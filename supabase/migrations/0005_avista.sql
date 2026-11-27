-- Melhorias pós-uso — execute no SQL Editor (modo Database), uma vez.

-- Nova condição de pagamento: "À vista, na aprovação do orçamento" (avista_ato).
alter table public.orcamentos drop constraint if exists orcamentos_condicao_check;
alter table public.orcamentos add constraint orcamentos_condicao_check
  check (condicao in ('avista_ato', 'avista', 'entrada50', 'p3x'));

-- Aprovação passa a gerar a parcela da nova condição.
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

  if o.condicao = 'avista_ato' then
    insert into public.parcelas (servico_id, descricao, vencimento, valor) values (s, 'Pagamento à vista', hoje, t);
  elsif o.condicao = 'avista' then
    insert into public.parcelas (servico_id, descricao, vencimento, valor) values (s, 'Pagamento único (até 15 dias)', hoje + 15, t);
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
