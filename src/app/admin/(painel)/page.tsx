import { supabaseServidor } from '@/lib/supabase/server';
import { chavePublicaVapid } from '@/lib/avisos';
import Avisos from './Avisos';

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default async function Painel() {
  const supabase = await supabaseServidor();
  const hoje = new Date().toISOString().slice(0, 10);
  const [novos, abertos, pend, mats] = await Promise.all([
    supabase.from('clientes').select('id', { count: 'exact', head: true }).eq('status', 'novo'),
    supabase.from('orcamentos').select('id', { count: 'exact', head: true }).eq('status', 'enviado'),
    supabase.from('parcelas').select('valor,vencimento').eq('pago', false),
    supabase.from('materiais').select('quantidade,minimo').eq('ativo', true),
  ]);
  const chave = await chavePublicaVapid().catch(() => null);
  const aReceber = (pend.data ?? []).reduce((s, p) => s + Number(p.valor), 0);
  const atrasado = (pend.data ?? []).filter((p) => p.vencimento < hoje).reduce((s, p) => s + Number(p.valor), 0);
  const baixo = (mats.data ?? []).filter((m) => Number(m.quantidade) <= Number(m.minimo)).length;

  return (
    <>
      <div className="ph"><div><h1>Painel</h1><p className="lead">Resumo de hoje, {new Date().toLocaleDateString('pt-BR')}</p></div></div>
      <div className="tiles">
        <div className="tile"><span className="eyebrow">Pedidos novos</span><span className="v">{novos.count ?? 0}</span><span className="sub">aguardando primeiro contato</span></div>
        <div className="tile"><span className="eyebrow">Orçamentos enviados</span><span className="v">{abertos.count ?? 0}</span><span className="sub">aguardando resposta</span></div>
        <div className={`tile ${atrasado ? 'alert' : ''}`}><span className="eyebrow">A receber</span><span className="v">{brl(aReceber)}</span><span className="sub">{atrasado ? `${brl(atrasado)} em atraso` : 'nada em atraso'}</span></div>
        <div className={`tile ${baixo ? 'alert' : ''}`}><span className="eyebrow">Estoque baixo</span><span className="v">{baixo}</span><span className="sub">itens no mínimo ou abaixo</span></div>
      </div>
      <Avisos chave={chave} emailOk={Boolean(process.env.RESEND_API_KEY)} pushOk={Boolean(chave)} />
    </>
  );
}
