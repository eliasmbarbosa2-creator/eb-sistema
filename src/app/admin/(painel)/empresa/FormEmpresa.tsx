'use client';
import { useActionState } from 'react';
import { salvarEmpresa, type Estado } from '../../acoes';

const CAMPOS: [string, string, boolean?][] = [
  ['nome', 'Nome da empresa'], ['responsavel', 'Responsável técnico'], ['registro', 'Registro profissional (ex.: Técnico em Eletrotécnica · CFT nº …)', true],
  ['telefone', 'Telefone / WhatsApp'], ['email', 'E-mail'], ['cidade', 'Cidade – UF'], ['regiao', 'Região atendida'],
];

export default function FormEmpresa({ inicial }: { inicial: Record<string, string> }) {
  const [estado, acao, enviando] = useActionState<Estado, FormData>(salvarEmpresa, {});
  return (
    <form action={acao} className="fgrid">
      {CAMPOS.map(([k, l, largo]) => (
        <label key={k} className={`fld ${largo ? 'span2' : ''}`}><span>{l}</span><input name={k} defaultValue={inicial[k] ?? ''} required={k === 'nome'} /></label>
      ))}
      <div className="span2 actions" style={{ alignItems: 'center' }}>
        <button className="btn btn-p" type="submit" disabled={enviando}>{enviando ? 'Salvando…' : 'Salvar dados'}</button>
        {estado.ok && <span className="okline" role="status">{estado.ok}</span>}
        {estado.erro && <span className="lerr" role="alert">{estado.erro}</span>}
      </div>
    </form>
  );
}
