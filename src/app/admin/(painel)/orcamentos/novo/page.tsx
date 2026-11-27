import { dadosEditor } from '../dados';
import Editor from '../Editor';

export default async function NovoOrcamento({ searchParams }: { searchParams: Promise<{ cliente?: string }> }) {
  const { cliente } = await searchParams;
  const d = await dadosEditor();
  const c = d.clientes.find((x) => x.id === cliente);
  return (
    <Editor {...d} inicial={{
      cliente_id: c?.id ?? '', data: new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }), validade_dias: 15, condicao: 'entrada50', desconto: 0,
      prazo_qtd: null, prazo_unidade: 'du', prazo_inicio: 'aprov', endereco_obra: c ? [c.endereco, c.cidade].filter(Boolean).join(' · ') : '', observacoes: '',
      status: 'rascunho', itens: [{ tipo: 'servico', material_id: null, descricao: c ? `Mão de obra: ${c.servico.toLowerCase()}` : '', quantidade: 1, unidade: 'vb', valor_unit: 0 }],
    }} />
  );
}
