'use client';
import { useActionState } from 'react';
import { entrar, type Estado } from '../acoes';

export default function FormEntrar() {
  const [estado, acao, enviando] = useActionState<Estado, FormData>(entrar, {});
  return (
    <form action={acao} className="fgrid" style={{ gridTemplateColumns: '1fr' }}>
      <label className="fld"><span>E-mail</span><input name="email" type="email" required autoComplete="username" autoFocus /></label>
      <label className="fld"><span>Senha</span><input name="senha" type="password" required autoComplete="current-password" /></label>
      {estado.erro && <p className="lerr" role="alert">{estado.erro}</p>}
      <button className="btn btn-p btn-l" type="submit" disabled={enviando}>{enviando ? 'Entrando…' : 'Entrar'}</button>
    </form>
  );
}
