-- Excluir clientes e materiais — execute no SQL Editor (modo Database), uma vez.

-- Exclui os clientes escolhidos, com seus orçamentos, ordens de serviço e parcelas.
-- p_devolver: devolve ao estoque o material que já tinha saído para as OS.
-- p_apagar_pagos: sem ele, a exclusão para se houver pagamento registrado.
create or replace function public.excluir_clientes(p_ids uuid[], p_devolver boolean default true, p_apagar_pagos boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $$
declare s public.servicos; n int;
begin
  if not public.is_admin() then raise exception 'sem permissão'; end if;
  if p_ids is null or array_length(p_ids, 1) is null then return jsonb_build_object('excluidos', 0); end if;
  for s in select * from public.servicos where cliente_id = any(p_ids) for update loop
    if not p_apagar_pagos and exists (select 1 from public.parcelas where servico_id = s.id and pago) then
      raise exception 'tem pagamento registrado na %', s.numero; end if;
    if s.baixa_feita and p_devolver then perform public.devolver_material_servico(s.id); end if;
    delete from public.servicos where id = s.id;          -- parcelas saem junto; histórico do estoque fica
  end loop;
  delete from public.orcamentos where cliente_id = any(p_ids);   -- itens, versões e respostas saem junto
  delete from public.clientes where id = any(p_ids);
  get diagnostics n = row_count;
  return jsonb_build_object('excluidos', n);
end $$;

-- Exclui um material do estoque.
-- Nos orçamentos cujo material ainda NÃO saiu do estoque, o item passa para o substituto
-- (ou fica só no orçamento, sem ligação com o estoque, se não houver substituto).
-- O material sai das listas, mas o histórico de movimentações é mantido.
create or replace function public.excluir_material(p_mat uuid, p_substituto uuid default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not public.is_admin() then raise exception 'sem permissão'; end if;
  if p_substituto = p_mat then raise exception 'escolha outro material'; end if;
  if p_substituto is not null and not exists (select 1 from public.materiais where id = p_substituto and ativo) then
    raise exception 'substituto inválido'; end if;
  update public.orcamento_itens i set material_id = p_substituto
   where i.material_id = p_mat
     and not exists (select 1 from public.servicos s where s.orcamento_id = i.orcamento_id and s.baixa_feita);
  get diagnostics n = row_count;
  update public.materiais set ativo = false where id = p_mat;
  return jsonb_build_object('itens', n);
end $$;
