# EB Instalações Elétricas — Site e Sistema

Site público + sistema de gestão (clientes, orçamentos, serviços, financeiro, estoque e conteúdo do site).

- **Tecnologia:** Next.js 15 · Supabase (banco, login e fotos) · Vercel (hospedagem)
- **Site público:** `/`
- **Sistema:** `/admin` — não tem link em nenhuma página, não aparece no Google e exige login de administrador.

## Etapas

| Etapa | Conteúdo | Situação |
|---|---|---|
| 1. Fundação | Banco de dados, segurança, login, site público, Dados da empresa | ✅ pronta |
| 2. Site público | Formulário de orçamento, aviso por e-mail e no celular, portfólio com fotos, Clientes, recuperar senha | ✅ pronta |
| 3A/3B. Estoque e Orçamentos | Estoque com reservas e lista de compras; orçamentos com PDF, envio pelo WhatsApp e aprovação online | ✅ pronta |
| 3C. Serviços e Financeiro | Ordens de serviço, baixa de material, parcelas, pagamentos e cobrança; Painel com próximas ações | ✅ pronta |
| 4. Acabamento | Editor do conteúdo do site com pré-visualização, backup em Excel (manual e semanal por e-mail), rotina que mantém o banco ativo | ✅ pronta |

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

### 3. Etapa 2: avisos e recuperação de senha (uma vez só)
1. **Supabase → SQL Editor** (modo *Database*): rode `supabase/migrations/0002_avisos.sql`.
2. **Supabase → Authentication → URL Configuration**:
   - **Site URL:** `https://eb-instalacoes-eletrica.vercel.app`
   - **Redirect URLs → Add URL:** `https://eb-instalacoes-eletrica.vercel.app/**`
3. **Chave de serviço** (para o servidor enviar os avisos):
   Supabase → **Project Settings → API Keys** → copie a **service_role** (aba *Legacy API Keys*) ou a **Secret key**.
   Na Vercel, cadastre `SUPABASE_SERVICE_ROLE_KEY` com esse valor. **Nunca** use essa chave em variável que comece com `NEXT_PUBLIC_`.
4. **E-mail de aviso** (Resend, gratuito até 3.000 e-mails/mês):
   - Crie conta em [resend.com](https://resend.com) **com o mesmo e-mail em que quer receber os avisos**.
   - **API Keys → Create API Key** (permissão *Sending access*) e copie a chave (`re_…`).
   - Na Vercel, cadastre `RESEND_API_KEY` com essa chave.
   - Sem domínio próprio, a Resend só entrega para o e-mail da sua conta, o que é exatamente o caso aqui.
5. Na Vercel: **Deployments → ⋯ → Redeploy**.
6. No celular, abra `/admin`, instale o sistema na tela inicial e, no **Painel**, toque em **Ativar avisos neste aparelho**.

Variáveis opcionais: `AVISO_EMAIL` (outro destinatário; padrão = e-mail da conta Resend/empresa) e `AVISO_REMETENTE`.

### 4. Etapa 3 (estoque e orçamentos)
No **Supabase → SQL Editor** (modo *Database*), rode `supabase/migrations/0003_orcamentos.sql`. Não precisa mexer na Vercel.

O cliente vê a proposta pelo link `/p/<código>`: o código é secreto e impossível de adivinhar, a página não aparece no Google e nunca mostra o custo dos materiais.

### 5. Etapa 3C (serviços e financeiro)
No **Supabase → SQL Editor** (modo *Database*), rode `supabase/migrations/0004_servicos.sql`.

### 6. Etapa 4 (backup automático e banco sempre ativo)
1. Na Vercel, cadastre a variável `CRON_SECRET` com um texto longo e aleatório (ex.: gere uma senha de 32 caracteres no gerenciador de senhas). Ela impede que outras pessoas disparem a rotina.
2. **Deployments → ⋯ → Redeploy**.

O arquivo `vercel.json` agenda a rotina `/api/rotina` todo dia às 8h (horário de Brasília):
- faz uma consulta leve no banco, porque o **Supabase gratuito pausa projetos sem uso por 7 dias**;
- às **segundas-feiras**, envia por e-mail a planilha com todos os dados (precisa de `RESEND_API_KEY`).

O backup manual fica em **Sistema → Dados da empresa → Baixar backup (Excel)**.

### 7. Melhorias pós-uso
No **Supabase → SQL Editor** (modo *Database*), rode `supabase/migrations/0005_avista.sql` (nova condição "À vista, na aprovação").

As funções do servidor rodam em **São Paulo** (`"regions": ["gru1"]` no `vercel.json`), perto do banco. Confira se o projeto do Supabase também está em São Paulo: *Project Settings → General → Region*.

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
- A chave `anon` pode ficar no navegador: ela só tem as permissões acima.
- A chave `service_role` fica **só** na variável `SUPABASE_SERVICE_ROLE_KEY` da Vercel e é usada apenas no servidor (avisos). Nunca a coloque no código nem em variável `NEXT_PUBLIC_`.
- Formulário do site com proteção anti-robô (campo invisível e tempo mínimo de preenchimento).
