export const STATUS_CLIENTE: Record<string, [string, string]> = {
  novo: ['Novo', 'info'], contato: ['Em contato', 'warn'], orcamento: ['Orçamento enviado', 'accent'],
  fechado: ['Fechado', 'ok'], perdido: ['Perdido', 'mute'],
};
export const dataBR = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
export const dataHoraBR = (iso: string) => new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' });
