-- Sensorial Boutique. Ejecutar en un proyecto Supabase nuevo.
-- Cada fila de perfumes representa una formula concreta (por ejemplo EDT y EDP son filas distintas).

create table public.brands (
  id text primary key check (id ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null unique check (length(trim(name)) between 2 and 120),
  website_url text,
  created_at timestamptz not null default now()
);

create table public.families (
  id text primary key check (id ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null unique,
  short_description text not null default '',
  long_description text not null default '',
  hero_image text,
  hero_alt text not null default '',
  hero_position text not null default '50% 50%',
  video_youtube_id text,
  video_start_seconds integer not null default 0 check (video_start_seconds >= 0),
  video_title text,
  ingredient_image text,
  ingredient_alt text not null default '',
  featured_perfume_id text,
  display_order smallint not null default 0
);

create table public.perfumes (
  id text primary key check (id ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  brand_id text not null references public.brands(id),
  family_id text not null references public.families(id),
  name text not null check (length(trim(name)) between 2 and 160),
  concentration text, -- EDT, EDP, extracto, etc.; forma parte de la formula, no del tamaño
  edition text,
  origin text not null check (origin in ('Diseñador', 'Árabe')),
  description text,
  release_year smallint check (release_year between 1800 and 2200),
  audience text check (audience in ('mujer', 'hombre', 'unisex')),
  primary_image text not null,
  collage_image text,
  best_seller_rank smallint check (best_seller_rank between 1 and 100),
  new_arrival_rank smallint check (new_arrival_rank between 1 and 100),
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (brand_id, name, concentration, edition)
);

alter table public.families add constraint families_featured_perfume_fk
  foreign key (featured_perfume_id) references public.perfumes(id) on delete set null;
create unique index perfumes_best_seller_rank_unique on public.perfumes(best_seller_rank)
  where best_seller_rank is not null;
create unique index perfumes_new_arrival_rank_unique on public.perfumes(new_arrival_rank)
  where new_arrival_rank is not null;
create index perfumes_family_public_idx on public.perfumes(family_id, is_published);
create index perfumes_origin_public_idx on public.perfumes(origin, is_published);

-- Tamaños/SKU/precios son opcionales: la web actual cotiza por WhatsApp.
create table public.perfume_variants (
  id uuid primary key default gen_random_uuid(),
  perfume_id text not null references public.perfumes(id) on delete cascade,
  sku text unique,
  size_ml numeric(7,2) not null check (size_ml > 0),
  price_mxn numeric(12,2) check (price_mxn >= 0),
  stock_quantity integer check (stock_quantity >= 0),
  is_active boolean not null default true,
  unique (perfume_id, size_ml)
);

create table public.perfume_images (
  perfume_id text not null references public.perfumes(id) on delete cascade,
  position smallint not null check (position between 1 and 20),
  image_url text not null,
  alt_text text not null default '',
  primary key (perfume_id, position)
);

-- Procedencia: admite información propia, fabricantes, carga manual o una licencia comercial.
-- Guardar una URL NO concede derechos de extracción ni reutilización.
create table public.perfume_sources (
  id uuid primary key default gen_random_uuid(),
  perfume_id text not null references public.perfumes(id) on delete cascade,
  publisher text not null,
  source_url text,
  rights_basis text not null check (rights_basis in ('propio', 'fabricante', 'licencia', 'manual')),
  license_reference text,
  is_primary boolean not null default false,
  checked_at date,
  created_at timestamptz not null default now(),
  check (rights_basis <> 'licencia' or license_reference is not null)
);
create unique index perfume_sources_one_primary on public.perfume_sources(perfume_id)
  where is_primary;

create table public.notes (
  name text primary key check (length(trim(name)) between 2 and 100)
);
create table public.perfume_notes (
  perfume_id text not null references public.perfumes(id) on delete cascade,
  phase text not null check (phase in ('salida', 'corazon', 'fondo')),
  position smallint not null check (position between 1 and 100),
  note_name text not null references public.notes(name),
  source_id uuid references public.perfume_sources(id) on delete set null,
  primary key (perfume_id, phase, position),
  unique (perfume_id, phase, note_name)
);
create index perfume_notes_note_idx on public.perfume_notes(note_name);

create table public.accords (
  name text primary key check (length(trim(name)) between 2 and 100),
  color_rgb text not null check (color_rgb ~ '^[0-9]{1,3},[0-9]{1,3},[0-9]{1,3}$')
);
create table public.perfume_accords (
  perfume_id text not null references public.perfumes(id) on delete cascade,
  position smallint not null check (position between 1 and 100),
  accord_name text not null references public.accords(name),
  intensity smallint not null check (intensity between 0 and 100),
  source_id uuid references public.perfume_sources(id) on delete set null,
  primary key (perfume_id, position),
  unique (perfume_id, accord_name)
);

create table public.perfume_usage (
  perfume_id text primary key references public.perfumes(id) on delete cascade,
  winter smallint not null check (winter between 0 and 100),
  spring smallint not null check (spring between 0 and 100),
  summer smallint not null check (summer between 0 and 100),
  autumn smallint not null check (autumn between 0 and 100),
  day_score smallint not null check (day_score between 0 and 100),
  night_score smallint not null check (night_score between 0 and 100),
  source_id uuid references public.perfume_sources(id) on delete set null
);

-- Pendiente por defecto. Solo las publicadas son visibles al público.
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  perfume_id text references public.perfumes(id) on delete set null,
  author_name text not null check (length(trim(author_name)) between 2 and 80),
  city text check (city is null or length(trim(city)) between 2 and 80),
  body text not null check (length(trim(body)) between 15 and 1500),
  rating smallint check (rating between 1 and 5),
  photo_url text,
  photo_consent boolean not null default false,
  publication_consent boolean not null default false,
  status text not null default 'pending' check (status in ('pending', 'published', 'rejected')),
  is_featured boolean not null default false,
  verified_purchase boolean not null default false,
  created_at timestamptz not null default now(),
  published_at timestamptz,
  check (photo_url is null or photo_consent),
  check (status <> 'published' or publication_consent),
  check (status <> 'published' or published_at is not null)
);
create index reviews_public_perfume_idx on public.reviews(perfume_id, published_at desc)
  where status = 'published';
create index reviews_featured_idx on public.reviews(published_at desc)
  where status = 'published' and is_featured;

create function public.set_review_published_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.status = 'published' and new.published_at is null then
    new.published_at := now();
  elsif new.status <> 'published' then
    new.published_at := null;
    new.is_featured := false;
  end if;
  return new;
end;
$$;
create trigger reviews_published_at before insert or update of status on public.reviews
  for each row execute function public.set_review_published_at();

-- Vistas con la forma que consume app.js. security_invoker preserva RLS de tablas base.
create view public.catalog_public with (security_invoker = true) as
select
  p.id, b.name as casa, p.name as nombre, p.concentration as version,
  p.edition, p.origin as origen, p.family_id as familia,
  p.primary_image as foto, p.collage_image as lamina,
  case when ns.note_count > 0 then ns.notas else null end as notas,
  aa.acordes,
  case when u.perfume_id is not null then
    jsonb_build_array(u.winter, u.spring, u.summer, u.autumn, u.day_score, u.night_score)
  end as uso,
  ii.galeria,
  s.source_url as fuente, s.publisher as fuente_nombre,
  p.description as descripcion, p.release_year, p.audience,
  p.best_seller_rank, p.new_arrival_rank
from public.perfumes p
join public.brands b on b.id = p.brand_id
left join public.perfume_usage u on u.perfume_id = p.id
left join lateral (
  select count(*) as note_count,
    jsonb_build_object(
      'salida', coalesce(string_agg(n.name, ', ' order by pn.position) filter (where pn.phase = 'salida'), ''),
      'corazon', coalesce(string_agg(n.name, ', ' order by pn.position) filter (where pn.phase = 'corazon'), ''),
      'fondo', coalesce(string_agg(n.name, ', ' order by pn.position) filter (where pn.phase = 'fondo'), '')
    ) as notas
  from public.perfume_notes pn join public.notes n on n.name = pn.note_name
  where pn.perfume_id = p.id
) ns on true
left join lateral (
  select jsonb_agg(jsonb_build_array(a.name, pa.intensity, a.color_rgb) order by pa.position) as acordes
  from public.perfume_accords pa join public.accords a on a.name = pa.accord_name
  where pa.perfume_id = p.id
) aa on true
left join lateral (
  select jsonb_agg(jsonb_build_object('src', image_url, 'alt', alt_text) order by position) as galeria
  from public.perfume_images where perfume_id = p.id
) ii on true
left join public.perfume_sources s on s.perfume_id = p.id and s.is_primary
where p.is_published;

create view public.featured_reviews with (security_invoker = true) as
select id, perfume_id as perfume, author_name as nombre, city as ciudad,
  body as texto, rating as estrellas,
  case when photo_consent then photo_url end as foto,
  verified_purchase, published_at
from public.reviews
where status = 'published' and is_featured
order by published_at desc;

-- Bloquear privilegios heredados de proyectos Supabase antiguos antes de conceder lectura.
alter table public.brands enable row level security;
alter table public.families enable row level security;
alter table public.perfumes enable row level security;
alter table public.perfume_variants enable row level security;
alter table public.perfume_images enable row level security;
alter table public.perfume_sources enable row level security;
alter table public.notes enable row level security;
alter table public.perfume_notes enable row level security;
alter table public.accords enable row level security;
alter table public.perfume_accords enable row level security;
alter table public.perfume_usage enable row level security;
alter table public.reviews enable row level security;

revoke all on public.brands, public.families, public.perfumes, public.perfume_variants,
  public.perfume_images, public.perfume_sources, public.notes, public.perfume_notes,
  public.accords, public.perfume_accords, public.perfume_usage, public.reviews,
  public.catalog_public, public.featured_reviews from anon, authenticated;
grant select on public.brands, public.families, public.perfumes, public.perfume_images,
  public.notes, public.perfume_notes, public.accords,
  public.perfume_accords, public.perfume_usage,
  public.catalog_public, public.featured_reviews to anon, authenticated;
grant select (perfume_id, publisher, source_url, is_primary)
  on public.perfume_sources to anon, authenticated;
grant select (id, perfume_id, author_name, city, body, rating, photo_url,
  photo_consent, status, is_featured, verified_purchase, published_at)
  on public.reviews to anon, authenticated;
grant select, insert, update, delete on public.brands, public.families, public.perfumes,
  public.perfume_variants, public.perfume_images, public.perfume_sources,
  public.notes, public.perfume_notes, public.accords, public.perfume_accords,
  public.perfume_usage, public.reviews to service_role;
grant select on public.catalog_public, public.featured_reviews to service_role;

create policy "Read brands" on public.brands for select to anon, authenticated using (true);
create policy "Read families" on public.families for select to anon, authenticated using (true);
create policy "Read published perfumes" on public.perfumes for select to anon, authenticated
  using (is_published);
create policy "Read published perfume images" on public.perfume_images for select to anon, authenticated
  using (exists (select 1 from public.perfumes p where p.id = perfume_id and p.is_published));
create policy "Read published perfume sources" on public.perfume_sources for select to anon, authenticated
  using (exists (select 1 from public.perfumes p where p.id = perfume_id and p.is_published));
create policy "Read notes dictionary" on public.notes for select to anon, authenticated using (true);
create policy "Read published perfume notes" on public.perfume_notes for select to anon, authenticated
  using (exists (select 1 from public.perfumes p where p.id = perfume_id and p.is_published));
create policy "Read accords dictionary" on public.accords for select to anon, authenticated using (true);
create policy "Read published perfume accords" on public.perfume_accords for select to anon, authenticated
  using (exists (select 1 from public.perfumes p where p.id = perfume_id and p.is_published));
create policy "Read published perfume usage" on public.perfume_usage for select to anon, authenticated
  using (exists (select 1 from public.perfumes p where p.id = perfume_id and p.is_published));
create policy "Read published reviews" on public.reviews for select to anon, authenticated
  using (status = 'published' and (
    perfume_id is null or exists (
      select 1 from public.perfumes p where p.id = perfume_id and p.is_published
    )
  ));

-- No INSERT público directo en reviews: la recepción se habilita con una función protegida
-- con CAPTCHA o mediante autenticación, según el flujo de comentarios elegido.
