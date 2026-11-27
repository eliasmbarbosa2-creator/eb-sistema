'use client';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { salvarMaterial, movimentar, entradaEmLote, usoDoMaterial, excluirMaterial, type UsoMaterial } from './acoes';
import { brl, num, dataBR, CATEGORIAS_MATERIAL, UNIDADES_MATERIAL, fmtQtd } from '@/lib/negocio';

export type Material = { id: string; codigo: string; nome: string; categoria: string; unidade: string; quantidade: number; minimo: number; custo: number; preco: number; local: string; fornecedor: string };
export type Mov = { id: string; material_id: string; tipo: 'entrada' | 'saida' | 'ajuste'; quantidade: number; data: string; observacao: string; criado_em: string };
type Reservas = Record<string, { q: number; os: string[] }>;
type Modal =
  | { t: 'ficha'; id: string } | { t: 'mov'; id: string; tipo: 'entrada' | 'saida' } | { t: 'ajuste'; id: string }
  | { t: 'material'; m?: Material } | { t: 'compras' } | { t: 'excluir'; id: string } | null;

const MOV_T = { entrada: ['Entrada', 't-ok'], saida: ['Saída', 't-accent'], ajuste: ['Ajuste de inventário', 't-info'] } as const;

function lucro(custo: number, preco: number) {
  const v = preco - custo, p = custo ? (v / custo) * 100 : 0;
  return { v, p, cls: v < 0 ? 'neg' : v > 0 ? 'pos' : '', txt: v < 0 ? 'prejuízo' : v > 0 ? 'lucro' : 'sem lucro' };
}

