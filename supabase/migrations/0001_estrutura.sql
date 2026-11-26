-- EB Instalações Elétricas — estrutura do banco (Etapa 1)
-- Execute no Supabase: SQL Editor > New query > cole este arquivo > Run.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------
-- Administradores: só quem está nesta tabela acessa o sistema.
-- ---------------------------------------------------------------
create table public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  criado_em timestamptz not null default now()
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- ---------------------------------------------------------------
-- Empresa e conteúdo do site (uma linha cada)
-- ---------------------------------------------------------------
create table public.empresa (
  id int primary key default 1 check (id = 1),
  nome text not null default 'EB Instalações Elétricas',
  responsavel text not null default '',
  registro text not null default '',
  telefone text not null default '',
  email text not null default '',
  cidade text not null default '',
  regiao text not null default '',
  atualizado_em timestamptz not null default now()
);

create table public.conteudo_site (
  id int primary key default 1 check (id = 1),
  publicado jsonb not null default '{}'::jsonb,   -- o que o site mostra
  rascunho jsonb,                                  -- edição ainda não publicada
  publicado_em timestamptz not null default now()
);

create table public.portfolio (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  categoria text not null,
  local text not null default '',
  ano text not null default '',
  descricao text not null default '',
  destaques text[] not null default '{}',
  fotos text[] not null default '{}',              -- caminhos no Storage (bucket "portfolio")
  ilustracao text not null default 'quadro',       -- usada quando não há foto
  publicado boolean not null default true,
  ordem int not null default 0,
  criado_em timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- Clientes (pedidos do site, WhatsApp, indicação…)
-- ---------------------------------------------------------------
create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(nome) between 2 and 120),
  telefone text not null check (char_length(telefone) between 8 and 30),
  email text not null default '' check (char_length(email) <= 160),
  documento text not null default '',
  endereco text not null default '' check (char_length(endereco) <= 200),
  cidade text not null default '' check (char_length(cidade) <= 120),
  tipo text not null default 'Residencial' check (tipo in ('Residencial','Comercial','Industrial')),
  servico text not null default '' check (char_length(servico) <= 120),
  mensagem text not null default '' check (char_length(mensagem) <= 2000),
  urgencia text not null default '' check (char_length(urgencia) <= 60),
  horario text not null default '' check (char_length(horario) <= 60),
  origem text not null default 'Site',
  status text not null default 'novo' check (status in ('novo','contato','orcamento','fechado','perdido')),
  criado_em timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- Estoque
