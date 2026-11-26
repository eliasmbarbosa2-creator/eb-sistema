import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL } from './config';

/**
 * Cliente com a chave de serviço (acesso total). Usado SÓ no servidor, para tarefas
 * internas como enviar avisos. A variável SUPABASE_SERVICE_ROLE_KEY nunca vai para o navegador.
 */
export function supabaseServico() {
  const chave = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();
  if (!SUPABASE_URL || !chave) return null;
  return createClient(SUPABASE_URL, chave, { auth: { persistSession: false, autoRefreshToken: false } });
}
