'use client';
import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { salvarOrcamento, marcarEnviado, aprovarAdmin, recusar, excluirRascunho } from './acoes';
import Proposta, { type DadosProposta } from '@/components/Proposta';
import { baixarPDF } from '@/lib/pdf';
import {
  STATUS_ORC, CONDICOES, PRAZO_UN, PRAZO_INICIO, UNIDADES, brl, num, dataBR, totais, validoAte, prazoTxt, condicaoTxt, linkWhatsAppPara, type Item,
} from '@/lib/negocio';

type Cliente = { id: string; nome: string; telefone: string; email: string; documento: string; endereco: string; cidade: string; tipo: string; servico: string; mensagem: string; urgencia: string; horario: string; origem: string; status: string; criado_em: string };
type Mat = { id: string; codigo: string; nome: string; unidade: string; quantidade: number; custo: number; preco: number };
type Empresa = { nome: string; responsavel: string; registro: string; telefone: string; email: string; cidade: string };
export type OrcEd = {
  id?: string; numero?: string; token?: string; cliente_id: string; data: string; validade_dias: number; condicao: string; desconto: number;
  prazo_qtd: number | null; prazo_unidade: string; prazo_inicio: string; endereco_obra: string; observacoes: string; status: string; aprovado_em?: string | null; itens: Item[];
};
const DUR = /^\s*(\d+(?:[.,]\d+)?)\s*(dias?|horas?|h|semanas?)(?:\s+(úteis|uteis|útil|util|corridos?))?\s*\.?\s*$/i;

