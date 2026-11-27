import Link from 'next/link';
import { supabaseServidor } from '@/lib/supabase/server';
import { chavePublicaVapid } from '@/lib/avisos';
import { brl, dataBR, diasEntre, hojeISO, num } from '@/lib/negocio';
import { STATUS_CLIENTE } from '@/lib/rotulos';
import Avisos from './Avisos';
import { ehUrgente } from '@/lib/conteudo';

export default async function Painel() {
  const sb = await supabaseServidor();
  const hoje = hojeISO();
  const [cli, orc, par, mats, srv] = await Promise.all([
    sb.from('clientes').select('id,nome,servico,origem,status,criado_em,urgencia'),
    sb.from('orcamentos').select('id,numero,data,desconto,status,clientes(nome),orcamento_itens(quantidade,valor_unit)').eq('status', 'enviado'),
    sb.from('parcelas').select('id,descricao,valor,vencimento,pago,servicos(numero,clientes(nome))').eq('pago', false),
    sb.from('materiais').select('id,nome,quantidade,minimo,unidade').eq('ativo', true),
    sb.from('servicos').select('id,numero,titulo,status,inicio,clientes(nome)').neq('status', 'concluido').order('inicio'),
  ]);
  type O = { id: string; numero: string; data: string; desconto: number; clientes: { nome: string } | null; orcamento_itens: { quantidade: number; valor_unit: number }[] };
  type P = { id: string; descricao: string; valor: number; vencimento: string; servicos: { numero: string; clientes: { nome: string } | null } | null };
  type S = { id: string; numero: string; titulo: string; status: string; inicio: string | null; clientes: { nome: string } | null };
  const clientes = cli.data ?? [];
  const abertos = (orc.data ?? []) as unknown as O[];
  const pend = (par.data ?? []) as unknown as P[];
  const ativos = (srv.data ?? []) as unknown as S[];
  const totalOrc = (o: O) => Math.max(0, o.orcamento_itens.reduce((s, i) => s + Number(i.quantidade) * Number(i.valor_unit), 0) - Number(o.desconto));
  const novos = clientes.filter((c) => c.status === 'novo');
  const atrasadas = pend.filter((p) => p.vencimento < hoje);
  const baixo = (mats.data ?? []).filter((m) => Number(m.minimo) > 0 && Number(m.quantidade) <= Number(m.minimo));
  const chave = await chavePublicaVapid().catch(() => null);

  const acoes: { tom: string; titulo: string; sub: string; href: string; rot: string }[] = [
    ...atrasadas.map((p) => ({ tom: 'bad', titulo: `Cobrar ${brl(Number(p.valor))} · ${p.servicos?.clientes?.nome ?? ''}`, sub: `${p.descricao} venceu em ${dataBR(p.vencimento)} (${diasEntre(p.vencimento, hoje)} dias)`, href: '/admin/financeiro', rot: 'Financeiro' })),
    ...novos.map((c) => ({ tom: ehUrgente(c.urgencia) ? 'bad' : 'info', titulo: `Responder ${c.nome}${ehUrgente(c.urgencia) ? ' · URGENTE' : ''}`, sub: `${c.servico} · pedido via ${c.origem} em ${dataBR(c.criado_em)}`, href: '/admin/clientes?status=novo', rot: 'Clientes' })),
    ...abertos.filter((o) => diasEntre(o.data, hoje) >= 5).map((o) => ({ tom: 'warn', titulo: `Retornar sobre ${o.numero}`, sub: `${o.clientes?.nome ?? ''} · enviado há ${diasEntre(o.data, hoje)} dias · ${brl(totalOrc(o))}`, href: `/admin/orcamentos/${o.id}`, rot: 'Orçamento' })),
    ...baixo.map((m) => ({ tom: 'warn', titulo: `Repor ${m.nome}`, sub: `Saldo ${num(Number(m.quantidade))} ${m.unidade} · mínimo ${num(Number(m.minimo))} ${m.unidade}`, href: '/admin/estoque', rot: 'Estoque' })),
  ];
  const ordem = ['novo', 'contato', 'orcamento', 'fechado', 'perdido'];
  const cont = ordem.map((k) => clientes.filter((c) => c.status === k).length);
  const mx = Math.max(1, ...cont);

  return (
    <>
      <div className="ph"><div><h1>Painel</h1><p className="lead">Resumo de hoje, {dataBR(hoje)}</p></div><Link className="btn btn-p" href="/admin/orcamentos/novo">+ Novo orçamento</Link></div>
      <div className="tiles">
        <Link className="tile" href="/admin/clientes?status=novo"><span className="eyebrow">Pedidos novos</span><span className="v">{novos.length}</span><span className="sub">aguardando primeiro contato</span></Link>
        <Link className="tile" href="/admin/orcamentos?status=enviado"><span className="eyebrow">Orçamentos em aberto</span><span className="v">{brl(abertos.reduce((s, o) => s + totalOrc(o), 0))}</span><span className="sub">{abertos.length} aguardando resposta</span></Link>
        <Link className={`tile ${atrasadas.length ? 'alert' : ''}`} href="/admin/financeiro"><span className="eyebrow">A receber</span><span className="v">{brl(pend.reduce((s, p) => s + Number(p.valor), 0))}</span><span className="sub">{atrasadas.length ? `${brl(atrasadas.reduce((s, p) => s + Number(p.valor), 0))} em atraso` : 'nada em atraso'}</span></Link>
        <Link className={`tile ${baixo.length ? 'alert' : ''}`} href="/admin/estoque"><span className="eyebrow">Estoque baixo</span><span className="v">{baixo.length}</span><span className="sub">itens no mínimo ou abaixo</span></Link>
      </div>
      <div className="grid2">
        <div className="card"><h2 className="h2">Próximas ações</h2>
          {acoes.length ? <ul className="todo">{acoes.map((a, i) => (
            <li key={i}><span className={`dot d-${a.tom}`} /><div className="grow"><b>{a.titulo}</b><div className="sub">{a.sub}</div></div><Link className="link" href={a.href}>{a.rot} →</Link></li>
          ))}</ul> : <p className="sub">Tudo em dia.</p>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, minWidth: 0 }}>
          <div className="card"><h2 className="h2">Funil de clientes</h2><div className="funnel">{ordem.map((k, i) => (
            <div key={k} className={`fr ${k === 'perdido' ? 'lost' : ''}`}><span>{STATUS_CLIENTE[k][0]}</span><div className="bar"><i style={{ width: `${(cont[i] / mx) * 100}%` }} /></div><b className="mono r">{cont[i]}</b></div>
          ))}</div></div>
          <div className="card"><h2 className="h2">Serviços em andamento</h2>
            {ativos.length ? <ul className="todo">{ativos.map((s) => (
              <li key={s.id}><div className="grow"><b>{s.titulo}</b><div className="sub">{s.numero} · {s.clientes?.nome} · início {dataBR(s.inicio)}</div></div><span className={`pill ${s.status === 'execucao' ? 't-warn' : 't-info'}`}>{s.status === 'execucao' ? 'Em execução' : 'Agendado'}</span></li>
            ))}</ul> : <p className="sub">Nenhum serviço em andamento.</p>}
          </div>
        </div>
      </div>
      <Avisos chave={chave} emailOk={Boolean(process.env.RESEND_API_KEY)} pushOk={Boolean(chave)} />
    </>
  );
}