-- ---------------------------------------------------------------
create table public.materiais (
  id uuid primary key default gen_random_uuid(),
  codigo text not null default '',
  nome text not null,
  categoria text not null default 'Outros',
  unidade text not null default 'pç',
  quantidade numeric(12,2) not null default 0,
  minimo numeric(12,2) not null default 0,
  custo numeric(12,2) not null default 0,
  preco numeric(12,2) not null default 0,
  local text not null default '',
  fornecedor text not null default '',
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- Orçamentos
-- ---------------------------------------------------------------
create table public.orcamentos (
  id uuid primary key default gen_random_uuid(),
  numero text not null unique,
  cliente_id uuid not null references public.clientes(id) on delete restrict,
  data date not null default current_date,
  validade_dias int not null default 15 check (validade_dias > 0),
  condicao text not null default 'entrada50' check (condicao in ('avista','entrada50','p3x')),
  desconto numeric(12,2) not null default 0 check (desconto >= 0),
  prazo_qtd numeric(6,1),
  prazo_unidade text not null default 'du' check (prazo_unidade in ('du','dc','h','sem')),
  prazo_inicio text not null default 'aprov' check (prazo_inicio in ('aprov','entrada','inicio')),
  endereco_obra text not null default '',
  observacoes text not null default '',
  status text not null default 'rascunho' check (status in ('rascunho','enviado','aprovado','recusado')),
  token_publico uuid not null default gen_random_uuid() unique,  -- link para o cliente ver/aprovar
  aprovado_em timestamptz,
  criado_em timestamptz not null default now()
);

create table public.orcamento_itens (
  id uuid primary key default gen_random_uuid(),
  orcamento_id uuid not null references public.orcamentos(id) on delete cascade,
  ordem int not null default 0,
  tipo text not null check (tipo in ('servico','material')),
  material_id uuid references public.materiais(id) on delete set null,
  descricao text not null,
  quantidade numeric(12,2) not null default 1 check (quantidade >= 0),
  unidade text not null default 'vb',
  valor_unit numeric(12,2) not null default 0 check (valor_unit >= 0),
  custo_unit numeric(12,2) not null default 0          -- custo no momento do orçamento
);

-- ---------------------------------------------------------------
-- Serviços (ordens de serviço) e parcelas
-- ---------------------------------------------------------------
create table public.servicos (
  id uuid primary key default gen_random_uuid(),
  numero text not null unique,
  orcamento_id uuid references public.orcamentos(id) on delete set null,
  cliente_id uuid not null references public.clientes(id) on delete restrict,
  titulo text not null,
  endereco text not null default '',
  inicio date,
  status text not null default 'agendado' check (status in ('agendado','execucao','concluido')),
  baixa_feita boolean not null default false,
  notas text not null default '',
  criado_em timestamptz not null default now()
);

create table public.parcelas (
  id uuid primary key default gen_random_uuid(),
  servico_id uuid not null references public.servicos(id) on delete cascade,
  descricao text not null,
  vencimento date not null,
  valor numeric(12,2) not null check (valor >= 0),
  pago boolean not null default false,
  pago_em date,
  forma text not null default ''
);

create table public.movimentacoes (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.materiais(id) on delete cascade,
  tipo text not null check (tipo in ('entrada','saida','ajuste')),
  quantidade numeric(12,2) not null,      -- ajuste pode ser negativo
  data date not null default current_date,
  observacao text not null default '',
  servico_id uuid references public.servicos(id) on delete set null,
  criado_em timestamptz not null default now()
);

-- Avisos no celular (Web Push)
create table public.push_inscricoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  criado_em timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- Numeração sequencial por ano: ORC-2026-001, OS-2026-001
-- ---------------------------------------------------------------
create table public.contadores (
  chave text not null,
  ano int not null,
  valor int not null default 0,
  primary key (chave, ano)
);

create or replace function public.proximo_numero(p_chave text) returns text
language plpgsql security definer set search_path = public as $$
declare v int; a int := extract(year from now());
begin
  if not public.is_admin() then raise exception 'sem permissão'; end if;
  insert into public.contadores(chave, ano, valor) values (p_chave, a, 1)
  on conflict (chave, ano) do update set valor = contadores.valor + 1
  returning valor into v;
  return p_chave || '-' || a || '-' || lpad(v::text, 3, '0');
end $$;

-- Movimentar estoque de forma atômica (saldo nunca fica inconsistente)
create or replace function public.movimentar_material(
  p_material uuid, p_tipo text, p_quantidade numeric, p_obs text default '', p_servico uuid default null
) returns numeric
language plpgsql security definer set search_path = public as $$
declare novo numeric;
begin
  if not public.is_admin() then raise exception 'sem permissão'; end if;
  if p_tipo = 'entrada' then
    update materiais set quantidade = quantidade + p_quantidade where id = p_material returning quantidade into novo;
  elsif p_tipo = 'saida' then
    update materiais set quantidade = quantidade - p_quantidade where id = p_material and quantidade >= p_quantidade returning quantidade into novo;
    if novo is null then raise exception 'saldo insuficiente'; end if;
  elsif p_tipo = 'ajuste' then      -- p_quantidade = quantidade contada
    select p_quantidade - quantidade into p_quantidade from materiais where id = p_material;
    update materiais set quantidade = quantidade + p_quantidade where id = p_material returning quantidade into novo;
  else raise exception 'tipo inválido'; end if;
  insert into movimentacoes(material_id, tipo, quantidade, observacao, servico_id)
  values (p_material, p_tipo, p_quantidade, coalesce(p_obs,''), p_servico);
  return novo;
end $$;

-- ---------------------------------------------------------------
-- Segurança (Row Level Security)
-- ---------------------------------------------------------------
alter table public.admins enable row level security;
alter table public.empresa enable row level security;
alter table public.conteudo_site enable row level security;
alter table public.portfolio enable row level security;
alter table public.clientes enable row level security;
alter table public.materiais enable row level security;
alter table public.orcamentos enable row level security;
alter table public.orcamento_itens enable row level security;
alter table public.servicos enable row level security;
alter table public.parcelas enable row level security;
alter table public.movimentacoes enable row level security;
alter table public.push_inscricoes enable row level security;
alter table public.contadores enable row level security;

-- Administrador: acesso total
do $$ declare t text; begin
  foreach t in array array['empresa','conteudo_site','portfolio','clientes','materiais','orcamentos',
    'orcamento_itens','servicos','parcelas','movimentacoes','contadores'] loop
    execute format('create policy "admin total" on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;
create policy "admin ve admins" on public.admins for select to authenticated using (public.is_admin());
create policy "push proprio" on public.push_inscricoes for all to authenticated
  using (user_id = auth.uid() and public.is_admin()) with check (user_id = auth.uid() and public.is_admin());

-- Visitante: lê só o que é público
create policy "publico le empresa" on public.empresa for select to anon using (true);
create policy "publico le portfolio" on public.portfolio for select to anon using (publicado);
-- conteúdo do site: visitante lê pela view abaixo (sem o rascunho)
create view public.site_publico with (security_invoker = false) as
  select publicado as conteudo from public.conteudo_site where id = 1;
grant select on public.site_publico to anon, authenticated;

-- Visitante: só pode CRIAR pedido de orçamento (não lê, não altera)
create policy "publico envia pedido" on public.clientes for insert to anon
  with check (origem = 'Site' and status = 'novo' and documento = '');

-- ---------------------------------------------------------------
-- Fotos do portfólio (Storage)
-- ---------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('portfolio', 'portfolio', true)
on conflict (id) do nothing;
create policy "admin envia fotos" on storage.objects for all to authenticated
  using (bucket_id = 'portfolio' and public.is_admin()) with check (bucket_id = 'portfolio' and public.is_admin());

-- Índices úteis
create index on public.clientes (status, criado_em desc);
create index on public.orcamentos (cliente_id);
create index on public.orcamento_itens (orcamento_id, ordem);
create index on public.servicos (status);
create index on public.parcelas (servico_id);
create index on public.parcelas (pago, vencimento);
create index on public.movimentacoes (material_id, data desc);
