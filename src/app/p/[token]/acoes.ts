'use server';
import { after } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase/config';
import { avisarAprovacao } from '@/lib/avisos';

export async function aprovarPeloLink(token: string): Promise<{ ok?: boolean; erro?: string }> {
  if (!/^[0-9a-f-]{36}$/i.test(token)) return { erro: 'Link inválido.' };
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const { data, error } = await sb.rpc('aprovar_orcamento_publico', { p_token: token });
  if (error) {
    const m = error.message;
    return { erro: m.includes('vencido') ? 'Este orçamento passou da validade. Fale com a gente para atualizar os valores.' : m.includes('disponível') ? 'Este orçamento não está mais disponível para aprovação.' : 'Não foi possível aprovar agora. Tente de novo ou fale pelo WhatsApp.' };
  }
  const r = data as { ok: boolean; ja_aprovado?: boolean; numero?: string; cliente?: string };
  if (!r.ja_aprovado && r.numero) after(() => avisarAprovacao(r.numero!, r.cliente ?? 'O cliente'));
  return { ok: true };
}
