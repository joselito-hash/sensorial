-- Sensorial: varias tablas de pagos para una misma clienta.
-- Las tablas con el mismo client_group se ven juntas en un solo enlace: la clienta desliza de
-- lado para pasar de un perfume a otro. Cada tabla conserva su token y cualquiera de ellos abre
-- el grupo completo, empezando por esa tabla. Las tablas que ya existen quedan solas (cada una
-- recibe su propio grupo) hasta que el panel las junte.
-- Ejecutar después de 20261007_003_payment_plans.sql. Se puede volver a ejecutar sin problema.

alter table public.payment_plans
  add column if not exists client_group uuid not null default gen_random_uuid();
create index if not exists payment_plans_client_group_idx on public.payment_plans (client_group, created_at);

-- Lo que ve la clienta de una tabla. Las notas de los abonos se quedan en el panel.
create or replace function private.sensorial_payment_plan_publica(pp public.payment_plans) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'token', pp.token,
    'client_name', pp.client_name,
    'brand', pp.brand,
    'product_name', pp.product_name,
    'watermark', pp.watermark,
    'image_url', pp.image_url,
    'watermark_image_url', pp.watermark_image_url,
    'tone', pp.tone,
    'installments', pp.installments,
    'payments', (
      select coalesce(jsonb_agg(jsonb_build_object('amount', e.item->'amount', 'date', e.item->'date')
        order by e.n), '[]'::jsonb)
      from jsonb_array_elements(pp.payments) with ordinality as e(item, n)
    ),
    'updated_at', pp.updated_at
  );
$$;
revoke all on function private.sensorial_payment_plan_publica(public.payment_plans) from public, anon, authenticated;

-- La tabla del token, igual que antes (las páginas que ya estaban abiertas la siguen leyendo
-- así), y en "grupo" todas las tablas de esa clienta, de la más antigua a la más nueva. Nunca
-- más de 12: la del token y las 11 más recientes.
create or replace function public.sensorial_payment_plan(p_token text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select private.sensorial_payment_plan_publica(pp) || jsonb_build_object(
    'grupo', (
      select jsonb_agg(private.sensorial_payment_plan_publica(g.fila) order by (g.fila).created_at, (g.fila).id)
      from (
        select otra as fila
        from public.payment_plans otra
        where otra.client_group = pp.client_group
        order by otra.id = pp.id desc, otra.created_at desc, otra.id
        limit 12
      ) g
    )
  )
  from public.payment_plans pp
  where p_token ~ '^[A-Za-z0-9_-]{16,64}$' and pp.token = p_token;
$$;
revoke all on function public.sensorial_payment_plan(text) from public;
grant execute on function public.sensorial_payment_plan(text) to anon, authenticated;
