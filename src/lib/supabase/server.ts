import 'server-only';
import { cache } from 'react';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config';

/** Cliente do Supabase para Server Components, Server Actions e rotas (um por requisição). */
export const supabaseServidor = cache(async () => {
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(lista) {
        try {
          lista.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Chamado de um Server Component: o middleware já renova a sessão.
        }
      },
    },
  });
});

/**
 * Retorna o usuário logado somente se ele for administrador.
 * Fica em cache durante a requisição: layout, página e ações não repetem a verificação.
 */
export const adminAtual = cache(async () => {
  const supabase = await supabaseServidor();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: ehAdmin } = await supabase.rpc('is_admin');
  return ehAdmin ? user : null;
});
