-- Panel privado de Sensorial. Ejecutar después de 20261003_001_sensorial.sql.
-- Dar acceso únicamente insertando el UUID de un usuario real de auth.users
-- en private.sensorial_admins desde SQL Editor (ver SUPABASE.md).

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create table private.sensorial_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table private.sensorial_admins enable row level security;
revoke all on private.sensorial_admins from public, anon, authenticated;

create function private.sensorial_is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from private.sensorial_admins
    where user_id = (select auth.uid())
  );
$$;
revoke all on function private.sensorial_is_admin() from public, anon;
grant execute on function private.sensorial_is_admin() to authenticated;

-- El navegador puede conocer si su propia sesión tiene acceso, sin leer la lista privada.
create function public.sensorial_admin_access() returns boolean
language sql stable security invoker set search_path = '' as $$
  select private.sensorial_is_admin();
$$;
revoke all on function public.sensorial_admin_access() from public, anon;
grant execute on function public.sensorial_admin_access() to authenticated;

-- Lectura y edición protegidas por RLS. La función privada no está expuesta al Data API.
grant select, insert, update, delete on public.brands, public.perfumes,
  public.perfume_images, public.perfume_sources, public.notes,
  public.perfume_notes, public.accords, public.perfume_accords,
  public.perfume_usage, public.perfume_variants to authenticated;
grant select, update, delete on public.reviews to authenticated;

-- Los grants de administrador incluyen columnas privadas. Mantener las políticas
-- públicas de estas dos tablas solo en anon para no exponerlas a otras cuentas.
drop policy "Read published perfume sources" on public.perfume_sources;
create policy "Read published perfume sources" on public.perfume_sources for select to anon
  using (exists (select 1 from public.perfumes p where p.id = perfume_id and p.is_published));
drop policy "Read published reviews" on public.reviews;
create policy "Read published reviews" on public.reviews for select to anon
  using (status = 'published' and (
    perfume_id is null or exists (
      select 1 from public.perfumes p where p.id = perfume_id and p.is_published
    )
  ));

create policy "Admin brands" on public.brands for all to authenticated
  using ((select private.sensorial_is_admin()))
  with check ((select private.sensorial_is_admin()));
create policy "Admin perfumes" on public.perfumes for all to authenticated
  using ((select private.sensorial_is_admin()))
  with check ((select private.sensorial_is_admin()));
create policy "Admin perfume images" on public.perfume_images for all to authenticated
  using ((select private.sensorial_is_admin()))
  with check ((select private.sensorial_is_admin()));
create policy "Admin perfume sources" on public.perfume_sources for all to authenticated
  using ((select private.sensorial_is_admin()))
  with check ((select private.sensorial_is_admin()));
create policy "Admin notes" on public.notes for all to authenticated
  using ((select private.sensorial_is_admin()))
  with check ((select private.sensorial_is_admin()));
create policy "Admin perfume notes" on public.perfume_notes for all to authenticated
  using ((select private.sensorial_is_admin()))
  with check ((select private.sensorial_is_admin()));
create policy "Admin accords" on public.accords for all to authenticated
  using ((select private.sensorial_is_admin()))
  with check ((select private.sensorial_is_admin()));
create policy "Admin perfume accords" on public.perfume_accords for all to authenticated
  using ((select private.sensorial_is_admin()))
  with check ((select private.sensorial_is_admin()));
create policy "Admin perfume usage" on public.perfume_usage for all to authenticated
  using ((select private.sensorial_is_admin()))
  with check ((select private.sensorial_is_admin()));
create policy "Admin perfume variants" on public.perfume_variants for all to authenticated
  using ((select private.sensorial_is_admin()))
  with check ((select private.sensorial_is_admin()));
create policy "Admin reviews" on public.reviews for all to authenticated
  using ((select private.sensorial_is_admin()))
  with check ((select private.sensorial_is_admin()));

-- Un RPC equivale a una transacción: si una nota o foto falla, no queda una ficha a medias.
create function public.sensorial_admin_save_perfume(p jsonb) returns text
language plpgsql security invoker set search_path = '' as $$
declare
  v_id text := nullif(btrim(p->>'id'), '');
  v_brand_id text := nullif(btrim(p->>'brand_id'), '');
  v_brand_name text := nullif(btrim(p->>'brand_name'), '');
  v_phase text;
  v_item jsonb;
  v_name text;
  v_color text;
  v_position integer;
  v_source jsonb;
  v_note_sources jsonb;
  v_accord_sources jsonb;
  v_usage_source uuid;
