'use client';
import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { ConteudoSite } from '@/lib/conteudo';
import { Icone, NOMES_ICONES } from '@/lib/icones';
import { salvarRascunho, publicarConteudo, descartarRascunho } from './acoes';

type Campo = [chave: string, rotulo: string, tipo: 'ico' | 'txt' | 'area' | 'linhas'];
type ListaDef = { item: string; campos: Campo[]; novo: () => Record<string, unknown> };
const LISTAS: Record<'garantias' | 'servicos' | 'segmentos' | 'diferenciais' | 'etapas' | 'faq', ListaDef> = {
  garantias: { item: 'Garantia', campos: [['icone', 'Ícone', 'ico'], ['texto', 'Texto', 'txt']], novo: () => ({ icone: 'shield', texto: '' }) },
  servicos: { item: 'Serviço', campos: [['icone', 'Ícone', 'ico'], ['titulo', 'Título', 'txt'], ['nome', 'Nome no formulário de orçamento', 'txt'], ['texto', 'Descrição', 'area'], ['itens', 'Itens da lista (um por linha)', 'linhas']], novo: () => ({ icone: 'bolt', titulo: '', nome: '', texto: '', itens: [] }) },
  segmentos: { item: 'Tipo de cliente', campos: [['icone', 'Ícone', 'ico'], ['titulo', 'Título', 'txt'], ['texto', 'Descrição', 'area']], novo: () => ({ icone: 'home', titulo: '', texto: '' }) },
  diferenciais: { item: 'Diferencial', campos: [['icone', 'Ícone', 'ico'], ['titulo', 'Título', 'txt'], ['texto', 'Descrição', 'area']], novo: () => ({ icone: 'shield', titulo: '', texto: '' }) },
  etapas: { item: 'Etapa', campos: [['titulo', 'Título', 'txt'], ['texto', 'Descrição', 'area']], novo: () => ({ titulo: '', texto: '' }) },
  faq: { item: 'Pergunta', campos: [['pergunta', 'Pergunta', 'txt'], ['resposta', 'Resposta', 'area']], novo: () => ({ pergunta: '', resposta: '' }) },
};
type ChaveLista = keyof typeof LISTAS;

