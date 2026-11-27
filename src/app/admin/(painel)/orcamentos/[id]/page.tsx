import { notFound } from 'next/navigation';
import { supabaseServidor } from '@/lib/supabase/server';
import { dadosEditor } from '../dados';
import Editor from '../Editor';

export default async function EditarOrcamento({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = await supabaseServidor();
  const [{ data: o }, d, { data: os }] = await Promise.all([
    sb.from('orcamentos').select('*, orcamento_itens(*)').eq('id', id).maybeSingle(),
    dadosEditor(),
    sb.from('servicos').select('numero').eq('orcamento_id', id).maybeSingle(),
  ]);
  if (!o) notFound();
  type I = { ordem: number; tipo: 'servico' | 'material'; material_id: string | null; descricao: string; quantidade: number; unidade: string; valor_unit: number; custo_unit: number };
  const itens = ((o.orcamento_itens ?? []) as I[]).sort((a, b) => a.ordem - b.ordem)
    .map((i) => ({ tipo: i.tipo, material_id: i.material_id, descricao: i.descricao, quantidade: Number(i.quantidade), unidade: i.unidade, valor_unit: Number(i.valor_unit), custo_unit: Number(i.custo_unit) }));
  return (
    <Editor {...d} osNumero={os?.numero} inicial={{
      id: o.id, numero: o.numero, token: o.token_publico, cliente_id: o.cliente_id, data: o.data, validade_dias: o.validade_dias, condicao: o.condicao,
      desconto: Number(o.desconto), prazo_qtd: o.prazo_qtd == null ? null : Number(o.prazo_qtd), prazo_unidade: o.prazo_unidade, prazo_inicio: o.prazo_inicio,
      endereco_obra: o.endereco_obra, observacoes: o.observacoes, status: o.status, aprovado_em: o.aprovado_em, itens,
    }} />
  );
}
