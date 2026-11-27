'use server';
import { revalidatePath } from 'next/cache';
import { adminAtual, supabaseServidor } from '@/lib/supabase/server';
import { CATEGORIAS_MATERIAL, UNIDADES_MATERIAL } from '@/lib/negocio';

type R = { ok?: string; erro?: string };
const n = (v: unknown) => { const x = Number(v); return Number.isFinite(x) ? Math.round(x * 100) / 100 : 0; };

export async function salvarMaterial(d: {
  id?: string; codigo: string; nome: string; categoria: string; unidade: string; local: string; fornecedor: string;
  minimo: number; custo: number; preco: number; quantidade_inicial?: number;
}): Promise<R> {
  if (!(await adminAtual())) return { erro: 'Sessão expirada. Entre novamente.' };
  const nome = d.nome.trim().slice(0, 160);
  if (nome.length < 2) return { erro: 'Informe a descrição do material.' };
  const linha = {
    nome, codigo: d.codigo.trim().slice(0, 40),
    categoria: CATEGORIAS_MATERIAL.includes(d.categoria) ? d.categoria : 'Outros',
    unidade: UNIDADES_MATERIAL.some((u) => u[0] === d.unidade) ? d.unidade : 'pç',
    local: d.local.trim().slice(0, 80), fornecedor: d.fornecedor.trim().slice(0, 120),
    minimo: Math.max(0, n(d.minimo)), custo: Math.max(0, n(d.custo)), preco: Math.max(0, n(d.preco)),
  };
  const sb = await supabaseServidor();
  if (d.id) {
    const { error } = await sb.from('materiais').update(linha).eq('id', d.id);
    if (error) return { erro: 'Não foi possível salvar.' };
  } else {
    const { data, error } = await sb.from('materiais').insert(linha).select('id').single();
    if (error || !data) return { erro: 'Não foi possível salvar.' };
    const q = Math.max(0, n(d.quantidade_inicial));
    if (q > 0) await sb.rpc('movimentar_material', { p_material: data.id, p_tipo: 'entrada', p_quantidade: q, p_obs: 'Saldo inicial' });
  }
  revalidatePath('/admin', 'layout');
  return { ok: 'Material salvo.' };
}

export async function movimentar(d: { id: string; tipo: 'entrada' | 'saida' | 'ajuste'; quantidade: number; obs: string; custo?: number }): Promise<R> {
  if (!(await adminAtual())) return { erro: 'Sessão expirada. Entre novamente.' };
  const q = n(d.quantidade);
  if (d.tipo === 'ajuste' ? q < 0 : q <= 0) return { erro: 'Informe uma quantidade válida.' };
  const sb = await supabaseServidor();
  const { error } = await sb.rpc('movimentar_material', { p_material: d.id, p_tipo: d.tipo, p_quantidade: q, p_obs: d.obs.trim().slice(0, 200) });
  if (error) return { erro: error.message.includes('saldo insuficiente') ? 'Saldo insuficiente para essa saída.' : 'Não foi possível registrar.' };
  if (d.tipo === 'entrada' && d.custo && n(d.custo) > 0) await sb.from('materiais').update({ custo: n(d.custo) }).eq('id', d.id);
  revalidatePath('/admin', 'layout');
  return { ok: 'Registrado.' };
}

export async function entradaEmLote(itens: { id: string; quantidade: number }[], nf: string, fornecedor: string): Promise<R> {
  if (!(await adminAtual())) return { erro: 'Sessão expirada. Entre novamente.' };
  const sb = await supabaseServidor();
  const obs = [nf.trim(), fornecedor.trim()].filter(Boolean).join(' · ').slice(0, 200) || 'Compra da lista de compras';
  let ok = 0;
  for (const i of itens) {
    const q = n(i.quantidade); if (q <= 0) continue;
    const { error } = await sb.rpc('movimentar_material', { p_material: i.id, p_tipo: 'entrada', p_quantidade: q, p_obs: obs });
    if (!error) ok++;
    if (fornecedor.trim()) await sb.from('materiais').update({ fornecedor: fornecedor.trim().slice(0, 120) }).eq('id', i.id).eq('fornecedor', '');
  }
  revalidatePath('/admin', 'layout');
  return ok ? { ok: `Entrada registrada para ${ok} ${ok === 1 ? 'material' : 'materiais'}.` } : { erro: 'Informe ao menos uma quantidade.' };
}
