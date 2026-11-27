import 'server-only';
import { supabaseServidor } from '@/lib/supabase/server';

export async function dadosEditor() {
  const sb = await supabaseServidor();
  const [cl, mt, em] = await Promise.all([
    sb.from('clientes').select('id,nome,telefone,email,documento,endereco,cidade,tipo,servico,mensagem,urgencia,horario,origem,status,criado_em').order('criado_em', { ascending: false }),
    sb.from('materiais').select('id,codigo,nome,unidade,quantidade,custo,preco').eq('ativo', true).order('nome'),
    sb.from('empresa').select('nome,responsavel,registro,telefone,email,cidade').eq('id', 1).maybeSingle(),
  ]);
  const num = (v: unknown) => Number(v) || 0;
  return {
    clientes: cl.data ?? [],
    materiais: (mt.data ?? []).map((m) => ({ ...m, quantidade: num(m.quantidade), custo: num(m.custo), preco: num(m.preco) })),
    empresa: em.data ?? { nome: 'EB Instalações Elétricas', responsavel: '', registro: '', telefone: '', email: '', cidade: '' },
  };
}
