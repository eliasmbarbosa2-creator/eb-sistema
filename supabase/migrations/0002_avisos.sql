-- Etapa 2 — execute no SQL Editor (modo Database), uma vez.

-- Configurações internas do servidor (ex.: chaves dos avisos no celular).
-- Sem nenhuma política: só o servidor, com a chave de serviço, consegue ler ou gravar.
create table if not exists public.config_privada (
  chave text primary key,
  valor text not null,
  criado_em timestamptz not null default now()
);
alter table public.config_privada enable row level security;
