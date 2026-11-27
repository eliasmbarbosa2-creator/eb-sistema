'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { registrarPagamento, desfazerPagamento } from './acoes';
import { brl, dataBR, diasEntre, hojeISO, linkWhatsAppPara } from '@/lib/negocio';

export type Parcela = {
  id: string; descricao: string; vencimento: string; valor: number; pago: boolean; pago_em: string | null; forma: string;
  servicos: { numero: string; titulo: string; clientes: { nome: string; telefone: string } | null } | null;
};
const FORMAS = ['Pix', 'Dinheiro', 'Transferência', 'Cartão de crédito', 'Cartão de débito', 'Boleto'];

export default function Financeiro({ parcelas }: { parcelas: Parcela[] }) {
  const router = useRouter();
  const hoje = hojeISO();
  const [f, setF] = useState<'aberto' | 'atrasado' | 'pago' | 'todos'>('todos');
  const [pagar, setPagar] = useState<Parcela | null>(null);
  const [msg, setMsg] = useState<{ t: 'ok' | 'bad'; s: string } | null>(null);
  const [ocupado, iniciar] = useTransition();
  const atrasada = (p: Parcela) => !p.pago && p.vencimento < hoje;
  const pred = { todos: () => true, aberto: (p: Parcela) => !p.pago && !atrasada(p), atrasado: atrasada, pago: (p: Parcela) => p.pago };
  const soma = (fn: (p: Parcela) => boolean) => parcelas.filter(fn).reduce((s, p) => s + p.valor, 0);
  const mes = hoje.slice(0, 7);
  const recebidoMes = parcelas.filter((p) => p.pago && (p.pago_em ?? '').startsWith(mes)).reduce((s, p) => s + p.valor, 0);
  const lista = parcelas.filter(pred[f]).sort((a, b) => (f === 'pago' ? (b.pago_em ?? '').localeCompare(a.pago_em ?? '') : a.vencimento.localeCompare(b.vencimento)));
  const fim = (r: { ok?: string; erro?: string }) => { setMsg(r.erro ? { t: 'bad', s: r.erro } : { t: 'ok', s: r.ok ?? '' }); setPagar(null); router.refresh(); };
  const cobrar = (p: Parcela) => {
    const c = p.servicos?.clientes; if (!c?.telefone) return null;
    const quando = p.vencimento < hoje ? `que venceu em ${dataBR(p.vencimento)}` : p.vencimento === hoje ? 'que vence hoje' : `com vencimento em ${dataBR(p.vencimento)}`;
    return linkWhatsAppPara(c.telefone, `Olá, ${c.nome.split(' ')[0]}! Tudo bem? Passando para lembrar da parcela "${p.descricao}" do serviço ${p.servicos?.numero}, no valor de ${brl(p.valor)}, ${quando}. Qualquer dúvida, estou à disposição.`);
  };
  const rot = { todos: 'Todas', aberto: 'A vencer', atrasado: 'Atrasadas', pago: 'Pagas' } as const;

  return (
    <>
      <div className="ph"><div><h1>Financeiro</h1><p className="lead">Parcelas criadas automaticamente quando um orçamento é aprovado</p></div></div>
      <div className="tiles">
        <div className="tile"><span className="eyebrow">Recebido este mês</span><span className="v pos">{brl(recebidoMes)}</span><span className="sub">total já recebido: {brl(soma(pred.pago))}</span></div>
        <div className="tile"><span className="eyebrow">A vencer</span><span className="v">{brl(soma(pred.aberto))}</span><span className="sub">{parcelas.filter(pred.aberto).length} parcela(s)</span></div>
        <div className={`tile ${soma(atrasada) ? 'alert' : ''}`}><span className="eyebrow">Em atraso</span><span className="v">{brl(soma(atrasada))}</span><span className="sub">{parcelas.filter(atrasada).length} parcela(s)</span></div>
        <div className="tile"><span className="eyebrow">Total a receber</span><span className="v">{brl(soma((p) => !p.pago))}</span><span className="sub">a vencer + em atraso</span></div>
      </div>
      <div className="chips">{(Object.keys(rot) as (keyof typeof rot)[]).map((k) => <button key={k} className={`chip ${f === k ? 'on' : ''}`} onClick={() => setF(k)}>{rot[k]} <span>{parcelas.filter(pred[k]).length}</span></button>)}</div>
      {msg && <div className={`banner t-${msg.t}`} role="status">{msg.s}</div>}
      <div className="card">
        {lista.length === 0 ? <p className="sub">{parcelas.length ? 'Nenhuma parcela aqui.' : 'Nenhuma parcela ainda. Elas são criadas quando um orçamento é aprovado.'}</p> : (
          <div className="tw"><table className="tbl stk-t mv-t" style={{ minWidth: 800 }}>
            <thead><tr><th>Vencimento</th><th>Cliente / serviço</th><th>Parcela</th><th className="r">Valor</th><th>Situação</th><th></th></tr></thead>
            <tbody>{lista.map((p) => {
              const z = !p.pago ? cobrar(p) : null;
              return (
                <tr key={p.id}>
                  <td className="mono" data-label="Vencimento">{dataBR(p.vencimento)}</td>
                  <td data-label="Cliente / serviço"><b>{p.servicos?.clientes?.nome ?? '—'}</b><div className="sub">{p.servicos?.numero} · {p.servicos?.titulo}</div></td>
                  <td data-label="Parcela">{p.descricao}</td>
                  <td className="r mono" data-label="Valor"><b>{brl(p.valor)}</b></td>
                  <td data-label="Situação">{p.pago ? <><span className="pill t-ok">Pago</span><div className="sub">{dataBR(p.pago_em)} · {p.forma}</div></>
                    : atrasada(p) ? <span className="pill t-bad">Atrasada {diasEntre(p.vencimento, hoje)} d</span> : p.vencimento === hoje ? <span className="pill t-warn">Vence hoje</span> : <span className="pill t-info">A vencer</span>}</td>
                  <td className="r c-act" data-label=""><div className="rowact">
                    {p.pago ? <button className="btn btn-s btn-g" disabled={ocupado} onClick={() => iniciar(async () => fim(await desfazerPagamento(p.id)))}>Desfazer</button> : <>
                      {z ? <a className={`btn btn-s ${atrasada(p) ? 'btn-warn' : ''}`} href={z} target="_blank" rel="noopener">{atrasada(p) ? 'Cobrar no WhatsApp' : 'Lembrar no WhatsApp'}</a>
                        : <span className="sub" title="Cadastre o telefone do cliente">sem telefone</span>}
                      <button className="btn btn-s btn-p" onClick={() => setPagar(p)}>Registrar pagamento</button></>}
                  </div></td>
                </tr>
              );
            })}</tbody>
          </table></div>
        )}
      </div>

      {pagar && (
        <div id="modal" onClick={(e) => e.target === e.currentTarget && setPagar(null)}>
          <div className="mbox" role="dialog" aria-modal="true">
            <form className="fgrid" onSubmit={(e) => { e.preventDefault(); const d = new FormData(e.currentTarget); iniciar(async () => fim(await registrarPagamento(pagar.id, String(d.get('data')), String(d.get('forma'))))); }}>
              <div className="mh span2"><h2>Registrar pagamento</h2><button type="button" className="x" onClick={() => setPagar(null)} aria-label="Fechar">×</button></div>
              <p className="span2"><b>{brl(pagar.valor)}</b> · {pagar.descricao}<br /><span className="sub">{pagar.servicos?.clientes?.nome} · {pagar.servicos?.numero}</span></p>
              <label className="fld"><span>Data do pagamento</span><input name="data" type="date" defaultValue={hoje} required /></label>
              <label className="fld"><span>Forma</span><select name="forma">{FORMAS.map((x) => <option key={x}>{x}</option>)}</select></label>
              <div className="mfoot span2"><button type="button" className="btn btn-g" onClick={() => setPagar(null)}>Cancelar</button><button className="btn btn-ok" disabled={ocupado}>Confirmar recebimento</button></div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
