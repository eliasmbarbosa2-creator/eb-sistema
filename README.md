# EB Instalações Elétricas — Site e Sistema

Site público + sistema de gestão (clientes, orçamentos, serviços, financeiro, estoque e conteúdo do site).

- **Tecnologia:** Next.js 15 · Supabase (banco, login e fotos) · Vercel (hospedagem)
- **Site público:** `/`
- **Sistema:** `/admin` — não tem link em nenhuma página, não aparece no Google e exige login de administrador.

## Etapas

| Etapa | Conteúdo | Situação |
|---|---|---|
| 1. Fundação | Banco de dados, segurança, login, site público, Dados da empresa | ✅ pronta |
| 2. Site público | Formulário de orçamento, aviso por e-mail e no celular, portfólio | próxima |
| 3. Sistema | Clientes, orçamentos (PDF + aprovação online), serviços, financeiro, estoque | — |
| 4. Acabamento | Editor do conteúdo do site, fotos, backup | — |

## Como colocar no ar (uma vez só)

### 1. Banco de dados (Supabase)
1. Em [supabase.com](https://supabase.com), crie um projeto (região **South America (São Paulo)**). Guarde a senha do banco.
2. **SQL Editor → New query**: cole o conteúdo de `supabase/migrations/0001_estrutura.sql` e clique em **Run**.
3. Faça o mesmo com `supabase/seed.sql`.
4. **Authentication → Sign In / Providers → Email**: desligue **Allow new users to sign up**. Assim ninguém consegue criar conta sozinho.
5. **Authentication → Users → Add user → Create new user**: seu e-mail e uma senha forte, com **Auto Confirm User** marcado.
6. No **SQL Editor**, rode (com o seu e-mail):
   ```sql
   insert into public.admins (user_id) select id from auth.users where email = 'seu-email@exemplo.com';
   ```
7. **Project Settings → API**: copie a **Project URL** e a chave **anon public**.

### 2. Hospedagem (Vercel)
1. Em [vercel.com](https://vercel.com) → **Add New → Project** → importe o repositório `eb-sistema`.
2. Em **Environment Variables**, cadastre:
   - `NEXT_PUBLIC_SUPABASE_URL` = Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = chave anon public
3. Clique em **Deploy**. O endereço será algo como `eb-sistema.vercel.app`.
4. Entre em `https://SEU-ENDERECO.vercel.app/admin` com o e-mail e a senha do passo 1.5.

A partir daí, cada atualização enviada ao GitHub é publicada automaticamente.

## Desenvolvimento local

```bash
npm install
cp .env.example .env.local   # preencha com os dados do Supabase
npm run dev                  # http://localhost:3000
```

## Segurança

- Todas as tabelas usam **Row Level Security**: só administradores (tabela `admins`) leem e alteram dados.
- Visitantes só podem **ler** o conteúdo público (empresa, conteúdo do site, portfólio publicado) e **enviar** pedidos de orçamento. Eles não conseguem ler os pedidos de ninguém.
- O cadastro público de usuários fica desligado no Supabase. Sem estar na tabela `admins`, um login não acessa nada.
- A chave `anon` pode ficar no navegador: ela só tem as permissões acima. **Nunca** coloque a chave `service_role` no projeto.
