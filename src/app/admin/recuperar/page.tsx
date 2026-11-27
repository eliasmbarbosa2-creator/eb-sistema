import type { Metadata } from 'next';
import FormRecuperar from './FormRecuperar';

export const metadata: Metadata = { title: 'Recuperar senha', robots: { index: false, follow: false },
  manifest: '/app/eb.webmanifest', icons: { apple: '/app/icone-192.png' }, appleWebApp: { capable: true, title: 'EB Sistema' } };

export default async function Recuperar({ searchParams }: { searchParams: Promise<{ link?: string }> }) {
  const { link } = await searchParams;
  return (
    <div className="login gut">
      <div className="lbox card">
        <h1>Esqueci minha senha</h1>
        {link === 'invalido' && <p className="banner t-bad">O link expirou ou já foi usado. Peça um novo abaixo.</p>}
        <p className="sub">Informe o e-mail de administrador. Vamos enviar um link para você criar uma senha nova.</p>
        <FormRecuperar />
        <a className="link" href="/admin/entrar">← Voltar para entrar</a>
      </div>
    </div>
  );
}
