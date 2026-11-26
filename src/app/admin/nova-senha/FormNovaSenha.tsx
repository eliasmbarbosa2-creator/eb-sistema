'use client';
import { useActionState } from 'react';
import { definirNovaSenha, type Estado } from '../acoes';

export default function FormNovaSenha() {
  const [estado, acao, enviando] = useActionState<Estado, FormData>(definirNovaSenha, {});
  return (
    <form action={acao} className="fgrid" style={{ gridTemplateColumns: '1fr' }}>
      <label className="fld"><span>Senha nova</span><input name="senha" type="password" required minLength={10} autoComplete="new-password" autoFocus /></label>
      <label className="fld"><span>Repita a senha</span><input name="senha2" type="password" required minLength={10} autoComplete="new-password" /></label>
      {estado.erro && <p className="lerr" role="alert">{estado.erro}</p>}
      <button className="btn btn-p btn-l" type="submit" disabled={enviando}>{enviando ? 'Salvando…' : 'Salvar senha e entrar'}</button>
    </form>
  );
}
