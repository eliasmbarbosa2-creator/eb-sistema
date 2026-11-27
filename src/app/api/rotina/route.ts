import { NextResponse, type NextRequest } from 'next/server';
import { supabaseServico } from '@/lib/supabase/servico';
import { gerarBackup, nomeBackup } from '@/lib/backup';
import { emailDoAviso, urlDoSite } from '@/lib/avisos';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Rotina diária (chamada pela Vercel, ver vercel.json):
 * 1) faz uma consulta leve no banco, para o Supabase gratuito não pausar o projeto por inatividade;
 * 2) às segundas-feiras, envia por e-mail a planilha de backup.
 */
export async function GET(req: NextRequest) {
  const segredo = process.env.CRON_SECRET?.trim();
  const autorizado = Boolean(segredo) && req.headers.get('authorization') === `Bearer ${segredo}`;
  const sb = supabaseServico();
  if (!sb) return NextResponse.json({ ok: false, motivo: 'SUPABASE_SERVICE_ROLE_KEY ausente' }, { status: 500 });

  const { error } = await sb.from('empresa').select('id').eq('id', 1).maybeSingle();
  const resultado: Record<string, unknown> = { banco: error ? `erro: ${error.message}` : 'ativo' };

  const segunda = new Date().toLocaleDateString('en-US', { timeZone: 'America/Sao_Paulo', weekday: 'short' }) === 'Mon';
  const forcar = req.nextUrl.searchParams.get('backup') === '1';
  if (autorizado && (segunda || forcar)) {
    const chave = process.env.RESEND_API_KEY?.trim();
    const para = await emailDoAviso(sb);
    if (chave && para) {
      try {
        const arq = await gerarBackup(sb);
        const r = await fetch('https://api.resend.com/emails', {
          method: 'POST', headers: { Authorization: `Bearer ${chave}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: process.env.AVISO_REMETENTE?.trim() || 'EB Sistema <onboarding@resend.dev>', to: [para],
            subject: `Backup semanal do sistema · ${new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`,
            text: `Segue em anexo a cópia de todos os dados do sistema (clientes, orçamentos, serviços, parcelas, estoque e portfólio).\nGuarde este e-mail: ele é a sua cópia de segurança desta semana.\n\n${urlDoSite()}/admin`,
            attachments: [{ filename: nomeBackup(), content: arq.toString('base64') }],
          }),
        });
        resultado.backup = r.ok ? 'enviado' : `falhou (${r.status})`;
        if (!r.ok) console.warn('[rotina] backup recusado pela Resend:', r.status, await r.text());
      } catch (e) {
        resultado.backup = 'erro'; console.error('[rotina] backup', (e as Error).message);
      }
    } else resultado.backup = 'sem e-mail configurado';
  } else if (!autorizado) resultado.backup = 'ignorado (sem CRON_SECRET)';
  console.log('[rotina]', JSON.stringify(resultado));
  return NextResponse.json({ ok: true, ...resultado });
}
