'use client';
import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { salvarTrabalho, excluirTrabalho, removerFotos } from '../../acoes';
import { supabaseNavegador } from '@/lib/supabase/navegador';
import { ILUSTRACOES, NOMES_ILUSTRACOES } from '@/lib/ilustracoes';

export type TrabalhoAdmin = {
  id: string; titulo: string; categoria: string; local: string; ano: string; descricao: string;
  destaques: string[]; fotos: string[]; ilustracao: string; publicado: boolean;
};
const VAZIO: Omit<TrabalhoAdmin, 'id'> & { id?: string } = {
  titulo: '', categoria: 'Instalações elétricas', local: '', ano: String(new Date().getFullYear()), descricao: '',
  destaques: [], fotos: [], ilustracao: 'quadro', publicado: true,
};
const CATEGORIAS = ['Projetos elétricos', 'Quadros de comando', 'Instalações elétricas'];

/** Reduz a foto para no máximo 1600 px e JPEG ~80%, para subir rápido do celular. */
async function comprimir(arq: File): Promise<Blob> {
  const bmp = await createImageBitmap(arq);
  const esc = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * esc); c.height = Math.round(bmp.height * esc);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((ok, erro) => c.toBlob((b) => (b ? ok(b) : erro(new Error('falha'))), 'image/jpeg', 0.82));
}

