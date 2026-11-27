-- Devolver ao estoque os materiais retirados para uma OS — execute no SQL Editor (modo Database), uma vez.

-- Desfaz a retirada: devolve cada material e registra uma entrada "Devolução de OS-…" no histórico do estoque.
create or replace function public.devolver_material_servico(p_servico uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s public.servicos; r record; n int := 0;
begin
  if not public.is_admin() then raise exception 'sem permissão'; end if;
  select * into s from public.servicos where id = p_servico for update;
  if s.id is null then raise exception 'serviço não encontrado'; end if;
  if not s.baixa_feita then return jsonb_build_object('ok', true, 'devolvidos', 0); end if;

  -- saldo líquido que saiu para esta OS (saídas menos devoluções anteriores)
  for r in
    select material_id, sum(case when tipo = 'saida' then quantidade when tipo = 'entrada' then -quantidade else 0 end) q
      from public.movimentacoes where servico_id = s.id group by material_id
  loop
    if r.q > 0 then
      update public.materiais set quantidade = quantidade + r.q where id = r.material_id;
      insert into public.movimentacoes (material_id, tipo, quantidade, observacao, servico_id)
      values (r.material_id, 'entrada', r.q, 'Devolução de ' || s.numero, s.id);
      n := n + 1;
    end if;
  end loop;
  update public.servicos set baixa_feita = false where id = s.id;
  return jsonb_build_object('ok', true, 'devolvidos', n);
end $$;

-- Excluir orçamento: agora pode devolver os materiais da OS antes de excluir.
drop function if exists public.excluir_orcamento(uuid);
create or replace function public.excluir_orcamento(p_orc uuid, p_devolver boolean default false) returns void
language plpgsql security definer set search_path = public as $$
declare o public.orcamentos; s public.servicos;
begin
  if not public.is_admin() then raise exception 'sem permissão'; end if;
  select * into o from public.orcamentos where id = p_orc for update;
  if o.id is null then raise exception 'orçamento não encontrado'; end if;
  for s in select * from public.servicos where orcamento_id = o.id loop
    if exists (select 1 from public.parcelas where servico_id = s.id and pago) then
      raise exception 'tem pagamento registrado na %', s.numero; end if;
    if s.baixa_feita then
      if p_devolver then perform public.devolver_material_servico(s.id);
      else raise exception 'o material da % já saiu do estoque', s.numero; end if;
    end if;
    -- o histórico do estoque fica, só perde o vínculo com a OS excluída
    update public.movimentacoes set servico_id = null where servico_id = s.id;
    delete from public.servicos where id = s.id;   -- parcelas saem junto
  end loop;
  delete from public.orcamentos where id = o.id;   -- itens, versões e respostas saem junto
end $$;