export default function Editor({ inicial, clientes, materiais, empresa, osNumero }: { inicial: OrcEd; clientes: Cliente[]; materiais: Mat[]; empresa: Empresa; osNumero?: string }) {
  const router = useRouter();
  const [o, setO] = useState<OrcEd>(inicial);
  const [sujo, setSujo] = useState(!inicial.id);
  const [matSel, setMatSel] = useState(materiais[0]?.id ?? '');
  const [msg, setMsg] = useState<{ t: 'ok' | 'bad'; s: string } | null>(null);
  const [modal, setModal] = useState<'proposta' | 'enviar' | 'aprovar' | 'recusar' | 'excluir' | null>(null);
  const [link, setLink] = useState('');
  const [ocupado, iniciar] = useTransition();
  const bloqueado = o.status === 'aprovado' || o.status === 'recusado';

  const mat = (id: string | null) => materiais.find((m) => m.id === id);
  const itensComCusto = o.itens.map((i) => ({ ...i, custo_unit: i.tipo === 'material' ? (mat(i.material_id)?.custo ?? i.custo_unit ?? 0) : 0 }));
  const t = totais(itensComCusto, o.desconto);
  const cli = clientes.find((c) => c.id === o.cliente_id);
  const mud = (p: Partial<OrcEd>) => { setO((x) => ({ ...x, ...p })); setSujo(true); };
  const mudItem = (k: number, p: Partial<Item>) => mud({ itens: o.itens.map((i, j) => (j === k ? { ...i, ...p } : i)) });
  const obsDur = DUR.exec(o.observacoes);

  const dados: DadosProposta | null = useMemo(() => cli && o.numero ? {
    orc: { ...o, numero: o.numero }, itens: o.itens, empresa,
    cliente: { nome: cli.nome, telefone: cli.telefone, email: cli.email, documento: cli.documento, endereco: cli.endereco, cidade: cli.cidade, tipo: cli.tipo },
  } : null, [o, cli, empresa]);

  const salvar = (depois?: (id: string) => Promise<void> | void) => iniciar(async () => {
    setMsg(null);
    const r = await salvarOrcamento({ ...o, itens: o.itens });
    if (r.erro) { setMsg({ t: 'bad', s: r.erro }); return; }
    setSujo(false);
    if (!o.id && r.id) { setO((x) => ({ ...x, id: r.id, numero: r.numero })); window.history.replaceState(null, '', `/admin/orcamentos/${r.id}`); }
    if (depois && r.id) await depois(r.id); else setMsg({ t: 'ok', s: r.ok ?? 'Salvo.' });
    router.refresh();
  });

  const enviar = () => salvar(async (id) => {
    const r = await marcarEnviado(id);
    if (r.erro) { setMsg({ t: 'bad', s: r.erro }); return; }
    setO((x) => ({ ...x, status: x.status === 'rascunho' ? 'enviado' : x.status, token: r.token }));
    setLink(`${window.location.origin}/p/${r.token}`); setModal('enviar');
  });

  const textoZap = (l: string) => `Olá, ${cli?.nome.split(' ')[0] ?? ''}! Segue o orçamento ${o.numero} da ${empresa.nome}.\n\nTotal: ${brl(t.total)}\nPagamento: ${condicaoTxt(o, t.total)}\nPrazo: ${prazoTxt(o)}\n\nNo link abaixo você vê todos os detalhes, baixa o PDF e pode aprovar online:\n${l}`;
  const copiar = async (s: string) => { try { await navigator.clipboard.writeText(s); setMsg({ t: 'ok', s: 'Copiado.' }); } catch { setMsg({ t: 'bad', s: 'Não foi possível copiar. Selecione e copie manualmente.' }); } };

  return (
    <>
      <div className="ph">
        <div><Link className="link" href="/admin/orcamentos">← Todos os orçamentos</Link><h1>{o.numero ?? 'Novo orçamento'}</h1></div>
        <span className={`pill t-${STATUS_ORC[o.status][1]}`}>{STATUS_ORC[o.status][0]}</span>
      </div>
      {o.status === 'aprovado' && <div className="banner t-ok">Aprovado{o.aprovado_em ? ` em ${new Date(o.aprovado_em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}` : ''}. {osNumero ? <>Gerou a ordem de serviço <b>{osNumero}</b> e as parcelas no Financeiro.</> : null}</div>}
      {o.status === 'recusado' && <div className="banner t-bad">O cliente recusou esta proposta.</div>}
      {msg && <div className={`banner t-${msg.t}`} role="status">{msg.s}</div>}

      {cli ? (
        <div className="card req">
          <div className="row" style={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div><div className="eyebrow">Dados do cliente</div><h2 className="h2" style={{ margin: '4px 0 0' }}>{cli.nome}</h2></div>
            <Link className="btn btn-s" href={`/admin/clientes?status=${cli.status}`}>Ver em Clientes</Link>
          </div>
          <div className="kvg">
            <div><div className="gh">Contato</div><dl><div><dt>Telefone / WhatsApp</dt><dd className="mono">{cli.telefone}</dd></div><div><dt>E-mail</dt><dd>{cli.email || '—'}</dd></div><div><dt>CPF / CNPJ</dt><dd className="mono">{cli.documento || '—'}</dd></div></dl></div>
            <div><div className="gh">Local do serviço</div><dl><div><dt>Endereço</dt><dd>{cli.endereco || '—'}</dd></div><div><dt>Bairro / cidade</dt><dd>{cli.cidade || '—'}</dd></div><div><dt>Tipo de imóvel</dt><dd>{cli.tipo}</dd></div></dl></div>
            <div><div className="gh">Pedido</div><dl><div><dt>Serviço</dt><dd>{cli.servico}</dd></div>{cli.urgencia && <div><dt>Urgência</dt><dd>{cli.urgencia}</dd></div>}<div><dt>Recebido</dt><dd>{cli.origem} · {dataBR(cli.criado_em)}</dd></div></dl></div>
          </div>
          {cli.mensagem && <p className="msg">{cli.mensagem}</p>}
        </div>
      ) : <div className="card req"><p className="sub">Escolha o cliente abaixo para ver os dados do pedido.</p></div>}

      <fieldset disabled={bloqueado} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div className="card"><div className="fgrid">
          <label className="fld"><span>Cliente</span><select value={o.cliente_id} onChange={(e) => { const c = clientes.find((x) => x.id === e.target.value); mud({ cliente_id: e.target.value, endereco_obra: o.endereco_obra || (c ? [c.endereco, c.cidade].filter(Boolean).join(' · ') : '') }); }}>
            <option value="">Selecione…</option>{clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></label>
          <label className="fld"><span>Data de emissão</span><input type="date" value={o.data} onChange={(e) => mud({ data: e.target.value })} /></label>
          <label className="fld"><span>Validade da proposta (dias)</span><input type="number" min={1} value={o.validade_dias} onChange={(e) => mud({ validade_dias: Number(e.target.value) })} /><span className="hint">Válida até {dataBR(validoAte(o))}</span></label>
          <div className="fld span2"><span>Prazo de execução do serviço</span><div className="prz">
            <input type="number" min={0} step={1} placeholder="Qtd" value={o.prazo_qtd ?? ''} onChange={(e) => mud({ prazo_qtd: e.target.value === '' ? null : Number(e.target.value) })} aria-label="Quantidade do prazo" />
            <select value={o.prazo_unidade} onChange={(e) => mud({ prazo_unidade: e.target.value })} aria-label="Unidade do prazo">{Object.entries(PRAZO_UN).map(([k, v]) => <option key={k} value={k}>{v[1]}</option>)}</select>
            <select value={o.prazo_inicio} onChange={(e) => mud({ prazo_inicio: e.target.value })} aria-label="A partir de quando">{Object.entries(PRAZO_INICIO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          </div><span className="hint">Na proposta: “Prazo de execução: {prazoTxt(o)}”</span></div>
          <label className="fld span2"><span>Endereço da obra</span><input value={o.endereco_obra} onChange={(e) => mud({ endereco_obra: e.target.value })} placeholder="Rua, número, bairro" /></label>
          <label className="fld span2"><span>Condição de pagamento</span><select value={o.condicao} onChange={(e) => mud({ condicao: e.target.value })}>{Object.entries(CONDICOES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select><span className="hint">{condicaoTxt(o, t.total)}</span></label>
        </div></div>

        <div className="card">
          <h2 className="h2">Itens</h2>
          <div className="tw"><table className="tbl items">
            <thead><tr><th>Tipo</th><th>Descrição</th><th className="r">Quantidade</th><th>Unidade</th><th className="r">Valor unitário</th><th className="r">Subtotal</th><th></th></tr></thead>
            <tbody>{o.itens.map((i, k) => {
              const m = i.tipo === 'material' ? mat(i.material_id) : undefined;
              const luc = m ? (i.valor_unit - m.custo) * i.quantidade : 0;
              return (
                <tr key={k}>
                  <td><span className={`tag ${i.tipo}`}>{i.tipo === 'servico' ? 'Serviço' : 'Material'}</span></td>
                  <td><input value={i.descricao} onChange={(e) => mudItem(k, { descricao: e.target.value })} aria-label="Descrição" placeholder={i.tipo === 'servico' ? 'Ex.: Mão de obra: troca de quadro' : ''} />
                    {m && <div className="stk"><span className={i.quantidade > m.quantidade ? 'low' : ''}>Em estoque: {num(m.quantidade)} {m.unidade}</span> · custo {brl(m.custo)}/{m.unidade} · <span className={luc < 0 ? 'neg' : 'pos'}>{luc < 0 ? `prejuízo de ${brl(-luc)}` : `lucro de ${brl(luc)}`}</span></div>}</td>
                  <td><input className="num" type="number" step="0.01" min="0" value={i.quantidade} onChange={(e) => mudItem(k, { quantidade: Number(e.target.value) })} aria-label="Quantidade" /></td>
                  <td><select className="un" value={i.unidade} onChange={(e) => mudItem(k, { unidade: e.target.value })} aria-label="Unidade">{UNIDADES.map((u) => <option key={u[0]} value={u[0]}>{u[1]}</option>)}</select></td>
                  <td><input className="num" type="number" step="0.01" min="0" value={i.valor_unit} onChange={(e) => mudItem(k, { valor_unit: Number(e.target.value) })} aria-label="Valor unitário" /></td>
                  <td className="r mono">{brl(i.quantidade * i.valor_unit)}</td>
                  <td>{!bloqueado && <button type="button" className="x" onClick={() => mud({ itens: o.itens.filter((_, j) => j !== k) })} aria-label="Remover item">×</button>}</td>
                </tr>
              );
            })}
            {o.itens.length === 0 && <tr><td colSpan={7} className="sub">Adicione mão de obra e materiais abaixo.</td></tr>}</tbody>
          </table></div>
          {!bloqueado && (
            <div className="additem">
              <button type="button" className="btn" onClick={() => mud({ itens: [...o.itens, { tipo: 'servico', material_id: null, descricao: '', quantidade: 1, unidade: 'vb', valor_unit: 0 }] })}>+ Serviço / mão de obra</button>
              {materiais.length > 0 ? (
                <div className="addmat">
                  <select value={matSel} onChange={(e) => setMatSel(e.target.value)} aria-label="Material do estoque">{materiais.map((m) => <option key={m.id} value={m.id}>{m.codigo ? `${m.codigo} · ` : ''}{m.nome} · {brl(m.preco)}/{m.unidade} ({num(m.quantidade)} em estoque)</option>)}</select>
                  <button type="button" className="btn" onClick={() => { const m = mat(matSel); if (!m) return; const ex = o.itens.findIndex((i) => i.material_id === m.id);
                    if (ex >= 0) mudItem(ex, { quantidade: o.itens[ex].quantidade + 1 }); else mud({ itens: [...o.itens, { tipo: 'material', material_id: m.id, descricao: m.nome, quantidade: 1, unidade: m.unidade, valor_unit: m.preco }] }); }}>+ Material</button>
                </div>
              ) : <span className="sub">Cadastre materiais no Estoque para adicioná-los aqui.</span>}
            </div>
          )}
        </div>

        <div className="ged">
          <div className="card">
            <label className="fld"><span>Observações para o cliente</span><textarea rows={5} value={o.observacoes} onChange={(e) => mud({ observacoes: e.target.value })} placeholder="Informações extras. Ex.: a energia será desligada das 8h às 12h; não inclui reboco nem pintura." /></label>
            {obsDur && !bloqueado && (
              <div className="banner t-warn obsw"><span>“<b>{o.observacoes.trim()}</b>” sozinho não explica nada para o cliente. Isso é o prazo do serviço?</span>
                <button type="button" className="btn btn-s" onClick={() => { const w = obsDur[2].toLowerCase(); mud({ prazo_qtd: parseFloat(obsDur[1].replace(',', '.')), prazo_unidade: w.startsWith('h') ? 'h' : w.startsWith('sem') ? 'sem' : obsDur[3] && /corrid/i.test(obsDur[3]) ? 'dc' : 'du', observacoes: '' }); }}>Sim, usar como prazo de execução</button></div>
            )}
          </div>
          <div className="card sum">
            <div className="row"><span>Mão de obra</span><b>{brl(t.srv)}</b></div>
            <div className="row"><span>Materiais</span><b>{brl(t.mat)}</b></div>
            <div className="row"><label htmlFor="desc">Desconto (R$)</label><input id="desc" type="number" step="0.01" min="0" value={o.desconto} onChange={(e) => mud({ desconto: Number(e.target.value) })} /></div>
            <div className="row total"><span>Total</span><b>{brl(t.total)}</b></div>
            <div className="row sub"><span>Lucro nos materiais</span><b className={t.margem < 0 ? 'neg' : 'pos'}>{t.margem < 0 ? '−' : '+'}{brl(Math.abs(t.margem))}</b></div>
          </div>
        </div>
      </fieldset>

      <div className="actions">
        {!bloqueado && <button className="btn" disabled={ocupado} onClick={() => salvar()}>{ocupado ? 'Salvando…' : sujo ? 'Salvar' : 'Salvo ✓'}</button>}
        <button className="btn" disabled={!dados || ocupado} onClick={() => setModal('proposta')} title={!dados ? 'Salve o orçamento primeiro' : ''}>Ver proposta</button>
        <button className="btn" disabled={!dados || ocupado || sujo} onClick={() => dados && baixarPDF(dados)} title={sujo ? 'Salve as alterações primeiro' : ''}>Baixar PDF</button>
        {!bloqueado && <button className="btn btn-p" disabled={ocupado} onClick={enviar}>{o.status === 'enviado' ? 'Enviar de novo / copiar link' : 'Enviar ao cliente'}</button>}
        {o.status === 'aprovado' && o.token && <button className="btn" onClick={() => { setLink(`${window.location.origin}/p/${o.token}`); setModal('enviar'); }}>Link do cliente</button>}
        {!bloqueado && o.id && <button className="btn btn-ok" disabled={ocupado} onClick={() => setModal('aprovar')}>Cliente aprovou</button>}
        {!bloqueado && o.id && <button className="btn btn-g" disabled={ocupado} onClick={() => setModal('recusar')}>Cliente recusou</button>}
        {o.status === 'rascunho' && o.id && <button className="btn btn-g" disabled={ocupado} onClick={() => setModal('excluir')}>Excluir rascunho</button>}
      </div>

      {modal && (
        <div id="modal" onClick={(e) => e.target === e.currentTarget && setModal(null)}>
          <div className={`mbox ${modal === 'proposta' ? 'wide' : ''}`} role="dialog" aria-modal="true">
            {modal === 'proposta' && dados && (<>
              <div className="mh"><h2>Proposta {o.numero}</h2><button className="x" onClick={() => setModal(null)} aria-label="Fechar">×</button></div>
              <Proposta d={dados} />
              <div className="mfoot"><button className="btn" disabled={sujo} onClick={() => baixarPDF(dados)}>Baixar PDF</button></div>
            </>)}
            {modal === 'enviar' && (<>
              <div className="mh"><h2>Enviar ao cliente</h2><button className="x" onClick={() => setModal(null)} aria-label="Fechar">×</button></div>
              <p>O cliente abre o link, vê a proposta, baixa o PDF e pode <b>aprovar online</b>. Quando ele aprovar, você recebe um aviso.</p>
              <div className="linkbox"><input readOnly value={link} onFocus={(e) => e.currentTarget.select()} aria-label="Link da proposta" /><button className="btn" onClick={() => copiar(link)}>Copiar link</button></div>
              <div className="mfoot">
                <button className="btn" onClick={() => copiar(textoZap(link))}>Copiar mensagem</button>
                {cli && <a className="btn btn-wa" href={linkWhatsAppPara(cli.telefone, textoZap(link))} target="_blank" rel="noopener">Abrir no WhatsApp do cliente</a>}
              </div>
            </>)}
            {modal === 'aprovar' && (<>
              <div className="mh"><h2>Cliente aprovou?</h2><button className="x" onClick={() => setModal(null)} aria-label="Fechar">×</button></div>
              <p>O orçamento fica como <b>aprovado</b>, o sistema abre a <b>ordem de serviço</b> e lança as <b>parcelas</b> conforme a condição de pagamento ({CONDICOES[o.condicao]}).</p>
              {sujo && <p className="banner t-warn">As alterações ainda não salvas serão salvas antes.</p>}
              <div className="mfoot"><button className="btn btn-g" onClick={() => setModal(null)}>Cancelar</button>
                <button className="btn btn-ok" disabled={ocupado} onClick={() => salvar(async (id) => { const r = await aprovarAdmin(id); setModal(null); if (r.erro) setMsg({ t: 'bad', s: r.erro }); else { setO((x) => ({ ...x, status: 'aprovado', aprovado_em: new Date().toISOString() })); setMsg({ t: 'ok', s: r.ok! }); } })}>Confirmar aprovação</button></div>
            </>)}
            {modal === 'recusar' && (<>
              <div className="mh"><h2>Cliente recusou?</h2><button className="x" onClick={() => setModal(null)} aria-label="Fechar">×</button></div>
              <p>O orçamento fica como recusado e o cliente vai para “Perdido”.</p>
              <div className="mfoot"><button className="btn btn-g" onClick={() => setModal(null)}>Cancelar</button>
                <button className="btn btn-p" disabled={ocupado} onClick={() => iniciar(async () => { const r = await recusar(o.id!); setModal(null); if (r.erro) setMsg({ t: 'bad', s: r.erro }); else { setO((x) => ({ ...x, status: 'recusado' })); router.refresh(); } })}>Marcar como recusado</button></div>
            </>)}
            {modal === 'excluir' && (<>
              <div className="mh"><h2>Excluir rascunho?</h2><button className="x" onClick={() => setModal(null)} aria-label="Fechar">×</button></div>
              <p>O rascunho {o.numero} será apagado. O número não será reutilizado.</p>
              <div className="mfoot"><button className="btn btn-g" onClick={() => setModal(null)}>Cancelar</button>
                <button className="btn btn-p" disabled={ocupado} onClick={() => iniciar(async () => { await excluirRascunho(o.id!); router.push('/admin/orcamentos'); })}>Excluir</button></div>
            </>)}
          </div>
        </div>
      )}
    </>
  );
}
