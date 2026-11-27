import Link from 'next/link';
import { supabaseServidor } from '@/lib/supabase/server';
import { STATUS_CLIENTE } from '@/lib/rotulos';
import NovoCliente from './NovoCliente';
import ListaClientes, { type Cliente, type Resumo } from './ListaClientes';

export default async function Clientes({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status = 'todos' } = await searchParams;
  const supabase = await supabaseServidor();
  const [{ data }, { data: orcs }, { data: srvs }] = await Promise.all([
    supabase.from('clientes').select('*').order('criado_em', { ascending: false }),
    supabase.from('orcamentos').select('cliente_id'),
    supabase.from('servicos').select('cliente_id,baixa_feita,parcelas(pago)'),
  ]);
  const todos = (data ?? []) as Cliente[];
  const lista = todos.filter((c) => status === 'todos' || c.status === status);
  // O que vai junto se o cliente for excluído
  const resumo: Record<string, Resumo> = {};
  const r = (id: string) => (resumo[id] ??= { orcamentos: 0, servicos: 0, parcelas: 0, pagas: 0, retirado: 0 });
  for (const o of orcs ?? []) r(o.cliente_id).orcamentos++;
  for (const s of (srvs ?? []) as unknown as { cliente_id: string; baixa_feita: boolean; parcelas: { pago: boolean }[] }[]) {
    const x = r(s.cliente_id); x.servicos++; if (s.baixa_feita) x.retirado++;
    x.parcelas += s.parcelas.length; x.pagas += s.parcelas.filter((p) => p.pago).length;
  }
  return (
    <>
      <div className="ph">
        <div><h1>Clientes</h1><p className="lead">Pedidos do site, WhatsApp, indicações e redes sociais</p></div>
        <NovoCliente />
      </div>
      <div className="chips">
        {['todos', ...Object.keys(STATUS_CLIENTE)].map((k) => (
          <Link key={k} href={k === 'todos' ? '/admin/clientes' : `/admin/clientes?status=${k}`} className={`chip ${status === k ? 'on' : ''}`} style={{ textDecoration: 'none' }}>
            {k === 'todos' ? 'Todos' : STATUS_CLIENTE[k][0]} <span>{k === 'todos' ? todos.length : todos.filter((c) => c.status === k).length}</span>
          </Link>
        ))}
      </div>
      {lista.length === 0
        ? <div className="card"><p className="sub">{todos.length === 0 ? 'Nenhum pedido ainda. Os pedidos feitos pelo formulário do site aparecem aqui automaticamente.' : 'Nenhum cliente neste status.'}</p></div>
        : <ListaClientes lista={lista} resumo={resumo} />}
    </>
  );
}
