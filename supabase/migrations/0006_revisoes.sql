-- Revisões, respostas do cliente e exclusão de orçamentos — execute no SQL Editor (modo Database), uma vez.

alter table public.orcamentos add column if not exists revisao int not null default 0;
alter table public.orcamentos add column if not exists contestacao_pendente boolean not null default false;

-- Cópia de cada versão anterior do orçamento (histórico)
create table if not exists public.orcamento_versoes (
  id uuid primary key default gen_random_uuid(),
  orcamento_id uuid not null references public.orcamentos(id) on delete cascade,
  revisao int not null,
  status text not null,
  motivo text not null default '',
  dados jsonb not null,
  criado_em timestamptz not null default now()
);

-- Respostas do cliente (e recusas registradas por você)
create table if not exists public.orcamento_interacoes (
  id uuid primary key default gen_random_uuid(),
  orcamento_id uuid not null references public.orcamentos(id) on delete cascade,
  revisao int not null default 0,
  tipo text not null check (tipo in ('aprovacao', 'recusa', 'contestacao')),
  origem text not null default 'cliente' check (origem in ('cliente', 'admin')),
  mensagem text not null default '' check (char_length(mensagem) <= 1500),
  criado_em timestamptz not null default now()
);
create index if not exists orcamento_versoes_orc on public.orcamento_versoes (orcamento_id, revisao);
create index if not exists orcamento_interacoes_orc on public.orcamento_interacoes (orcamento_id, criado_em);

alter table public.orcamento_versoes enable row level security;
alter table public.orcamento_interacoes enable row level security;
drop policy if exists "admin total" on public.orcamento_versoes;
drop policy if exists "admin total" on public.orcamento_interacoes;
create policy "admin total" on public.orcamento_versoes for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin total" on public.orcamento_interacoes for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Proposta vista pelo cliente: inclui a revisão, as mensagens dele e o aviso de "em revisão".
create or replace function public.orcamento_publico(p_token uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'orcamento', jsonb_build_object(
      'numero', o.numero, 'revisao', o.revisao, 'data', o.data, 'validade_dias', o.validade_dias, 'condicao', o.condicao,
      'desconto', o.desconto, 'prazo_qtd', o.prazo_qtd, 'prazo_unidade', o.prazo_unidade, 'prazo_inicio', o.prazo_inicio,
      'endereco_obra', o.endereco_obra, 'observacoes', o.observacoes, 'status', o.status, 'aprovado_em', o.aprovado_em,
      'contestacao_pendente', o.contestacao_pendente),
    'itens', case when o.status = 'rascunho' then '[]'::jsonb else coalesce((select jsonb_agg(jsonb_build_object('tipo', i.tipo, 'descricao', i.descricao, 'quantidade', i.quantidade,
                         'unidade', i.unidade, 'valor_unit', i.valor_unit) order by i.ordem)
                       from public.orcamento_itens i where i.orcamento_id = o.id), '[]'::jsonb) end,
    'mensagens', coalesce((select jsonb_agg(jsonb_build_object('tipo', m.tipo, 'mensagem', m.mensagem, 'criado_em', m.criado_em) order by m.criado_em)
                           from public.orcamento_interacoes m where m.orcamento_id = o.id and m.origem = 'cliente' and m.revisao = o.revisao), '[]'::jsonb),
    'cliente', jsonb_build_object('nome', c.nome, 'telefone', c.telefone, 'email', c.email, 'documento', c.documento,
                                  'endereco', c.endereco, 'cidade', c.cidade, 'tipo', c.tipo),
    'empresa', (select jsonb_build_object('nome', e.nome, 'responsavel', e.responsavel, 'registro', e.registro,
                  'telefone', e.telefone, 'email', e.email, 'cidade', e.cidade) from public.empresa e where e.id = 1))
  from public.orcamentos o join public.clientes c on c.id = o.cliente_id
  where o.token_publico = p_token and (o.status in ('enviado', 'aprovado', 'recusado') or (o.status = 'rascunho' and o.revisao > 0));
$$;
grant execute on function public.orcamento_publico(uuid) to anon, authenticated;

-- Aprovação pelo cliente, agora com observação opcional
drop function if exists public.aprovar_orcamento_publico(uuid);
create or replace function public.aprovar_orcamento_publico(p_token uuid, p_obs text default '') returns jsonb
language plpgsql security definer set search_path = public as $$
declare o public.orcamentos; c text; hoje date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  select * into o from public.orcamentos where token_publico = p_token;
  if o.id is null then raise exception 'link inválido'; end if;
  if o.status = 'aprovado' then return jsonb_build_object('ok', true, 'ja_aprovado', true); end if;
  if o.status <> 'enviado' then raise exception 'este orçamento não está disponível para aprovação'; end if;
  if o.data + o.validade_dias < hoje then raise exception 'orçamento vencido'; end if;
  perform public._aprovar(o.id);
  insert into public.orcamento_interacoes (orcamento_id, revisao, tipo, mensagem) values (o.id, o.revisao, 'aprovacao', left(coalesce(p_obs, ''), 1500));
  update public.orcamentos set contestacao_pendente = false where id = o.id;
  select nome into c from public.clientes where id = o.cliente_id;
  return jsonb_build_object('ok', true, 'numero', o.numero, 'cliente', c);
