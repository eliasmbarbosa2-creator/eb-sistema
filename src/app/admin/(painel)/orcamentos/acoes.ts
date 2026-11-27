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

  let id = o.id, numero: string | undefined, token: string | undefined;
  if (id) {
    // Só altera se ainda estiver em rascunho/enviado (aprovado ou recusado fica travado).
    const { data: atual, error } = await sb.from('orcamentos').update(linha).eq('id', id).eq('status', 'rascunho').select('numero,token_publico').maybeSingle();
    if (error) return { erro: 'Não foi possível salvar.' };
    if (!atual) return { erro: 'Este orçamento já foi enviado. Para alterar, use “Revisar orçamento”: a versão enviada fica guardada no histórico.' };
    numero = atual.numero; token = atual.token_publico;
  } else {
    const { data: num, error: e1 } = await sb.rpc('proximo_numero', { p_chave: 'ORC' });
    if (e1 || !num) return { erro: 'Não foi possível numerar o orçamento.' };
    const { data, error } = await sb.from('orcamentos').insert({ ...linha, numero: num, status: 'rascunho' }).select('id,numero,token_publico').single();
    if (error || !data) return { erro: 'Não foi possível salvar.' };
    id = data.id; numero = data.numero; token = data.token_publico;
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
  return { ok: 'Orçamento salvo.', id, numero, token };
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

export async function recusar(id: string, motivo = ''): Promise<R> {
  if (!(await adminAtual())) return { erro: 'Sessão expirada.' };
  const sb = await supabaseServidor();
  const { data: o } = await sb.from('orcamentos').select('status,cliente_id,revisao').eq('id', id).single();
  if (!o || !['rascunho', 'enviado'].includes(o.status)) return { erro: 'Este orçamento não pode ser recusado.' };
  await sb.from('orcamentos').update({ status: 'recusado', contestacao_pendente: false }).eq('id', id);
  await sb.from('clientes').update({ status: 'perdido' }).eq('id', o.cliente_id);
  await sb.from('orcamento_interacoes').insert({ orcamento_id: id, revisao: o.revisao, tipo: 'recusa', origem: 'admin', mensagem: motivo.trim().slice(0, 1500) });
  revalidatePath('/admin', 'layout');
  return { ok: 'Marcado como recusado.' };
}

export async function revisar(id: string): Promise<R> {
  if (!(await adminAtual())) return { erro: 'Sessão expirada.' };
  const sb = await supabaseServidor();
  const { error } = await sb.rpc('revisar_orcamento', { p_orc: id });
  if (error) return { erro: error.message.includes('só orçamentos') ? 'Só orçamentos enviados ou recusados podem ser revisados.' : 'Não foi possível abrir a revisão.' };
  revalidatePath('/admin', 'layout');
  return { ok: 'Nova revisão aberta. A versão anterior está no histórico.' };
}

export async function excluirOrcamento(id: string, devolver = false): Promise<R> {
  if (!(await adminAtual())) return { erro: 'Sessão expirada.' };
  const sb = await supabaseServidor();
  const { error } = await sb.rpc('excluir_orcamento', { p_orc: id, p_devolver: devolver });
  if (error) {
    const m = error.message;
    if (m.includes('pagamento')) return { erro: `Não dá para excluir: ${m.replace(/^.*?tem/, 'tem')}. Desfaça o pagamento no Financeiro antes.` };
    if (m.includes('estoque')) return { erro: `Não dá para excluir: ${m.replace(/^.*?o material/, 'o material')}. Marque “devolver os materiais ao estoque” para excluir.` };
    return { erro: 'Não foi possível excluir.' };
  }
  revalidatePath('/admin', 'layout');
  return { ok: 'Orçamento excluído.' };
}
