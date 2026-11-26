// Ícones de traço (24x24), os mesmos do protótipo. Conteúdo fixo, definido aqui no código.
export const ICONES: Record<string, string> = {
  prj:'<path d="M6 3h9l3 3v15H6z"/><path d="M15 3v3h3"/><path d="M9 11h6M9 14.5h6M9 18h3"/>',
  qdc:'<rect x="4.5" y="3" width="15" height="18" rx="1.5"/><path d="M8 7.5h8M8 11h8"/><circle cx="9.5" cy="16" r="1.3"/><circle cx="14.5" cy="16" r="1.3"/>',
  ins:'<path d="M9 3v5M15 3v5"/><path d="M6.5 8h11v3.5a5.5 5.5 0 0 1-11 0z"/><path d="M12 17v4"/>',
  shield:'<path d="M12 3l7 3v5c0 4.8-3.3 8.4-7 10-3.7-1.6-7-5.2-7-10V6z"/><path d="M9 12l2 2 4-4"/>',
  doc:'<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4"/><path d="M10 13l1.5 1.5L15 11"/>',
  badge:'<circle cx="12" cy="9" r="5"/><path d="M9 13.5L8 21l4-2 4 2-1-7.5"/>',
  tag:'<path d="M4 4h7l9 9-7 7-9-9z"/><circle cx="8.5" cy="8.5" r="1.4"/>',
  list:'<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2"/>',
  clock:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  home:'<path d="M4 11l8-7 8 7"/><path d="M6 10v10h12V10"/><path d="M10 20v-5h4v5"/>',
  shop:'<path d="M4 9l1.5-5h13L20 9"/><path d="M4 9h16v2a3 3 0 0 1-5.3 2 3 3 0 0 1-5.4 0A3 3 0 0 1 4 11z"/><path d="M5.5 13.5V20h13v-6.5"/>',
  fab:'<path d="M3 21V10l5 3V10l5 3V6h4l1 15z"/><path d="M8 21v-3h3v3"/>',
  wa:'<path d="M4 20l1.3-3.9A8 8 0 1 1 8 19z"/><path d="M9.2 8.8c0 3 2.5 5.8 5.8 6.2l1-1.4-1.9-1-.9.8c-1-.4-2.1-1.5-2.5-2.5l.8-.9-1-1.9z" fill="currentColor" stroke="none"/>',
  bolt:'<path d="M13 3L5 13.5h6L10 21l9-11.5h-6z"/>'
};

export function Icone({ nome, tamanho = 22 }: { nome: string; tamanho?: number }) {
  const d = ICONES[nome];
  if (!d) return null;
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: d }} />
  );
}

export const NOMES_ICONES: Record<string, string> = {
  prj: 'Projeto (folha)', qdc: 'Quadro elétrico', ins: 'Tomada', bolt: 'Raio', shield: 'Escudo (segurança)',
  badge: 'Selo (certificado)', clock: 'Relógio', doc: 'Documento', list: 'Lista', tag: 'Etiqueta',
  home: 'Casa', shop: 'Loja', fab: 'Fábrica', wa: 'WhatsApp',
};
