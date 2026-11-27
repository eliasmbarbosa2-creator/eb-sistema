import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY, supabaseConfigurado } from '@/lib/supabase/config';
import type { DadosProposta } from '@/components/Proposta';
import Proposta from '@/components/Proposta';
import AcoesCliente from './AcoesCliente';
import { hojeISO, validoAte } from '@/lib/negocio';

export const metadata: Metadata = { title: 'Proposta', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function PropostaCliente({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!supabaseConfigurado || !/^[0-9a-f-]{36}$/i.test(token)) notFound();
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const { data } = await sb.rpc('orcamento_publico', { p_token: token });
  if (!data) notFound();
  const r = data as { orcamento: DadosProposta['orc']; itens: DadosProposta['itens']; cliente: DadosProposta['cliente']; empresa: DadosProposta['empresa']; mensagens?: { tipo: string; mensagem: string; criado_em: string }[] };
  const num = (v: unknown) => Number(v) || 0;
  const d: DadosProposta = {
    orc: { ...r.orcamento, desconto: num(r.orcamento.desconto), validade_dias: num(r.orcamento.validade_dias), prazo_qtd: r.orcamento.prazo_qtd == null ? null : num(r.orcamento.prazo_qtd) },
    itens: r.itens.map((i) => ({ ...i, material_id: null, quantidade: num(i.quantidade), valor_unit: num(i.valor_unit) })),
    cliente: r.cliente, empresa: r.empresa,
  };
  const vencido = d.orc.status === 'enviado' && hojeISO() > validoAte(d.orc);
  return (
    <>
      <header className="top"><div className="top-in gut">
        <a className="brand" href="/"><img className="lg-d" src="/marca/marca.png" alt="" /><img className="lg-l" src="/marca/marca-claro.png" alt="" /><span>{d.empresa.nome}</span></a>
      </div></header>
      <main className="gut prop-pg">
        <AcoesCliente token={token} dados={d} status={d.orc.status} vencido={vencido} aprovadoEm={d.orc.aprovado_em ?? null} mensagens={r.mensagens ?? []} />
        {d.orc.status !== 'rascunho' && <Proposta d={d} />}
      </main>
    </>
  );
}
