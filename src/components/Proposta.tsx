import { brl, dataBR, diasTxt, fmtQtd, prazoTxt, condicaoTxt, totais, validoAte, type Item, type OrcBase } from '@/lib/negocio';

export type DadosProposta = {
  orc: OrcBase & { numero: string; revisao?: number; observacoes: string; endereco_obra: string; status: string; aprovado_em?: string | null };
  itens: Item[];
  cliente: { nome: string; telefone: string; email: string; documento: string; endereco: string; cidade: string; tipo: string };
  empresa: { nome: string; responsavel: string; registro: string; telefone: string; email: string; cidade?: string };
};

export const numeroComRevisao = (o: { numero: string; revisao?: number }) => (o.revisao ? `${o.numero} · rev. ${o.revisao}` : o.numero);

export function enderecoObra(d: DadosProposta) {
  return d.orc.endereco_obra || [d.cliente.endereco, d.cliente.cidade].filter(Boolean).join(' · ');
}

/** A proposta comercial, como o cliente vê (sem custos internos). */
export default function Proposta({ d }: { d: DadosProposta }) {
  const { orc, itens, cliente: c, empresa: E } = d;
  const t = totais(itens, orc.desconto);
  const srv = itens.filter((i) => i.tipo === 'servico'), mat = itens.filter((i) => i.tipo === 'material');
  let n = 0;
  const sec = (s: string) => <h3 className="doc-s">{++n}. {s}</h3>;
  const kv = (rows: [string, string][]) => <dl className="dkv">{rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v || '—'}</dd></div>)}</dl>;
  const tabela = (arr: Item[], ini: number) => (
    <div className="tw"><table className="tbl" style={{ minWidth: 560 }}>
      <thead><tr><th>Item</th><th>Descrição</th><th className="r">Quantidade</th><th className="r">Valor unitário</th><th className="r">Total</th></tr></thead>
      <tbody>{arr.map((i, k) => (
        <tr key={k}><td className="mono">{ini + k + 1}</td><td>{i.descricao}</td><td className="r" style={{ whiteSpace: 'nowrap' }}>{fmtQtd(i.quantidade, i.unidade)}</td><td className="r mono">{brl(i.valor_unit)}</td><td className="r mono">{brl(i.quantidade * i.valor_unit)}</td></tr>
      ))}</tbody>
    </table></div>
  );
  return (
    <div className="doc">
      <div className="doc-h">
        <div className="doc-id">
          <img className="doc-logo lg-d" src="/marca/logo.png" alt="" />
          <img className="doc-logo lg-l" src="/marca/logo-claro.png" alt="" />
          <div><div className="doc-brand">{E.nome}</div><div className="sub">{[E.responsavel, E.registro].filter(Boolean).join(' · ')}</div><div className="sub">{[E.telefone, E.email].filter(Boolean).join(' · ')}</div></div>
        </div>
        <div className="r"><div className="eyebrow">Proposta comercial</div><div className="mono big">{numeroComRevisao(orc)}</div><div className="sub">Emissão: {dataBR(orc.data)}</div><div className="sub">Válida até: {dataBR(validoAte(orc))}</div></div>
      </div>
      {sec('Dados do cliente')}
      {kv([['Nome / razão social', c.nome], ['CPF / CNPJ', c.documento], ['Telefone / WhatsApp', c.telefone], ['E-mail', c.email], ['Endereço da obra', enderecoObra(d)], ['Tipo de imóvel', c.tipo]])}
      {srv.length > 0 && <>{sec('Serviços e mão de obra')}{tabela(srv, 0)}</>}
      {mat.length > 0 && <>{sec('Materiais')}{tabela(mat, srv.length)}</>}
      {sec('Resumo de valores')}
      <div className="doc-tot"><table><tbody>
        <tr><td className="sub">Serviços e mão de obra</td><td className="mono">{brl(t.srv)}</td></tr>
        <tr><td className="sub">Materiais</td><td className="mono">{brl(t.mat)}</td></tr>
        {orc.desconto > 0 && <tr><td className="sub">Desconto</td><td className="mono">-{brl(orc.desconto)}</td></tr>}
        <tr className="gt"><td>Total</td><td>{brl(t.total)}</td></tr>
      </tbody></table></div>
      {sec('Condições')}
      {kv([['Forma de pagamento', condicaoTxt(orc, t.total)], ['Prazo de execução', prazoTxt(orc)], ['Validade da proposta', `${diasTxt(orc.validade_dias)} (até ${dataBR(validoAte(orc))})`], ['Garantia', '90 dias sobre a mão de obra'], ['Normas técnicas', 'ABNT NBR 5410, com TRT emitida no CFT']])}
      {orc.observacoes && <>{sec('Observações')}<p style={{ fontSize: '.92rem', whiteSpace: 'pre-wrap' }}>{orc.observacoes}</p></>}
      <div className="sign"><div>{E.responsavel || E.nome}<br /><span className="sub">Responsável técnico</span></div><div>{c.nome}<br /><span className="sub">De acordo</span></div></div>
    </div>
  );
}
