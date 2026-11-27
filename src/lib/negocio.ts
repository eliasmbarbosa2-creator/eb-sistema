// Regras e textos compartilhados (mesmas do protótipo aprovado).

export const brl = (v: number) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const num = (v: number) => (Math.round((Number(v) || 0) * 100) / 100).toLocaleString('pt-BR');
export const r2 = (v: number) => Math.round(v * 100) / 100;
export const hojeISO = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
export const dataBR = (iso?: string | null) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '—');
export const somarDias = (iso: string, d: number) => {
  const x = new Date(iso + 'T12:00:00'); x.setDate(x.getDate() + d); return x.toISOString().slice(0, 10);
};
export const diasEntre = (a: string, b: string) => Math.round((new Date(b + 'T12:00:00').getTime() - new Date(a + 'T12:00:00').getTime()) / 864e5);

// Unidades: [código, rótulo na lista, singular, plural]
export const UNIDADES: [string, string, string, string][] = [
  ['vb', 'serviço fechado', 'serviço', 'serviços'], ['dia', 'dia de trabalho', 'dia', 'dias'], ['h', 'hora', 'hora', 'horas'],
  ['pt', 'ponto', 'ponto', 'pontos'], ['m', 'metro', 'm', 'm'], ['pç', 'peça', 'peça', 'peças'], ['rl', 'rolo', 'rolo', 'rolos'],
  ['un', 'unidade', 'unidade', 'unidades'], ['cx', 'caixa', 'caixa', 'caixas'], ['kg', 'quilo', 'kg', 'kg'],
];
export const UNIDADES_MATERIAL = UNIDADES.filter((u) => !['vb', 'dia', 'h'].includes(u[0]));
export function fmtQtd(q: number, un: string) {
  const u = UNIDADES.find((x) => x[0] === un);
  return `${num(q)} ${u ? (Number(q) === 1 ? u[2] : u[3]) : un}`.trim();
}

export const CATEGORIAS_MATERIAL = ['Cabos e fios', 'Proteção', 'Quadros e barramentos', 'Comando e automação', 'Infraestrutura', 'Tomadas e iluminação', 'Outros'];

export const STATUS_ORC: Record<string, [string, string]> = {
  rascunho: ['Rascunho', 'mute'], enviado: ['Enviado', 'info'], aprovado: ['Aprovado', 'ok'], recusado: ['Recusado', 'bad'],
};
export const CONDICOES: Record<string, string> = {
  avista_ato: 'À vista, na aprovação do orçamento',
  avista: 'À vista em até 15 dias após a conclusão',
  entrada50: '50% de entrada + 50% na entrega',
  p3x: '3 parcelas mensais (entrada, 30 e 60 dias)',
};
export const PRAZO_UN: Record<string, [string, string]> = {
  du: ['dia útil', 'dias úteis'], dc: ['dia corrido', 'dias corridos'], h: ['hora de trabalho', 'horas de trabalho'], sem: ['semana', 'semanas'],
};
export const PRAZO_INICIO: Record<string, string> = {
  aprov: 'a partir da aprovação do orçamento', entrada: 'a partir do pagamento da entrada', inicio: 'a partir do início dos trabalhos na obra',
};

export type Item = { tipo: 'servico' | 'material'; material_id: string | null; descricao: string; quantidade: number; unidade: string; valor_unit: number; custo_unit?: number };
export type OrcBase = {
  data: string; validade_dias: number; condicao: string; desconto: number;
  prazo_qtd: number | null; prazo_unidade: string; prazo_inicio: string;
};

export function totais(itens: Item[], desconto: number) {
  const srv = itens.filter((i) => i.tipo === 'servico').reduce((s, i) => s + r2(i.quantidade * i.valor_unit), 0);
  const mat = itens.filter((i) => i.tipo === 'material').reduce((s, i) => s + r2(i.quantidade * i.valor_unit), 0);
  const margem = itens.filter((i) => i.tipo === 'material').reduce((s, i) => s + (i.valor_unit - (i.custo_unit ?? 0)) * i.quantidade, 0);
  return { srv, mat, margem, total: Math.max(0, r2(srv + mat - (Number(desconto) || 0))) };
}
export const validoAte = (o: OrcBase) => somarDias(o.data, Number(o.validade_dias) || 0);
export function prazoTxt(o: OrcBase) {
  const q = Number(o.prazo_qtd) || 0;
  if (q > 0) { const u = PRAZO_UN[o.prazo_unidade] ?? PRAZO_UN.du; return `${num(q)} ${q === 1 ? u[0] : u[1]}, ${PRAZO_INICIO[o.prazo_inicio] ?? PRAZO_INICIO.aprov}`; }
  return 'A combinar com o cliente';
}
export function condicaoTxt(o: OrcBase, total: number) {
  if (o.condicao === 'avista_ato') return `À vista: ${brl(total)} na aprovação do orçamento`;
  if (o.condicao === 'avista') return `À vista: ${brl(total)} em até 15 dias após a conclusão do serviço`;
  if (o.condicao === 'entrada50') { const a = r2(total / 2); return `Entrada de ${brl(a)} na aprovação + ${brl(r2(total - a))} na entrega do serviço`; }
  const a = r2(total / 3); return `3 parcelas: ${brl(a)} na aprovação, ${brl(a)} em 30 dias e ${brl(r2(total - 2 * a))} em 60 dias`;
}
export const diasTxt = (n: number) => `${n} ${Number(n) === 1 ? 'dia' : 'dias'}`;
export function linkWhatsAppPara(telefone: string, texto: string) {
  let d = telefone.replace(/\D/g, ''); if (d.length >= 10 && d.length <= 11) d = '55' + d;
  return `https://wa.me/${d}?text=${encodeURIComponent(texto)}`;
}
