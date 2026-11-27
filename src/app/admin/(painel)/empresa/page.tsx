import { supabaseServidor } from '@/lib/supabase/server';
import FormEmpresa from './FormEmpresa';

export default async function Empresa() {
  const supabase = await supabaseServidor();
  const { data } = await supabase.from('empresa').select('*').eq('id', 1).maybeSingle();
  return (
    <>
      <div className="ph"><div><h1>Dados da empresa</h1><p className="lead">Usados no site e no cabeçalho das propostas</p></div></div>
      <div className="card"><FormEmpresa inicial={data ?? {}} /></div>
      <div className="card">
        <h2 className="h2">Backup dos dados</h2>
        <p className="sub" style={{ marginBottom: 12 }}>Baixe uma planilha do Excel com tudo o que está no sistema: clientes, orçamentos e itens, serviços, parcelas, estoque, movimentações e portfólio. {process.env.CRON_SECRET ? 'Além disso, toda segunda-feira uma cópia chega no seu e-mail.' : 'Para receber uma cópia automática toda segunda-feira por e-mail, cadastre CRON_SECRET na Vercel (veja o README).'}</p>
        <a className="btn btn-p" href="/admin/backup" download>Baixar backup (Excel)</a>
      </div>
    </>
  );
}
