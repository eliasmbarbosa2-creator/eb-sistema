import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { adminAtual, supabaseServidor } from '@/lib/supabase/server';
import { supabaseConfigurado } from '@/lib/supabase/config';
import { sair } from '../acoes';
import Menu from './Menu';

export const metadata: Metadata = {
  title: 'Sistema',
  robots: { index: false, follow: false },
  manifest: '/app/eb.webmanifest', // só as páginas do sistema apontam para o app instalável
  appleWebApp: { capable: true, title: 'EB Sistema', statusBarStyle: 'black-translucent' },
  icons: { apple: '/app/icone-192.png' },
};
export const dynamic = 'force-dynamic';

export default async function LayoutAdmin({ children }: { children: React.ReactNode }) {
  if (!supabaseConfigurado) redirect('/admin/entrar');
  const user = await adminAtual();
  if (!user) redirect('/admin/entrar');
  const supabase = await supabaseServidor();
  const { data: empresa } = await supabase.from('empresa').select('nome').eq('id', 1).maybeSingle();
  const hoje = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
  const [{ count: novos }, { count: atrasadas }, { data: mats }] = await Promise.all([
    supabase.from('clientes').select('id', { count: 'exact', head: true }).eq('status', 'novo'),
    supabase.from('parcelas').select('id', { count: 'exact', head: true }).eq('pago', false).lt('vencimento', hoje),
    supabase.from('materiais').select('quantidade,minimo').eq('ativo', true).gt('minimo', 0),
  ]);
  const baixo = (mats ?? []).filter((m) => Number(m.quantidade) <= Number(m.minimo)).length;

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
        <aside className="side"><Menu novos={novos ?? 0} atrasadas={atrasadas ?? 0} baixo={baixo} /></aside>
        <main className="main">{children}</main>
      </div>
    </>
  );
}
