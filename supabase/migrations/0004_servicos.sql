-- Etapa 3C (serviços e financeiro) — execute no SQL Editor (modo Database), uma vez.

-- Retira do estoque os materiais do orçamento de uma OS. Tudo ou nada:
-- se faltar algum material, nada é retirado e a lista do que falta é devolvida.
create or replace function public.dar_baixa_servico(p_servico uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s public.servicos; falta jsonb; r record;
begin
  if not public.is_admin() then raise exception 'sem permissão'; end if;
  select * into s from public.servicos where id = p_servico for update;
  if s.id is null then raise exception 'serviço não encontrado'; end if;
  if s.baixa_feita then return jsonb_build_object('ok', true, 'ja_feita', true); end if;

  -- trava os materiais envolvidos enquanto confere e retira
  perform 1 from public.materiais m
   where m.id in (select material_id from public.orcamento_itens where orcamento_id = s.orcamento_id and tipo = 'material' and material_id is not null)
   for update;

  select coalesce(jsonb_agg(jsonb_build_object('nome', m.nome, 'precisa', x.q, 'tem', m.quantidade, 'unidade', m.unidade)), '[]'::jsonb)
    into falta
    from (select material_id, sum(quantidade) q from public.orcamento_itens
           where orcamento_id = s.orcamento_id and tipo = 'material' and material_id is not null group by material_id) x
    join public.materiais m on m.id = x.material_id
   where m.quantidade < x.q;
  if jsonb_array_length(falta) > 0 then return jsonb_build_object('ok', false, 'falta', falta); end if;

  for r in select material_id, sum(quantidade) q from public.orcamento_itens
            where orcamento_id = s.orcamento_id and tipo = 'material' and material_id is not null group by material_id loop
    update public.materiais set quantidade = quantidade - r.q where id = r.material_id;
    insert into public.movimentacoes (material_id, tipo, quantidade, observacao, servico_id)
    values (r.material_id, 'saida', r.q, 'Saída para ' || s.numero, s.id);
  end loop;
  update public.servicos set baixa_feita = true where id = s.id;
  return jsonb_build_object('ok', true);
end $$;