export default function Estoque({ materiais, movs, reservas, usos }: { materiais: Material[]; movs: Mov[]; reservas: Reservas; usos: Record<string, string[]> }) {
  const router = useRouter();
  const [modal, setModal] = useState<Modal>(null);
  const [busca, setBusca] = useState('');
  const [cat, setCat] = useState('Todas');
  const [soRepor, setSoRepor] = useState(false);
  const [movF, setMovF] = useState<'todas' | Mov['tipo']>('todas');
  const [movTodas, setMovTodas] = useState(false);
  const [aviso, setAviso] = useState('');
  const [erro, setErro] = useState('');
  const [ocupado, iniciar] = useTransition();

  const info = useMemo(() => Object.fromEntries(materiais.map((m) => {
    const r = reservas[m.id] ?? { q: 0, os: [] };
    const disp = Math.round((m.quantidade - r.q) * 100) / 100;
    const baixo = disp <= m.minimo && (m.minimo > 0 || disp < 0);
    return [m.id, { res: r.q, os: r.os, disp, baixo, sug: baixo ? Math.max(1, Math.ceil(m.minimo * 2 - disp)) : 0 }];
  })), [materiais, reservas]);
  const porId = (id: string) => materiais.find((m) => m.id === id)!;

  const cats = ['Todas', ...CATEGORIAS_MATERIAL.filter((c) => materiais.some((m) => m.categoria === c))];
  const q = busca.trim().toLowerCase();
  const lista = materiais
    .filter((m) => (cat === 'Todas' || m.categoria === cat) && (!soRepor || info[m.id].baixo))
    .filter((m) => !q || [m.nome, m.codigo, m.local, m.categoria, m.fornecedor].join(' ').toLowerCase().includes(q))
    .sort((a, b) => a.categoria.localeCompare(b.categoria) || a.nome.localeCompare(b.nome));
  const baixos = materiais.filter((m) => info[m.id].baixo);
  const valor = materiais.reduce((s, m) => s + m.quantidade * m.custo, 0);
  const pot = materiais.reduce((s, m) => s + m.quantidade * (m.preco - m.custo), 0);
  const resV = materiais.reduce((s, m) => s + info[m.id].res * m.custo, 0);
  const negs = materiais.filter((m) => m.preco < m.custo);
  const movsF = movs.filter((v) => movF === 'todas' || v.tipo === movF);

  const fim = (r: { ok?: string; erro?: string }) => {
    if (r.erro) { setErro(r.erro); return; }
    setErro(''); setModal(null); setAviso(r.ok ?? ''); router.refresh();
    setTimeout(() => setAviso(''), 3500);
  };
  const abrir = (m: Modal) => { setErro(''); setModal(m); };

  const linhaMov = (v: Mov, comMaterial: boolean) => {
    const m = materiais.find((x) => x.id === v.material_id);
    const sinal = v.tipo === 'entrada' ? '+' : v.tipo === 'saida' ? '−' : v.quantidade >= 0 ? '+' : '−';
    return (
      <tr key={v.id}>
        <td className="mono" data-label="Data">{dataBR(v.data)}</td>
        {comMaterial && <td data-label="Material">{m ? <button className="link" onClick={() => abrir({ t: 'ficha', id: m.id })}>{m.nome}</button> : '—'}</td>}
        <td data-label="Tipo"><span className={`pill ${MOV_T[v.tipo][1]}`}>{MOV_T[v.tipo][0]}</span></td>
        <td className="r mono" data-label="Quantidade">{sinal}{num(Math.abs(v.quantidade))} {m?.unidade ?? ''}</td>
        <td className="sub" data-label="Observação">{v.observacao || '—'}</td>
      </tr>
    );
  };

  return (
    <>
      <div className="ph">
        <div><h1>Estoque</h1><p className="lead">{materiais.length} materiais · clique no nome para abrir a ficha</p></div>
        <div className="actions">
          <button className={`btn ${baixos.length ? 'btn-warn' : ''}`} onClick={() => abrir({ t: 'compras' })}>Lista de compras{baixos.length > 0 && <span className="badge bad" style={{ marginLeft: 6 }}>{baixos.length}</span>}</button>
          <button className="btn btn-p" onClick={() => abrir({ t: 'material' })}>+ Novo material</button>
        </div>
      </div>
      {aviso && <div className="banner t-ok" role="status">{aviso}</div>}

      <div className="tiles">
        <div className="tile"><span className="eyebrow">Valor em estoque</span><span className="v">{brl(valor)}</span><span className="sub">pelo preço de custo</span></div>
        <div className="tile"><span className="eyebrow">Lucro se vender tudo</span><span className={`v ${pot < 0 ? 'neg' : 'pos'}`}>{brl(pot)}</span><span className="sub">preço de venda menos custo</span></div>
        <div className="tile"><span className="eyebrow">Reservado para serviços</span><span className="v">{brl(resV)}</span><span className="sub">materiais de OS ainda não retirados</span></div>
        <button className={`tile tile-b ${baixos.length ? 'alert' : ''}`} onClick={() => setSoRepor((v) => !v)}><span className="eyebrow">Repor</span><span className="v">{baixos.length}</span><span className="sub">disponível no mínimo ou abaixo</span></button>
      </div>
      {negs.length > 0 && <div className="banner t-bad"><b>Vendendo abaixo do custo:</b> {negs.map((m) => m.nome).join(' · ')}. Ajuste o preço de venda na ficha.</div>}

      <div className="card">
        {materiais.length === 0 ? (
          <p className="sub">Nenhum material cadastrado. Clique em <b>+ Novo material</b> e informe o saldo atual de cada item. Depois disso, o estoque é atualizado pelas entradas, saídas e serviços.</p>
        ) : (
          <>
            <div className="est-tools">
              <input type="search" placeholder="Buscar por nome, código, local ou fornecedor…" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar material" />
              <div className="chips">
                {cats.map((c) => <button key={c} className={`chip ${cat === c ? 'on' : ''}`} onClick={() => setCat(c)}>{c}</button>)}
                <button className={`chip chip-low ${soRepor ? 'on' : ''}`} onClick={() => setSoRepor((v) => !v)}>Só para repor <span>{baixos.length}</span></button>
              </div>
            </div>
            <div className="tw"><table className="tbl stk-t">
              <thead><tr><th>Material</th><th>Saldo</th><th className="r">Reservado</th><th className="r">Disponível</th><th className="r">Mínimo</th><th className="r">Custo / venda</th><th className="r">Lucro / un.</th><th></th></tr></thead>
              <tbody>
                {lista.map((m) => {
                  const i = info[m.id], L = lucro(m.custo, m.preco);
                  const ratio = m.minimo ? i.disp / (m.minimo * 2) : 1;
                  const cls = i.baixo ? 'low' : i.disp <= m.minimo * 1.5 ? 'mid' : '';
                  return (
                    <tr key={m.id}>
                      <td className="c-name" data-label=""><button className="mname" onClick={() => abrir({ t: 'ficha', id: m.id })}>{m.nome}</button><div className="sub"><span className="mono">{m.codigo}</span>{m.codigo && ' · '}{m.categoria}{m.local && ` · ${m.local}`}</div></td>
                      <td data-label="Saldo"><div className={`lvl ${cls}`}><div className="meter"><i style={{ width: `${Math.max(4, Math.min(100, ratio * 100))}%` }} /></div><span className="mono"><b>{num(m.quantidade)}</b> {m.unidade}</span></div></td>
                      <td className="r mono" data-label="Reservado">{i.res ? <>{num(i.res)}<div className="sub">{i.os.join(', ')}</div></> : <span className="sub">—</span>}</td>
                      <td className="r mono" data-label="Disponível"><b className={i.baixo ? 'neg' : ''}>{num(i.disp)}</b> {m.unidade}{i.baixo && <div><span className="pill t-bad">repor</span></div>}</td>
                      <td className="r mono" data-label="Mínimo">{num(m.minimo)}</td>
                      <td className="r mono" data-label="Custo / venda">{brl(m.custo)}<div className="sub">venda {brl(m.preco)}</div></td>
                      <td className={`r mono ${L.cls}`} data-label="Lucro / un."><b>{L.v < 0 ? '−' : L.v > 0 ? '+' : ''}{brl(Math.abs(L.v))}</b><div className="sub">{L.txt}{m.custo && L.v ? ` de ${num(Math.abs(L.p))}%` : ''}</div></td>
                      <td className="r c-act" data-label=""><div className="rowact">
                        <button className="btn btn-s sq" title="Entrada" aria-label={`Entrada de ${m.nome}`} onClick={() => abrir({ t: 'mov', id: m.id, tipo: 'entrada' })}>+</button>
                        <button className="btn btn-s sq" title="Saída" aria-label={`Saída de ${m.nome}`} onClick={() => abrir({ t: 'mov', id: m.id, tipo: 'saida' })}>−</button>
                      </div></td>
                    </tr>
                  );
                })}
                {lista.length === 0 && <tr><td colSpan={8} className="sub">Nenhum material encontrado.</td></tr>}
              </tbody>
            </table></div>
          </>
        )}
      </div>

      <div className="card">
        <div className="row" style={{ flexWrap: 'wrap', marginBottom: 10 }}>
          <h2 className="h2" style={{ margin: 0 }}>Movimentações</h2>
          <div className="chips">{([['todas', 'Todas'], ['entrada', 'Entradas'], ['saida', 'Saídas'], ['ajuste', 'Ajustes']] as const).map(([k, l]) => <button key={k} className={`chip ${movF === k ? 'on' : ''}`} onClick={() => { setMovF(k); setMovTodas(false); }}>{l}</button>)}</div>
        </div>
        <div className="tw"><table className="tbl stk-t mv-t">
          <thead><tr><th>Data</th><th>Material</th><th>Tipo</th><th className="r">Quantidade</th><th>Observação</th></tr></thead>
          <tbody>{(movTodas ? movsF : movsF.slice(0, 10)).map((v) => linhaMov(v, true))}{movsF.length === 0 && <tr><td colSpan={5} className="sub">Nenhuma movimentação.</td></tr>}</tbody>
        </table></div>
        {movsF.length > 10 && <button className="link" style={{ marginTop: 10 }} onClick={() => setMovTodas((v) => !v)}>{movTodas ? 'Mostrar menos' : `Ver todas as ${movsF.length} movimentações`}</button>}
      </div>

      {modal && (
        <div id="modal" onClick={(e) => e.target === e.currentTarget && setModal(null)}>
          <div className={`mbox ${modal.t === 'ficha' || modal.t === 'compras' ? 'wide' : ''}`} role="dialog" aria-modal="true">
            {modal.t === 'ficha' && (() => {
              const m = porId(modal.id), i = info[m.id], L = lucro(m.custo, m.preco);
              const hist = movs.filter((v) => v.material_id === m.id);
              const ultima = hist.find((v) => v.tipo === 'entrada');
              const st = (k: string, v: string, c = '') => <div><dt>{k}</dt><dd className={`mono ${c}`}>{v}</dd></div>;
              return (<>
                <div className="mh"><div><div className="eyebrow">{[m.codigo, m.categoria].filter(Boolean).join(' · ')}</div><h2>{m.nome}</h2></div><button className="x" onClick={() => setModal(null)} aria-label="Fechar">×</button></div>
                {i.baixo && <div className="banner t-bad">Disponível ({num(i.disp)} {m.unidade}) está no mínimo ou abaixo. Sugestão de compra: <b>{num(i.sug)} {m.unidade}</b>.</div>}
                <dl className="fstats">
                  {st('Saldo', `${num(m.quantidade)} ${m.unidade}`)}{st('Reservado', i.res ? `${num(i.res)} ${m.unidade}` : '—')}{st('Disponível', `${num(i.disp)} ${m.unidade}`, i.baixo ? 'neg' : '')}{st('Mínimo', `${num(m.minimo)} ${m.unidade}`)}
                  {st('Custo', brl(m.custo))}{st('Preço de venda', brl(m.preco))}{st('Lucro / un.', `${L.v < 0 ? '−' : '+'}${brl(Math.abs(L.v))}`, L.cls)}{st('Valor em estoque', brl(m.quantidade * m.custo))}
                </dl>
                <div className="finfo">
                  <div><span className="k">Local</span>{m.local || 'Não informado'}</div>
                  <div><span className="k">Fornecedor</span>{m.fornecedor || 'Não informado'}</div>
                  <div><span className="k">Última compra</span>{ultima ? `${dataBR(ultima.data)} · ${ultima.observacao || 'sem nota'}` : 'Nenhuma'}</div>
                  <div><span className="k">Reservado para</span>{i.os.length ? i.os.join(', ') : 'Nenhum serviço'}</div>
                  <div><span className="k">Usado em orçamentos</span>{usos[m.id]?.join(', ') || 'Nenhum'}</div>
                </div>
                <div className="actions">
                  <button className="btn btn-p" onClick={() => abrir({ t: 'mov', id: m.id, tipo: 'entrada' })}>+ Entrada</button>
                  <button className="btn" onClick={() => abrir({ t: 'mov', id: m.id, tipo: 'saida' })}>− Saída</button>
                  <button className="btn" onClick={() => abrir({ t: 'ajuste', id: m.id })}>Ajustar contagem</button>
                  <button className="btn btn-g" onClick={() => abrir({ t: 'material', m })}>Editar cadastro</button>
                  <button className="btn btn-g" onClick={() => abrir({ t: 'excluir', id: m.id })}>Excluir material</button>
                </div>
                <div><h3 className="h2" style={{ fontSize: '1.1rem', marginBottom: 6 }}>Histórico</h3>
                  <div className="tw"><table className="tbl stk-t mv-t"><thead><tr><th>Data</th><th>Tipo</th><th className="r">Quantidade</th><th>Observação</th></tr></thead>
                    <tbody>{hist.map((v) => linhaMov(v, false))}{hist.length === 0 && <tr><td colSpan={4} className="sub">Sem movimentações.</td></tr>}</tbody></table></div></div>
              </>);
            })()}

            {modal.t === 'mov' && (() => {
              const m = porId(modal.id), ent = modal.tipo === 'entrada';
              return (
                <form className="fgrid" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); iniciar(async () => fim(await movimentar({ id: m.id, tipo: modal.tipo, quantidade: Number(f.get('q')), obs: String(f.get('obs') ?? ''), custo: Number(f.get('custo') || 0) }))); }}>
                  <div className="mh span2"><h2>{ent ? 'Entrada' : 'Saída'} de material</h2><button type="button" className="x" onClick={() => setModal(null)} aria-label="Fechar">×</button></div>
                  <p className="span2"><b>{m.nome}</b><br /><span className="sub">Saldo atual: {fmtQtd(m.quantidade, m.unidade)}</span></p>
                  <label className="fld"><span>Quantidade ({m.unidade}) *</span><input name="q" type="number" step="0.01" min="0.01" required autoFocus /></label>
                  {ent && <label className="fld"><span>Novo custo unitário (opcional)</span><input name="custo" type="number" step="0.01" min="0" placeholder={String(m.custo)} /></label>}
                  <label className="fld span2"><span>{ent ? 'Nota fiscal / fornecedor' : 'Motivo'}</span><input name="obs" placeholder={ent ? 'NF 4700 · Distribuidora' : 'Uso em manutenção, perda…'} /></label>
                  {erro && <p className="lerr span2" role="alert">{erro}</p>}
                  <div className="mfoot span2"><button type="button" className="btn btn-g" onClick={() => setModal(null)}>Cancelar</button><button className="btn btn-p" disabled={ocupado}>{ocupado ? 'Registrando…' : 'Registrar'}</button></div>
                </form>
              );
            })()}

            {modal.t === 'ajuste' && (() => {
              const m = porId(modal.id);
              return (
                <form className="fgrid" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); const c = Number(f.get('q'));
                  if (c === m.quantidade) { setModal(null); setAviso('Contagem confere com o sistema.'); return; }
                  iniciar(async () => fim(await movimentar({ id: m.id, tipo: 'ajuste', quantidade: c, obs: [`Contado ${num(c)} ${m.unidade} (sistema tinha ${num(m.quantidade)})`, String(f.get('obs') ?? '')].filter(Boolean).join(' · ') }))); }}>
                  <div className="mh span2"><h2>Ajustar contagem</h2><button type="button" className="x" onClick={() => setModal(null)} aria-label="Fechar">×</button></div>
                  <p className="span2"><b>{m.nome}</b><br /><span className="sub">O sistema tem {fmtQtd(m.quantidade, m.unidade)}. Conte o que existe de fato e informe abaixo.</span></p>
                  <label className="fld"><span>Quantidade contada ({m.unidade}) *</span><input name="q" type="number" step="0.01" min="0" required autoFocus /></label>
                  <label className="fld"><span>Motivo da diferença</span><input name="obs" placeholder="Perda, sobra de obra, erro de lançamento…" /></label>
                  {erro && <p className="lerr span2" role="alert">{erro}</p>}
                  <div className="mfoot span2"><button type="button" className="btn btn-g" onClick={() => setModal(null)}>Cancelar</button><button className="btn btn-p" disabled={ocupado}>Salvar contagem</button></div>
                </form>
              );
            })()}

            {modal.t === 'material' && (() => {
              const m = modal.m;
              return (
                <FormMaterial m={m} erro={erro} ocupado={ocupado} catPadrao={cat !== 'Todas' ? cat : CATEGORIAS_MATERIAL[0]} onCancelar={() => setModal(null)}
                  onSalvar={(d) => iniciar(async () => fim(await salvarMaterial({ ...d, id: m?.id })))} />
              );
            })()}

            {modal.t === 'excluir' && <ExcluirMaterial m={porId(modal.id)} outros={materiais.filter((x) => x.id !== modal.id)} ocupado={ocupado} erro={erro} onFechar={() => setModal(null)}
              onExcluir={(sub) => iniciar(async () => fim(await excluirMaterial(modal.id, sub)))} />}
            {modal.t === 'compras' && <Compras itens={baixos.map((m) => ({ m, ...info[m.id] }))} ocupado={ocupado} erro={erro} onFechar={() => setModal(null)}
              onEntrada={(lista, nf, forn) => iniciar(async () => fim(await entradaEmLote(lista, nf, forn)))} />}
          </div>
        </div>
      )}
    </>
  );
}

