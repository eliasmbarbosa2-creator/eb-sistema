'use server';
import { revalidatePath } from 'next/cache';
import { adminAtual, supabaseServidor } from '@/lib/supabase/server';
import { limparConteudo } from '@/lib/conteudo';
import { ICONES } from '@/lib/icones';

type R = { ok?: string; erro?: string };

export async function salvarRascunho(conteudo: unknown): Promise<R> {
  if (!(await adminAtual())) return { erro: 'Sessão expirada. Entre novamente.' };
  const sb = await supabaseServidor();
  const { error } = await sb.from('conteudo_site').update({ rascunho: limparConteudo(conteudo, Object.keys(ICONES)) }).eq('id', 1);
  return error ? { erro: 'Não foi possível salvar o rascunho.' } : { ok: 'Rascunho salvo.' };
}

export async function publicarConteudo(conteudo: unknown): Promise<R> {
  if (!(await adminAtual())) return { erro: 'Sessão expirada. Entre novamente.' };
  const sb = await supabaseServidor();
  const { error } = await sb.from('conteudo_site')
    .update({ publicado: limparConteudo(conteudo, Object.keys(ICONES)), rascunho: null, publicado_em: new Date().toISOString() }).eq('id', 1);
  if (error) return { erro: 'Não foi possível publicar.' };
  revalidatePath('/');
  return { ok: 'Site atualizado. As mudanças já estão no ar.' };
}

export async function descartarRascunho(): Promise<R> {
  if (!(await adminAtual())) return { erro: 'Sessão expirada.' };
  const sb = await supabaseServidor();
  await sb.from('conteudo_site').update({ rascunho: null }).eq('id', 1);
  return { ok: 'Alterações descartadas.' };
}
