export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
/** false enquanto as variáveis do Supabase não foram cadastradas (ex.: primeiro deploy). */
export const supabaseConfigurado = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
