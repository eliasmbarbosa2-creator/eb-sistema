import { supabaseServidor } from '@/lib/supabase/server';
import { STATUS_CLIENTE, dataHoraBR } from '@/lib/rotulos';
import StatusCliente from './StatusCliente';
import NovoCliente from './NovoCliente';

type Cliente = {
  id: string; nome: string; telefone: string; email: string; documento: string; endereco: string; cidade: string; tipo: string;
  servico: string; mensagem: string; urgencia: string; horario: string; origem: string; status: string; criado_em: string;
};

export default async function Clientes({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status = 'todos' } = await searchParams;
  const supabase = await supabaseServidor();
  const { data } = await supabase.from('clientes').select('*').order('criado_em', { ascending: false });
  const todos = (data ?? []) as Cliente[];
  const lista = todos.filter((c) => status === 'todos' || c.status === status);
  const wa = (t: string) => { let d = t.replace(/\D/g, ''); if (d.length <= 11) d = '55' + d; return `https://wa.me/${d}`; };

  return (
    <>
      <div className="ph">
        <div><h1>Clientes</h1><p className="lead">Pedidos do site, WhatsApp, indicações e redes sociais</p></div>
        <NovoCliente />
      </div>
      <div className="chips">
        {['todos', ...Object.keys(STATUS_CLIENTE)].map((k) => (
          <a key={k} href={k === 'todos' ? '/admin/clientes' : `/admin/clientes?status=${k}`} className={`chip ${status === k ? 'on' : ''}`} style={{ textDecoration: 'none' }}>
            {k === 'todos' ? 'Todos' : STATUS_CLIENTE[k][0]} <span>{k === 'todos' ? todos.length : todos.filter((c) => c.status === k).length}</span>
          </a>
        ))}
      </div>
      {lista.length === 0 ? (
        <div className="card"><p className="sub">{todos.length === 0 ? 'Nenhum pedido ainda. Os pedidos feitos pelo formulário do site aparecem aqui automaticamente.' : 'Nenhum cliente neste status.'}</p></div>
      ) : (
        <div className="clist">
          {lista.map((c) => (
            <details className="card ccard" key={c.id} open={c.status === 'novo'}>
              <summary>
                <div className="cc-main">
                  <b>{c.nome}</b>
                  <span className="sub">{c.servico} · {c.tipo}{c.cidade ? ` · ${c.cidade}` : ''}</span>
                </div>
                <div className="cc-side">
                  {/^Urgente/.test(c.urgencia) && <span className="pill t-bad">Urgente</span>}
                  <span className="sub mono">{dataHoraBR(c.criado_em)}</span>
                  <StatusCliente id={c.id} status={c.status} />
                </div>
              </summary>
              <div className="kvg">
                <div><div className="gh">Contato</div><dl>
                  <div><dt>Telefone / WhatsApp</dt><dd className="mono">{c.telefone} · <a className="link" href={wa(c.telefone)} target="_blank" rel="noopener">abrir WhatsApp</a></dd></div>
                  <div><dt>E-mail</dt><dd>{c.email || '—'}</dd></div>
                  <div><dt>CPF / CNPJ</dt><dd className="mono">{c.documento || '—'}</dd></div>
                </dl></div>
                <div><div className="gh">Local do serviço</div><dl>
                  <div><dt>Endereço</dt><dd>{c.endereco || '—'}</dd></div>
                  <div><dt>Bairro / cidade</dt><dd>{c.cidade || '—'}</dd></div>
                  <div><dt>Tipo de imóvel</dt><dd>{c.tipo}</dd></div>
                </dl></div>
                <div><div className="gh">Pedido</div><dl>
                  <div><dt>Serviço</dt><dd>{c.servico}</dd></div>
                  {c.urgencia && <div><dt>Urgência</dt><dd>{c.urgencia}</dd></div>}
                  {c.horario && <div><dt>Melhor horário</dt><dd>{c.horario}</dd></div>}
                  <div><dt>Recebido por</dt><dd>{c.origem}</dd></div>
                </dl></div>
              </div>
              {c.mensagem ? <p className="msg-c">{c.mensagem}</p> : <p className="sub">Sem descrição.</p>}
              <div className="actions" style={{ marginTop: 12 }}>
                <NovoCliente cliente={c} />
                <a className="btn btn-s btn-p" href={`/admin/orcamentos/novo?cliente=${c.id}`}>Criar orçamento</a>
              </div>
            </details>
          ))}
        </div>
      )}
    </>
  );
}