export default function EditorPortfolio({ lista, baseFotos }: { lista: TrabalhoAdmin[]; baseFotos: string }) {
  const router = useRouter();
  const [ed, setEd] = useState<(typeof VAZIO) | null>(null);
  const [destaquesTxt, setDestaquesTxt] = useState('');
  const [enviando, setEnviando] = useState(0);
  const [erro, setErro] = useState('');
  const [salvando, iniciar] = useTransition();
  const novasFotos = useRef<string[]>([]);
  const fotosRemovidas = useRef<string[]>([]);
  const url = (p: string) => baseFotos + p.split('/').map(encodeURIComponent).join('/');

  const abrir = (t?: TrabalhoAdmin) => {
    setEd(t ? { ...t } : { ...VAZIO }); setDestaquesTxt((t?.destaques ?? []).join(', ')); setErro('');
    novasFotos.current = []; fotosRemovidas.current = [];
  };
  const fechar = () => {
    if (novasFotos.current.length) void removerFotos(novasFotos.current); // descarta fotos enviadas e não salvas
    setEd(null);
  };

  const enviarFotos = async (arquivos: FileList | null) => {
    if (!arquivos || !ed) return;
    const sb = supabaseNavegador();
    const pasta = ed.id ?? 'novos';
    setErro('');
    for (const arq of Array.from(arquivos).slice(0, 12 - ed.fotos.length)) {
      if (!arq.type.startsWith('image/')) continue;
      setEnviando((n) => n + 1);
      try {
        const blob = await comprimir(arq);
        const caminho = `${pasta}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
        const { error } = await sb.storage.from('portfolio').upload(caminho, blob, { contentType: 'image/jpeg' });
        if (error) throw error;
        novasFotos.current.push(caminho);
        setEd((e) => (e ? { ...e, fotos: [...e.fotos, caminho] } : e));
      } catch {
        setErro('Uma das fotos não foi enviada. Tente de novo.');
      } finally {
        setEnviando((n) => n - 1);
      }
    }
  };

  const mover = (i: number, d: number) => setEd((e) => {
    if (!e) return e; const f = [...e.fotos]; const j = i + d; if (j < 0 || j >= f.length) return e;
    [f[i], f[j]] = [f[j], f[i]]; return { ...e, fotos: f };
  });

  const salvar = () => {
    if (!ed) return;
    iniciar(async () => {
      const r = await salvarTrabalho({ ...ed, destaques: destaquesTxt.split(',') });
      if (r.erro) { setErro(r.erro); return; }
      if (fotosRemovidas.current.length) await removerFotos(fotosRemovidas.current);
      novasFotos.current = []; setEd(null); router.refresh();
    });
  };

  return (
    <>
      <div className="actions"><button className="btn btn-p" onClick={() => abrir()}>+ Novo trabalho</button></div>
      {lista.length === 0 ? (
        <div className="card"><p className="sub">Nenhum trabalho cadastrado. Clique em “Novo trabalho” e envie fotos do celular ou do computador. A seção só aparece no site quando houver pelo menos um trabalho publicado.</p></div>
      ) : (
        <div className="pfgrid">
          {lista.map((t) => (
            <div className="card pfc" key={t.id}>
              {t.fotos[0] ? <img className="foto" src={url(t.fotos[0])} alt="" /> : <div className="art" dangerouslySetInnerHTML={{ __html: (ILUSTRACOES[t.ilustracao] ?? ILUSTRACOES.quadro)() }} />}
              <div className="row"><span className="eyebrow">{t.categoria}</span>{t.publicado ? <span className="pill t-ok">No site</span> : <span className="pill t-mute">Oculto</span>}</div>
              <h3>{t.titulo}</h3>
              <p className="sub">{[t.local, t.ano].filter(Boolean).join(' · ')} · {t.fotos.length} foto(s)</p>
              <div className="actions">
                <button className="btn btn-s" onClick={() => abrir(t)}>Editar</button>
                <button className="btn btn-s btn-g" onClick={() => { if (confirm(`Excluir "${t.titulo}" e as fotos dele?`)) iniciar(async () => { await excluirTrabalho(t.id); router.refresh(); }); }}>Excluir</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {ed && (
        <div id="modal" onClick={(e) => e.target === e.currentTarget && fechar()}>
          <div className="mbox wide" role="dialog" aria-modal="true">
            <div className="mh"><h2>{ed.id ? 'Editar trabalho' : 'Novo trabalho'}</h2><button className="x" onClick={fechar} aria-label="Fechar">×</button></div>
            <div className="fgrid">
              <label className="fld span2"><span>Título *</span><input value={ed.titulo} onChange={(e) => setEd({ ...ed, titulo: e.target.value })} placeholder="Ex.: Troca de quadro com DR e DPS" autoFocus /></label>
              <label className="fld"><span>Categoria</span><select value={ed.categoria} onChange={(e) => setEd({ ...ed, categoria: e.target.value })}>{CATEGORIAS.map((c) => <option key={c}>{c}</option>)}</select></label>
              <label className="fld"><span>Local / tipo de cliente</span><input value={ed.local} onChange={(e) => setEd({ ...ed, local: e.target.value })} placeholder="Ex.: Residência, Padaria, Indústria" /></label>
              <label className="fld"><span>Ano</span><input value={ed.ano} onChange={(e) => setEd({ ...ed, ano: e.target.value })} inputMode="numeric" /></label>
              <label className="fld"><span>Ilustração (se não houver foto)</span><select value={ed.ilustracao} onChange={(e) => setEd({ ...ed, ilustracao: e.target.value })}>{Object.entries(NOMES_ILUSTRACOES).map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select></label>
              <label className="fld span2"><span>Descrição</span><textarea rows={3} value={ed.descricao} onChange={(e) => setEd({ ...ed, descricao: e.target.value })} /></label>
              <label className="fld span2"><span>Destaques (separados por vírgula)</span><input value={destaquesTxt} onChange={(e) => setDestaquesTxt(e.target.value)} placeholder="Ex.: DR 30 mA, DPS classe II, 24 circuitos" /></label>
            </div>
            <div>
              <div className="row" style={{ marginBottom: 8 }}><b>Fotos ({ed.fotos.length}/12)</b><span className="sub">A primeira é a capa</span></div>
              <div className="fotos-ed">
                {ed.fotos.map((f, i) => (
                  <div className="fe" key={f}>
                    <img src={url(f)} alt={`Foto ${i + 1}`} />
                    <div className="fe-a">
                      <button className="btn btn-s sq" onClick={() => mover(i, -1)} disabled={i === 0} aria-label="Mover para a esquerda">←</button>
                      <button className="btn btn-s sq" onClick={() => mover(i, 1)} disabled={i === ed.fotos.length - 1} aria-label="Mover para a direita">→</button>
                      <button className="btn btn-s sq" onClick={() => { fotosRemovidas.current.push(f); setEd({ ...ed, fotos: ed.fotos.filter((x) => x !== f) }); }} aria-label="Remover foto">×</button>
                    </div>
                  </div>
                ))}
                {ed.fotos.length < 12 && (
                  <label className="fe fe-add">
                    <input type="file" accept="image/*" multiple hidden onChange={(e) => { void enviarFotos(e.target.files); e.target.value = ''; }} />
                    <span>{enviando ? `Enviando ${enviando}…` : '+ Adicionar fotos'}</span>
                  </label>
                )}
              </div>
            </div>
            <label className="check"><input type="checkbox" checked={ed.publicado} onChange={(e) => setEd({ ...ed, publicado: e.target.checked })} /> Mostrar no site</label>
            {erro && <p className="lerr" role="alert">{erro}</p>}
            <div className="mfoot"><button className="btn btn-g" onClick={fechar}>Cancelar</button><button className="btn btn-p" onClick={salvar} disabled={salvando || enviando > 0}>{salvando ? 'Salvando…' : 'Salvar'}</button></div>
          </div>
        </div>
      )}
    </>
  );
}
