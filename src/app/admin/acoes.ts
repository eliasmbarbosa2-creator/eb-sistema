'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { supabaseServidor, adminAtual } from '@/lib/supabase/server';

export type Estado = { erro?: string; ok?: string };

export async function entrar(_: Estado, form: FormData): Promise<Estado> {
  const email = String(form.get('email') ?? '').trim();
  const senha = String(form.get('senha') ?? '');
  if (!email || !senha) return { erro: 'Informe e-mail e senha.' };
  const supabase = await supabaseServidor();
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
  // Mesma mensagem para qualquer falha: não revela se o e-mail existe.
  if (error) {
    // Motivo real só no log do servidor (Vercel > Logs); a tela mostra mensagem genérica.
    console.warn('[login] recusado pelo Supabase Auth:', error.code ?? '', error.message);
    return { erro: 'E-mail ou senha incorretos.' };
  }
  const { data: ehAdmin, error: erroAdmin } = await supabase.rpc('is_admin');
  if (!ehAdmin) {
    console.warn('[login] senha correta, mas o usuário não está na tabela admins', erroAdmin?.message ?? '');
    await supabase.auth.signOut();
    return { erro: 'E-mail ou senha incorretos.' };
  }
  redirect('/admin');
}

export async function sair() {
  const supabase = await supabaseServidor();
  await supabase.auth.signOut();
  redirect('/admin/entrar');
}

export async function salvarEmpresa(_: Estado, form: FormData): Promise<Estado> {
  if (!(await adminAtual())) return { erro: 'Sessão expirada. Entre novamente.' };
  const campos = ['nome', 'responsavel', 'registro', 'telefone', 'email', 'cidade', 'regiao'] as const;
  const dados: Record<string, string> = {};
  for (const c of campos) dados[c] = String(form.get(c) ?? '').trim().slice(0, 200);
  if (!dados.nome) return { erro: 'O nome da empresa é obrigatório.' };
  const supabase = await supabaseServidor();
  const { error } = await supabase.from('empresa').upsert({ id: 1, ...dados, atualizado_em: new Date().toISOString() });
  if (error) return { erro: 'Não foi possível salvar. Tente de novo.' };
  revalidatePath('/');
  revalidatePath('/admin', 'layout');
  return { ok: 'Dados da empresa salvos.' };
}
