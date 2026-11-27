'use client';
import { useActionState, useEffect, useRef, useState } from 'react';
import { enviarPedido, type EstadoPedido } from '@/app/acoes-publicas';
import type { Formulario } from '@/lib/conteudo';

export default function FormPedido({ servicos, form: F }: { servicos: string[]; form: Formulario }) {
  const C = F.campos;
  const [estado, acao, enviando] = useActionState<EstadoPedido, FormData>(enviarPedido, {});
  const [t, setT] = useState('');
  const [novo, setNovo] = useState(0);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => setT(String(Date.now())), [novo]);

  // Botões "Pedir orçamento" do site preenchem o serviço e a mensagem.
  useEffect(() => {
    const ouvir = (e: Event) => {
      const { servico, mensagem } = (e as CustomEvent<{ servico?: string; mensagem?: string }>).detail ?? {};
      const f = form.current;
      if (!f) return;
      const sel = f.elements.namedItem('servico') as HTMLSelectElement | null;
      if (servico && sel) sel.value = servico;
      const ta = f.elements.namedItem('mensagem') as HTMLTextAreaElement | null;
      if (mensagem && ta && !ta.value) ta.value = mensagem;
      (f.elements.namedItem('nome') as HTMLInputElement).focus({ preventScroll: true });
    };
    window.addEventListener('eb:pedir', ouvir);
    return () => window.removeEventListener('eb:pedir', ouvir);
  }, []);

  if (estado.ok && !enviando) {
    return (
      <div className="ok-box" role="status">
        <h3>{F.sucessoTitulo}</h3>
        <p>{F.sucessoTexto}</p>
        <div className="actions"><button className="btn" type="button" onClick={() => { setNovo((n) => n + 1); location.hash = 'contato'; location.reload(); }}>Enviar outro pedido</button></div>
      </div>
    );
  }

  return (
    <form ref={form} action={acao} className="fgrid" noValidate={false}>
      <input type="hidden" name="t" value={t} />
      <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, overflow: 'hidden' }}>
        <label>Não preencha<input name="site" tabIndex={-1} autoComplete="off" /></label>
      </div>
      <label className="fld"><span>{F.nomeRotulo} *</span><input name="nome" required autoComplete="name" aria-invalid={estado.campo === 'nome'} /></label>
      <label className="fld"><span>{F.telefoneRotulo} *</span><input name="telefone" required inputMode="tel" autoComplete="tel" placeholder="(00) 00000-0000" aria-invalid={estado.campo === 'telefone'} /></label>
      {C.email.mostrar && <label className="fld"><span>{C.email.rotulo}</span><input name="email" type="email" autoComplete="email" aria-invalid={estado.campo === 'email'} /></label>}
      {C.tipo.mostrar && <label className="fld"><span>{C.tipo.rotulo}</span><select name="tipo"><option>Residencial</option><option>Comercial</option><option>Industrial</option></select></label>}
      {C.endereco.mostrar && <label className="fld"><span>{C.endereco.rotulo}</span><input name="endereco" placeholder="Rua, número" autoComplete="street-address" /></label>}
      {C.cidade.mostrar && <label className="fld"><span>{C.cidade.rotulo}</span><input name="cidade" /></label>}
      {C.servico.mostrar && <label className="fld"><span>{C.servico.rotulo}</span><select name="servico">{servicos.map((s) => <option key={s}>{s}</option>)}</select></label>}
      {C.urgencia.mostrar && <label className="fld"><span>{C.urgencia.rotulo}</span><select name="urgencia">{F.urgencias.map((u) => <option key={u}>{u}</option>)}</select></label>}
      {C.horario.mostrar && <label className="fld span2"><span>{C.horario.rotulo}</span><select name="horario">{F.horarios.map((h) => <option key={h}>{h}</option>)}</select></label>}
      {C.mensagem.mostrar && <label className="fld span2"><span>{C.mensagem.rotulo}</span><textarea name="mensagem" rows={4} maxLength={2000} placeholder={F.mensagemExemplo} /></label>}
      {estado.erro && <p className="lerr span2" role="alert">{estado.erro}</p>}
      <div className="span2 fsend">
        <button className="btn btn-p btn-l" type="submit" disabled={enviando || !t}>{enviando ? 'Enviando…' : F.botao}</button>
        {F.aviso && <span className="sub">{F.aviso}</span>}
      </div>
    </form>
  );
}
