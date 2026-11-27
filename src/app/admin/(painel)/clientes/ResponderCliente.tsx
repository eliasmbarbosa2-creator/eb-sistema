'use client';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { mudarStatusCliente } from '../../acoes';
import { linkWhatsAppPara } from '@/lib/negocio';

type Cliente = { id: string; nome: string; telefone: string; email: string; endereco: string; cidade: string; servico: string; status: string };
type Empresa = { nome: string; responsavel: string; registro: string; telefone: string };
type Horario = { data: string; inicio: string; fim: string };

const ITENS_FOTOS = [
  'Foto do quadro de distribuição aberto, mostrando os disjuntores',
  'Foto do padrão de entrada (medidor) e do disjuntor geral',
  'Fotos e um vídeo curto do local onde será feito o serviço',
  'Foto da etiqueta dos equipamentos (chuveiro, ar-condicionado, motor): potência e tensão',
  'Medida aproximada da distância do quadro até o ponto novo',
  'Foto da conta de energia mais recente (para ver o tipo de ligação)',
];
const HORAS = Array.from({ length: 29 }, (_, i) => { const m = 7 * 60 + i * 30; return `${String(Math.floor(m / 60)).padStart(2, '0')}:${m % 60 ? '30' : '00'}`; });
const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const hojeISO = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
function proximoDiaUtil(apos: string) {
  const d = new Date(apos + 'T12:00:00');
  do { d.setDate(d.getDate() + 1); } while (d.getDay() === 0 || d.getDay() === 6);
  return d.toISOString().slice(0, 10);
}
const fmtHora = (h: string) => (h.endsWith(':00') ? `${Number(h.slice(0, 2))}h` : `${Number(h.slice(0, 2))}h${h.slice(3)}`);
const fmtDia = (iso: string) => { const d = new Date(iso + 'T12:00:00'); return `${DIAS[d.getDay()][0].toUpperCase()}${DIAS[d.getDay()].slice(1)}, ${iso.slice(8, 10)}/${iso.slice(5, 7)}`; };

