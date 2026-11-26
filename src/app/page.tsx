import { carregarSitePublico, carregarPortfolio, linkWhatsApp, urlFoto } from '@/lib/dados-publicos';
import { Icone } from '@/lib/icones';
import FormPedido from '@/components/FormPedido';
import BotaoPedir from '@/components/BotaoPedir';
import Portfolio from '@/components/Portfolio';

// O site é gerado de novo no máximo a cada 5 minutos, ou na hora quando você publica uma alteração.
export const revalidate = 300;

export default async function Inicio() {
  const [{ empresa: E, conteudo: T }, trabalhos] = await Promise.all([carregarSitePublico(), carregarPortfolio()]);
  const opcoes = [...T.servicos.map((s) => s.nome || s.titulo).filter(Boolean), 'Manutenção / outro'];
  const fotos = Object.fromEntries(trabalhos.map((t) => [t.id, t.fotos.map(urlFoto)]));
  const servicoPorCategoria = Object.fromEntries(T.servicos.map((s) => [s.titulo, s.nome || s.titulo]));
  const curto = E.nome.split(' ')[0];
  const wa = E.telefone ? linkWhatsApp(E.telefone, E.nome) : null;

  return (
    <>
      <header className="top">
        <div className="top-in gut">
          <a className="brand" href="#">
            <img className="lg-d" src="/marca/marca.png" alt="" />
            <img className="lg-l" src="/marca/marca-claro.png" alt="" />
            <span>{E.nome}</span>
          </a>
          <nav className="sitenav" aria-label="Seções do site">
            <a href="#servicos">Serviços</a>
            {trabalhos.length > 0 && <a href="#trabalhos">Trabalhos</a>}
            {T.faq.length > 0 && <a href="#duvidas">Dúvidas</a>}
            <a href="#contato">Contato</a>
          </nav>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hero-in gut">
            <div className="hero-txt">
              {E.registro && <div className="eyebrow">{E.registro}</div>}
              <h1>{T.heroTitulo}</h1>
              <p>{T.heroTexto}</p>
              <div className="hero-cta">
                <a className="btn btn-p btn-l" href="#contato">Solicitar orçamento</a>
                {wa && (
                  <a className="btn btn-hg btn-l" href={wa} target="_blank" rel="noopener">
                    <Icone nome="wa" tamanho={20} /> Chamar no WhatsApp
                  </a>
                )}
              </div>
              {T.garantias.length > 0 && (
                <div className="trust">
                  {T.garantias.map((g, i) => (
                    <div key={i}><Icone nome={g.icone} /><span>{g.texto}</span></div>
                  ))}
                </div>
              )}
            </div>
            <img className="hero-logo" src="/marca/logo-claro.png" alt={`Logo ${E.nome}`} />
          </div>
        </section>

        <section className="sec gut" id="servicos">
          <div className="sec-h">
            <div><div className="eyebrow ac-t">Serviços</div><h2>{T.servicosTitulo}</h2></div>
            <p>{T.servicosTexto}{E.regiao ? ` Região atendida: ${E.regiao}.` : ''}</p>
          </div>
          <div className="svc">
            {T.servicos.map((s, i) => (
              <div className="card" key={i}>
                <span className="ico"><Icone nome={s.icone} tamanho={24} /></span>
                <h3>{s.titulo}</h3>
                <p className="sub">{s.texto}</p>
                {s.itens.length > 0 && <ul>{s.itens.map((x, j) => <li key={j}>{x}</li>)}</ul>}
                <BotaoPedir className="link svc-cta" servico={s.nome || s.titulo}>Pedir orçamento →</BotaoPedir>
              </div>
            ))}
          </div>
          {T.segmentos.length > 0 && (
            <div className="segs" style={{ gridTemplateColumns: `repeat(${Math.min(T.segmentos.length, 3)},minmax(0,1fr))` }}>
              {T.segmentos.map((s, i) => (
                <div className="seg" key={i}>
                  <span className="seg-i"><Icone nome={s.icone} tamanho={20} /></span>
                  <div><b>{s.titulo}</b><p>{s.texto}</p></div>
                </div>
              ))}
            </div>
          )}
        </section>

        {trabalhos.length > 0 && (
          <section className="sec gut" id="trabalhos">
            <div className="sec-h"><div><div className="eyebrow ac-t">Portfólio</div><h2>{T.trabalhosTitulo}</h2></div></div>
            <Portfolio trabalhos={trabalhos} fotos={fotos} servicoPorCategoria={servicoPorCategoria} />
          </section>
        )}

        {T.diferenciais.length > 0 && (
          <section className="sec gut">
            <div className="sec-h"><div><div className="eyebrow ac-t">Diferenciais</div><h2>{T.difTitulo}</h2></div></div>
            <div className="why">
              {T.diferenciais.map((w, i) => (
                <div key={i}><span className="ico"><Icone nome={w.icone} /></span><h3>{w.titulo}</h3><p>{w.texto}</p></div>
              ))}
            </div>
          </section>
        )}

        {T.etapas.length > 0 && (
          <section className="sec gut">
            <div className="sec-h"><div><div className="eyebrow ac-t">Atendimento</div><h2>{T.etapasTitulo}</h2></div></div>
            <div className="steps" style={{ gridTemplateColumns: `repeat(${Math.min(T.etapas.length, 4)},minmax(0,1fr))` }}>
              {T.etapas.map((s, i) => (
                <div className="step" key={i}><span className="n">ETAPA {i + 1}</span><h3>{s.titulo}</h3><p>{s.texto}</p></div>
              ))}
            </div>
          </section>
        )}

        {T.faq.length > 0 && (
          <section className="sec gut" id="duvidas">
            <div className="faqw">
              <div><div className="eyebrow ac-t">Dúvidas frequentes</div><h2 className="faq-h">{T.faqTitulo}</h2><p className="sub">{T.faqTexto}</p></div>
              <div className="faq">
                {T.faq.map((q, i) => (
                  <details key={i} open={i === 0}><summary>{q.pergunta}</summary><p>{q.resposta}</p></details>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="sec gut" id="contato">
          <div className="contact">
            <div className="cpanel">
              <div className="eyebrow">Fale com a {curto}</div>
              <h2>{T.contatoTitulo}</h2>
              <p>{T.contatoTexto}</p>
              <div className="cinfo">
                {E.telefone && <div><div className="k">Telefone e WhatsApp</div><div className="v">{E.telefone}</div></div>}
                {E.email && <div><div className="k">E-mail</div><div className="v">{E.email}</div></div>}
                {E.regiao && <div><div className="k">Região atendida</div><div>{E.regiao}</div></div>}
              </div>
              {wa && <a className="btn btn-wa btn-l" href={wa} target="_blank" rel="noopener"><Icone nome="wa" tamanho={20} /> Chamar no WhatsApp</a>}
              {T.contatoDica && <p className="tip">{T.contatoDica}</p>}
            </div>
            <div className="card cform">
              <FormPedido servicos={opcoes} />
            </div>
          </div>
        </section>
      </main>

      <footer className="foot gut">
        <div className="foot-in">
          <div className="fcol">
            <span className="fb"><img className="lg-d" src="/marca/marca.png" alt="" /><img className="lg-l" src="/marca/marca-claro.png" alt="" /><b>{E.nome}</b></span>
            {E.registro && <span>{E.registro}</span>}{E.cidade && <span>{E.cidade}</span>}
          </div>
          <div className="fcol"><b>Serviços</b>{T.servicos.map((s, i) => <BotaoPedir key={i} className="link fl" servico={s.nome || s.titulo}>{s.titulo}</BotaoPedir>)}</div>
          <div className="fcol"><b>Contato</b>{E.telefone && <span className="mono">{E.telefone}</span>}{E.email && <span>{E.email}</span>}</div>
        </div>
        <div className="foot-b">© {new Date().getFullYear()} {E.nome}</div>
      </footer>
      {wa && <a className="wa-fab" href={wa} target="_blank" rel="noopener" aria-label="Chamar no WhatsApp"><Icone nome="wa" /><span>WhatsApp</span></a>}
    </>
  );
}
