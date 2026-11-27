import Link from 'next/link';
import { supabaseServidor } from '@/lib/supabase/server';
import { STATUS_ORC, brl, dataBR, diasTxt, validoAte, hojeISO } from '@/lib/negocio';

export default async function Orcamentos({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status = 'todos' } = await searchParams;
  const sb = await supabaseServidor();
  const { data } = await sb.from('orcamentos')
    .select('id,numero,revisao,contestacao_pendente,data,validade_dias,condicao,desconto,prazo_qtd,prazo_unidade,prazo_inicio,status,clientes(nome),orcamento_itens(descricao,quantidade,valor_unit,ordem)')
    .order('criado_em', { ascending: false });
  type L = { id: string; numero: string; revisao: number; contestacao_pendente: boolean; data: string; validade_dias: number; desconto: number; status: string; clientes: { nome: string } | null; orcamento_itens: { descricao: string; quantidade: number; valor_unit: number; ordem: number }[] };
  const todos = (data ?? []) as unknown as L[];
  const lista = todos.filter((o) => status === 'todos' || o.status === status);
  const hoje = hojeISO();
  const total = (o: L) => Math.max(0, o.orcamento_itens.reduce((s, i) => s + Number(i.quantidade) * Number(i.valor_unit), 0) - Number(o.desconto));
  return (
    <>
      <div className="ph"><div><h1>Orçamentos</h1><p className="lead">Monte a proposta com mão de obra e materiais do estoque</p></div><Link className="btn btn-p" href="/admin/orcamentos/novo">+ Novo orçamento</Link></div>
      <div className="chips">
        {['todos', ...Object.keys(STATUS_ORC)].map((k) => (
          <Link key={k} href={k === 'todos' ? '/admin/orcamentos' : `/admin/orcamentos?status=${k}`} className={`chip ${status === k ? 'on' : ''}`} style={{ textDecoration: 'none' }}>
            {k === 'todos' ? 'Todos' : STATUS_ORC[k][0]} <span>{k === 'todos' ? todos.length : todos.filter((o) => o.status === k).length}</span>
          </Link>
        ))}
      </div>
      <div className="card">
        {lista.length === 0 ? <p className="sub">{todos.length ? 'Nenhum orçamento neste status.' : 'Nenhum orçamento ainda. Crie o primeiro em “+ Novo orçamento” ou pelo botão “Criar orçamento” de um cliente.'}</p> : (
          <div className="tw"><table className="tbl stk-t mv-t" style={{ minWidth: 760 }}>
            <thead><tr><th>Número</th><th>Cliente</th><th>Emissão</th><th>Validade</th><th className="r">Total</th><th>Status</th><th></th></tr></thead>
            <tbody>{lista.map((o) => {
              const ate = validoAte({ ...o, condicao: '', prazo_qtd: null, prazo_unidade: '', prazo_inicio: '' });
              const vencido = o.status === 'enviado' && hoje > ate;
              const primeiro = [...o.orcamento_itens].sort((a, b) => a.ordem - b.ordem)[0];
              return (
                <tr key={o.id}>
                  <td className="mono" data-label="Número"><b>{o.numero}</b>{o.revisao > 0 && <div className="sub">rev. {o.revisao}</div>}</td>
                  <td data-label="Cliente">{o.clientes?.nome ?? '—'}<div className="sub">{primeiro?.descricao ?? ''}</div></td>
                  <td className="mono" data-label="Emissão">{dataBR(o.data)}</td>
                  <td data-label="Validade">até <span className="mono">{dataBR(ate)}</span><div className="sub">{diasTxt(o.validade_dias)}{vencido && <> · <span className="pill t-bad">vencido</span></>}</div></td>
                  <td className="r mono" data-label="Total"><b>{brl(total(o))}</b></td>
                  <td data-label="Status"><span className={`pill t-${STATUS_ORC[o.status][1]}`}>{STATUS_ORC[o.status][0]}</span>{o.contestacao_pendente && o.status === 'enviado' && <div style={{ marginTop: 4 }}><span className="pill t-warn">Pediu alteração</span></div>}</td>
                  <td className="r c-act" data-label=""><Link className="btn btn-s" href={`/admin/orcamentos/${o.id}`}>Abrir</Link></td>
                </tr>
              );
            })}</tbody>
          </table></div>
        )}
      </div>
    </>
  );
}
