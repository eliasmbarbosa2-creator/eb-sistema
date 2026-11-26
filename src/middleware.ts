import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { SUPABASE_URL, SUPABASE_ANON_KEY, supabaseConfigurado } from '@/lib/supabase/config';

// Protege tudo em /admin. Quem não está logado vai para /admin/entrar,
// página que não tem link em lugar nenhum do site e não aparece no Google.
export async function middleware(req: NextRequest) {
  if (!supabaseConfigurado) return NextResponse.next();

  let res = NextResponse.next({ request: req });
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(lista) {
        lista.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        lista.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  const caminho = req.nextUrl.pathname;
  const naEntrada = caminho === '/admin/entrar';
  // Páginas de acesso que funcionam sem login (entrar, recuperar senha e o retorno do link do e-mail)
  const livre = naEntrada || caminho === '/admin/recuperar' || caminho.startsWith('/admin/auth/');

  if (!user && !livre) {
    const url = req.nextUrl.clone();
    url.pathname = '/admin/entrar';
    url.search = '';
    return NextResponse.redirect(url);
  }
  if (user && naEntrada) {
    const url = req.nextUrl.clone();
    url.pathname = '/admin';
    url.search = '';
    return NextResponse.redirect(url);
  }
  return res;
}

export const config = { matcher: ['/admin', '/admin/:path*'] };
