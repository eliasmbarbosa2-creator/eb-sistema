'use client';
/** Leva até o formulário e já escolhe o serviço (e uma mensagem, se houver). */
export default function BotaoPedir({ servico, mensagem, children, className = 'link' }: { servico?: string; mensagem?: string; children: React.ReactNode; className?: string }) {
  return (
    <button type="button" className={className} onClick={() => {
      document.getElementById('contato')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.dispatchEvent(new CustomEvent('eb:pedir', { detail: { servico, mensagem } }));
    }}>{children}</button>
  );
}
