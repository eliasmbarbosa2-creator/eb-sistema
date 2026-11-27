'use server';
import { after } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY, supabaseConfigurado } from '@/lib/supabase/config';
import { avisarNovoPedido } from '@/lib/avisos';
import { mesclarConteudo } from '@/lib/conteudo';

export type EstadoPedido = { ok?: boolean; erro?: string; campo?: string };

const TIPOS = ['Residencial', 'Comercial', 'Industrial'];
const txt = (f: FormData, k: string, max: number) => String(f.get(k) ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

export async function enviarPedido(_: EstadoPedido, f: FormData): Promise<EstadoPedido> {
  // Proteção contra robôs: campo invisível preenchido, ou formulário enviado rápido demais / sem JavaScript.
  const armadilha = String(f.get('site') ?? '');
  const t = Number(f.get('t') ?? 0);
  const decorrido = Date.now() - t;
  if (armadilha || !t || decorrido < 2500 || decorrido > 1000 * 60 * 60 * 24) {
    console.warn('[pedido] descartado pela proteção anti-robô');
    return { ok: true }; // não revela ao robô que foi barrado
  }

  const nome = txt(f, 'nome', 120);
  const telefone = txt(f, 'telefone', 30);
  const email = txt(f, 'email', 160);
  const mensagem = String(f.get('mensagem') ?? '').trim().slice(0, 2000);
  if (nome.length < 2) return { erro: 'Informe o seu nome.', campo: 'nome' };
  if (telefone.replace(/\D/g, '').length < 10) return { erro: 'Informe um telefone com DDD.', campo: 'telefone' };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { erro: 'Confira o e-mail.', campo: 'email' };

  if (!supabaseConfigurado) return { erro: 'O formulário está temporariamente indisponível. Fale pelo WhatsApp.' };
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  // As opções válidas de urgência e horário são as que estão publicadas em "Conteúdo do site".
  const { data: site } = await sb.from('site_publico').select('conteudo').maybeSingle();
  const F = mesclarConteudo(site?.conteudo).formulario;
  const escolha = (k: string, lista: string[]) => (lista.includes(txt(f, k, 60)) ? txt(f, k, 60) : '');

  const pedido = {
    nome, telefone, email,
    tipo: TIPOS.includes(txt(f, 'tipo', 20)) ? txt(f, 'tipo', 20) : 'Residencial',
    endereco: txt(f, 'endereco', 200),
    cidade: txt(f, 'cidade', 120),
    servico: txt(f, 'servico', 120) || 'Não informado',
    urgencia: F.campos.urgencia.mostrar ? escolha('urgencia', F.urgencias) : '',
    horario: F.campos.horario.mostrar ? escolha('horario', F.horarios) : '',
    mensagem,
    origem: 'Site',
    status: 'novo',
  };

  // Grava como visitante: as regras do banco só permitem CRIAR pedidos, nunca ler.
  const { error } = await sb.from('clientes').insert(pedido);
  if (error) {
    console.error('[pedido] erro ao gravar:', error.message);
    return { erro: 'Não foi possível enviar agora. Tente de novo em instantes ou fale pelo WhatsApp.' };
  }
  // Avisos saem depois da resposta, para o visitante não esperar.
  after(() => avisarNovoPedido(pedido));
  return { ok: true };
}