type DadosMat = { codigo: string; nome: string; categoria: string; unidade: string; local: string; fornecedor: string; minimo: number; custo: number; preco: number; quantidade_inicial?: number };
function FormMaterial({ m, erro, ocupado, catPadrao, onCancelar, onSalvar }: { m?: Material; erro: string; ocupado: boolean; catPadrao: string; onCancelar: () => void; onSalvar: (d: DadosMat) => void }) {
  const [custo, setCusto] = useState(m?.custo ?? 0);
  const [preco, setPreco] = useState(m?.preco ?? 0);
  const L = lucro(custo, preco);
  return (
    <form className="fgrid" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); const s = (k: string) => String(f.get(k) ?? '');
      onSalvar({ codigo: s('codigo'), nome: s('nome'), categoria: s('categoria'), unidade: s('unidade'), local: s('local'), fornecedor: s('fornecedor'), minimo: Number(s('minimo')), custo, preco, quantidade_inicial: Number(s('qtd') || 0) }); }}>
      <div className="mh span2"><h2>{m ? 'Editar material' : 'Novo material'}</h2><button type="button" className="x" onClick={onCancelar} aria-label="Fechar">×</button></div>
      <label className="fld span2"><span>Descrição *</span><input name="nome" required defaultValue={m?.nome} placeholder="Disjuntor DIN 1P 25 A curva C" autoFocus /></label>
      <label className="fld"><span>Código</span><input name="codigo" defaultValue={m?.codigo} placeholder="DJ-1P25" /></label>
      <label className="fld"><span>Categoria</span><select name="categoria" defaultValue={m?.categoria ?? catPadrao}>{CATEGORIAS_MATERIAL.map((c) => <option key={c}>{c}</option>)}</select></label>
      <label className="fld"><span>Unidade</span><select name="unidade" defaultValue={m?.unidade ?? 'pç'}>{UNIDADES_MATERIAL.map((u) => <option key={u[0]} value={u[0]}>{u[1]}</option>)}</select></label>
      <label className="fld"><span>Local no estoque</span><input name="local" defaultValue={m?.local} placeholder="Prateleira A2, Carro…" /></label>
      <label className="fld span2"><span>Fornecedor principal</span><input name="fornecedor" defaultValue={m?.fornecedor} /></label>
      {!m && <label className="fld"><span>Saldo atual</span><input name="qtd" type="number" step="0.01" min="0" defaultValue={0} /></label>}
      <label className="fld"><span>Estoque mínimo</span><input name="minimo" type="number" step="0.01" min="0" defaultValue={m?.minimo ?? 0} /><span className="hint">Abaixo disso, entra na lista de compras</span></label>
      <label className="fld"><span>Custo (R$)</span><input type="number" step="0.01" min="0" value={custo} onChange={(e) => setCusto(Number(e.target.value))} /></label>
      <label className="fld"><span>Preço de venda (R$)</span><input type="number" step="0.01" min="0" value={preco} onChange={(e) => setPreco(Number(e.target.value))} /></label>
      <div className="span2"><span className={`banner ${L.v < 0 ? 't-bad' : L.v > 0 ? 't-ok' : 't-mute'}`} style={{ display: 'block' }}>{L.v < 0 ? 'Prejuízo' : L.v > 0 ? 'Lucro' : 'Sem lucro'} por unidade: <b className="mono">{brl(Math.abs(L.v))}</b>{L.v ? ` (${num(Math.abs(L.p))}% sobre o custo)` : ''}</span></div>
      {erro && <p className="lerr span2" role="alert">{erro}</p>}
      <div className="mfoot span2"><button type="button" className="btn btn-g" onClick={onCancelar}>Cancelar</button><button className="btn btn-p" disabled={ocupado}>{ocupado ? 'Salvando…' : 'Salvar'}</button></div>
    </form>
  );
}

