'use server';
import { after } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase/config';
import { avisarRespostaCliente } from '@/lib/avisos';

type R = { ok?: boolean; erro?: string };
const valido = (t: string) => /^[0-9a-f-]{36}$/i.test(t);
const cliente = () => createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
const msgErro = (m: string) =>
  m.includes('vencido') ? 'Este orçamento passou da validade. Fale com a gente para atualizar os valores.'
  : m.includes('disponível') ? 'Este orçamento não está mais disponível. Atualize a página.'
  : m.includes('limite') ? 'Você já enviou muitas mensagens. Fale com a gente pelo WhatsApp.'
  : m.includes('vazia') ? 'Escreva o que gostaria de alterar.'
  : 'Não foi possível concluir agora. Tente de novo ou fale pelo WhatsApp.';

export async function aprovarPeloLink(token: string, obs: string): Promise<R> {
  if (!valido(token)) return { erro: 'Link inválido.' };
  const o = String(obs ?? '').trim().slice(0, 1500);
  const { data, error } = await cliente().rpc('aprovar_orcamento_publico', { p_token: token, p_obs: o });
  if (error) return { erro: msgErro(error.message) };
  const r = data as { ja_aprovado?: boolean; numero?: string; cliente?: string };
  if (!r.ja_aprovado && r.numero) after(() => avisarRespostaCliente('aprovacao', r.numero!, r.cliente ?? 'O cliente', o));
  return { ok: true };
}

export async function recusarPeloLink(token: string, motivo: string): Promise<R> {
  if (!valido(token)) return { erro: 'Link inválido.' };
  const m = String(motivo ?? '').trim().slice(0, 1500);
  const { data, error } = await cliente().rpc('recusar_orcamento_publico', { p_token: token, p_motivo: m });
  if (error) return { erro: msgErro(error.message) };
  const r = data as { ja_recusado?: boolean; numero?: string; cliente?: string };
  if (!r.ja_recusado && r.numero) after(() => avisarRespostaCliente('recusa', r.numero!, r.cliente ?? 'O cliente', m));
  return { ok: true };
}

export async function contestarPeloLink(token: string, mensagem: string): Promise<R> {
  if (!valido(token)) return { erro: 'Link inválido.' };
  const m = String(mensagem ?? '').trim().slice(0, 1500);
  if (m.length < 3) return { erro: 'Escreva o que gostaria de alterar.' };
  const { data, error } = await cliente().rpc('contestar_orcamento_publico', { p_token: token, p_msg: m });
  if (error) return { erro: msgErro(error.message) };
  const r = data as { numero?: string; cliente?: string };
  if (r.numero) after(() => avisarRespostaCliente('contestacao', r.numero!, r.cliente ?? 'O cliente', m));
  return { ok: true };
}
