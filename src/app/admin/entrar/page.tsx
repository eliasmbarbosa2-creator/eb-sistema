import type { Metadata } from 'next';
import { supabaseConfigurado } from '@/lib/supabase/config';
import FormEntrar from './FormEntrar';

export const metadata: Metadata = { title: 'Entrar', robots: { index: false, follow: false } };

export default function Entrar() {
  return (
    <div className="login gut">
      <div className="lbox card">
        <img className="lg-d" src="/marca/marca.png" alt="" style={{ height: 40, width: 'auto' }} />
        <img className="lg-l" src="/marca/marca-claro.png" alt="" style={{ height: 40, width: 'auto' }} />
        <h1>Área restrita</h1>
        {supabaseConfigurado ? <FormEntrar /> : (
          <p className="banner t-warn">O banco de dados ainda não foi configurado. Cadastre as variáveis do Supabase na Vercel.</p>
        )}
      </div>
    </div>
  );
}
