// Aceita a URL do Supabase mesmo se for colada com sufixos (ex.: ".../rest/v1/") ou espaços.
function normalizarUrl(bruta: string) {
  const s = bruta.trim().replace(/\/+$/, '');
  try {
    const u = new URL(s);
    return `${u.protocol}//${u.host}`;
  } catch {
    return s;
  }
}

export const SUPABASE_URL = normalizarUrl(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '');
export const SUPABASE_ANON_KEY = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();
/** false enquanto as variáveis do Supabase não foram cadastradas (ex.: primeiro deploy). */
export const supabaseConfigurado = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
