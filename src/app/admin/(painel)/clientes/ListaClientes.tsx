'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import StatusCliente from './StatusCliente';
import NovoCliente from './NovoCliente';
import { excluirClientes } from '../../acoes';
import { dataHoraBR } from '@/lib/rotulos';
import { ehUrgente } from '@/lib/conteudo';

export type Cliente = {
  id: string; nome: string; telefone: string; email: string; documento: string; endereco: string; cidade: string; tipo: string;
  servico: string; mensagem: string; urgencia: string; horario: string; origem: string; status: string; criado_em: string;
};
export type Resumo = { orcamentos: number; servicos: number; parcelas: number; pagas: number; retirado: number };
const VAZIO: Resumo = { orcamentos: 0, servicos: 0, parcelas: 0, pagas: 0, retirado: 0 };
const wa = (t: string) => { let d = t.replace(/\D/g, ''); if (d.length <= 11) d = '55' + d; return `https://wa.me/${d}`; };
const pl = (n: number, s: string, p: string) => `${n} ${n === 1 ? s : p}`;

export default function ListaClientes({ lista, resumo }: { lista: Cliente[]; resumo: Record<string, Resumo> }) {
  const router = useRouter();
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [modo, setModo] = useState(false);
  const [excluir, setExcluir] = useState<string[] | null>(null);
  const [devolver, setDevolver] = useState(true);
  const [apagarPagos, setApagarPagos] = useState(false);
  const [msg, setMsg] = useState<{ t: 'ok' | 'bad'; s: string } | null>(null);
  const [ocupado, iniciar] = useTransition();

  const alternar = (id: string) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const abrirExclusao = (ids: string[]) => { setExcluir(ids); setDevolver(true); setApagarPagos(false); setMsg(null); };
  const tot = (excluir ?? []).reduce((a, id) => { const r = resumo[id] ?? VAZIO; return { orcamentos: a.orcamentos + r.orcamentos, servicos: a.servicos + r.servicos, parcelas: a.parcelas + r.parcelas, pagas: a.pagas + r.pagas, retirado: a.retirado + r.retirado }; }, VAZIO);
  const nomes = (excluir ?? []).map((id) => lista.find((c) => c.id === id)?.nome).filter(Boolean) as string[];

  return (
    <>
      <div className="row" style={{ flexWrap: 'wrap' }}>
        <span className="sub">{lista.length} {lista.length === 1 ? 'cliente' : 'clientes'}</span>
        {!modo ? <button className="btn btn-s" onClick={() => setModo(true)}>Selecionar para excluir</button> : (
          <div className="actions">
            <button className="btn btn-s" onClick={() => setSel(sel.size === lista.length ? new Set() : new Set(lista.map((c) => c.id)))}>{sel.size === lista.length ? 'Desmarcar todos' : 'Marcar todos desta lista'}</button>
            <button className="btn btn-s btn-g" onClick={() => { setModo(false); setSel(new Set()); }}>Cancelar seleção</button>
          </div>
        )}
      </div>
      {msg && <div className={`banner t-${msg.t}`} role="status">{msg.s}</div>}

      <div className="clist">
        {lista.map((c) => (
          <details className={`card ccard ${sel.has(c.id) ? 'sel' : ''}`} key={c.id} open={!modo && c.status === 'novo'}>
            <summary>
              {modo && <input type="checkbox" className="ccheck" checked={sel.has(c.id)} onChange={() => alternar(c.id)} onClick={(e) => e.stopPropagation()} aria-label={`Selecionar ${c.nome}`} />}
              <div className="cc-main"><b>{c.nome}</b><span className="sub">{c.servico} · {c.tipo}{c.cidade ? ` · ${c.cidade}` : ''}</span></div>
              <div className="cc-side">
                {ehUrgente(c.urgencia) && <span className="pill t-bad">Urgente</span>}
                <span className="sub mono">{dataHoraBR(c.criado_em)}</span>
                <StatusCliente id={c.id} status={c.status} />
              </div>
            </summary>
            <div className="kvg">
              <div><div className="gh">Contato</div><dl>
                <div><dt>Telefone / WhatsApp</dt><dd className="mono">{c.telefone} · <a className="link" href={wa(c.telefone)} target="_blank" rel="noopener">abrir WhatsApp</a></dd></div>
                <div><dt>E-mail</dt><dd>{c.email || '—'}</dd></div>
                <div><dt>CPF / CNPJ</dt><dd className="mono">{c.documento || '—'}</dd></div>
              </dl></div>
              <div><div className="gh">Local do serviço</div><dl>
                <div><dt>Endereço</dt><dd>{c.endereco || '—'}</dd></div>
                <div><dt>Bairro / cidade</dt><dd>{c.cidade || '—'}</dd></div>
                <div><dt>Tipo de imóvel</dt><dd>{c.tipo}</dd></div>
              </dl></div>
              <div><div className="gh">Pedido</div><dl>
                <div><dt>Serviço</dt><dd>{c.servico}</dd></div>
                {c.urgencia && <div><dt>Urgência</dt><dd>{c.urgencia}</dd></div>}
                {c.horario && <div><dt>Melhor horário</dt><dd>{c.horario}</dd></div>}
                <div><dt>Recebido por</dt><dd>{c.origem}</dd></div>
              </dl></div>
            </div>
            {c.mensagem ? <p className="msg-c">{c.mensagem}</p> : <p className="sub">Sem descrição.</p>}
            <div className="actions" style={{ marginTop: 12 }}>
              <NovoCliente cliente={c} />
              <Link className="btn btn-s btn-p" href={`/admin/orcamentos/novo?cliente=${c.id}`}>Criar orçamento</Link>
              <button className="btn btn-s btn-g" onClick={() => abrirExclusao([c.id])}>Excluir</button>
            </div>
          </details>
        ))}
      </div>

      {modo && sel.size > 0 && (
        <div className="selbar"><span><b>{sel.size}</b> {sel.size === 1 ? 'selecionado' : 'selecionados'}</span>
          <button className="btn btn-p" onClick={() => abrirExclusao([...sel])}>Excluir selecionados</button></div>
      )}

      {excluir && (
        <div id="modal" onClick={(e) => e.target === e.currentTarget && setExcluir(null)}>
          <div className="mbox" role="dialog" aria-modal="true">
            <div className="mh"><h2>Excluir {excluir.length === 1 ? 'cliente' : `${excluir.length} clientes`}?</h2><button className="x" onClick={() => setExcluir(null)} aria-label="Fechar">×</button></div>
            <p>{nomes.slice(0, 6).join(', ')}{nomes.length > 6 ? ` e mais ${nomes.length - 6}` : ''}.</p>
            {tot.orcamentos + tot.servicos > 0 ? (
              <div className="banner t-warn">Vai junto: <b>{pl(tot.orcamentos, 'orçamento', 'orçamentos')}</b>, <b>{pl(tot.servicos, 'ordem de serviço', 'ordens de serviço')}</b> e <b>{pl(tot.parcelas, 'parcela', 'parcelas')}</b> (com o histórico de versões e as respostas do cliente).</div>
            ) : <p className="sub">Não há orçamentos nem serviços ligados. Só o cadastro será apagado.</p>}
            {tot.retirado > 0 && <label className="check"><input type="checkbox" checked={devolver} onChange={(e) => setDevolver(e.target.checked)} /> Devolver ao estoque o material que já saiu para {pl(tot.retirado, 'OS', 'OS')}</label>}
            {tot.pagas > 0 && <label className="check aviso-pago"><input type="checkbox" checked={apagarPagos} onChange={(e) => setApagarPagos(e.target.checked)} /> Existem <b>{pl(tot.pagas, 'parcela paga', 'parcelas pagas')}</b>. Entendo que esses pagamentos também serão apagados do Financeiro.</label>}
            <p className="sub"><b>Não dá para desfazer.</b> Se quiser guardar uma cópia antes, baixe o backup em Dados da empresa.</p>
            <div className="mfoot"><button className="btn btn-g" onClick={() => setExcluir(null)}>Cancelar</button>
              <button className="btn btn-p" disabled={ocupado || (tot.pagas > 0 && !apagarPagos)} onClick={() => iniciar(async () => {
                const r = await excluirClientes(excluir, devolver, apagarPagos); setExcluir(null);
                setMsg(r.erro ? { t: 'bad', s: r.erro } : { t: 'ok', s: r.ok ?? '' });
                if (!r.erro) { setSel(new Set()); setModo(false); router.refresh(); } })}>{ocupado ? 'Excluindo…' : 'Excluir definitivamente'}</button></div>
          </div>
        </div>
      )}
    </>
  );
}
