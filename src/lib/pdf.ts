'use client';
// Gera o PDF da proposta no navegador (mesmo layout aprovado no protótipo).
import type { DadosProposta } from '@/components/Proposta';
import { enderecoObra } from '@/components/Proposta';
import { brl, dataBR, diasTxt, fmtQtd, prazoTxt, condicaoTxt, totais, validoAte, type Item } from './negocio';

const P = (s: unknown) => String(s ?? '').replace(/[−–—]/g, '-').replace(/→/g, '->').replace(/[“”″]/g, '"').replace(/[‘’]/g, "'").replace(/[^\x00-\xFF•]/g, '');

async function logo(): Promise<{ data: string; r: number } | null> {
  try {
    const b = await (await fetch('/marca/logo.png')).blob();
    const data = await new Promise<string>((ok, er) => { const f = new FileReader(); f.onload = () => ok(String(f.result)); f.onerror = er; f.readAsDataURL(b); });
    const r = await new Promise<number>((ok) => { const i = new Image(); i.onload = () => ok(i.naturalWidth / i.naturalHeight); i.onerror = () => ok(1); i.src = data; });
    return { data, r };
  } catch { return null; }
}

export async function gerarPDF(d: DadosProposta): Promise<Blob> {
  const [{ jsPDF }, { autoTable }, LG] = await Promise.all([import('jspdf'), import('jspdf-autotable'), logo()]);
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const { orc, itens, cliente: c, empresa: E } = d;
  const t = totais(itens, orc.desconto);
  const W = 210, MG = 16, CU: [number, number, number] = [3, 128, 172], INK: [number, number, number] = [18, 28, 30], MU: [number, number, number] = [90, 104, 110];
  let y = 20, n = 1, X = MG;
  const fim = () => { y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY; };

  if (LG) { const h = 22, w = h * LG.r; doc.addImage(LG.data, 'PNG', MG, y - 9, w, h); X = MG + w + 5; }
  doc.setTextColor(...INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(17); doc.text(P(E.nome), X, y);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...MU);
  doc.text(P([E.responsavel, E.registro].filter(Boolean).join(' · ')), X, y + 5.5);
  doc.text(P([E.telefone, E.email, E.cidade].filter(Boolean).join(' · ')), X, y + 10);
  doc.setFontSize(7.5); doc.text('PROPOSTA COMERCIAL', W - MG, y - 4, { align: 'right' });
  doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(...INK); doc.text(P(orc.numero), W - MG, y + 2, { align: 'right' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...MU);
  doc.text(`Emissão: ${dataBR(orc.data)}`, W - MG, y + 7, { align: 'right' });
  doc.text(P(`Válida até: ${dataBR(validoAte(orc))}`), W - MG, y + 11.5, { align: 'right' });
  y += 16; doc.setDrawColor(...CU); doc.setLineWidth(0.8); doc.line(MG, y, W - MG, y);

  const sec = (s: string) => { y += 7.5; if (y > 262) { doc.addPage(); y = 20; } doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.setTextColor(...CU); doc.text(P(`${n++}. ${s}`), MG, y); y += 2.5; };
  const kv = (rows: [string, string][]) => {
    const body: string[][] = [];
    for (let i = 0; i < rows.length; i += 2) { const a = rows[i], b = rows[i + 1] ?? ['', '']; body.push([P(a[0]), P(a[1] || '-'), P(b[0]), P(b[1] || (b[0] ? '-' : ''))]); }
    autoTable(doc, { startY: y, margin: { left: MG, right: MG }, theme: 'plain', body, styles: { fontSize: 9, cellPadding: { top: 1.6, bottom: 1.6, left: 0, right: 3 }, textColor: INK },
      columnStyles: { 0: { cellWidth: 34, textColor: MU, fontSize: 8 }, 2: { cellWidth: 30, textColor: MU, fontSize: 8 } } }); fim();
  };
  const tabela = (arr: Item[], ini: number) => {
    autoTable(doc, { startY: y + 1, margin: { left: MG, right: MG }, head: [['Item', 'Descrição', 'Quantidade', 'Valor unitário', 'Total']],
      body: arr.map((i, k) => [String(ini + k + 1), P(i.descricao), P(fmtQtd(i.quantidade, i.unidade)), P(brl(i.valor_unit)), P(brl(i.quantidade * i.valor_unit))]),
      theme: 'striped', headStyles: { fillColor: CU, textColor: 255, fontSize: 8.5 }, styles: { fontSize: 9, textColor: INK, cellPadding: 2.2 }, alternateRowStyles: { fillColor: [236, 244, 248] },
      columnStyles: { 0: { cellWidth: 12, halign: 'center' }, 2: { cellWidth: 28, halign: 'right' }, 3: { cellWidth: 28, halign: 'right' }, 4: { cellWidth: 28, halign: 'right' } },
      didParseCell: (h) => { if (h.section === 'head' && h.column.index >= 2) h.cell.styles.halign = 'right'; if (h.section === 'head' && h.column.index === 0) h.cell.styles.halign = 'center'; } }); fim();
  };

  sec('Dados do cliente');
  kv([['Nome / razão social', c.nome], ['CPF / CNPJ', c.documento], ['Telefone / WhatsApp', c.telefone], ['E-mail', c.email], ['Endereço da obra', enderecoObra(d)], ['Tipo de imóvel', c.tipo]]);
  const srv = itens.filter((i) => i.tipo === 'servico'), mat = itens.filter((i) => i.tipo === 'material');
  if (srv.length) { sec('Serviços e mão de obra'); tabela(srv, 0); }
  if (mat.length) { sec('Materiais'); tabela(mat, srv.length); }
  sec('Resumo de valores');
  const res: string[][] = [['Serviços e mão de obra', brl(t.srv)], ['Materiais', brl(t.mat)]];
  if (orc.desconto) res.push(['Desconto', '-' + brl(orc.desconto)]);
  res.push(['TOTAL', brl(t.total)]);
  autoTable(doc, { startY: y + 1, margin: { left: W - MG - 90, right: MG }, theme: 'plain', body: res.map((r) => r.map(P)), styles: { fontSize: 9.5, textColor: INK, cellPadding: 1.6 }, columnStyles: { 1: { halign: 'right' } },
    didParseCell: (h) => { if (h.row.index === res.length - 1) { h.cell.styles.fontStyle = 'bold'; h.cell.styles.fontSize = 12.5; h.cell.styles.textColor = CU; } } }); fim();
  sec('Condições');
  autoTable(doc, { startY: y, margin: { left: MG, right: MG }, theme: 'plain',
    body: [['Forma de pagamento', condicaoTxt(orc, t.total)], ['Prazo de execução', prazoTxt(orc)], ['Validade da proposta', `${diasTxt(orc.validade_dias)} (até ${dataBR(validoAte(orc))})`], ['Garantia', '90 dias sobre a mão de obra'], ['Normas técnicas', 'ABNT NBR 5410, com TRT emitida no CFT']].map((r) => r.map(P)),
    styles: { fontSize: 9, textColor: INK, cellPadding: { top: 1.6, bottom: 1.6, left: 0, right: 3 } }, columnStyles: { 0: { cellWidth: 40, textColor: MU, fontSize: 8 } } }); fim();
  if (orc.observacoes) {
    sec('Observações'); doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...INK);
    const l = doc.splitTextToSize(P(orc.observacoes), W - 2 * MG); y += 3; doc.text(l, MG, y); y += l.length * 4.2;
  }
  if (y > 260) { doc.addPage(); y = 30; }
  y += 15; doc.setDrawColor(...INK); doc.setLineWidth(0.3); doc.line(MG, y, MG + 75, y); doc.line(W - MG - 75, y, W - MG, y);
  doc.setFontSize(9); doc.setTextColor(...INK); doc.text(P(E.responsavel || E.nome), MG, y + 5); doc.text(P(c.nome), W - MG - 75, y + 5);
  doc.setFontSize(7.5); doc.setTextColor(...MU); doc.text('Responsável técnico', MG, y + 9); doc.text('De acordo', W - MG - 75, y + 9);
  const pags = doc.getNumberOfPages();
  for (let i = 1; i <= pags; i++) { doc.setPage(i); doc.setFontSize(7.5); doc.setTextColor(...MU); doc.text(P(`${E.nome} · ${orc.numero}`), MG, 289); doc.text(`Página ${i} de ${pags}`, W - MG, 289, { align: 'right' }); }
  return doc.output('blob');
}

export async function baixarPDF(d: DadosProposta) {
  const blob = await gerarPDF(d);
  const nome = `Orçamento ${d.orc.numero} - ${d.cliente.nome}`.replace(/[\\/:*?"<>|]/g, '') + '.pdf';
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = nome; document.body.appendChild(a); a.click();
  setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 10000);
}