begin
  if not private.sensorial_is_admin() then
    raise exception 'Acceso denegado' using errcode = '42501';
  end if;
  if v_id is null or v_brand_id is null or v_brand_name is null
      or v_id !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
      or v_brand_id !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'ID o casa inválidos';
  end if;
  if jsonb_typeof(p->'images') is distinct from 'array'
      or jsonb_typeof(p->'notes') is distinct from 'object'
      or jsonb_typeof(p->'accords') is distinct from 'array'
      or jsonb_typeof(p->'variants') is distinct from 'array' then
    raise exception 'Datos de la ficha incompletos';
  end if;
  if jsonb_array_length(p->'images') > 20
      or jsonb_array_length(p->'accords') > 100
      or jsonb_array_length(p->'variants') > 100 then
    raise exception 'Demasiados elementos en la ficha';
  end if;

  insert into public.brands (id, name) values (v_brand_id, v_brand_name)
  on conflict (id) do nothing;
  if not exists (select 1 from public.brands where id = v_brand_id and name = v_brand_name) then
    raise exception 'El ID de la casa ya existe con otro nombre';
  end if;

  insert into public.perfumes (
    id, brand_id, family_id, name, concentration, edition, origin, description,
    release_year, audience, primary_image, collage_image, best_seller_rank,
    new_arrival_rank, is_published
  ) values (
    v_id, v_brand_id, p->>'family_id', btrim(p->>'name'),
    nullif(btrim(p->>'concentration'), ''), nullif(btrim(p->>'edition'), ''),
    p->>'origin', nullif(btrim(p->>'description'), ''),
    nullif(p->>'release_year', '')::smallint, nullif(p->>'audience', ''),
    btrim(p->>'primary_image'), nullif(btrim(p->>'collage_image'), ''),
    nullif(p->>'best_seller_rank', '')::smallint,
    nullif(p->>'new_arrival_rank', '')::smallint,
    coalesce((p->>'is_published')::boolean, false)
  ) on conflict (id) do update set
    brand_id = excluded.brand_id, family_id = excluded.family_id,
    name = excluded.name, concentration = excluded.concentration,
    edition = excluded.edition, origin = excluded.origin,
    description = excluded.description, release_year = excluded.release_year,
    audience = excluded.audience, primary_image = excluded.primary_image,
    collage_image = excluded.collage_image,
    best_seller_rank = excluded.best_seller_rank,
    new_arrival_rank = excluded.new_arrival_rank,
    is_published = excluded.is_published, updated_at = now();

  delete from public.perfume_images where perfume_id = v_id;
  v_position := 0;
  for v_item in select value from jsonb_array_elements(p->'images') loop
    v_position := v_position + 1;
    if nullif(btrim(v_item->>'image_url'), '') is null then
      raise exception 'Hay una foto sin URL';
    end if;
    insert into public.perfume_images (perfume_id, position, image_url, alt_text)
    values (v_id, v_position, btrim(v_item->>'image_url'), coalesce(v_item->>'alt_text', ''));
  end loop;

  select coalesce(jsonb_object_agg(phase || ':' || note_name, source_id), '{}'::jsonb)
    into v_note_sources from public.perfume_notes where perfume_id = v_id;
  delete from public.perfume_notes where perfume_id = v_id;
  foreach v_phase in array array['salida', 'corazon', 'fondo'] loop
    if jsonb_typeof(p->'notes'->v_phase) is distinct from 'array'
        or jsonb_array_length(p->'notes'->v_phase) > 100 then
      raise exception 'Notas inválidas en %', v_phase;
    end if;
    v_position := 0;
    for v_item in select value from jsonb_array_elements(p->'notes'->v_phase) loop
      v_name := nullif(btrim(v_item #>> '{}'), '');
      if v_name is not null then
        v_position := v_position + 1;
        insert into public.notes (name) values (v_name) on conflict do nothing;
        insert into public.perfume_notes (perfume_id, phase, position, note_name, source_id)
        values (v_id, v_phase, v_position, v_name,
          (v_note_sources->>(v_phase || ':' || v_name))::uuid);
      end if;
    end loop;
  end loop;

  select coalesce(jsonb_object_agg(accord_name, source_id), '{}'::jsonb)
    into v_accord_sources from public.perfume_accords where perfume_id = v_id;
  delete from public.perfume_accords where perfume_id = v_id;
  v_position := 0;
  for v_item in select value from jsonb_array_elements(p->'accords') loop
    v_position := v_position + 1;
    v_name := nullif(btrim(v_item->>'name'), '');
    v_color := coalesce(nullif(btrim(v_item->>'color_rgb'), ''), '150,150,150');
    if v_name is null then raise exception 'Hay un acorde sin nombre'; end if;
    insert into public.accords (name, color_rgb) values (v_name, v_color)
    on conflict (name) do nothing;
    insert into public.perfume_accords (perfume_id, position, accord_name, intensity, source_id)
    values (v_id, v_position, v_name, (v_item->>'intensity')::smallint,
      (v_accord_sources->>v_name)::uuid);
  end loop;

  select source_id into v_usage_source from public.perfume_usage where perfume_id = v_id;
  delete from public.perfume_usage where perfume_id = v_id;
  if jsonb_typeof(p->'usage') = 'object' then
    insert into public.perfume_usage
      (perfume_id, winter, spring, summer, autumn, day_score, night_score, source_id)
    values (
      v_id, (p->'usage'->>'winter')::smallint,
      (p->'usage'->>'spring')::smallint,
      (p->'usage'->>'summer')::smallint,
      (p->'usage'->>'autumn')::smallint,
      (p->'usage'->>'day_score')::smallint,
      (p->'usage'->>'night_score')::smallint, v_usage_source
    );
  end if;

  delete from public.perfume_variants where perfume_id = v_id;
  for v_item in select value from jsonb_array_elements(p->'variants') loop
    insert into public.perfume_variants
      (perfume_id, size_ml, sku, price_mxn, stock_quantity, is_active)
    values (
      v_id, (v_item->>'size_ml')::numeric,
      nullif(btrim(v_item->>'sku'), ''),
      nullif(v_item->>'price_mxn', '')::numeric,
      nullif(v_item->>'stock_quantity', '')::integer,
      coalesce((v_item->>'is_active')::boolean, true)
    );
  end loop;

  if p ? 'primary_source' then
    v_source := p->'primary_source';
    if jsonb_typeof(v_source) = 'object'
        and nullif(btrim(v_source->>'publisher'), '') is not null then
      update public.perfume_sources set
        publisher = btrim(v_source->>'publisher'),
        source_url = nullif(btrim(v_source->>'source_url'), ''),
        rights_basis = v_source->>'rights_basis',
        license_reference = nullif(btrim(v_source->>'license_reference'), ''),
        checked_at = nullif(v_source->>'checked_at', '')::date
      where perfume_id = v_id and is_primary;
      if not found then
        insert into public.perfume_sources
          (perfume_id, publisher, source_url, rights_basis, license_reference, is_primary, checked_at)
        values (
          v_id, btrim(v_source->>'publisher'),
          nullif(btrim(v_source->>'source_url'), ''),
          v_source->>'rights_basis',
          nullif(btrim(v_source->>'license_reference'), ''),
          true, nullif(v_source->>'checked_at', '')::date
        );
      end if;
    else
      delete from public.perfume_sources where perfume_id = v_id and is_primary;
    end if;
  end if;

  return v_id;
end;
$$;
revoke all on function public.sensorial_admin_save_perfume(jsonb) from public, anon;
grant execute on function public.sensorial_admin_save_perfume(jsonb) to authenticated;

-- Crear en Storage un bucket público llamado sensorial-perfumes antes de subir fotos.
-- Los archivos son públicos porque aparecen en el catálogo; solo el administrador sube.
create policy "Sensorial admin upload perfume images" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'sensorial-perfumes' and (select private.sensorial_is_admin()));
create policy "Sensorial admin inspect perfume images" on storage.objects
  for select to authenticated
  using (bucket_id = 'sensorial-perfumes' and (select private.sensorial_is_admin()));
