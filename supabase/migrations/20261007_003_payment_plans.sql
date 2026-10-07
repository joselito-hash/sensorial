-- Tablas de pagos (apartados en abonos). Ejecutar después de 20261003_002_admin_panel.sql.
-- El panel crea cada tabla con su plan de pagos y va registrando los abonos. El cliente la ve
-- en pagos.html#TOKEN: el navegador no puede listar las tablas, solo leer una con su token
-- mediante sensorial_payment_plan(). El token es aleatorio (128 bits) y no se puede adivinar.

-- Plan de pagos: [{ "amount": 570, "due": "2026-10-15" (opcional) }, ...]
create function private.sensorial_valid_installments(v jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select jsonb_typeof(v) = 'array'
    and jsonb_array_length(v) between 1 and 24
    and not exists (
      select 1 from jsonb_array_elements(v) as e(item)
      where jsonb_typeof(e.item) is distinct from 'object'
        or case when jsonb_typeof(e.item->'amount') = 'number'
             then (e.item->>'amount')::numeric not between 0.01 and 1000000
             else true end
        or case when jsonb_typeof(e.item->'due') in ('string', 'number', 'boolean', 'array', 'object')
             then e.item->>'due' !~ '^\d{4}-\d{2}-\d{2}$'
             else false end
    );
$$;

-- Abonos recibidos: [{ "amount": 200, "date": "2026-10-03", "note": "Efectivo" (opcional) }, ...]
-- Se aplican en orden al plan: cada pago queda tachado cuando lo abonado lo cubre.
create function private.sensorial_valid_payments(v jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select jsonb_typeof(v) = 'array'
    and jsonb_array_length(v) <= 200
    and not exists (
      select 1 from jsonb_array_elements(v) as e(item)
      where jsonb_typeof(e.item) is distinct from 'object'
        or case when jsonb_typeof(e.item->'amount') = 'number'
             then (e.item->>'amount')::numeric not between 0.01 and 1000000
             else true end
        or case when jsonb_typeof(e.item->'date') = 'string'
             then e.item->>'date' !~ '^\d{4}-\d{2}-\d{2}$'
             else true end
        or case when jsonb_typeof(e.item->'note') in ('string', 'number', 'boolean', 'array', 'object')
             then jsonb_typeof(e.item->'note') <> 'string' or length(e.item->>'note') > 120
             else false end
    );
$$;

create table public.payment_plans (
  id uuid primary key default gen_random_uuid(),
  token text not null unique
    default rtrim(translate(encode(uuid_send(gen_random_uuid()), 'base64'), '+/', '-_'), '='),
  client_name text not null check (length(btrim(client_name)) between 1 and 80),
  brand text not null default '' check (length(brand) <= 80),
  product_name text not null check (length(btrim(product_name)) between 1 and 120),
  watermark text not null default '' check (length(watermark) <= 16),
  -- Foto del perfume y silueta opcional detrás del frasco (por ejemplo el logo de la casa).
  image_url text check (image_url is null or image_url ~ '^(https://|img/)[^\s"''<>`]+$'),
  watermark_image_url text
    check (watermark_image_url is null or watermark_image_url ~ '^(https://|img/)[^\s"''<>`]+$'),
  tone text not null default 'rosa' check (tone in ('rosa', 'dorado', 'celeste', 'verde', 'lila')),
  installments jsonb not null check (private.sensorial_valid_installments(installments)),
  payments jsonb not null default '[]'::jsonb check (private.sensorial_valid_payments(payments)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create function private.sensorial_touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
create trigger payment_plans_updated_at before update on public.payment_plans
  for each row execute function private.sensorial_touch_updated_at();

-- Solo la cuenta administradora lee y edita la tabla completa (incluidas las notas de cada abono).
alter table public.payment_plans enable row level security;
revoke all on public.payment_plans from public, anon, authenticated;
grant select, insert, update, delete on public.payment_plans to authenticated;
create policy "Admin payment plans" on public.payment_plans for all to authenticated
  using ((select private.sensorial_is_admin()))
  with check ((select private.sensorial_is_admin()));

-- Lectura pública de una sola tabla por su token. Devuelve null si no existe.
-- Las notas de los abonos se quedan en el panel.
create function public.sensorial_payment_plan(p_token text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
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
  )
  from public.payment_plans pp
  where p_token ~ '^[A-Za-z0-9_-]{16,64}$' and pp.token = p_token;
$$;
revoke all on function public.sensorial_payment_plan(text) from public;
grant execute on function public.sensorial_payment_plan(text) to anon, authenticated;

-- Las fotos subidas desde la tabla de pagos van al mismo bucket, en la carpeta pagos/.
-- Las políticas de 20261003_002_admin_panel.sql ya permiten que solo el administrador suba.
