'use client';
import { useActionState, useEffect, useRef, useState } from 'react';
import { enviarPedido, type EstadoPedido } from '@/app/acoes-publicas';

export default function FormPedido({ servicos }: { servicos: string[] }) {
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
      if (servico) (f.elements.namedItem('servico') as HTMLSelectElement).value = servico;
      const ta = f.elements.namedItem('mensagem') as HTMLTextAreaElement;
      if (mensagem && !ta.value) ta.value = mensagem;
      (f.elements.namedItem('nome') as HTMLInputElement).focus({ preventScroll: true });
    };
    window.addEventListener('eb:pedir', ouvir);
    return () => window.removeEventListener('eb:pedir', ouvir);
  }, []);

  if (estado.ok && !enviando) {
    return (
      <div className="ok-box" role="status">
        <h3>Pedido recebido</h3>
        <p>Obrigado! Retorno em até 1 dia útil para combinar a visita técnica.</p>
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
      <label className="fld"><span>Nome *</span><input name="nome" required autoComplete="name" aria-invalid={estado.campo === 'nome'} /></label>
      <label className="fld"><span>Telefone / WhatsApp *</span><input name="telefone" required inputMode="tel" autoComplete="tel" placeholder="(00) 00000-0000" aria-invalid={estado.campo === 'telefone'} /></label>
      <label className="fld"><span>E-mail</span><input name="email" type="email" autoComplete="email" aria-invalid={estado.campo === 'email'} /></label>
      <label className="fld"><span>Tipo de imóvel</span><select name="tipo"><option>Residencial</option><option>Comercial</option><option>Industrial</option></select></label>
      <label className="fld"><span>Endereço do serviço</span><input name="endereco" placeholder="Rua, número" autoComplete="street-address" /></label>
      <label className="fld"><span>Bairro / cidade</span><input name="cidade" /></label>
      <label className="fld"><span>Serviço</span><select name="servico">{servicos.map((s) => <option key={s}>{s}</option>)}</select></label>
      <label className="fld"><span>Urgência</span><select name="urgencia"><option>Sem pressa</option><option>Nas próximas semanas</option><option>Urgente (falta de energia ou risco)</option></select></label>
      <label className="fld span2"><span>Melhor horário para contato</span><select name="horario"><option>Qualquer horário</option><option>Manhã</option><option>Tarde</option><option>Noite</option></select></label>
      <label className="fld span2"><span>Descreva o que precisa</span><textarea name="mensagem" rows={4} maxLength={2000} placeholder="Ex.: troca do quadro de uma casa com 2 banheiros e chuveiros de 7.500 W" /></label>
      {estado.erro && <p className="lerr span2" role="alert">{estado.erro}</p>}
      <div className="span2 fsend">
        <button className="btn btn-p btn-l" type="submit" disabled={enviando || !t}>{enviando ? 'Enviando…' : 'Enviar pedido de orçamento'}</button>
        <span className="sub">Seus dados são usados só para o orçamento.</span>
      </div>
    </form>
  );
}
