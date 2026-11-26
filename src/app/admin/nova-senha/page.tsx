import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { adminAtual } from '@/lib/supabase/server';
import FormNovaSenha from './FormNovaSenha';

export const metadata: Metadata = { title: 'Nova senha', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function NovaSenha() {
  if (!(await adminAtual())) redirect('/admin/entrar');
  return (
    <div className="login gut">
      <div className="lbox card">
        <h1>Criar senha nova</h1>
        <p className="sub">Use pelo menos 10 caracteres. Uma frase curta com números é fácil de lembrar e difícil de adivinhar.</p>
        <FormNovaSenha />
      </div>
    </div>
  );
}
