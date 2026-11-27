import { supabaseServidor } from '@/lib/supabase/server';
import Estoque, { type Material, type Mov } from './Estoque';

export default async function PaginaEstoque() {
  const sb = await supabaseServidor();
  const [mats, movs, srv] = await Promise.all([
    sb.from('materiais').select('id,codigo,nome,categoria,unidade,quantidade,minimo,custo,preco,local,fornecedor').eq('ativo', true).order('nome'),
    sb.from('movimentacoes').select('id,material_id,tipo,quantidade,data,observacao,criado_em').order('criado_em', { ascending: false }).limit(300),
    sb.from('servicos').select('numero,orcamento_id').neq('status', 'concluido').eq('baixa_feita', false),
  ]);
  // Reservas: materiais de serviços abertos que ainda não saíram do estoque
  const reservas: Record<string, { q: number; os: string[] }> = {};
  const orcIds = (srv.data ?? []).map((s) => s.orcamento_id).filter(Boolean) as string[];
  if (orcIds.length) {
    const { data: itens } = await sb.from('orcamento_itens').select('orcamento_id,material_id,quantidade').in('orcamento_id', orcIds).eq('tipo', 'material');
    for (const i of itens ?? []) {
      if (!i.material_id) continue;
      const os = (srv.data ?? []).find((s) => s.orcamento_id === i.orcamento_id)?.numero ?? '';
      const r = (reservas[i.material_id] ??= { q: 0, os: [] });
      r.q += Number(i.quantidade); if (os && !r.os.includes(os)) r.os.push(os);
    }
  }
  const usos: Record<string, string[]> = {};
  const { data: usados } = await sb.from('orcamento_itens').select('material_id,orcamentos(numero)').eq('tipo', 'material').not('material_id', 'is', null);
  for (const u of (usados ?? []) as unknown as { material_id: string; orcamentos: { numero: string } | null }[]) {
    const num = u.orcamentos?.numero; if (!num) continue;
    (usos[u.material_id] ??= []).includes(num) || usos[u.material_id].push(num);
  }
  const num = (v: unknown) => Number(v) || 0;
  return (
    <Estoque
      materiais={(mats.data ?? []).map((m) => ({ ...m, quantidade: num(m.quantidade), minimo: num(m.minimo), custo: num(m.custo), preco: num(m.preco) })) as Material[]}
      movs={(movs.data ?? []).map((v) => ({ ...v, quantidade: num(v.quantidade) })) as Mov[]}
      reservas={reservas} usos={usos}
    />
  );
}