function Compras({ itens, ocupado, erro, onFechar, onEntrada }: {
  itens: { m: Material; disp: number; sug: number }[]; ocupado: boolean; erro: string; onFechar: () => void;
  onEntrada: (l: { id: string; quantidade: number }[], nf: string, forn: string) => void;
}) {
  const [qtd, setQtd] = useState<Record<string, number>>(() => Object.fromEntries(itens.map((i) => [i.m.id, i.sug])));
  const [forn, setForn] = useState('');
  const [nf, setNf] = useState('');
  const [copiado, setCopiado] = useState('');
  const total = itens.reduce((s, i) => s + (qtd[i.m.id] || 0) * i.m.custo, 0);
  if (!itens.length) return (<><div className="mh"><h2>Lista de compras</h2><button className="x" onClick={onFechar} aria-label="Fechar">×</button></div><p>Nenhum material está no mínimo. Estoque em dia.</p></>);
  const copiar = async () => {
    const linhas = itens.filter((i) => (qtd[i.m.id] || 0) > 0).map((i) => `• ${fmtQtd(qtd[i.m.id], i.m.unidade)}: ${i.m.nome}${i.m.codigo ? ` (${i.m.codigo})` : ''}`);
    const txt = ['*Pedido de material*', ...(forn ? [`Fornecedor: ${forn}`] : []), '', ...linhas, '', 'Por favor, me envie o orçamento com prazo de entrega. Obrigado!'].join('\n');
    try { await navigator.clipboard.writeText(txt); setCopiado('Pedido copiado. Cole na conversa com o fornecedor.'); } catch { setCopiado('Não foi possível copiar automaticamente.'); }
  };
  return (
    <>
      <div className="mh"><h2>Lista de compras</h2><button className="x" onClick={onFechar} aria-label="Fechar">×</button></div>
      <p className="sub">Materiais com o disponível (saldo menos o reservado para serviços) no mínimo ou abaixo. A sugestão leva o disponível ao dobro do mínimo. Ajuste à vontade.</p>
      <div className="tw"><table className="tbl" style={{ minWidth: 600 }}>
        <thead><tr><th>Material</th><th className="r">Disponível</th><th className="r">Mínimo</th><th className="r">Comprar</th><th className="r">Custo est.</th></tr></thead>
        <tbody>{itens.map(({ m, disp }) => (
          <tr key={m.id}>
            <td>{m.nome}<div className="sub mono">{m.codigo}{m.fornecedor && ` · ${m.fornecedor}`}</div></td>
            <td className="r mono neg">{num(disp)} {m.unidade}</td><td className="r mono">{num(m.minimo)}</td>
            <td className="r"><input type="number" min="0" step="1" value={qtd[m.id] ?? 0} onChange={(e) => setQtd({ ...qtd, [m.id]: Number(e.target.value) })} style={{ width: 90, textAlign: 'right' }} aria-label={`Quantidade a comprar de ${m.nome}`} /> <span className="sub">{m.unidade}</span></td>
            <td className="r mono">{brl((qtd[m.id] || 0) * m.custo)}</td>
          </tr>))}</tbody>
      </table></div>
      <div className="row"><span>Total estimado</span><b className="mono" style={{ fontSize: '1.15rem' }}>{brl(total)}</b></div>
      <div className="fgrid"><label className="fld"><span>Fornecedor</span><input value={forn} onChange={(e) => setForn(e.target.value)} placeholder="Distribuidora" /></label><label className="fld"><span>Nota fiscal (na chegada)</span><input value={nf} onChange={(e) => setNf(e.target.value)} placeholder="NF 4800" /></label></div>
      {copiado && <p className="sub" role="status">{copiado}</p>}
      {erro && <p className="lerr" role="alert">{erro}</p>}
      <div className="mfoot">
        <button className="btn" onClick={copiar}>Copiar pedido para o fornecedor</button>
        <button className="btn btn-ok" disabled={ocupado} onClick={() => onEntrada(itens.map((i) => ({ id: i.m.id, quantidade: qtd[i.m.id] || 0 })), nf, forn)}>{ocupado ? 'Registrando…' : 'Material chegou: dar entrada'}</button>
      </div>
    </>
  );
}

