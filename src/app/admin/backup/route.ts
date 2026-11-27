import { NextResponse } from 'next/server';
import { adminAtual, supabaseServidor } from '@/lib/supabase/server';
import { gerarBackup, nomeBackup } from '@/lib/backup';

export const dynamic = 'force-dynamic';

// Baixa a planilha com todos os dados (só para o administrador logado).
export async function GET() {
  if (!(await adminAtual())) return new NextResponse('Não autorizado', { status: 401 });
  try {
    const arq = await gerarBackup(await supabaseServidor());
    return new NextResponse(new Uint8Array(arq), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="backup.xlsx"; filename*=UTF-8''${encodeURIComponent(nomeBackup())}`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    console.error('[backup]', (e as Error).message);
    return new NextResponse('Não foi possível gerar o backup agora. Tente de novo.', { status: 500 });
  }
}