end $$;
grant execute on function public.aprovar_orcamento_publico(uuid, text) to anon, authenticated;

-- Recusa pelo cliente, com motivo opcional
create or replace function public.recusar_orcamento_publico(p_token uuid, p_motivo text default '') returns jsonb
language plpgsql security definer set search_path = public as $$
declare o public.orcamentos; c text;
begin
  select * into o from public.orcamentos where token_publico = p_token for update;
  if o.id is null then raise exception 'link inválido'; end if;
  if o.status = 'recusado' then return jsonb_build_object('ok', true, 'ja_recusado', true); end if;
  if o.status <> 'enviado' then raise exception 'este orçamento não está disponível'; end if;
  update public.orcamentos set status = 'recusado', contestacao_pendente = false where id = o.id;
  update public.clientes set status = 'perdido' where id = o.cliente_id;
  insert into public.orcamento_interacoes (orcamento_id, revisao, tipo, mensagem) values (o.id, o.revisao, 'recusa', left(coalesce(p_motivo, ''), 1500));
  select nome into c from public.clientes where id = o.cliente_id;
  return jsonb_build_object('ok', true, 'numero', o.numero, 'cliente', c);
end $$;
grant execute on function public.recusar_orcamento_publico(uuid, text) to anon, authenticated;

-- Contestação / pedido de alteração pelo cliente (o orçamento continua aguardando decisão)
create or replace function public.contestar_orcamento_publico(p_token uuid, p_msg text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare o public.orcamentos; c text; n int;
begin
  if char_length(trim(coalesce(p_msg, ''))) < 3 then raise exception 'mensagem vazia'; end if;
  select * into o from public.orcamentos where token_publico = p_token;
  if o.id is null then raise exception 'link inválido'; end if;
  if o.status <> 'enviado' then raise exception 'este orçamento não está disponível'; end if;
  select count(*) into n from public.orcamento_interacoes where orcamento_id = o.id and revisao = o.revisao and tipo = 'contestacao';
  if n >= 10 then raise exception 'limite de mensagens'; end if;
  insert into public.orcamento_interacoes (orcamento_id, revisao, tipo, mensagem) values (o.id, o.revisao, 'contestacao', left(trim(p_msg), 1500));
  update public.orcamentos set contestacao_pendente = true where id = o.id;
  select nome into c from public.clientes where id = o.cliente_id;
  return jsonb_build_object('ok', true, 'numero', o.numero, 'cliente', c);
end $$;
grant execute on function public.contestar_orcamento_publico(uuid, text) to anon, authenticated;

-- Revisar: guarda a versão atual no histórico e volta para rascunho (mesmo número, mesmo link).
create or replace function public.revisar_orcamento(p_orc uuid) returns int
language plpgsql security definer set search_path = public as $$
declare o public.orcamentos; mot text;
begin
  if not public.is_admin() then raise exception 'sem permissão'; end if;
  select * into o from public.orcamentos where id = p_orc for update;
  if o.id is null then raise exception 'orçamento não encontrado'; end if;
  if o.status not in ('enviado', 'recusado') then raise exception 'só orçamentos enviados ou recusados podem ser revisados'; end if;
  select mensagem into mot from public.orcamento_interacoes
   where orcamento_id = o.id and revisao = o.revisao and tipo in ('recusa', 'contestacao') order by criado_em desc limit 1;
  insert into public.orcamento_versoes (orcamento_id, revisao, status, motivo, dados)
  values (o.id, o.revisao, o.status, coalesce(mot, ''), jsonb_build_object(
    'orcamento', to_jsonb(o) - 'token_publico',
    'itens', coalesce((select jsonb_agg(to_jsonb(i) - 'id' - 'orcamento_id' order by i.ordem) from public.orcamento_itens i where i.orcamento_id = o.id), '[]'::jsonb)));
  update public.orcamentos set revisao = revisao + 1, status = 'rascunho', contestacao_pendente = false, aprovado_em = null where id = o.id;
  if o.status = 'recusado' then update public.clientes set status = 'contato' where id = o.cliente_id and status = 'perdido'; end if;
  return o.revisao + 1;
end $$;

-- Excluir orçamento. Se aprovado, leva junto a OS e as parcelas — desde que nada tenha sido pago nem retirado do estoque.
create or replace function public.excluir_orcamento(p_orc uuid) returns void
language plpgsql security definer set search_path = public as $$
declare o public.orcamentos; s public.servicos;
begin
  if not public.is_admin() then raise exception 'sem permissão'; end if;
  select * into o from public.orcamentos where id = p_orc for update;
  if o.id is null then raise exception 'orçamento não encontrado'; end if;
  for s in select * from public.servicos where orcamento_id = o.id loop
    if exists (select 1 from public.parcelas where servico_id = s.id and pago) then
      raise exception 'tem pagamento registrado na %', s.numero; end if;
    if s.baixa_feita then raise exception 'o material da % já saiu do estoque', s.numero; end if;
    delete from public.servicos where id = s.id;   -- parcelas saem junto
  end loop;
  delete from public.orcamentos where id = o.id;   -- itens, versões e respostas saem junto
end $$;
