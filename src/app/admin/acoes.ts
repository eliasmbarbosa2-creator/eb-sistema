'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { supabaseServidor, adminAtual } from '@/lib/supabase/server';

export type Estado = { erro?: string; ok?: string };

export async function entrar(_: Estado, form: FormData): Promise<Estado> {
  const email = String(form.get('email') ?? '').trim();
  const senha = String(form.get('senha') ?? '');
  if (!email || !senha) return { erro: 'Informe e-mail e senha.' };
  const supabase = await supabaseServidor();
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
  // Mesma mensagem para qualquer falha: não revela se o e-mail existe.
  if (error) {
    // Motivo real só no log do servidor (Vercel > Logs); a tela mostra mensagem genérica.
    console.warn('[login] recusado pelo Supabase Auth:', error.code ?? '', error.message);
    return { erro: 'E-mail ou senha incorretos.' };
  }
  const { data: ehAdmin, error: erroAdmin } = await supabase.rpc('is_admin');
  if (!ehAdmin) {
    console.warn('[login] senha correta, mas o usuário não está na tabela admins', erroAdmin?.message ?? '');
    await supabase.auth.signOut();
    return { erro: 'E-mail ou senha incorretos.' };
  }
  redirect('/admin');
}

export async function sair() {
  const supabase = await supabaseServidor();
  await supabase.auth.signOut();
  redirect('/admin/entrar');
}

export async function salvarEmpresa(_: Estado, form: FormData): Promise<Estado> {
  if (!(await adminAtual())) return { erro: 'Sessão expirada. Entre novamente.' };
  const campos = ['nome', 'responsavel', 'registro', 'telefone', 'email', 'cidade', 'regiao'] as const;
  const dados: Record<string, string> = {};
  for (const c of campos) dados[c] = String(form.get(c) ?? '').trim().slice(0, 200);
  if (!dados.nome) return { erro: 'O nome da empresa é obrigatório.' };
  const supabase = await supabaseServidor();
  const { error } = await supabase.from('empresa').upsert({ id: 1, ...dados, atualizado_em: new Date().toISOString() });
  if (error) return { erro: 'Não foi possível salvar. Tente de novo.' };
  revalidatePath('/');
  revalidatePath('/admin', 'layout');
  return { ok: 'Dados da empresa salvos.' };
}

