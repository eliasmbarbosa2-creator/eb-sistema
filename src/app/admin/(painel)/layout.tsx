import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { adminAtual, supabaseServidor } from '@/lib/supabase/server';
import { supabaseConfigurado } from '@/lib/supabase/config';
import { sair } from '../acoes';
import Menu from './Menu';

export const metadata: Metadata = { title: 'Sistema', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function LayoutAdmin({ children }: { children: React.ReactNode }) {
  if (!supabaseConfigurado) redirect('/admin/entrar');
  const user = await adminAtual();
  if (!user) redirect('/admin/entrar');
  const supabase = await supabaseServidor();
  const { data: empresa } = await supabase.from('empresa').select('nome').eq('id', 1).maybeSingle();
  const { count: novos } = await supabase.from('clientes').select('id', { count: 'exact', head: true }).eq('status', 'novo');

  return (
    <>
      <header className="top">
        <div className="top-in gut">
          <a className="brand" href="/admin">
            <img className="lg-d" src="/marca/marca.png" alt="" />
            <img className="lg-l" src="/marca/marca-claro.png" alt="" />
            <span>{empresa?.nome ?? 'EB Instalações Elétricas'}</span>
          </a>
          <nav className="mode" aria-label="Alternar área">
            <a href="/" target="_blank" rel="noopener">Ver site</a>
            <a href="/admin" className="on">Sistema</a>
          </nav>
          <form action={sair}><button className="btn btn-s btn-g" type="submit">Sair</button></form>
        </div>
      </header>
      <div className="app gut">
        <aside className="side"><Menu novos={novos ?? 0} /></aside>
        <main className="main">{children}</main>
      </div>
    </>
  );
}
