'use server';
import { revalidatePath } from 'next/cache';
import { adminAtual, supabaseServidor } from '@/lib/supabase/server';
import { CONDICOES, PRAZO_UN, PRAZO_INICIO, UNIDADES } from '@/lib/negocio';

type R = { ok?: string; erro?: string; id?: string; numero?: string; token?: string };
export type ItemIn = { tipo: 'servico' | 'material'; material_id: string | null; descricao: string; quantidade: number; unidade: string; valor_unit: number };
export type OrcIn = {
  id?: string; cliente_id: string; data: string; validade_dias: number; condicao: string; desconto: number;
  prazo_qtd: number | null; prazo_unidade: string; prazo_inicio: string; endereco_obra: string; observacoes: string; itens: ItemIn[];
};
const n = (v: unknown) => { const x = Number(v); return Number.isFinite(x) ? Math.round(x * 100) / 100 : 0; };

export async function salvarOrcamento(o: OrcIn): Promise<R> {
  if (!(await adminAtual())) return { erro: 'Sessão expirada. Entre novamente.' };
  if (!o.cliente_id) return { erro: 'Escolha o cliente.' };
  const itens = o.itens.filter((i) => i.descricao.trim());
  if (!itens.length) return { erro: 'Adicione pelo menos um item.' };
  const sb = await supabaseServidor();

  const linha = {
    cliente_id: o.cliente_id,
    data: /^\d{4}-\d{2}-\d{2}$/.test(o.data) ? o.data : new Date().toISOString().slice(0, 10),
    validade_dias: Math.max(1, Math.round(n(o.validade_dias)) || 15),
    condicao: o.condicao in CONDICOES ? o.condicao : 'entrada50',
    desconto: Math.max(0, n(o.desconto)),
    prazo_qtd: o.prazo_qtd && n(o.prazo_qtd) > 0 ? n(o.prazo_qtd) : null,
    prazo_unidade: o.prazo_unidade in PRAZO_UN ? o.prazo_unidade : 'du',
    prazo_inicio: o.prazo_inicio in PRAZO_INICIO ? o.prazo_inicio : 'aprov',
    endereco_obra: o.endereco_obra.trim().slice(0, 200),
    observacoes: o.observacoes.trim().slice(0, 3000),
  };

  let id = o.id, numero: string | undefined;
  if (id) {
    const { data: atual } = await sb.from('orcamentos').select('status').eq('id', id).single();
    if (!atual || !['rascunho', 'enviado'].includes(atual.status)) return { erro: 'Orçamento aprovado ou recusado não pode ser alterado.' };
    const { error } = await sb.from('orcamentos').update(linha).eq('id', id);
    if (error) return { erro: 'Não foi possível salvar.' };
  } else {
    const { data: num, error: e1 } = await sb.rpc('proximo_numero', { p_chave: 'ORC' });
    if (e1 || !num) return { erro: 'Não foi possível numerar o orçamento.' };
    const { data, error } = await sb.from('orcamentos').insert({ ...linha, numero: num, status: 'rascunho' }).select('id,numero').single();
    if (error || !data) return { erro: 'Não foi possível salvar.' };
    id = data.id; numero = data.numero;
  }

  // Custo dos materiais vem do banco (não do navegador), para o cálculo de lucro ser confiável.
  const matIds = itens.map((i) => i.material_id).filter(Boolean) as string[];
  const { data: mats } = matIds.length ? await sb.from('materiais').select('id,custo').in('id', matIds) : { data: [] as { id: string; custo: number }[] };
  const custo = Object.fromEntries((mats ?? []).map((m) => [m.id, Number(m.custo)]));
  await sb.from('orcamento_itens').delete().eq('orcamento_id', id!);
  const { error: eI } = await sb.from('orcamento_itens').insert(itens.map((i, ordem) => ({
    orcamento_id: id, ordem, tipo: i.tipo === 'material' ? 'material' : 'servico',
    material_id: i.tipo === 'material' ? i.material_id : null,
    descricao: i.descricao.trim().slice(0, 300), quantidade: Math.max(0, n(i.quantidade)),
    unidade: UNIDADES.some((u) => u[0] === i.unidade) ? i.unidade : 'un', valor_unit: Math.max(0, n(i.valor_unit)),
    custo_unit: i.material_id ? custo[i.material_id] ?? 0 : 0,
  })));
  if (eI) return { erro: 'Os itens não foram salvos. Tente de novo.' };
  revalidatePath('/admin', 'layout');
  return { ok: 'Orçamento salvo.', id, numero };
}

export async function marcarEnviado(id: string): Promise<R> {
  if (!(await adminAtual())) return { erro: 'Sessão expirada.' };
  const sb = await supabaseServidor();
  const { data: o } = await sb.from('orcamentos').select('status,cliente_id,token_publico').eq('id', id).single();
  if (!o) return { erro: 'Orçamento não encontrado.' };
  if (o.status === 'rascunho') {
    await sb.from('orcamentos').update({ status: 'enviado' }).eq('id', id);
    await sb.from('clientes').update({ status: 'orcamento' }).eq('id', o.cliente_id).in('status', ['novo', 'contato']);
  }
  revalidatePath('/admin', 'layout');
  return { ok: 'Marcado como enviado.', token: o.token_publico };
}

export async function aprovarAdmin(id: string): Promise<R> {
  if (!(await adminAtual())) return { erro: 'Sessão expirada.' };
  const sb = await supabaseServidor();
  const { error } = await sb.rpc('aprovar_orcamento', { p_orc: id });
  if (error) return { erro: error.message };
  revalidatePath('/admin', 'layout');
  return { ok: 'Aprovado. A ordem de serviço e as parcelas foram criadas.' };
}

export async function recusar(id: string): Promise<R> {
  if (!(await adminAtual())) return { erro: 'Sessão expirada.' };
  const sb = await supabaseServidor();
  const { data: o } = await sb.from('orcamentos').select('status,cliente_id').eq('id', id).single();
  if (!o || !['rascunho', 'enviado'].includes(o.status)) return { erro: 'Este orçamento não pode ser recusado.' };
  await sb.from('orcamentos').update({ status: 'recusado' }).eq('id', id);
  await sb.from('clientes').update({ status: 'perdido' }).eq('id', o.cliente_id);
  revalidatePath('/admin', 'layout');
  return { ok: 'Marcado como recusado.' };
}

export async function excluirRascunho(id: string): Promise<R> {
  if (!(await adminAtual())) return { erro: 'Sessão expirada.' };
  const sb = await supabaseServidor();
  const { error } = await sb.from('orcamentos').delete().eq('id', id).eq('status', 'rascunho');
  revalidatePath('/admin', 'layout');
  return error ? { erro: 'Não foi possível excluir.' } : { ok: 'Rascunho excluído.' };
}
