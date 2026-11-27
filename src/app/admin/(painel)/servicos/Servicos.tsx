'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { mudarStatusServico, darBaixa, salvarServico, concluirSemBaixa } from './acoes';
import { brl, num, dataBR, fmtQtd, hojeISO, linkWhatsAppPara } from '@/lib/negocio';

export type Srv = {
  id: string; numero: string; titulo: string; endereco: string; inicio: string | null; status: string; baixa_feita: boolean; notas: string; orcamento_id: string | null;
  clientes: { nome: string; telefone: string } | null;
  orcamentos: { id: string; numero: string; orcamento_itens: { tipo: string; material_id: string | null; descricao: string; quantidade: number; unidade: string; ordem: number }[] } | null;
  parcelas: { valor: number; pago: boolean; vencimento: string }[];
};
const ETAPAS: [string, string][] = [['agendado', 'Agendado'], ['execucao', 'Em execução'], ['concluido', 'Concluído']];
const ORDEM: Record<string, number> = { execucao: 0, agendado: 1, concluido: 2 };

export default function Servicos({ lista, estoque }: { lista: Srv[]; estoque: Record<string, number> }) {
  const router = useRouter();
  const [filtro, setFiltro] = useState<'abertos' | 'concluido' | 'todos'>('abertos');
  const [msg, setMsg] = useState<{ t: 'ok' | 'bad' | 'warn'; s: string } | null>(null);
  const [falta, setFalta] = useState<{ numero: string; itens: { nome: string; precisa: number; tem: number; unidade: string }[] } | null>(null);
  const [editar, setEditar] = useState<Srv | null>(null);
  const [concluir, setConcluir] = useState<Srv | null>(null);
  const [ocupado, iniciar] = useTransition();
  const hoje = hojeISO();

  const vis = lista.filter((s) => filtro === 'todos' || (filtro === 'concluido' ? s.status === 'concluido' : s.status !== 'concluido'))
    .sort((a, b) => ORDEM[a.status] - ORDEM[b.status] || (a.inicio ?? '').localeCompare(b.inicio ?? ''));
  const contar = (f: typeof filtro) => lista.filter((s) => f === 'todos' || (f === 'concluido' ? s.status === 'concluido' : s.status !== 'concluido')).length;
  const refrescar = (r: { ok?: string; erro?: string }) => { setMsg(r.erro ? { t: 'bad', s: r.erro } : { t: 'ok', s: r.ok ?? '' }); router.refresh(); };

  return (
    <>
      <div className="ph"><div><h1>Serviços</h1><p className="lead">Ordens de serviço abertas a partir de orçamentos aprovados</p></div></div>
      <div className="chips">{([['abertos', 'Em aberto'], ['concluido', 'Concluídos'], ['todos', 'Todos']] as const).map(([k, l]) => <button key={k} className={`chip ${filtro === k ? 'on' : ''}`} onClick={() => setFiltro(k)}>{l} <span>{contar(k)}</span></button>)}</div>
      {msg && <div className={`banner t-${msg.t}`} role="status">{msg.s}</div>}
      {vis.length === 0 ? (
        <div className="card"><p className="sub">{lista.length ? 'Nenhum serviço aqui.' : 'Nenhum serviço ainda. Quando um orçamento é aprovado (por você ou pelo cliente no link), a ordem de serviço aparece aqui.'}</p></div>
      ) : (
        <div className="srvs">{vis.map((s) => {
          const mats = (s.orcamentos?.orcamento_itens ?? []).filter((i) => i.tipo === 'material').sort((a, b) => a.ordem - b.ordem);
          const T = s.parcelas.reduce((a, p) => a + Number(p.valor), 0), pg = s.parcelas.filter((p) => p.pago).reduce((a, p) => a + Number(p.valor), 0);
          const atraso = s.parcelas.some((p) => !p.pago && p.vencimento < hoje);
          const idx = ETAPAS.findIndex(([k]) => k === s.status);
          return (
            <article className="card srv" key={s.id}>
              <div className="srv-h">
                <div><div className="mono sub">{s.numero}{s.orcamentos && <> · <Link className="link" href={`/admin/orcamentos/${s.orcamentos.id}`}>{s.orcamentos.numero}</Link></>}</div>
                  <h3>{s.titulo}</h3><div className="sub">{s.clientes?.nome}{s.endereco && ` · ${s.endereco}`}</div></div>
                <button className="btn btn-s" onClick={() => setEditar(s)}>Editar</button>
              </div>
              <div className="stepper" role="group" aria-label="Status do serviço">
                {ETAPAS.map(([k, l], i) => (
                  <button key={k} className={`stp ${i < idx ? 'done' : ''} ${i === idx ? 'cur' : ''}`} aria-pressed={i === idx} disabled={ocupado}
                    onClick={() => { if (k === 'concluido' && !s.baixa_feita && mats.length) { setConcluir(s); return; } iniciar(async () => { const r = await mudarStatusServico(s.id, k); refrescar(r);
                      if (!r.erro && k === 'execucao' && !s.baixa_feita && mats.length) setMsg({ t: 'warn', s: `${s.numero} em execução. Lembre de retirar os materiais do estoque.` }); }); }}>{l}</button>
                ))}
              </div>
              <div className="srv-b">
                <div><div className="eyebrow">Materiais do orçamento</div>
                  <ul className="ml">{mats.length ? mats.map((i, k) => {
                    const tem = i.material_id ? estoque[i.material_id] : undefined; const curto = !s.baixa_feita && tem !== undefined && tem < Number(i.quantidade);
                    return <li key={k}><span>{i.descricao}</span><span className={`mono ${curto ? 'short' : ''}`}>{fmtQtd(Number(i.quantidade), i.unidade)}{!s.baixa_feita && tem !== undefined && <small> / {num(tem)}</small>}</span></li>;
                  }) : <li className="sub">Sem materiais do estoque</li>}</ul>
                  {mats.length > 0 && (s.baixa_feita ? <div className="okline">✓ Retirados do estoque</div> :
                    <button className="btn btn-s" disabled={ocupado} onClick={() => iniciar(async () => { const r = await darBaixa(s.id); if (r.falta) setFalta({ numero: s.numero, itens: r.falta }); else refrescar(r); })}>Retirar materiais do estoque</button>)}
                </div>
                <div><div className="eyebrow">Pagamento</div>
                  <div className="meter"><i style={{ width: `${T ? (pg / T) * 100 : 0}%` }} /></div>
                  <div className="sub"><b style={{ color: 'var(--ink)' }}>{brl(pg)}</b> de {brl(T)}</div>
                  {atraso && <div style={{ marginTop: 6 }}><span className="pill t-bad">parcela atrasada</span></div>}
                  <div style={{ marginTop: 8 }}><Link className="link" href="/admin/financeiro">Ver parcelas →</Link></div>
                </div>
              </div>
              <div className="sub">Início previsto: {dataBR(s.inicio)}{s.clientes?.telefone && <> · <a className="link" href={linkWhatsAppPara(s.clientes.telefone, `Olá, ${s.clientes.nome.split(' ')[0]}! Sobre o serviço ${s.numero}: `)} target="_blank" rel="noopener">WhatsApp do cliente</a></>}</div>
              {s.notas && <p className="msg-c">{s.notas}</p>}
            </article>
          );
        })}</div>
      )}

      {(falta || editar || concluir) && (
        <div id="modal" onClick={(e) => { if (e.target === e.currentTarget) { setFalta(null); setEditar(null); setConcluir(null); } }}>
          <div className="mbox" role="dialog" aria-modal="true">
            {concluir && !falta && (<>
              <div className="mh"><h2>Concluir {concluir.numero}?</h2><button className="x" onClick={() => setConcluir(null)} aria-label="Fechar">×</button></div>
              <p className="banner t-warn">Os materiais deste serviço <b>ainda não foram retirados do estoque</b>. O que aconteceu?</p>
              <div className="escolhas">
                <button className="btn btn-p" disabled={ocupado} onClick={() => iniciar(async () => {
                  const b = await darBaixa(concluir.id);
                  if (b.falta) { setFalta({ numero: concluir.numero, itens: b.falta }); setConcluir(null); return; }
                  if (b.erro) { refrescar(b); return; }
                  const r = await mudarStatusServico(concluir.id, 'concluido'); setConcluir(null); refrescar(r.erro ? r : { ok: 'Materiais retirados do estoque e serviço concluído.' }); })}>
                  <b>Usei os materiais:</b> retirar do estoque e concluir</button>
                <button className="btn" disabled={ocupado} onClick={() => iniciar(async () => { const r = await concluirSemBaixa(concluir.id); setConcluir(null); refrescar(r); })}>
                  <b>Os materiais não saíram do estoque:</b> concluir sem alterar o estoque</button>
                <button className="btn btn-g" onClick={() => setConcluir(null)}>Cancelar</button>
              </div>
              <p className="sub">Se escolher concluir sem alterar o estoque, isso fica registrado nas anotações da OS.</p>
            </>)}
            {falta && (<>
              <div className="mh"><h2>Estoque insuficiente</h2><button className="x" onClick={() => setFalta(null)} aria-label="Fechar">×</button></div>
              <p>Para {falta.numero} faltam os materiais abaixo. Nada foi retirado.</p>
              <ul className="ml">{falta.itens.map((i) => <li key={i.nome}><span>{i.nome}</span><span className="mono short">precisa {num(i.precisa)} · tem {num(i.tem)} {i.unidade}</span></li>)}</ul>
              <p className="sub">Registre a entrada da compra no Estoque (ou use a Lista de compras) e tente de novo.</p>
              <div className="mfoot"><Link className="btn btn-p" href="/admin/estoque">Ir para o Estoque</Link></div>
            </>)}
            {editar && (
              <form className="fgrid" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); const v = (k: string) => String(f.get(k) ?? '');
                iniciar(async () => { const r = await salvarServico(editar.id, { titulo: v('titulo'), endereco: v('endereco'), inicio: v('inicio'), notas: v('notas') }); if (!r.erro) setEditar(null); refrescar(r); }); }}>
                <div className="mh span2"><h2>{editar.numero}</h2><button type="button" className="x" onClick={() => setEditar(null)} aria-label="Fechar">×</button></div>
                <label className="fld span2"><span>Título</span><input name="titulo" defaultValue={editar.titulo} required /></label>
                <label className="fld span2"><span>Endereço da obra</span><input name="endereco" defaultValue={editar.endereco} /></label>
                <label className="fld"><span>Início previsto</span><input name="inicio" type="date" defaultValue={editar.inicio ?? ''} /></label>
                <label className="fld span2"><span>Anotações</span><textarea name="notas" rows={3} defaultValue={editar.notas} placeholder="Ex.: chave com o síndico; levar escada de 6 m" /></label>
                <div className="mfoot span2"><button type="button" className="btn btn-g" onClick={() => setEditar(null)}>Cancelar</button><button className="btn btn-p" disabled={ocupado}>Salvar</button></div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
