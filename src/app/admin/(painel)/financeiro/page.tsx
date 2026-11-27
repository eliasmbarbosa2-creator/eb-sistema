import { supabaseServidor } from '@/lib/supabase/server';
import Financeiro, { type Parcela } from './Financeiro';

export default async function PaginaFinanceiro() {
  const sb = await supabaseServidor();
  const { data } = await sb.from('parcelas')
    .select('id,descricao,vencimento,valor,pago,pago_em,forma,servicos(numero,titulo,clientes(nome,telefone))')
    .order('vencimento');
  return <Financeiro parcelas={(data ?? []).map((p) => ({ ...p, valor: Number(p.valor) })) as unknown as Parcela[]} />;
}
