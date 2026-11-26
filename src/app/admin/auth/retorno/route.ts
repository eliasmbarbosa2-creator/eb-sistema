import { NextResponse, type NextRequest } from 'next/server';
import { supabaseServidor } from '@/lib/supabase/server';

// Destino do link enviado por e-mail (recuperar senha): troca o código por uma sessão.
export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const codigo = url.searchParams.get('code');
  const proximo = url.searchParams.get('proximo') ?? '/admin';
  const destino = proximo.startsWith('/admin') ? proximo : '/admin';
  if (codigo) {
    const supabase = await supabaseServidor();
    const { error } = await supabase.auth.exchangeCodeForSession(codigo);
    if (!error) return NextResponse.redirect(new URL(destino, url.origin));
    console.warn('[retorno] link inválido:', error.message);
  }
  return NextResponse.redirect(new URL('/admin/recuperar?link=invalido', url.origin));
}
