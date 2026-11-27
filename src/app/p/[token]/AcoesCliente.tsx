'use client';
import { useState, useTransition } from 'react';
import { aprovarPeloLink, recusarPeloLink, contestarPeloLink } from './acoes';
import type { DadosProposta } from '@/components/Proposta';
import { numeroComRevisao } from '@/components/Proposta';
import { baixarPDF } from '@/lib/pdf';
import { brl, totais, linkWhatsAppPara } from '@/lib/negocio';

type Msg = { tipo: string; mensagem: string; criado_em: string };
type Passo = null | 'aprovar' | 'alterar' | 'recusar';

export default function AcoesCliente({ token, dados, status, vencido, aprovadoEm, mensagens }: {
  token: string; dados: DadosProposta; status: string; vencido: boolean; aprovadoEm: string | null; mensagens: Msg[];
}) {
  const [st, setSt] = useState(status);
  const [passo, setPasso] = useState<Passo>(null);
  const [texto, setTexto] = useState('');
  const [li, setLi] = useState(false);
  const [enviadas, setEnviadas] = useState<Msg[]>(mensagens.filter((m) => m.tipo === 'contestacao'));
  const [aviso, setAviso] = useState('');
  const [erro, setErro] = useState('');
  const [ocupado, iniciar] = useTransition();
  const total = totais(dados.itens, dados.orc.desconto).total;
  const primeiroNome = dados.cliente.nome.split(' ')[0];
  const zap = dados.empresa.telefone ? linkWhatsAppPara(dados.empresa.telefone, `Olá! Tenho uma dúvida sobre o orçamento ${dados.orc.numero}.`) : null;
  const abrir = (p: Passo) => { setPasso(p); setTexto(''); setLi(false); setErro(''); setAviso(''); };
  const data = (iso: string) => new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

  return (
    <div className="card prop-acoes">
      <div className="row" style={{ flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div><div className="eyebrow">Orçamento {numeroComRevisao(dados.orc)}</div><h1 className="prop-h">Olá, {primeiroNome}!</h1>
          {st !== 'rascunho' && <p className="sub">Total da proposta: <b style={{ color: 'var(--ink)' }}>{brl(total)}</b></p>}</div>
        <div className="actions">
          {st !== 'rascunho' && <button className="btn" onClick={() => baixarPDF(dados)}>Baixar PDF</button>}
          {zap && <a className="btn btn-wa" href={zap} target="_blank" rel="noopener">Falar no WhatsApp</a>}
        </div>
      </div>

      {st === 'rascunho' && <p className="banner t-info">Estamos revisando este orçamento. A nova versão vai aparecer aqui, neste mesmo link. Você será avisado quando ela estiver pronta.</p>}
      {st === 'aprovado' && <p className="banner t-ok">✓ Orçamento aprovado{aprovadoEm ? ` em ${new Date(aprovadoEm).toLocaleDateString('pt-BR')}` : ''}. Obrigado! Entraremos em contato para agendar o serviço.</p>}
      {st === 'recusado' && <p className="banner t-mute">Este orçamento foi recusado. Obrigado pelo retorno! Se mudar de ideia, fale com a gente pelo WhatsApp.</p>}
      {st === 'enviado' && vencido && <p className="banner t-warn">Este orçamento passou da validade. Fale com a gente para atualizar os valores.</p>}

      {enviadas.length > 0 && st === 'enviado' && (
        <div className="banner t-warn">
          <b>Seu pedido de alteração foi enviado.</b> Estamos analisando e vamos responder em breve.
          {enviadas.map((m, i) => <div key={i} className="sub" style={{ marginTop: 6 }}>{data(m.criado_em)} · “{m.mensagem}”</div>)}
        </div>
      )}
      {aviso && <p className="banner t-ok" role="status">{aviso}</p>}

      {st === 'enviado' && !vencido && passo === null && (
        <div className="decidir">
          <button className="btn btn-ok btn-l" onClick={() => abrir('aprovar')}>Aprovar orçamento</button>
          <button className="btn btn-l" onClick={() => abrir('alterar')}>Pedir alteração</button>
          <button className="btn btn-g" onClick={() => abrir('recusar')}>Recusar</button>
        </div>
      )}

      {passo === 'aprovar' && (
        <div className="aprova">
          <b>Aprovar o orçamento {dados.orc.numero}</b>
          <label className="fld"><span>Observação (opcional)</span><textarea rows={3} maxLength={1500} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Ex.: prefiro que o serviço seja feito pela manhã; o portão fica com o vizinho" /></label>
          <label className="check"><input type="checkbox" checked={li} onChange={(e) => setLi(e.target.checked)} /> Li a proposta abaixo e aprovo os serviços, valores e condições de pagamento.</label>
          {erro && <p className="lerr" role="alert">{erro}</p>}
          <div className="actions"><button className="btn btn-g" onClick={() => abrir(null)}>Voltar</button>
            <button className="btn btn-ok" disabled={!li || ocupado} onClick={() => iniciar(async () => { const r = await aprovarPeloLink(token, texto); if (r.erro) setErro(r.erro); else { setSt('aprovado'); setPasso(null); } })}>{ocupado ? 'Aprovando…' : 'Confirmar aprovação'}</button></div>
        </div>
      )}

      {passo === 'alterar' && (
        <div className="aprova alt">
          <b>O que você gostaria de alterar ou questionar?</b>
          <p className="sub" style={{ margin: 0 }}>Sua mensagem vai direto para nós. O orçamento continua aguardando sua decisão até respondermos.</p>
          <textarea rows={4} maxLength={1500} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Ex.: dá para trocar o quadro de 24 por um de 18 módulos? O valor da mão de obra pode ser parcelado?" aria-label="Seu pedido de alteração" autoFocus />
          {erro && <p className="lerr" role="alert">{erro}</p>}
          <div className="actions"><button className="btn btn-g" onClick={() => abrir(null)}>Voltar</button>
            <button className="btn btn-p" disabled={texto.trim().length < 3 || ocupado} onClick={() => iniciar(async () => { const r = await contestarPeloLink(token, texto); if (r.erro) setErro(r.erro); else { setEnviadas((l) => [...l, { tipo: 'contestacao', mensagem: texto.trim(), criado_em: new Date().toISOString() }]); setPasso(null); setAviso('Mensagem enviada. Vamos analisar e responder em breve.'); } })}>{ocupado ? 'Enviando…' : 'Enviar pedido de alteração'}</button></div>
        </div>
      )}

      {passo === 'recusar' && (
        <div className="aprova rec">
          <b>Recusar o orçamento</b>
          <label className="fld"><span>Se puder, conte o motivo (opcional). Isso nos ajuda a melhorar.</span><textarea rows={3} maxLength={1500} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Ex.: valor acima do que eu esperava; vou adiar o serviço" /></label>
          {erro && <p className="lerr" role="alert">{erro}</p>}
          <div className="actions"><button className="btn btn-g" onClick={() => abrir(null)}>Voltar</button>
            <button className="btn btn-p" disabled={ocupado} onClick={() => iniciar(async () => { const r = await recusarPeloLink(token, texto); if (r.erro) setErro(r.erro); else { setSt('recusado'); setPasso(null); } })}>{ocupado ? 'Enviando…' : 'Confirmar recusa'}</button></div>
        </div>
      )}
    </div>
  );
}