export default function EditorConteudo({ inicial, publicado, temRascunho, publicadoEm }: { inicial: ConteudoSite; publicado: ConteudoSite; temRascunho: boolean; publicadoEm: string | null }) {
  const router = useRouter();
  const [c, setC] = useState<ConteudoSite>(inicial);
  const [linhas, setLinhas] = useState<Record<number, string>>(() => Object.fromEntries(inicial.servicos.map((s, i) => [i, s.itens.join('\n')])));
  const [estado, setEstado] = useState<'publicado' | 'rascunho' | 'sujo'>(temRascunho ? 'rascunho' : 'publicado');
  const [msg, setMsg] = useState<{ t: 'ok' | 'bad'; s: string } | null>(null);
  const [ocupado, iniciar] = useTransition();

  useEffect(() => {
    const avisar = (e: BeforeUnloadEvent) => { if (estado === 'sujo') { e.preventDefault(); } };
    window.addEventListener('beforeunload', avisar);
    return () => window.removeEventListener('beforeunload', avisar);
  }, [estado]);

  const mud = (p: Partial<ConteudoSite>) => { setC((x) => ({ ...x, ...p })); setEstado('sujo'); };
  const lista = <K extends ChaveLista>(k: K) => c[k] as unknown as Record<string, unknown>[];
  const setLista = (k: ChaveLista, v: Record<string, unknown>[]) => mud({ [k]: v } as Partial<ConteudoSite>);
  const comLinhas = (x: ConteudoSite) => ({ ...x, servicos: x.servicos.map((s, i) => ({ ...s, itens: (linhas[i] ?? s.itens.join('\n')).split('\n').map((l) => l.trim()).filter(Boolean) })) });
  const mover = (k: ChaveLista, i: number, d: number) => {
    const a = [...lista(k)]; const j = i + d; if (j < 0 || j >= a.length) return;
    [a[i], a[j]] = [a[j], a[i]];
    if (k === 'servicos') setLinhas((l) => ({ ...l, [i]: l[j] ?? '', [j]: l[i] ?? '' }));
    setLista(k, a);
  };
  const remover = (k: ChaveLista, i: number) => {
    if (k === 'servicos') setLinhas((l) => { const n: Record<number, string> = {}; Object.entries(l).forEach(([x, v]) => { const xi = Number(x); if (xi < i) n[xi] = v; else if (xi > i) n[xi - 1] = v; }); return n; });
    setLista(k, lista(k).filter((_, j) => j !== i));
  };

  const fim = (r: { ok?: string; erro?: string }, novo: typeof estado) => { if (r.erro) setMsg({ t: 'bad', s: r.erro }); else { setMsg({ t: 'ok', s: r.ok ?? '' }); setEstado(novo); router.refresh(); } };
  const salvar = () => iniciar(async () => fim(await salvarRascunho(comLinhas(c)), 'rascunho'));
  const publicar = () => iniciar(async () => fim(await publicarConteudo(comLinhas(c)), 'publicado'));
  const previa = () => iniciar(async () => { const r = await salvarRascunho(comLinhas(c)); fim(r, 'rascunho'); if (!r.erro) window.open('/admin/previa', '_blank'); });
  const descartar = () => iniciar(async () => { await descartarRascunho(); setC(publicado); setLinhas(Object.fromEntries(publicado.servicos.map((s, i) => [i, s.itens.join('\n')]))); setEstado('publicado'); setMsg({ t: 'ok', s: 'Alterações descartadas. O editor voltou ao que está publicado.' }); router.refresh(); });

  const campo = (k: ChaveLista, i: number, [ch, rot, tipo]: Campo, it: Record<string, unknown>) => {
    const id = `cs-${k}-${i}-${ch}`;
    const set = (v: unknown) => setLista(k, lista(k).map((e, j) => (j === i ? { ...e, [ch]: v } : e)));
    if (tipo === 'ico') return (
      <label key={ch} className="fld"><span>{rot}</span><div className="icosel"><span className="ico"><Icone nome={String(it[ch])} /></span>
        <select id={id} value={String(it[ch])} onChange={(e) => set(e.target.value)}>{Object.entries(NOMES_ICONES).map(([v, n]) => <option key={v} value={v}>{n}</option>)}</select></div></label>);
    if (tipo === 'area') return <label key={ch} className="fld span2"><span>{rot}</span><textarea id={id} rows={3} value={String(it[ch] ?? '')} onChange={(e) => set(e.target.value)} /></label>;
    if (tipo === 'linhas') return <label key={ch} className="fld span2"><span>{rot}</span><textarea id={id} rows={3} value={linhas[i] ?? ''} onChange={(e) => { setLinhas({ ...linhas, [i]: e.target.value }); setEstado('sujo'); }} /></label>;
    const largo = LISTAS[k].campos.length <= 2;
    return <label key={ch} className={`fld ${largo ? 'span2' : ''}`}><span>{rot}</span><input id={id} value={String(it[ch] ?? '')} onChange={(e) => set(e.target.value)} /></label>;
  };
  const editorLista = (k: ChaveLista) => {
    const L = LISTAS[k], arr = lista(k);
    return (
      <div className="lst">
        {arr.map((it, i) => (
          <div className="li" key={i}>
            <div className="li-h"><b>{L.item} {i + 1}</b><div className="li-a">
              <button type="button" className="btn btn-s sq" onClick={() => mover(k, i, -1)} disabled={i === 0} aria-label="Subir">↑</button>
              <button type="button" className="btn btn-s sq" onClick={() => mover(k, i, 1)} disabled={i === arr.length - 1} aria-label="Descer">↓</button>
              <button type="button" className="btn btn-s btn-g" onClick={() => remover(k, i)}>Remover</button></div></div>
            <div className="fgrid">{L.campos.map((f) => campo(k, i, f, it))}</div>
          </div>
        ))}
        <button type="button" className="btn" onClick={() => { if (k === 'servicos') setLinhas({ ...linhas, [arr.length]: '' }); setLista(k, [...arr, L.novo()]); }}>+ Adicionar {L.item.toLowerCase()}</button>
      </div>
    );
  };
  const txt = (k: keyof ConteudoSite, rot: string, area = false) => (
    <label className="fld span2"><span>{rot}</span>{area
      ? <textarea rows={3} value={String(c[k])} onChange={(e) => mud({ [k]: e.target.value } as Partial<ConteudoSite>)} />
      : <input value={String(c[k])} onChange={(e) => mud({ [k]: e.target.value } as Partial<ConteudoSite>)} />}</label>
  );
  const sec = (id: string, titulo: string, desc: string, corpo: React.ReactNode) => (
    <section className="card csec" id={`cs-${id}`}><div className="csec-h"><h2 className="h2" style={{ margin: 0 }}>{titulo}</h2>{desc && <p className="sub">{desc}</p>}</div>{corpo}</section>
  );
  const ESTADO = { publicado: ['Tudo publicado', 'clean'], rascunho: ['Rascunho salvo, ainda não publicado', ''], sujo: ['Alterações não salvas', ''] } as const;

  return (
    <>
      <div className="ph">
        <div><h1>Conteúdo do site</h1><p className="lead">Edite os textos e publique quando estiver pronto{publicadoEm ? ` · última publicação em ${new Date(publicadoEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}` : ''}</p></div>
        <div className="actions">
          <span className={`dirty ${ESTADO[estado][1]}`}>{ESTADO[estado][0]}</span>
          <button className="btn" disabled={ocupado || estado !== 'sujo'} onClick={salvar}>Salvar rascunho</button>
          <button className="btn" disabled={ocupado} onClick={previa}>Pré-visualizar</button>
          <button className="btn btn-g" disabled={ocupado || estado === 'publicado'} onClick={descartar}>Descartar</button>
          <button className="btn btn-p" disabled={ocupado} onClick={publicar}>{ocupado ? 'Aguarde…' : 'Publicar no site'}</button>
        </div>
      </div>
      {msg && <div className={`banner t-${msg.t}`} role="status">{msg.s}</div>}
      <nav className="cidx" aria-label="Seções">{[['abertura', 'Abertura'], ['servicos', 'Serviços'], ['segmentos', 'Tipos de cliente'], ['trabalhos', 'Trabalhos'], ['dif', 'Diferenciais'], ['etapas', 'Como funciona'], ['faq', 'Perguntas frequentes'], ['contato', 'Contato']]
        .map(([id, l]) => <a key={id} className="chip" href={`#cs-${id}`} style={{ textDecoration: 'none' }}>{l}</a>)}</nav>

      {sec('abertura', 'Abertura', 'Primeira coisa que o visitante vê.', <>
        <div className="fgrid">{txt('heroTitulo', 'Frase principal')}{txt('heroTexto', 'Texto de apresentação', true)}</div>
        <h3 className="subh">Garantias (abaixo dos botões)</h3>{editorLista('garantias')}</>)}
      {sec('servicos', 'Serviços', 'O “nome no formulário” é o que aparece na lista de serviços do pedido de orçamento.', <>
        <div className="fgrid">{txt('servicosTitulo', 'Título da seção')}{txt('servicosTexto', 'Texto ao lado do título')}</div>{editorLista('servicos')}</>)}
      {sec('segmentos', 'Tipos de cliente', 'Faixa logo abaixo dos serviços.', editorLista('segmentos'))}
      {sec('trabalhos', 'Trabalhos realizados', 'Os trabalhos em si são cadastrados em Portfólio.', <><div className="fgrid">{txt('trabalhosTitulo', 'Título da seção')}</div><a className="link" href="/admin/portfolio">Ir para Portfólio →</a></>)}
      {sec('dif', 'Diferenciais', '', <><div className="fgrid">{txt('difTitulo', 'Título da seção')}</div>{editorLista('diferenciais')}</>)}
      {sec('etapas', 'Como funciona', '', <><div className="fgrid">{txt('etapasTitulo', 'Título da seção')}</div>{editorLista('etapas')}</>)}
      {sec('faq', 'Perguntas frequentes', '', <><div className="fgrid">{txt('faqTitulo', 'Título da seção')}{txt('faqTexto', 'Texto abaixo do título')}</div>{editorLista('faq')}</>)}
      {sec('contato', 'Contato', 'Telefone, e-mail e região ficam em Dados da empresa.', <div className="fgrid">{txt('contatoTitulo', 'Título')}{txt('contatoTexto', 'Texto', true)}{txt('contatoDica', 'Dica abaixo do botão do WhatsApp')}</div>)}

      <div className="actions" style={{ justifyContent: 'flex-end' }}>
        <button className="btn" disabled={ocupado} onClick={previa}>Pré-visualizar</button>
        <button className="btn btn-p" disabled={ocupado} onClick={publicar}>Publicar no site</button>
      </div>
    </>
  );
}
