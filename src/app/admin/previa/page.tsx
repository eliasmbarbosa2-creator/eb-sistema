import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { adminAtual, supabaseServidor } from '@/lib/supabase/server';
import { carregarSitePublico, carregarPortfolio } from '@/lib/dados-publicos';
import { mesclarConteudo } from '@/lib/conteudo';
import { supabaseConfigurado } from '@/lib/supabase/config';
import SitePublico from '@/components/SitePublico';

export const metadata: Metadata = { title: 'Pré-visualização', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

// Mostra o site com o RASCUNHO do conteúdo. Só o administrador vê.
export default async function Previa() {
  if (!supabaseConfigurado || !(await adminAtual())) redirect('/admin/entrar');
  const sb = await supabaseServidor();
  const [{ data }, { empresa }, trabalhos] = await Promise.all([
    sb.from('conteudo_site').select('publicado,rascunho').eq('id', 1).maybeSingle(),
    carregarSitePublico(), carregarPortfolio(),
  ]);
  const conteudo = mesclarConteudo(data?.rascunho ?? data?.publicado);
  return (
    <SitePublico empresa={empresa} conteudo={conteudo} trabalhos={trabalhos} previa={
      <div className="pvbar gut"><span><b>Pré-visualização:</b> {data?.rascunho ? 'estas alterações ainda não estão publicadas.' : 'não há alterações pendentes; este é o site publicado.'}</span>
        <div className="actions"><a className="btn btn-s" href="/admin/conteudo">Voltar à edição</a></div></div>
    } />
  );
}
