import 'server-only';
import webpush from 'web-push';
import { supabaseServico } from './supabase/servico';
import { ehUrgente } from '@/lib/conteudo';

type Sb = NonNullable<ReturnType<typeof supabaseServico>>;
export type Pedido = { nome: string; telefone: string; servico: string; cidade: string; urgencia: string; mensagem: string; tipo: string };

export function urlDoSite() {
  const v = process.env.SITE_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL || '';
  if (!v) return '';
  return v.startsWith('http') ? v.replace(/\/+$/, '') : `https://${v}`;
}

/** Chaves VAPID dos avisos no celular: criadas uma vez e guardadas no banco (tabela privada). */
async function chavesVapid(sb: Sb) {
  const ler = async () => {
    const { data } = await sb.from('config_privada').select('chave,valor').in('chave', ['vapid_publica', 'vapid_privada']);
    const m = Object.fromEntries((data ?? []).map((r) => [r.chave, r.valor]));
    return m.vapid_publica && m.vapid_privada ? { publica: m.vapid_publica as string, privada: m.vapid_privada as string } : null;
  };
  const existentes = await ler();
  if (existentes) return existentes;
  const novas = webpush.generateVAPIDKeys();
  await sb.from('config_privada').upsert(
    [{ chave: 'vapid_publica', valor: novas.publicKey }, { chave: 'vapid_privada', valor: novas.privateKey }],
    { onConflict: 'chave', ignoreDuplicates: true },
  );
  return ler();
}

export async function chavePublicaVapid(): Promise<string | null> {
  const sb = supabaseServico();
  if (!sb) return null;
  return (await chavesVapid(sb))?.publica ?? null;
}

export async function emailDoAviso(sb: Sb) {
  if (process.env.AVISO_EMAIL) return process.env.AVISO_EMAIL.trim();
  const { data } = await sb.from('empresa').select('email').eq('id', 1).maybeSingle();
  return data?.email?.trim() || '';
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

async function enviarEmail(sb: Sb, p: Pedido) {
  const chave = process.env.RESEND_API_KEY?.trim();
  const para = await emailDoAviso(sb);
  if (!chave || !para) return 'sem configuração';
  const link = urlDoSite() ? `${urlDoSite()}/admin/clientes` : '';
  const linhas: [string, string][] = [
    ['Telefone / WhatsApp', p.telefone], ['Serviço', p.servico], ['Tipo de imóvel', p.tipo],
    ['Bairro / cidade', p.cidade || '—'], ['Urgência', p.urgencia || '—'],
  ];
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;color:#121C1E">
    <h2 style="margin:0 0 12px">Novo pedido de orçamento</h2>
    <p style="margin:0 0 12px"><b>${esc(p.nome)}</b></p>
    <table cellpadding="4" style="border-collapse:collapse">${linhas.map(([k, v]) => `<tr><td style="color:#56656A">${k}</td><td><b>${esc(v)}</b></td></tr>`).join('')}</table>
    ${p.mensagem ? `<p style="margin:14px 0;padding:10px 12px;background:#F1F4F5;border-radius:6px;white-space:pre-wrap">${esc(p.mensagem)}</p>` : ''}
    ${link ? `<p><a href="${link}" style="background:#0380AC;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">Abrir no sistema</a></p>` : ''}
  </div>`;
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${chave}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.AVISO_REMETENTE?.trim() || 'EB Sistema <onboarding@resend.dev>',
      to: [para],
      subject: `Novo pedido de orçamento: ${p.nome}`,
      html,
      text: `Novo pedido de orçamento\n\n${p.nome}\n${linhas.map(([k, v]) => `${k}: ${v}`).join('\n')}\n\n${p.mensagem}\n\n${link}`,
    }),
  });
  if (!r.ok) console.warn('[aviso] e-mail recusado pela Resend:', r.status, await r.text());
  return r.ok ? 'enviado' : 'falhou';
}

export async function enviarPush(sb: Sb, titulo: string, corpo: string, url = '/admin/clientes') {
  const chaves = await chavesVapid(sb);
  if (!chaves) return 0;
  webpush.setVapidDetails(`mailto:${(await emailDoAviso(sb)) || 'avisos@eb-instalacoes.app'}`, chaves.publica, chaves.privada);
  const { data: inscricoes } = await sb.from('push_inscricoes').select('id,endpoint,p256dh,auth');
  let ok = 0;
  await Promise.all((inscricoes ?? []).map(async (s) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify({ titulo, corpo, url }), { TTL: 60 * 60 * 24 });
      ok++;
    } catch (e: unknown) {
      const st = (e as { statusCode?: number }).statusCode;
      if (st === 404 || st === 410) await sb.from('push_inscricoes').delete().eq('id', s.id); // aparelho desinstalou
      else console.warn('[aviso] push falhou:', st, (e as Error).message);
    }
  }));
  return ok;
}

/** Dispara todos os avisos de um pedido novo. Nunca lança erro: o pedido já está salvo. */
export async function avisarNovoPedido(p: Pedido) {
  const sb = supabaseServico();
  if (!sb) { console.warn('[aviso] SUPABASE_SERVICE_ROLE_KEY não configurada: avisos desligados'); return; }
  const corpo = `${p.servico}${p.cidade ? ' · ' + p.cidade : ''}${ehUrgente(p.urgencia) ? ' · URGENTE' : ''}`;
  const [email, push] = await Promise.allSettled([enviarEmail(sb, p), enviarPush(sb, `Novo pedido: ${p.nome}`, corpo)]);
  console.log('[aviso] pedido novo:', 'e-mail', email.status === 'fulfilled' ? email.value : 'erro', '· celulares', push.status === 'fulfilled' ? push.value : 'erro');
}

/** Aviso de resposta do cliente pelo link (aprovação, recusa ou pedido de alteração). */
export async function avisarRespostaCliente(tipo: 'aprovacao' | 'recusa' | 'contestacao', numero: string, cliente: string, mensagem = '') {
  const sb = supabaseServico();
  if (!sb) return;
  const T = {
    aprovacao: [`Orçamento aprovado: ${numero}`, `${cliente} aprovou pelo link. A OS e as parcelas já foram criadas.`],
    recusa: [`Orçamento recusado: ${numero}`, `${cliente} recusou pelo link.`],
    contestacao: [`Pedido de alteração: ${numero}`, `${cliente} pediu alteração antes de decidir.`],
  }[tipo];
  const corpo = mensagem ? `${T[1]} “${mensagem.slice(0, 120)}${mensagem.length > 120 ? '…' : ''}”` : T[1];
  const chave = process.env.RESEND_API_KEY?.trim();
  const para = await emailDoAviso(sb);
  const link = urlDoSite() ? `${urlDoSite()}/admin/orcamentos` : '';
  await Promise.allSettled([
    enviarPush(sb, T[0], corpo, '/admin/orcamentos'),
    chave && para ? fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: `Bearer ${chave}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.AVISO_REMETENTE?.trim() || 'EB Sistema <onboarding@resend.dev>', to: [para], subject: `${T[0]} · ${cliente}`,
        text: `${T[1]}${mensagem ? `\n\nMensagem do cliente:\n${mensagem}` : ''}\n\n${link}`,
      }),
    }) : Promise.resolve(),
  ]);
}
