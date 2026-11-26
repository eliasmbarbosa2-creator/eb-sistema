import { supabaseServidor } from '@/lib/supabase/server';
import { urlFoto } from '@/lib/dados-publicos';
import EditorPortfolio, { type TrabalhoAdmin } from './EditorPortfolio';

export default async function PortfolioAdmin() {
  const supabase = await supabaseServidor();
  const { data } = await supabase.from('portfolio').select('*').order('ordem').order('criado_em', { ascending: false });
  const lista = (data ?? []) as TrabalhoAdmin[];
  const base = urlFoto('x/y').replace(/x\/y$/, '');
  return (
    <>
      <div className="ph"><div><h1>Portfólio</h1><p className="lead">Os trabalhos que aparecem em “Trabalhos realizados” no site</p></div></div>
      <EditorPortfolio lista={lista} baseFotos={base} />
    </>
  );
}
