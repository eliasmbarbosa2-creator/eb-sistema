'use server';
import { revalidatePath } from 'next/cache';
import { adminAtual, supabaseServidor } from '@/lib/supabase/server';

const FORMAS = ['Pix', 'Dinheiro', 'Transferência', 'Cartão de crédito', 'Cartão de débito', 'Boleto'];

export async function registrarPagamento(id: string, data: string, forma: string): Promise<{ ok?: string; erro?: string }> {
  if (!(await adminAtual())) return { erro: 'Sessão expirada.' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return { erro: 'Informe a data do pagamento.' };
  const sb = await supabaseServidor();
  const { error } = await sb.from('parcelas').update({ pago: true, pago_em: data, forma: FORMAS.includes(forma) ? forma : 'Pix' }).eq('id', id);
  revalidatePath('/admin', 'layout');
  return error ? { erro: 'Não foi possível salvar.' } : { ok: 'Recebimento registrado.' };
}

export async function desfazerPagamento(id: string): Promise<{ ok?: string; erro?: string }> {
  if (!(await adminAtual())) return { erro: 'Sessão expirada.' };
  const sb = await supabaseServidor();
  const { error } = await sb.from('parcelas').update({ pago: false, pago_em: null, forma: '' }).eq('id', id);
  revalidatePath('/admin', 'layout');
  return error ? { erro: 'Não foi possível desfazer.' } : { ok: 'Pagamento desfeito.' };
}
