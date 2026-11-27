'use client';
import { useState, useTransition } from 'react';
import { aprovarPeloLink } from './acoes';
import type { DadosProposta } from '@/components/Proposta';
import { baixarPDF } from '@/lib/pdf';
import { brl, totais, linkWhatsAppPara } from '@/lib/negocio';

export default function AcoesCliente({ token, dados, status, vencido, aprovadoEm }: { token: string; dados: DadosProposta; status: string; vencido: boolean; aprovadoEm: string | null }) {
  const [st, setSt] = useState(status);
  const [conf, setConf] = useState(false);
  const [li, setLi] = useState(false);
  const [erro, setErro] = useState('');
  const [ocupado, iniciar] = useTransition();
  const total = totais(dados.itens, dados.orc.desconto).total;
  const zap = dados.empresa.telefone ? linkWhatsAppPara(dados.empresa.telefone, `Olá! Tenho uma dúvida sobre o orçamento ${dados.orc.numero}.`) : null;

  return (
    <div className="card prop-acoes">
      <div className="row" style={{ flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div><div className="eyebrow">Orçamento {dados.orc.numero}</div><h1 className="prop-h">Olá, {dados.cliente.nome.split(' ')[0]}!</h1>
          <p className="sub">Total da proposta: <b style={{ color: 'var(--ink)' }}>{brl(total)}</b></p></div>
        <div className="actions">
          <button className="btn" onClick={() => baixarPDF(dados)}>Baixar PDF</button>
          {zap && <a className="btn btn-wa" href={zap} target="_blank" rel="noopener">Tirar dúvidas no WhatsApp</a>}
        </div>
      </div>
      {st === 'aprovado' && <p className="banner t-ok">✓ Orçamento aprovado{aprovadoEm ? ` em ${new Date(aprovadoEm).toLocaleDateString('pt-BR')}` : ''}. Obrigado! Entraremos em contato para agendar o serviço.</p>}
      {st === 'recusado' && <p className="banner t-mute">Este orçamento foi encerrado. Se quiser retomar, fale com a gente pelo WhatsApp.</p>}
      {st === 'enviado' && vencido && <p className="banner t-warn">Este orçamento passou da validade. Fale com a gente para atualizar os valores.</p>}
      {st === 'enviado' && !vencido && (!conf
        ? <div className="actions"><button className="btn btn-ok btn-l" onClick={() => setConf(true)}>Aprovar orçamento</button></div>
        : <div className="aprova">
            <label className="check"><input type="checkbox" checked={li} onChange={(e) => setLi(e.target.checked)} /> Li a proposta abaixo e aprovo os serviços, valores e condições de pagamento.</label>
            {erro && <p className="lerr" role="alert">{erro}</p>}
            <div className="actions"><button className="btn btn-g" onClick={() => setConf(false)}>Voltar</button>
              <button className="btn btn-ok" disabled={!li || ocupado} onClick={() => iniciar(async () => { const r = await aprovarPeloLink(token); if (r.erro) setErro(r.erro); else setSt('aprovado'); })}>{ocupado ? 'Aprovando…' : 'Confirmar aprovação'}</button></div>
          </div>)}
    </div>
  );
}
