import 'server-only';
import ExcelJS from 'exceljs';
import type { SupabaseClient } from '@supabase/supabase-js';

type Aba = { nome: string; tabela: string; ordem: string; colunas: [string, string, number?][] };
// Cada aba da planilha: [campo no banco, título da coluna, largura]
const ABAS: Aba[] = [
  { nome: 'Clientes', tabela: 'clientes', ordem: 'criado_em', colunas: [['criado_em', 'Recebido em', 18], ['nome', 'Nome', 28], ['telefone', 'Telefone', 16], ['email', 'E-mail', 26], ['documento', 'CPF/CNPJ', 18], ['endereco', 'Endereço', 30], ['cidade', 'Bairro/cidade', 20], ['tipo', 'Tipo'], ['servico', 'Serviço', 20], ['urgencia', 'Urgência', 18], ['origem', 'Origem'], ['status', 'Status'], ['mensagem', 'Mensagem', 40]] },
  { nome: 'Orçamentos', tabela: 'orcamentos', ordem: 'criado_em', colunas: [['numero', 'Número', 16], ['data', 'Emissão', 12], ['cliente_id', 'ID do cliente', 38], ['status', 'Status'], ['validade_dias', 'Validade (dias)'], ['condicao', 'Condição'], ['desconto', 'Desconto'], ['prazo_qtd', 'Prazo'], ['prazo_unidade', 'Unid. prazo'], ['endereco_obra', 'Endereço da obra', 30], ['observacoes', 'Observações', 40], ['aprovado_em', 'Aprovado em', 18], ['id', 'ID', 38]] },
  { nome: 'Itens dos orçamentos', tabela: 'orcamento_itens', ordem: 'orcamento_id', colunas: [['orcamento_id', 'ID do orçamento', 38], ['ordem', 'Ordem'], ['tipo', 'Tipo'], ['descricao', 'Descrição', 40], ['quantidade', 'Quantidade'], ['unidade', 'Unidade'], ['valor_unit', 'Valor unitário'], ['custo_unit', 'Custo unitário']] },
  { nome: 'Serviços', tabela: 'servicos', ordem: 'criado_em', colunas: [['numero', 'Número', 16], ['titulo', 'Título', 34], ['cliente_id', 'ID do cliente', 38], ['orcamento_id', 'ID do orçamento', 38], ['status', 'Status'], ['inicio', 'Início', 12], ['endereco', 'Endereço', 30], ['baixa_feita', 'Material retirado'], ['notas', 'Anotações', 40]] },
  { nome: 'Parcelas', tabela: 'parcelas', ordem: 'vencimento', colunas: [['servico_id', 'ID do serviço', 38], ['descricao', 'Parcela', 24], ['vencimento', 'Vencimento', 12], ['valor', 'Valor'], ['pago', 'Pago'], ['pago_em', 'Pago em', 12], ['forma', 'Forma', 16]] },
  { nome: 'Materiais', tabela: 'materiais', ordem: 'nome', colunas: [['codigo', 'Código', 12], ['nome', 'Material', 40], ['categoria', 'Categoria', 20], ['unidade', 'Unidade'], ['quantidade', 'Saldo'], ['minimo', 'Mínimo'], ['custo', 'Custo'], ['preco', 'Preço de venda'], ['local', 'Local', 18], ['fornecedor', 'Fornecedor', 24], ['id', 'ID', 38]] },
  { nome: 'Movimentações', tabela: 'movimentacoes', ordem: 'criado_em', colunas: [['data', 'Data', 12], ['material_id', 'ID do material', 38], ['tipo', 'Tipo'], ['quantidade', 'Quantidade'], ['observacao', 'Observação', 40]] },
  { nome: 'Portfólio', tabela: 'portfolio', ordem: 'ordem', colunas: [['titulo', 'Título', 34], ['categoria', 'Categoria', 20], ['local', 'Local', 20], ['ano', 'Ano'], ['descricao', 'Descrição', 50], ['destaques', 'Destaques', 30], ['fotos', 'Fotos (caminhos)', 40], ['publicado', 'No site']] },
];

const NUMERICOS = new Set(['desconto', 'quantidade', 'valor_unit', 'custo_unit', 'valor', 'minimo', 'custo', 'preco', 'prazo_qtd']);
const DATA_HORA = new Set(['criado_em', 'aprovado_em']);
const DATA = new Set(['data', 'vencimento', 'inicio', 'pago_em']);

// O Excel não guarda fuso horário: grava o horário "de parede" de Brasília.
const horaBrasilia = (iso: string) => new Date(new Date(iso).toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' }).replace(' ', 'T') + 'Z');

/** Gera a planilha com todos os dados. Funciona com o cliente do administrador ou com a chave de serviço. */
export async function gerarBackup(sb: SupabaseClient): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'EB Sistema'; wb.created = new Date();
  for (const aba of ABAS) {
    const ws = wb.addWorksheet(aba.nome, { views: [{ state: 'frozen', ySplit: 1 }] });
    ws.columns = aba.colunas.map(([k, t, w]) => ({
      header: t, key: k, width: w ?? 14,
      style: DATA_HORA.has(k) ? { numFmt: 'dd/mm/yyyy hh:mm' } : DATA.has(k) ? { numFmt: 'dd/mm/yyyy' } : NUMERICOS.has(k) ? { numFmt: '#,##0.00' } : {},
    }));
    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0380AC' } };
    const linhas: Record<string, unknown>[] = [];
    for (let de = 0; ; de += 1000) {   // busca em páginas de 1000 linhas
      const { data, error } = await sb.from(aba.tabela).select(aba.colunas.map((c) => c[0]).join(',')).order(aba.ordem).range(de, de + 999);
      if (error) throw new Error(`${aba.tabela}: ${error.message}`);
      linhas.push(...((data ?? []) as unknown as Record<string, unknown>[]));
      if (!data || data.length < 1000) break;
    }
    for (const l of linhas) {
      const v: Record<string, unknown> = {};
      for (const [k] of aba.colunas) {
        const x = l[k];
        v[k] = Array.isArray(x) ? x.join(', ')
          : typeof x === 'boolean' ? (x ? 'Sim' : 'Não')
          : x == null || x === '' ? ''
          : NUMERICOS.has(k) ? Number(x)
          : DATA_HORA.has(k) ? horaBrasilia(String(x))
          : DATA.has(k) ? new Date(`${String(x).slice(0, 10)}T12:00:00`)
          : x;
      }
      ws.addRow(v);
    }
  }
  return Buffer.from(await wb.xlsx.writeBuffer());
}

export const nomeBackup = () => `EB backup ${new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })}.xlsx`;
