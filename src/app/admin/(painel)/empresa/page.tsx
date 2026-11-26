import { supabaseServidor } from '@/lib/supabase/server';
import FormEmpresa from './FormEmpresa';

export default async function Empresa() {
  const supabase = await supabaseServidor();
  const { data } = await supabase.from('empresa').select('nome,responsavel,registro,telefone,email,cidade,regiao').eq('id', 1).maybeSingle();
  return (
    <>
      <div className="ph"><div><h1>Dados da empresa</h1><p className="lead">Usados no site e no cabeçalho das propostas</p></div></div>
      <div className="card"><FormEmpresa inicial={data ?? {}} /></div>
    </>
  );
}