export async function pedirRecuperacao(_: Estado, form: FormData): Promise<Estado> {
  const email = String(form.get('email') ?? '').trim();
  if (!email) return { erro: 'Informe o seu e-mail.' };
  const { headers } = await import('next/headers');
  const h = await headers();
  const origem = `${h.get('x-forwarded-proto') ?? 'https'}://${h.get('x-forwarded-host') ?? h.get('host')}`;
  const supabase = await supabaseServidor();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origem}/admin/auth/retorno?proximo=/admin/nova-senha`,
  });
  if (error) console.warn('[recuperar] Supabase recusou:', error.message);
  // Mesma resposta sempre: não revela se o e-mail tem cadastro.
  return { ok: 'Se este e-mail for de um administrador, você vai receber um link para criar uma senha nova. Abra o link neste mesmo navegador.' };
}

export async function definirNovaSenha(_: Estado, form: FormData): Promise<Estado> {
  const senha = String(form.get('senha') ?? '');
  if (senha.length < 10) return { erro: 'Use pelo menos 10 caracteres.' };
  if (senha !== String(form.get('senha2') ?? '')) return { erro: 'As senhas não conferem.' };
  const supabase = await supabaseServidor();
  const { error } = await supabase.auth.updateUser({ password: senha });
  if (error) {
    console.warn('[nova-senha]', error.message);
    return { erro: error.message.includes('different') ? 'A senha nova precisa ser diferente da anterior.' : 'Não foi possível trocar a senha. Peça um link novo.' };
  }
  redirect('/admin');
}

const STATUS_VALIDOS = ['novo', 'contato', 'orcamento', 'fechado', 'perdido'];
export async function mudarStatusCliente(id: string, status: string) {
  if (!(await adminAtual()) || !STATUS_VALIDOS.includes(status)) return { erro: 'Não permitido.' };
  const supabase = await supabaseServidor();
  const { error } = await supabase.from('clientes').update({ status }).eq('id', id);
  revalidatePath('/admin', 'layout');
  return error ? { erro: 'Não foi possível salvar.' } : { ok: 'Salvo.' };
}

export async function salvarCliente(_: Estado, form: FormData): Promise<Estado> {
  if (!(await adminAtual())) return { erro: 'Sessão expirada. Entre novamente.' };
  const id = String(form.get('id') ?? '');
  const t = (k: string, max = 200) => String(form.get(k) ?? '').trim().slice(0, max);
  const dados = {
    nome: t('nome', 120), telefone: t('telefone', 30), email: t('email', 160), documento: t('documento', 30),
    endereco: t('endereco'), cidade: t('cidade', 120), tipo: ['Residencial', 'Comercial', 'Industrial'].includes(t('tipo')) ? t('tipo') : 'Residencial',
    servico: t('servico', 120), mensagem: t('mensagem', 2000), origem: t('origem', 40) || 'WhatsApp',
  };
  if (dados.nome.length < 2) return { erro: 'Informe o nome.' };
  if (dados.telefone.replace(/\D/g, '').length < 8) return { erro: 'Informe o telefone.' };
  const supabase = await supabaseServidor();
  const { error } = id
    ? await supabase.from('clientes').update(dados).eq('id', id)
    : await supabase.from('clientes').insert({ ...dados, status: 'novo' });
  if (error) { console.warn('[cliente]', error.message); return { erro: 'Não foi possível salvar.' }; }
  revalidatePath('/admin', 'layout');
  return { ok: id ? 'Cliente atualizado.' : 'Cliente cadastrado.' };
}

const CATEGORIAS = ['Projetos elétricos', 'Quadros de comando', 'Instalações elétricas'];
export async function salvarTrabalho(dados: {
  id?: string; titulo: string; categoria: string; local: string; ano: string; descricao: string;
  destaques: string[]; fotos: string[]; ilustracao: string; publicado: boolean;
}): Promise<Estado> {
  if (!(await adminAtual())) return { erro: 'Sessão expirada. Entre novamente.' };
  const titulo = dados.titulo.trim().slice(0, 140);
  if (titulo.length < 3) return { erro: 'Informe o título do trabalho.' };
  const linha = {
    titulo,
    categoria: CATEGORIAS.includes(dados.categoria) ? dados.categoria : CATEGORIAS[0],
    local: dados.local.trim().slice(0, 120), ano: dados.ano.trim().slice(0, 10),
    descricao: dados.descricao.trim().slice(0, 3000),
    destaques: dados.destaques.map((d) => d.trim().slice(0, 60)).filter(Boolean).slice(0, 8),
    fotos: dados.fotos.filter((f) => /^[\w-]+\/[\w.-]+$/.test(f)).slice(0, 12),
    ilustracao: ['quadro', 'unifilar', 'comando', 'planta'].includes(dados.ilustracao) ? dados.ilustracao : 'quadro',
    publicado: Boolean(dados.publicado),
  };
  const supabase = await supabaseServidor();
  const { error } = dados.id
    ? await supabase.from('portfolio').update(linha).eq('id', dados.id)
    : await supabase.from('portfolio').insert(linha);
  if (error) { console.warn('[portfolio]', error.message); return { erro: 'Não foi possível salvar.' }; }
  revalidatePath('/'); revalidatePath('/admin/portfolio');
  return { ok: 'Trabalho salvo.' };
}

export async function excluirTrabalho(id: string): Promise<Estado> {
  if (!(await adminAtual())) return { erro: 'Sessão expirada.' };
  const supabase = await supabaseServidor();
  const { data } = await supabase.from('portfolio').select('fotos').eq('id', id).maybeSingle();
  if (data?.fotos?.length) await supabase.storage.from('portfolio').remove(data.fotos);
  await supabase.from('portfolio').delete().eq('id', id);
  revalidatePath('/'); revalidatePath('/admin/portfolio');
  return { ok: 'Excluído.' };
}

export async function removerFotos(caminhos: string[]) {
  if (!(await adminAtual()) || !caminhos.length) return;
  const supabase = await supabaseServidor();
  await supabase.storage.from('portfolio').remove(caminhos.filter((c) => /^[\w-]+\/[\w.-]+$/.test(c)));
}

export async function inscreverAvisos(insc: { endpoint: string; keys: { p256dh: string; auth: string } }): Promise<Estado> {
  const user = await adminAtual();
  if (!user) return { erro: 'Sessão expirada.' };
  if (!/^https:\/\//.test(insc.endpoint) || !insc.keys?.p256dh || !insc.keys?.auth) return { erro: 'Inscrição inválida.' };
  const supabase = await supabaseServidor();
  const { error } = await supabase.from('push_inscricoes').upsert(
    { user_id: user.id, endpoint: insc.endpoint, p256dh: insc.keys.p256dh, auth: insc.keys.auth }, { onConflict: 'endpoint' });
  if (error) { console.warn('[avisos] inscrição', error.message); return { erro: 'Não foi possível ativar.' }; }
  return { ok: 'Avisos ativados neste aparelho.' };
}

export async function cancelarAvisos(endpoint: string) {
  if (!(await adminAtual())) return;
  const supabase = await supabaseServidor();
  await supabase.from('push_inscricoes').delete().eq('endpoint', endpoint);
}

export async function testarAvisos(): Promise<Estado> {
  if (!(await adminAtual())) return { erro: 'Sessão expirada.' };
  const { supabaseServico } = await import('@/lib/supabase/servico');
  const { enviarPush } = await import('@/lib/avisos');
  const sb = supabaseServico();
  if (!sb) return { erro: 'Falta cadastrar SUPABASE_SERVICE_ROLE_KEY na Vercel.' };
  const n = await enviarPush(sb, 'Teste de aviso', 'Se você está vendo isto, os avisos de pedido novo estão funcionando.', '/admin');
  return n ? { ok: `Aviso de teste enviado para ${n} aparelho(s).` } : { erro: 'Nenhum aparelho com avisos ativados.' };
}