export default function ResponderCliente({ cliente: c, empresa: E }: { cliente: Cliente; empresa: Empresa }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [tipo, setTipo] = useState<'visita' | 'fotos'>('visita');
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [valorVisita, setValorVisita] = useState<'nao' | 'gratis' | 'valor'>('nao');
  const [valor, setValor] = useState('');
  const [itens, setItens] = useState<string[]>(ITENS_FOTOS.slice(0, 3));
  const [extra, setExtra] = useState('');
  const [obs, setObs] = useState('');
  const [texto, setTexto] = useState('');
  const [editado, setEditado] = useState(false);
  const [aviso, setAviso] = useState('');
  const [, iniciar] = useTransition();

  useEffect(() => {
    if (!aberto || horarios.length) return;
    const d1 = proximoDiaUtil(hojeISO()), d2 = proximoDiaUtil(d1);
    setHorarios([{ data: d1, inicio: '08:00', fim: '12:00' }, { data: d2, inicio: '13:00', fim: '17:00' }]);
  }, [aberto, horarios.length]);

  const gerado = useMemo(() => {
    const primeiro = c.nome.split(' ')[0];
    const quem = E.responsavel ? `${E.responsavel.split(' ')[0]}, da ${E.nome}` : `da ${E.nome}`;
    const linhas = [`Olá, ${primeiro}! Aqui é ${quem}.`, `Recebi seu pedido de orçamento${c.servico ? ` para *${c.servico.toLowerCase()}*` : ''}. Obrigado pelo contato!`, ''];
    if (tipo === 'visita') {
      const local = [c.endereco, c.cidade].filter(Boolean).join(', ');
      linhas.push(`Para fazer um orçamento preciso, vou precisar fazer uma *visita técnica no local*${local ? ` (${local})` : ''}.`);
      if (valorVisita === 'gratis') linhas.push('A visita é gratuita.');
      if (valorVisita === 'valor' && valor.trim()) linhas.push(`O valor da visita técnica é de R$ ${valor.trim()}.`);
      const hs = horarios.filter((h) => h.data);
      if (hs.length) {
        linhas.push('', 'Tenho disponibilidade nestes dias e horários:');
        hs.forEach((h) => linhas.push(`• ${fmtDia(h.data)}, das ${fmtHora(h.inicio)} às ${fmtHora(h.fim)}`));
        linhas.push('', 'Qual opção fica melhor para você?');
      } else linhas.push('', 'Qual dia e horário ficam melhores para você?');
    } else {
      linhas.push('Consigo fazer o seu orçamento *por fotos e vídeos*, sem precisar de visita. Por favor, me envie por aqui:');
      [...itens, ...(extra.trim() ? [extra.trim()] : [])].forEach((i) => linhas.push(`• ${i}`));
      linhas.push('', 'Assim que eu receber, preparo o orçamento e te envio.');
    }
    if (obs.trim()) linhas.push('', obs.trim());
    linhas.push('', [E.nome, E.registro].filter(Boolean).join(' · '));
    return linhas.join('\n');
  }, [c, E, tipo, horarios, valorVisita, valor, itens, extra, obs]);
  useEffect(() => { if (!editado) setTexto(gerado); }, [gerado, editado]);

  const marcarContato = () => { if (c.status === 'novo') iniciar(async () => { await mudarStatusCliente(c.id, 'contato'); router.refresh(); }); };
  const assunto = `${E.nome}: seu pedido de orçamento${c.servico ? ` (${c.servico})` : ''}`;
  const mailto = c.email ? `mailto:${c.email}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(texto.replace(/\*/g, ''))}` : '';
  const mudarH = (i: number, p: Partial<Horario>) => setHorarios((l) => l.map((h, j) => (j === i ? { ...h, ...p } : h)));
  const abrir = () => { setAberto(true); setEditado(false); setAviso(''); };

  return (
    <>
      <button className="btn btn-s btn-ok" type="button" onClick={abrir}>Responder pedido</button>
      {aberto && (
        <div id="modal" onClick={(e) => e.target === e.currentTarget && setAberto(false)}>
          <div className="mbox wide" role="dialog" aria-modal="true" aria-label={`Responder ${c.nome}`}>
            <div className="mh"><div><div className="eyebrow">Responder pedido</div><h2>{c.nome}</h2></div><button className="x" onClick={() => setAberto(false)} aria-label="Fechar">×</button></div>

            <div className="tipo-av">
              <button type="button" className={`opc ${tipo === 'visita' ? 'on' : ''}`} onClick={() => { setTipo('visita'); setEditado(false); }}>
                <span><b>Visita técnica no local</b><br /><span className="sub">Informo os dias e horários que tenho livres</span></span></button>
              <button type="button" className={`opc ${tipo === 'fotos' ? 'on' : ''}`} onClick={() => { setTipo('fotos'); setEditado(false); }}>
                <span><b>Orçamento por fotos e vídeos</b><br /><span className="sub">Peço ao cliente o que preciso ver</span></span></button>
            </div>

            {tipo === 'visita' ? (
              <div className="resp-bloco">
                <b>Sua disponibilidade</b>
                {horarios.map((h, i) => (
                  <div className="hor" key={i}>
                    <input type="date" value={h.data} min={hojeISO()} onChange={(e) => { mudarH(i, { data: e.target.value }); setEditado(false); }} aria-label="Data" />
                    <span className="sub hor-dia">{h.data ? DIAS[new Date(h.data + 'T12:00:00').getDay()] : ''}</span>
                    <select value={h.inicio} onChange={(e) => { mudarH(i, { inicio: e.target.value }); setEditado(false); }} aria-label="Das">{HORAS.map((x) => <option key={x} value={x}>das {fmtHora(x)}</option>)}</select>
                    <select value={h.fim} onChange={(e) => { mudarH(i, { fim: e.target.value }); setEditado(false); }} aria-label="Até">{HORAS.filter((x) => x > h.inicio).map((x) => <option key={x} value={x}>às {fmtHora(x)}</option>)}</select>
                    <button type="button" className="x" onClick={() => { setHorarios((l) => l.filter((_, j) => j !== i)); setEditado(false); }} aria-label="Remover horário">×</button>
                  </div>
                ))}
                <button type="button" className="btn btn-s" onClick={() => { const ult = horarios[horarios.length - 1]?.data || hojeISO(); setHorarios((l) => [...l, { data: proximoDiaUtil(ult), inicio: '08:00', fim: '12:00' }]); setEditado(false); }}>+ Adicionar dia e horário</button>
                <div className="fgrid">
                  <label className="fld"><span>Valor da visita</span><select value={valorVisita} onChange={(e) => { setValorVisita(e.target.value as typeof valorVisita); setEditado(false); }}>
                    <option value="nao">Não mencionar</option><option value="gratis">Visita gratuita</option><option value="valor">Informar valor</option></select></label>
                  {valorVisita === 'valor' && <label className="fld"><span>Valor (R$)</span><input value={valor} inputMode="decimal" placeholder="Ex.: 80,00" onChange={(e) => { setValor(e.target.value); setEditado(false); }} /></label>}
                </div>
              </div>
            ) : (
              <div className="resp-bloco">
                <b>O que o cliente deve enviar</b>
                {ITENS_FOTOS.map((i) => (
                  <label key={i} className="check"><input type="checkbox" checked={itens.includes(i)} onChange={(e) => { setItens((l) => (e.target.checked ? [...ITENS_FOTOS.filter((x) => l.includes(x) || x === i)] : l.filter((x) => x !== i))); setEditado(false); }} /> {i}</label>
                ))}
                <label className="fld"><span>Outro item (opcional)</span><input value={extra} onChange={(e) => { setExtra(e.target.value); setEditado(false); }} placeholder="Ex.: foto da placa do motor da bomba" /></label>
              </div>
            )}

            <label className="fld"><span>Observação (opcional)</span><input value={obs} onChange={(e) => { setObs(e.target.value); setEditado(false); }} placeholder="Ex.: se preferir, me ligue nesse número" /></label>

            <div className="fld">
              <span>Mensagem {editado && <button type="button" className="link" style={{ marginLeft: 8 }} onClick={() => { setEditado(false); setTexto(gerado); }}>refazer a partir das escolhas</button>}</span>
              <textarea rows={10} value={texto} onChange={(e) => { setTexto(e.target.value); setEditado(true); }} aria-label="Mensagem para o cliente" />
              <span className="hint">Pode ajustar o texto à vontade. Os *asteriscos* viram negrito no WhatsApp.</span>
            </div>

            {aviso && <p className="banner t-ok" role="status">{aviso}</p>}
            <div className="mfoot">
              <button type="button" className="btn" onClick={async () => { try { await navigator.clipboard.writeText(texto); setAviso('Mensagem copiada.'); } catch { setAviso('Não foi possível copiar automaticamente.'); } }}>Copiar</button>
              {c.email ? <a className="btn" href={mailto} onClick={() => { marcarContato(); setAviso('Abrindo o seu aplicativo de e-mail…'); }}>Enviar por e-mail</a>
                : <span className="sub" title="Cadastre o e-mail do cliente">sem e-mail cadastrado</span>}
              <a className="btn btn-wa" href={linkWhatsAppPara(c.telefone, texto)} target="_blank" rel="noopener" onClick={() => { marcarContato(); setAviso('Mensagem aberta no WhatsApp do cliente. O cliente passou para “Em contato”.'); }}>Enviar pelo WhatsApp</a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
