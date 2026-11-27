-- Etapa 3 (estoque e orçamentos) — execute no SQL Editor (modo Database), uma vez.

-- Numeração interna (sem checagem; só outras funções do banco a usam)
create or replace function public._proximo_numero(p_chave text) returns text
language plpgsql security definer set search_path = public as $$
declare v int; a int := extract(year from (now() at time zone 'America/Sao_Paulo'));
begin
  insert into public.contadores(chave, ano, valor) values (p_chave, a, 1)
  on conflict (chave, ano) do update set valor = contadores.valor + 1
  returning valor into v;
  return p_chave || '-' || a || '-' || lpad(v::text, 3, '0');
end $$;
revoke all on function public._proximo_numero(text) from public, anon, authenticated;

create or replace function public.proximo_numero(p_chave text) returns text
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'sem permissão'; end if;
  return public._proximo_numero(p_chave);
end $$;

-- Total do orçamento (itens − desconto)
create or replace function public.total_orcamento(p_orc uuid) returns numeric
language sql stable security definer set search_path = public as $$
  select greatest(0, coalesce((select sum(round(quantidade * valor_unit, 2)) from public.orcamento_itens where orcamento_id = p_orc), 0)
                     - coalesce((select desconto from public.orcamentos where id = p_orc), 0));
$$;
revoke all on function public.total_orcamento(uuid) from public, anon;
grant execute on function public.total_orcamento(uuid) to authenticated;

-- Aprovação: marca aprovado, fecha o cliente, abre a OS e lança as parcelas — tudo ou nada.
create or replace function public._aprovar(p_orc uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  o public.orcamentos; t numeric; a numeric; s uuid; tit text;
  hoje date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  select * into o from public.orcamentos where id = p_orc for update;
  if o.id is null then raise exception 'orçamento não encontrado'; end if;
  if o.status = 'aprovado' then
    select id into s from public.servicos where orcamento_id = p_orc limit 1; return s;
  end if;
  if o.status not in ('rascunho', 'enviado') then raise exception 'este orçamento não pode mais ser aprovado'; end if;

  t := public.total_orcamento(p_orc);
  update public.orcamentos set status = 'aprovado', aprovado_em = now() where id = p_orc;
  update public.clientes set status = 'fechado' where id = o.cliente_id;

  select regexp_replace(descricao, '^m[aã]o de obra:\s*', '', 'i') into tit
  from public.orcamento_itens where orcamento_id = p_orc and tipo = 'servico' order by ordem limit 1;
  tit := coalesce(nullif(tit, ''), 'Serviço');
  tit := upper(left(tit, 1)) || substr(tit, 2);

  insert into public.servicos (numero, orcamento_id, cliente_id, titulo, endereco, inicio, status)
  values (public._proximo_numero('OS'), p_orc, o.cliente_id, tit, o.endereco_obra, hoje + 3, 'agendado')
  returning id into s;

  if o.condicao = 'avista' then
    insert into public.parcelas (servico_id, descricao, vencimento, valor) values (s, 'Pagamento único', hoje + 15, t);
  elsif o.condicao = 'entrada50' then
    a := round(t / 2, 2);
    insert into public.parcelas (servico_id, descricao, vencimento, valor) values
      (s, 'Entrada (50%)', hoje, a), (s, 'Saldo na entrega (50%)', hoje + 20, t - a);
  else
    a := round(t / 3, 2);
    insert into public.parcelas (servico_id, descricao, vencimento, valor) values
      (s, 'Parcela 1/3', hoje, a), (s, 'Parcela 2/3', hoje + 30, a), (s, 'Parcela 3/3', hoje + 60, t - 2 * a);
  end if;
  return s;
end $$;
revoke all on function public._aprovar(uuid) from public, anon, authenticated;

-- Aprovação pelo administrador (botão no sistema)
create or replace function public.aprovar_orcamento(p_orc uuid) returns uuid
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'sem permissão'; end if;
  return public._aprovar(p_orc);
end $$;

-- Proposta vista pelo cliente pelo link secreto. Nunca devolve custo dos materiais nem ids internos.
create or replace function public.orcamento_publico(p_token uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'orcamento', jsonb_build_object(
      'numero', o.numero, 'data', o.data, 'validade_dias', o.validade_dias, 'condicao', o.condicao,
      'desconto', o.desconto, 'prazo_qtd', o.prazo_qtd, 'prazo_unidade', o.prazo_unidade, 'prazo_inicio', o.prazo_inicio,
      'endereco_obra', o.endereco_obra, 'observacoes', o.observacoes, 'status', o.status, 'aprovado_em', o.aprovado_em),
    'itens', coalesce((select jsonb_agg(jsonb_build_object('tipo', i.tipo, 'descricao', i.descricao, 'quantidade', i.quantidade,
                         'unidade', i.unidade, 'valor_unit', i.valor_unit) order by i.ordem)
                       from public.orcamento_itens i where i.orcamento_id = o.id), '[]'::jsonb),
    'cliente', jsonb_build_object('nome', c.nome, 'telefone', c.telefone, 'email', c.email, 'documento', c.documento,
                                  'endereco', c.endereco, 'cidade', c.cidade, 'tipo', c.tipo),
    'empresa', (select jsonb_build_object('nome', e.nome, 'responsavel', e.responsavel, 'registro', e.registro,
                  'telefone', e.telefone, 'email', e.email, 'cidade', e.cidade) from public.empresa e where e.id = 1))
  from public.orcamentos o join public.clientes c on c.id = o.cliente_id
  where o.token_publico = p_token and o.status in ('enviado', 'aprovado', 'recusado');
$$;
grant execute on function public.orcamento_publico(uuid) to anon, authenticated;

-- Aprovação pelo cliente, pelo link secreto
create or replace function public.aprovar_orcamento_publico(p_token uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare o public.orcamentos; c text; hoje date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  select * into o from public.orcamentos where token_publico = p_token;
  if o.id is null then raise exception 'link inválido'; end if;
  if o.status = 'aprovado' then return jsonb_build_object('ok', true, 'ja_aprovado', true); end if;
  if o.status <> 'enviado' then raise exception 'este orçamento não está disponível para aprovação'; end if;
  if o.data + o.validade_dias < hoje then raise exception 'orçamento vencido'; end if;
  perform public._aprovar(o.id);
  select nome into c from public.clientes where id = o.cliente_id;
  return jsonb_build_object('ok', true, 'numero', o.numero, 'cliente', c);
end $$;
grant execute on function public.aprovar_orcamento_publico(uuid) to anon, authenticated;
