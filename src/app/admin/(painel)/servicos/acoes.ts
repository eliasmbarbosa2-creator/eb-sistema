'use server';
import { revalidatePath } from 'next/cache';
import { adminAtual, supabaseServidor } from '@/lib/supabase/server';

type R = { ok?: string; erro?: string; falta?: { nome: string; precisa: number; tem: number; unidade: string }[] };

export async function mudarStatusServico(id: string, status: string): Promise<R> {
  if (!(await adminAtual()) || !['agendado', 'execucao', 'concluido'].includes(status)) return { erro: 'Não permitido.' };
  const sb = await supabaseServidor();
  const { error } = await sb.from('servicos').update({ status }).eq('id', id);
  revalidatePath('/admin', 'layout');
  return error ? { erro: 'Não foi possível salvar.' } : { ok: 'Status atualizado.' };
}

export async function darBaixa(id: string): Promise<R> {
  if (!(await adminAtual())) return { erro: 'Sessão expirada.' };
  const sb = await supabaseServidor();
  const { data, error } = await sb.rpc('dar_baixa_servico', { p_servico: id });
  if (error) return { erro: 'Não foi possível retirar os materiais.' };
  const r = data as { ok: boolean; falta?: R['falta'] };
  revalidatePath('/admin', 'layout');
  return r.ok ? { ok: 'Materiais retirados do estoque.' } : { falta: r.falta };
}

export async function salvarServico(id: string, d: { titulo: string; endereco: string; inicio: string; notas: string }): Promise<R> {
  if (!(await adminAtual())) return { erro: 'Sessão expirada.' };
  const titulo = d.titulo.trim().slice(0, 200);
  if (!titulo) return { erro: 'Informe o título.' };
  const sb = await supabaseServidor();
  const { error } = await sb.from('servicos').update({
    titulo, endereco: d.endereco.trim().slice(0, 200), notas: d.notas.trim().slice(0, 2000),
    inicio: /^\d{4}-\d{2}-\d{2}$/.test(d.inicio) ? d.inicio : null,
  }).eq('id', id);
  revalidatePath('/admin', 'layout');
  return error ? { erro: 'Não foi possível salvar.' } : { ok: 'Serviço atualizado.' };
}

/** Conclui sem retirar materiais, registrando a confirmação nas anotações da OS. */
export async function concluirSemBaixa(id: string): Promise<R> {
  if (!(await adminAtual())) return { erro: 'Sessão expirada.' };
  const sb = await supabaseServidor();
  const { data: s } = await sb.from('servicos').select('notas').eq('id', id).single();
  const hoje = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const nota = `Concluído sem retirar materiais do estoque (confirmado em ${hoje}).`;
  const { error } = await sb.from('servicos').update({ status: 'concluido', notas: [s?.notas, nota].filter(Boolean).join('\n') }).eq('id', id);
  revalidatePath('/admin', 'layout');
  return error ? { erro: 'Não foi possível concluir.' } : { ok: 'Serviço concluído. O estoque não foi alterado.' };
}
