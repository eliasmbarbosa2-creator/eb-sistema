import { supabaseServidor } from '@/lib/supabase/server';
import { mesclarConteudo } from '@/lib/conteudo';
import EditorConteudo from './EditorConteudo';

export default async function Conteudo() {
  const sb = await supabaseServidor();
  const { data } = await sb.from('conteudo_site').select('publicado,rascunho,publicado_em').eq('id', 1).maybeSingle();
  const publicado = mesclarConteudo(data?.publicado);
  const temRascunho = Boolean(data?.rascunho);
  return <EditorConteudo inicial={temRascunho ? mesclarConteudo(data!.rascunho) : publicado} publicado={publicado} temRascunho={temRascunho} publicadoEm={data?.publicado_em ?? null} />;
}
