-- Excluir clientes (com os orçamentos, OS e parcelas deles) — execute no SQL Editor (modo Database), uma vez.

create or replace function public.excluir_cliente(p_cliente uuid, p_devolver boolean default true) returns void
language plpgsql security definer set search_path = public as $$
declare o record; s public.servicos;
begin
  if not public.is_admin() then raise exception 'sem permissão'; end if;
  if not exists (select 1 from public.clientes where id = p_cliente) then return; end if;

  -- orçamentos do cliente (cada um leva a sua OS e as parcelas; bloqueia se houver pagamento)
  for o in select id from public.orcamentos where cliente_id = p_cliente loop
    perform public.excluir_orcamento(o.id, p_devolver);
  end loop;

  -- OS que tenham ficado sem orçamento
  for s in select * from public.servicos where cliente_id = p_cliente loop
    if exists (select 1 from public.parcelas where servico_id = s.id and pago) then
      raise exception 'tem pagamento registrado na %', s.numero; end if;
    if s.baixa_feita then
      if p_devolver then perform public.devolver_material_servico(s.id);
      else raise exception 'o material da % já saiu do estoque', s.numero; end if;
    end if;
    update public.movimentacoes set servico_id = null where servico_id = s.id;
    delete from public.servicos where id = s.id;
  end loop;

  delete from public.clientes where id = p_cliente;
end $$;
