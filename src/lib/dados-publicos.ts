import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY, supabaseConfigurado } from './supabase/config';
import { mesclarConteudo, type ConteudoSite } from './conteudo';

export type Empresa = {
  nome: string; responsavel: string; registro: string; telefone: string; email: string; cidade: string; regiao: string; instagram: string;
};

export const EMPRESA_PADRAO: Empresa = {
  nome: 'EB Instalações Elétricas', responsavel: '', registro: 'Técnico em Eletrotécnica', telefone: '', email: '', cidade: '', regiao: '', instagram: '',
};

export async function carregarSitePublico(): Promise<{ empresa: Empresa; conteudo: ConteudoSite }> {
  if (!supabaseConfigurado) return { empresa: EMPRESA_PADRAO, conteudo: mesclarConteudo(null) };
  // Cliente sem sessão: o site público é igual para todos e pode ficar em cache.
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const [{ data: empresa }, { data: site }] = await Promise.all([
    supabase.from('empresa').select('*').eq('id', 1).maybeSingle(),
    supabase.from('site_publico').select('conteudo').maybeSingle(),
  ]);
  return { empresa: { ...EMPRESA_PADRAO, ...(empresa ?? {}) }, conteudo: mesclarConteudo(site?.conteudo) };
}

export function linkWhatsApp(telefone: string, nomeEmpresa: string) {
  let d = telefone.replace(/\D/g, '');
  if (d.length >= 10 && d.length <= 11) d = '55' + d;
  const msg = `Olá! Vim pelo site da ${nomeEmpresa} e gostaria de pedir um orçamento.`;
  return `https://wa.me/${d}?text=${encodeURIComponent(msg)}`;
}

/** Aceita "@perfil", "perfil" ou o link do perfil e devolve só "perfil" (vazio se inválido). */
export function arrobaInstagram(valor: string) {
  const v = valor.trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/^@/, '').split(/[/?#]/)[0];
  return /^[A-Za-z0-9._]{1,30}$/.test(v) ? v : '';
}

export function linkInstagram(arroba: string) {
  return `https://www.instagram.com/${arroba}/`;
}

export type Trabalho = {
  id: string; titulo: string; categoria: string; local: string; ano: string; descricao: string;
  destaques: string[]; fotos: string[]; ilustracao: string;
};

export function urlFoto(caminho: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/portfolio/${caminho.split('/').map(encodeURIComponent).join('/')}`;
}

export async function carregarPortfolio(): Promise<Trabalho[]> {
  if (!supabaseConfigurado) return [];
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const { data } = await supabase.from('portfolio')
    .select('id,titulo,categoria,local,ano,descricao,destaques,fotos,ilustracao')
    .eq('publicado', true).order('ordem').order('criado_em', { ascending: false });
  return (data ?? []) as Trabalho[];
}
