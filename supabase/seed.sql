-- Dados iniciais — execute DEPOIS do 0001_estrutura.sql
insert into public.empresa (id) values (1) on conflict do nothing;
insert into public.conteudo_site (id) values (1) on conflict do nothing;

-- Tornar o seu usuário administrador:
-- 1) Supabase > Authentication > Users > Add user > Create new user
--    (seu e-mail e uma senha forte; marque "Auto Confirm User")
-- 2) Troque o e-mail abaixo pelo seu e rode esta linha:
-- insert into public.admins (user_id) select id from auth.users where email = 'seu-email@exemplo.com';
