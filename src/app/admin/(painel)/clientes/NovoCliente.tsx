'use client';
import { useActionState, useEffect, useState } from 'react';
import { salvarCliente, type Estado } from '../../acoes';

type C = { id: string; nome: string; telefone: string; email: string; documento: string; endereco: string; cidade: string; tipo: string; servico: string; mensagem: string; origem: string };

export default function NovoCliente({ cliente }: { cliente?: C }) {
  const [aberto, setAberto] = useState(false);
  const [estado, acao, enviando] = useActionState<Estado, FormData>(salvarCliente, {});
  useEffect(() => { if (estado.ok) setAberto(false); }, [estado]);
  const v = (k: keyof C) => cliente?.[k] ?? '';
  const sel = (n: string, ops: string[], atual: string) => <select name={n} defaultValue={atual || ops[0]}>{ops.map((o) => <option key={o}>{o}</option>)}</select>;
  return (
    <>
      <button className={cliente ? 'btn btn-s' : 'btn btn-p'} type="button" onClick={() => setAberto(true)}>{cliente ? 'Editar dados' : '+ Novo cliente'}</button>
      {aberto && (
        <div id="modal" onClick={(e) => e.target === e.currentTarget && setAberto(false)}>
          <div className="mbox" role="dialog" aria-modal="true">
            <div className="mh"><h2>{cliente ? 'Editar cliente' : 'Novo cliente'}</h2><button className="x" type="button" onClick={() => setAberto(false)} aria-label="Fechar">×</button></div>
            <form action={acao} className="fgrid">
              <input type="hidden" name="id" value={cliente?.id ?? ''} />
              <label className="fld span2"><span>Nome ou empresa *</span><input name="nome" required defaultValue={v('nome')} autoFocus /></label>
              <label className="fld"><span>Telefone *</span><input name="telefone" required defaultValue={v('telefone')} inputMode="tel" /></label>
              <label className="fld"><span>E-mail</span><input name="email" type="email" defaultValue={v('email')} /></label>
              <label className="fld"><span>CPF / CNPJ</span><input name="documento" defaultValue={v('documento')} /></label>
              <label className="fld"><span>Origem</span>{sel('origem', ['WhatsApp', 'Indicação', 'Instagram', 'Telefone', 'Site', 'Outro'], v('origem'))}</label>
              <label className="fld"><span>Endereço do serviço</span><input name="endereco" defaultValue={v('endereco')} /></label>
              <label className="fld"><span>Bairro / cidade</span><input name="cidade" defaultValue={v('cidade')} /></label>
              <label className="fld"><span>Tipo</span>{sel('tipo', ['Residencial', 'Comercial', 'Industrial'], v('tipo'))}</label>
              <label className="fld"><span>Serviço</span><input name="servico" defaultValue={v('servico')} /></label>
              <label className="fld span2"><span>Descrição do pedido</span><textarea name="mensagem" rows={3} defaultValue={v('mensagem')} /></label>
              {estado.erro && <p className="lerr span2" role="alert">{estado.erro}</p>}
              <div className="mfoot span2"><button type="button" className="btn btn-g" onClick={() => setAberto(false)}>Cancelar</button><button className="btn btn-p" type="submit" disabled={enviando}>{enviando ? 'Salvando…' : 'Salvar'}</button></div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
