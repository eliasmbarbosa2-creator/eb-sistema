import { supabaseServidor } from '@/lib/supabase/server';
import Servicos, { type Srv } from './Servicos';

export default async function PaginaServicos() {
  const sb = await supabaseServidor();
  const { data } = await sb.from('servicos')
    .select('id,numero,titulo,endereco,inicio,status,baixa_feita,notas,orcamento_id,clientes(nome,telefone),orcamentos(id,numero,orcamento_itens(tipo,material_id,descricao,quantidade,unidade,ordem)),parcelas(valor,pago,vencimento)')
    .order('criado_em', { ascending: false });
  const { data: mats } = await sb.from('materiais').select('id,quantidade,unidade');
  const estoque = Object.fromEntries((mats ?? []).map((m) => [m.id, Number(m.quantidade)]));
  return <Servicos lista={(data ?? []) as unknown as Srv[]} estoque={estoque} />;
}
