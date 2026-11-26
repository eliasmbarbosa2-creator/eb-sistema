'use client';
import { useEffect, useState } from 'react';
import type { Trabalho } from '@/lib/dados-publicos';
import { ILUSTRACOES } from '@/lib/ilustracoes';
import BotaoPedir from './BotaoPedir';

function Capa({ t, urls, grande }: { t: Trabalho; urls: string[]; grande?: boolean }) {
  if (urls[0]) return <img className={`foto ${grande ? 'foto-g' : ''}`} src={urls[0]} alt={t.titulo} loading="lazy" />;
  const svg = (ILUSTRACOES[t.ilustracao] ?? ILUSTRACOES.quadro)();
  return <div className={`art ${grande ? 'art-l' : ''}`} dangerouslySetInnerHTML={{ __html: svg }} />;
}

export default function Portfolio({ trabalhos, fotos, servicoPorCategoria }: {
  trabalhos: Trabalho[]; fotos: Record<string, string[]>; servicoPorCategoria: Record<string, string>;
}) {
  const cats = ['Todos', ...Array.from(new Set(trabalhos.map((t) => t.categoria)))];
  const [filtro, setFiltro] = useState('Todos');
  const [aberto, setAberto] = useState<Trabalho | null>(null);
  const [fotoN, setFotoN] = useState(0);
  useEffect(() => {
    if (!aberto) return;
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setAberto(null);
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [aberto]);
  const lista = trabalhos.filter((t) => filtro === 'Todos' || t.categoria === filtro);

  return (
    <>
      {cats.length > 2 && (
        <div className="chips" style={{ marginBottom: 18 }}>
          {cats.map((c) => <button key={c} className={`chip ${filtro === c ? 'on' : ''}`} onClick={() => setFiltro(c)}>{c}</button>)}
        </div>
      )}
      <div className="pfgrid">
        {lista.map((t) => (
          <article className="pfc" key={t.id}>
            <button className="art-b capa-b" onClick={() => { setAberto(t); setFotoN(0); }} aria-label={`Ver detalhes: ${t.titulo}`}>
              <Capa t={t} urls={fotos[t.id] ?? []} />
            </button>
            <div className="eyebrow">{[t.categoria, t.local, t.ano].filter(Boolean).join(' · ')}</div>
            <h3>{t.titulo}</h3>
            <p className="sub clamp">{t.descricao}</p>
            {t.destaques.length > 0 && <div className="tags">{t.destaques.map((d) => <span key={d}>{d}</span>)}</div>}
            <button className="link" style={{ alignSelf: 'flex-start' }} onClick={() => { setAberto(t); setFotoN(0); }}>Ver detalhes →</button>
          </article>
        ))}
      </div>
      {aberto && (
        <div id="modal" onClick={(e) => e.target === e.currentTarget && setAberto(null)}>
          <div className="mbox wide" role="dialog" aria-modal="true" aria-label={aberto.titulo}>
            <div className="mh">
              <div><div className="eyebrow">{[aberto.categoria, aberto.local, aberto.ano].filter(Boolean).join(' · ')}</div><h2>{aberto.titulo}</h2></div>
              <button className="x" onClick={() => setAberto(null)} aria-label="Fechar">×</button>
            </div>
            {(fotos[aberto.id] ?? []).length > 0 ? (
              <div className="galeria">
                <img className="foto foto-g" src={fotos[aberto.id][fotoN]} alt={`${aberto.titulo} — foto ${fotoN + 1}`} />
                {fotos[aberto.id].length > 1 && (
                  <div className="miniaturas">
                    {fotos[aberto.id].map((u, i) => (
                      <button key={u} className={i === fotoN ? 'on' : ''} onClick={() => setFotoN(i)} aria-label={`Foto ${i + 1}`}><img src={u} alt="" /></button>
                    ))}
                  </div>
                )}
              </div>
            ) : <Capa t={aberto} urls={[]} grande />}
            <p style={{ whiteSpace: 'pre-wrap' }}>{aberto.descricao}</p>
            {aberto.destaques.length > 0 && <div className="tags">{aberto.destaques.map((d) => <span key={d}>{d}</span>)}</div>}
            <div className="mfoot">
              <span onClick={() => setAberto(null)}>
                <BotaoPedir className="btn btn-p" servico={servicoPorCategoria[aberto.categoria]} mensagem={`Vi no site o trabalho "${aberto.titulo}" e quero um serviço parecido.`}>Quero um serviço parecido</BotaoPedir>
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