const ST_ORC: Record<string, string> = { rascunho: 'Rascunho', enviado: 'Enviado', aprovado: 'Aprovado', recusado: 'Recusado' };
function ExcluirMaterial({ m, outros, ocupado, erro, onFechar, onExcluir }: { m: Material; outros: Material[]; ocupado: boolean; erro: string; onFechar: () => void; onExcluir: (substituto: string | null) => void }) {
  const [uso, setUso] = useState<UsoMaterial[] | null>(null);
  const [opcao, setOpcao] = useState<'substituir' | 'manter'>('substituir');
  const [sub, setSub] = useState('');
  const [busca, setBusca] = useState('');
  useEffect(() => { usoDoMaterial(m.id).then(setUso).catch(() => setUso([])); }, [m.id]);
  const pendentes = (uso ?? []).filter((u) => !u.retirado);
  const mesmaCat = outros.filter((o) => o.categoria === m.categoria);
  const opcoes = (busca ? outros.filter((o) => [o.nome, o.codigo].join(' ').toLowerCase().includes(busca.toLowerCase())) : [...mesmaCat, ...outros.filter((o) => o.categoria !== m.categoria)]).slice(0, 40);
  const escolhido = outros.find((o) => o.id === sub);
  return (
    <>
      <div className="mh"><div><div className="eyebrow">Excluir material</div><h2>{m.nome}</h2></div><button className="x" onClick={onFechar} aria-label="Fechar">×</button></div>
      {m.quantidade > 0 && <p className="banner t-warn">Este material tem <b>{fmtQtd(m.quantidade, m.unidade)}</b> em estoque. Ao excluir, esse saldo sai do estoque (o histórico de movimentações é mantido).</p>}
      {uso === null ? <p className="sub">Verificando os orçamentos…</p> : uso.length === 0 ? (
        <p>Este material não está em nenhum orçamento. Pode excluir sem preocupação.</p>
      ) : (<>
        <p>Este material está em <b>{uso.length} {uso.length === 1 ? 'orçamento' : 'orçamentos'}</b>:</p>
        <ul className="ml">{uso.map((u, i) => <li key={i}><span>{u.numero} · {u.cliente} <small>({ST_ORC[u.status] ?? u.status}{u.retirado ? ', material já retirado' : ''})</small></span><span className="mono">{fmtQtd(u.quantidade, m.unidade)}</span></li>)}</ul>
        {pendentes.length > 0 ? (<>
          <p><b>O que fazer nesses orçamentos?</b></p>
          <div className="escolhas">
            <label className={`opc ${opcao === 'substituir' ? 'on' : ''}`}><input type="radio" name="opc" checked={opcao === 'substituir'} onChange={() => setOpcao('substituir')} />
              <span><b>Substituir por outro material</b><br /><span className="sub">O item passa a usar o material escolhido no estoque (reserva e retirada). Descrição, quantidade e valor do orçamento não mudam.</span></span></label>
            {opcao === 'substituir' && (
              <div className="subst">
                <input type="search" placeholder="Buscar material…" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar material substituto" />
                <div className="subst-l">{opcoes.map((o) => (
                  <button type="button" key={o.id} className={`subst-i ${sub === o.id ? 'on' : ''}`} onClick={() => setSub(o.id)}>
                    <span><b>{o.nome}</b><span className="sub">{[o.codigo, o.categoria].filter(Boolean).join(' · ')}</span></span>
                    <span className="mono sub">{fmtQtd(o.quantidade, o.unidade)} · {brl(o.preco)}</span>
                  </button>))}
                  {opcoes.length === 0 && <p className="sub">Nenhum material encontrado.</p>}</div>
                {escolhido && escolhido.unidade !== m.unidade && <p className="banner t-warn">Atenção: unidades diferentes ({m.unidade} → {escolhido.unidade}). A quantidade nos orçamentos não é convertida.</p>}
              </div>
            )}
            <label className={`opc ${opcao === 'manter' ? 'on' : ''}`}><input type="radio" name="opc" checked={opcao === 'manter'} onChange={() => setOpcao('manter')} />
              <span><b>Tirar do estoque e deixar só no orçamento</b><br /><span className="sub">O item continua no orçamento com a mesma descrição, quantidade e valor, mas deixa de reservar ou retirar material do estoque.</span></span></label>
          </div>
        </>) : <p className="sub">Em todos eles o material já foi retirado do estoque. Esses registros ficam como estão.</p>}
      </>)}
      {erro && <p className="lerr" role="alert">{erro}</p>}
      <div className="mfoot"><button className="btn btn-g" onClick={onFechar}>Cancelar</button>
        <button className="btn btn-p" disabled={ocupado || uso === null || (pendentes.length > 0 && opcao === 'substituir' && !sub)}
          onClick={() => onExcluir(pendentes.length > 0 && opcao === 'substituir' ? sub : null)}>{ocupado ? 'Excluindo…' : 'Excluir material'}</button></div>
    </>
  );
}
