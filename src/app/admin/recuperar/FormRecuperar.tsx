'use client';
import { useActionState } from 'react';
import { pedirRecuperacao, type Estado } from '../acoes';

export default function FormRecuperar() {
  const [estado, acao, enviando] = useActionState<Estado, FormData>(pedirRecuperacao, {});
  if (estado.ok) return <p className="banner t-ok" role="status">{estado.ok}</p>;
  return (
    <form action={acao} className="fgrid" style={{ gridTemplateColumns: '1fr' }}>
      <label className="fld"><span>E-mail</span><input name="email" type="email" required autoComplete="username" autoFocus /></label>
      {estado.erro && <p className="lerr" role="alert">{estado.erro}</p>}
      <button className="btn btn-p btn-l" type="submit" disabled={enviando}>{enviando ? 'Enviando…' : 'Enviar link'}</button>
    </form>
  );
}
