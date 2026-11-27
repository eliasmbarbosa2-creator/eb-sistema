-- Instagram da empresa (o @, sem o "@" e sem link). Aparece no rodapé e no contato do site.
alter table public.empresa add column if not exists instagram text not null default '';
