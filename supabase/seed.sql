-- Carga inicial de identidad y presentación del catálogo actual.
-- No duplica notas, acordes ni puntuaciones de Fragrantica: esos datos requieren
-- una fuente propia, del fabricante o una licencia que permita reutilizarlos.

insert into public.brands (id, name) values
  ('dior', 'Dior'),
  ('giorgio-armani', 'Giorgio Armani'),
  ('dolce-gabbana', 'Dolce & Gabbana'),
  ('versace', 'Versace'),
  ('yves-saint-laurent', 'Yves Saint Laurent'),
  ('lancome', 'Lancôme'),
  ('chanel', 'Chanel'),
  ('hermes', 'Hermès'),
  ('hugo-boss', 'Hugo Boss'),
  ('lattafa', 'Lattafa'),
  ('rabanne', 'Rabanne')
on conflict (id) do update set name = excluded.name;

insert into public.families
  (id, name, short_description, long_description, hero_image, hero_alt,
   hero_position, video_youtube_id, video_start_seconds, video_title,
   ingredient_image, ingredient_alt, display_order)
values
  ('frescos', 'Frescos', 'Cítricos, marinos y limpios.',
   'Cítricos, marinos y limpios. Para el calor, la oficina y oler a recién bañado.',
   '1747916148863-7164d8920b57', 'Frasco de Dior Sauvage iluminado con luz azul',
   '50% 46%', 'mC-NysO3aHM', 1, 'Anuncio oficial de Dior Sauvage',
   '1716339140080-be256d3270ce', 'Rodajas de naranja en agua con burbujas', 1),
  ('dulces', 'Dulces', 'Vainilla, praliné y flores.',
   'Vainilla, praliné y flores. Envuelven, se notan y dejan estela.',
   '1724157073080-fcffb8d6c956', 'Frasco de YSL Libre sobre fondo dorado',
   '50% 50%', 'uHGSW2RiM14', 2, 'Anuncio oficial de YSL Libre',
   '1592788174877-3f99727fd23d', 'Vainas de vainilla sobre fondo claro', 2),
  ('amaderados', 'Amaderados', 'Cedro, vetiver y sándalo.',
   'Cedro, vetiver y sándalo. Sobrios, elegantes y fáciles de llevar a diario.',
   '1785881570973-281d0db41119', 'Frasco de Bleu de Chanel junto a una ventana al atardecer',
   '50% 55%', 'JAGVLUKdlP0', 1, 'Anuncio oficial de Bleu de Chanel',
   '1697507695420-04623ccff2af', 'Veta de madera oscura en primer plano', 3),
  ('orientales', 'Orientales', 'Oud, ámbar y especias.',
   'Oud, ámbar y especias. Intensos y cálidos, hechos para la noche.',
   '1731972206777-d9f796597a60', 'Frasco negro y dorado de Lattafa Oud for Glory',
   '50% 48%', null, 0, null,
   '1560076124-fe336393ef76', 'Hebras de azafrán en primer plano', 4)
on conflict (id) do update set
  name = excluded.name,
  short_description = excluded.short_description,
  long_description = excluded.long_description,
  hero_image = excluded.hero_image,
  hero_alt = excluded.hero_alt,
  hero_position = excluded.hero_position,
  video_youtube_id = excluded.video_youtube_id,
  video_start_seconds = excluded.video_start_seconds,
  video_title = excluded.video_title,
  ingredient_image = excluded.ingredient_image,
  ingredient_alt = excluded.ingredient_alt,
  display_order = excluded.display_order;

insert into public.perfumes
  (id, brand_id, family_id, name, concentration, origin, primary_image,
   collage_image, best_seller_rank, new_arrival_rank, is_published)
values
  ('sauvage', 'dior', 'frescos', 'Sauvage', 'Eau de Parfum', 'Diseñador',
   '1698867928110-2408e8e2f44a', null, 1, null, true),
  ('acqua-di-gio', 'giorgio-armani', 'frescos', 'Acqua di Giò', null, 'Diseñador',
   '1706924179763-7f2744656823', null, 5, null, true),
  ('light-blue', 'dolce-gabbana', 'frescos', 'Light Blue', null, 'Diseñador',
   '1706408604086-144590f4020a', null, null, 4, true),
  ('dylan-blue', 'versace', 'frescos', 'Dylan Blue', null, 'Diseñador',
   '1674469295525-11f85ed5a3ac', null, null, null, true),
  ('libre', 'yves-saint-laurent', 'dulces', 'Libre', null, 'Diseñador',
   '1709095458514-573bc6277d3d', null, 6, null, true),
  ('la-vie-est-belle', 'lancome', 'dulces', 'La Vie Est Belle', null, 'Diseñador',
   '1613521140785-e85e427f8002', null, 8, null, true),
  ('eros', 'versace', 'dulces', 'Eros', 'Eau de Parfum', 'Diseñador',
   '1624798956425-ef88fc12b540', 'img/eros.webp', 4, null, true),
  ('bleu-de-chanel', 'chanel', 'amaderados', 'Bleu de Chanel', 'Eau de Toilette', 'Diseñador',
   '1785881570973-281d0db41119', null, 2, null, true),
  ('terre-d-hermes', 'hermes', 'amaderados', 'Terre d''Hermès', null, 'Diseñador',
   '1635795729633-39a2c479c1d3', null, null, 3, true),
  ('boss-bottled', 'hugo-boss', 'amaderados', 'Boss Bottled', null, 'Diseñador',
   '1592400374347-0d983b987da8', null, null, null, true),
  ('oud-for-glory', 'lattafa', 'orientales', 'Oud for Glory', null, 'Árabe',
   '1731972206777-d9f796597a60', null, 3, null, true),
  ('oud-mood', 'lattafa', 'orientales', 'Oud Mood', null, 'Árabe',
   '1784822041091-1096030fb326', null, null, 1, true),
  ('1-million', 'rabanne', 'orientales', '1 Million', null, 'Diseñador',
   '1633072437275-ec3344b4b966', null, 7, null, true),
  ('coco-mademoiselle', 'chanel', 'orientales', 'Coco Mademoiselle', null, 'Diseñador',
   '1708733145706-82da0d0596e9', null, null, 2, true)
on conflict (id) do update set
  brand_id = excluded.brand_id,
  family_id = excluded.family_id,
  name = excluded.name,
  concentration = excluded.concentration,
  origin = excluded.origin,
  primary_image = excluded.primary_image,
  collage_image = excluded.collage_image,
  best_seller_rank = excluded.best_seller_rank,
  new_arrival_rank = excluded.new_arrival_rank,
  is_published = excluded.is_published,
  updated_at = now();

insert into public.perfume_images (perfume_id, position, image_url, alt_text) values
  ('bleu-de-chanel', 1, 'img/bleu-de-chanel-2.png', 'Madera de cedro, sándalo y vetiver'),
  ('bleu-de-chanel', 2, 'img/bleu-de-chanel-3.png', 'Madera oscura con incienso al atardecer')
on conflict (perfume_id, position) do update set
  image_url = excluded.image_url, alt_text = excluded.alt_text;

update public.families set featured_perfume_id = case id
  when 'frescos' then 'sauvage'
  when 'dulces' then 'libre'
  when 'amaderados' then 'bleu-de-chanel'
  when 'orientales' then 'oud-for-glory'
end
where id in ('frescos', 'dulces', 'amaderados', 'orientales');
