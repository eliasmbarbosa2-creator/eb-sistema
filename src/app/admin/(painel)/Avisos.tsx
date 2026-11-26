'use client';
import { useEffect, useState, useTransition } from 'react';
import { inscreverAvisos, cancelarAvisos, testarAvisos } from '../acoes';

const b64 = (s: string) => {
  const p = '='.repeat((4 - (s.length % 4)) % 4);
  const raw = atob((s + p).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

export default function Avisos({ chave, emailOk, pushOk }: { chave: string | null; emailOk: boolean; pushOk: boolean }) {
  const [estado, setEstado] = useState<'carregando' | 'sem-suporte' | 'ios' | 'negado' | 'ativo' | 'inativo'>('carregando');
  const [msg, setMsg] = useState('');
  const [ocupado, iniciar] = useTransition();

  useEffect(() => {
    (async () => {
      const ios = /iphone|ipad/i.test(navigator.userAgent);
      const instalado = window.matchMedia('(display-mode: standalone)').matches;
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) return setEstado(ios && !instalado ? 'ios' : 'sem-suporte');
      if (Notification.permission === 'denied') return setEstado('negado');
      const reg = await navigator.serviceWorker.register('/sw.js');
      const sub = await reg.pushManager.getSubscription();
      setEstado(sub ? 'ativo' : 'inativo');
    })().catch(() => setEstado('sem-suporte'));
  }, []);

  const ativar = () => iniciar(async () => {
    setMsg('');
    if (!chave) { setMsg('Os avisos ainda não foram configurados no servidor (falta a chave de serviço na Vercel).'); return; }
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') { setEstado(perm === 'denied' ? 'negado' : 'inativo'); return; }
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(chave) });
    const r = await inscreverAvisos(sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } });
    setMsg(r.erro ?? r.ok ?? ''); if (r.ok) setEstado('ativo');
  });
  const desativar = () => iniciar(async () => {
    const reg = await navigator.serviceWorker.ready; const sub = await reg.pushManager.getSubscription();
    if (sub) { await cancelarAvisos(sub.endpoint); await sub.unsubscribe(); }
    setEstado('inativo'); setMsg('Avisos desligados neste aparelho.');
  });
  const testar = () => iniciar(async () => { const r = await testarAvisos(); setMsg(r.erro ?? r.ok ?? ''); });

  return (
    <div className="card">
      <h2 className="h2">Avisos de pedido novo</h2>
      <div className="aviso-st">
        <div><span className={`pill ${emailOk ? 't-ok' : 't-mute'}`}>{emailOk ? 'E-mail ativo' : 'E-mail não configurado'}</span></div>
        <div><span className={`pill ${estado === 'ativo' ? 't-ok' : 't-mute'}`}>{estado === 'ativo' ? 'Avisos ativos neste aparelho' : 'Avisos desligados neste aparelho'}</span></div>
      </div>
      {!pushOk && <p className="sub">Para os avisos funcionarem, falta cadastrar a chave de serviço do Supabase na Vercel (veja o README).</p>}
      {estado === 'ios' && <p className="sub">No iPhone, primeiro instale o sistema na tela inicial: toque em <b>Compartilhar</b> → <b>Adicionar à Tela de Início</b>, abra pelo ícone e volte aqui.</p>}
      {estado === 'sem-suporte' && <p className="sub">Este navegador não aceita avisos. No Android use o Chrome; no iPhone, instale na tela inicial.</p>}
      {estado === 'negado' && <p className="sub">Os avisos foram bloqueados neste navegador. Libere em <b>Configurações do site → Notificações</b> e recarregue a página.</p>}
      <div className="actions" style={{ marginTop: 10 }}>
        {estado === 'inativo' && <button className="btn btn-p" onClick={ativar} disabled={ocupado}>Ativar avisos neste aparelho</button>}
        {estado === 'ativo' && <><button className="btn" onClick={testar} disabled={ocupado}>Enviar aviso de teste</button><button className="btn btn-g" onClick={desativar} disabled={ocupado}>Desligar neste aparelho</button></>}
      </div>
      {msg && <p className="sub" role="status" style={{ marginTop: 8 }}>{msg}</p>}
    </div>
  );
}
