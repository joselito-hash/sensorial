// Convierte una exportación JSON revisada del actor lexis-solutions/fragrantica
// en SQL para el catálogo existente. No ejecuta el actor ni conecta con Supabase.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { runInNewContext } from 'node:vm';

const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;
const phases = [['topNotes', 'salida'], ['middleNotes', 'corazon'], ['baseNotes', 'fondo']];
const usageKeys = ['winter', 'spring', 'summer', 'autumn', 'day', 'night'];

function fragranticaId(rawUrl) {
  try {
    const url = new URL(rawUrl);
    if (!/^www\.fragrantica\.(?:com|es)$/.test(url.hostname)) return null;
    const match = url.pathname.match(/-(\d+)\.html$/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

export function loadCatalogIds(appSource) {
  const match = appSource.match(/\b(?:const|let) PERFUMES = (\[[\s\S]*?\n  \]);/);
  if (!match) throw new Error('No se encontró PERFUMES en app.js');
  const perfumes = runInNewContext(`(${match[1]})`, {}, { timeout: 1000 });
  const bySourceId = new Map();
  for (const perfume of perfumes) {
    const sourceId = fragranticaId(perfume.fuente);
    if (!sourceId || bySourceId.has(sourceId)) throw new Error(`Fuente ausente o repetida: ${perfume.id}`);
    bySourceId.set(sourceId, { id: perfume.id, name: perfume.nombre });
  }
  return bySourceId;
}

function nameOf(value) {
  const name = String(value ?? '').trim();
  if (name.length < 2 || name.length > 100 || name.includes(',')) throw new Error(`Nombre inválido: ${name}`);
  return name;
}

function colorOf(accord) {
  const rgb = String(accord.rgb ?? '').match(/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i);
  if (rgb) {
    const channels = rgb.slice(1).map(Number);
    if (channels.every((number) => number <= 255)) return channels.join(',');
  }
  const hex = String(accord.hex ?? '').match(/^#([a-f\d]{6})$/i);
  if (hex) return [0, 2, 4].map((at) => parseInt(hex[1].slice(at, at + 2), 16)).join(',');
  throw new Error(`Color inválido para ${accord.accord ?? 'acorde'}`);
}

function parseItem(item) {
  if (item.pyramid?.type !== 'full' || !phases.every(([field]) => Array.isArray(item.pyramid[field]))) {
    throw new Error('Pirámide completa ausente (se omiten las de tipo single)');
  }
  const notes = [];
  for (const [field, phase] of phases) {
    const seen = new Set();
    for (const entry of item.pyramid[field]) {
      const name = nameOf(entry?.name);
      if (!seen.has(name)) {
        if (seen.size >= 100) throw new Error(`Demasiadas notas en ${phase}`);
        notes.push([phase, seen.size + 1, name]);
      }
      seen.add(name);
    }
  }
  if (notes.length === 0 || notes.length > 300) throw new Error('Cantidad de notas inválida');
  if (!Array.isArray(item.mainAccords) || item.mainAccords.length === 0 || item.mainAccords.length > 100) {
    throw new Error('Acordes ausentes o excesivos');
  }
  const accordNames = new Set();
  const accords = item.mainAccords.map((entry, index) => {
    const name = nameOf(entry?.accord);
    if (accordNames.has(name)) throw new Error(`Acorde repetido: ${name}`);
    accordNames.add(name);
    const value = entry.value;
    if (!Number.isFinite(value) || value < 0 || value > 100) throw new Error(`Intensidad inválida: ${name}`);
    return [index + 1, name, Math.round(value), colorOf(entry)];
  });
  const rawUsage = usageKeys.map((key) => item.seasonBreakout?.[key]);
  if (rawUsage.some((value) => !Number.isFinite(value) || value < 0) || Math.max(...rawUsage) === 0) {
    throw new Error('Votos de uso ausentes o inválidos');
  }
  const max = Math.max(...rawUsage);
  const usage = rawUsage.map((value) => Math.round((value / max) * 100));
  return { notes, accords, usage };
}

export function prepareImport(rawItems, bySourceId) {
  const items = Array.isArray(rawItems) ? rawItems : rawItems?.items;
  if (!Array.isArray(items)) throw new Error('El JSON debe ser un array de resultados de Apify');
  const matched = [];
  const skipped = [];
  const seen = new Set();
  for (const item of items) {
    const sourceId = fragranticaId(item?.url);
    if (!sourceId || String(item.id) !== sourceId) {
      skipped.push({ id: item?.id ?? '?', reason: 'ID y URL de Fragrantica no coinciden' });
      continue;
    }
    const catalog = bySourceId.get(sourceId);
    if (!catalog) {
      skipped.push({ id: sourceId, reason: 'No pertenece al catálogo actual' });
      continue;
    }
    if (seen.has(sourceId)) {
      skipped.push({ id: sourceId, reason: 'Resultado duplicado' });
      continue;
    }
    seen.add(sourceId);
    try {
      const data = parseItem(item);
      const url = new URL(item.url);
      matched.push({ ...catalog, sourceId, sourceUrl: `${url.origin}${url.pathname}`, ...data });
    } catch (error) {
      skipped.push({ id: sourceId, reason: error.message });
    }
  }
  return { matched, skipped, total: items.length };
}

export function buildSql(prepared, licenseReference) {
  if (!licenseReference || !licenseReference.trim()) throw new Error('Falta --license-ref con el folio real de autorización');
  if (prepared.matched.length === 0) throw new Error('Ningún perfume válido coincide con el catálogo');
  const lines = [
    '-- Revisar nombres traducidos, fórmulas y derechos antes de aplicar.',
    '-- Los votos de estaciones/día/noche se normalizan contra el mayor valor de cada perfume.',
    '-- Las reseñas, fotos, nombres y concentraciones NO se importan de Apify.',
    'begin;',
  ];
  for (const item of prepared.matched) {
    const id = quote(item.id);
    lines.push(`\n-- ${item.id}: Fragrantica #${item.sourceId}`);
    lines.push(`do $$ begin
  if exists (select 1 from public.perfume_sources where perfume_id = ${id} and is_primary and publisher <> 'Fragrantica') then
    raise exception 'Otra fuente principal ya existe para ${item.id}';
  end if;
end $$;`);
    lines.push(`insert into public.perfume_sources
  (perfume_id, publisher, source_url, rights_basis, license_reference, is_primary, checked_at)
select ${id}, 'Fragrantica', ${quote(item.sourceUrl)}, 'licencia', ${quote(licenseReference.trim())}, true, current_date
where not exists (select 1 from public.perfume_sources where perfume_id = ${id} and is_primary);`);
    lines.push(`update public.perfume_sources set source_url = ${quote(item.sourceUrl)},
  rights_basis = 'licencia', license_reference = ${quote(licenseReference.trim())}, checked_at = current_date
where perfume_id = ${id} and is_primary and publisher = 'Fragrantica';`);
    const source = `(select id from public.perfume_sources where perfume_id = ${id} and is_primary and publisher = 'Fragrantica')`;
    const noteNames = [...new Set(item.notes.map(([, , name]) => name))];
    lines.push(`insert into public.notes (name) values ${noteNames.map((name) => `(${quote(name)})`).join(', ')} on conflict (name) do nothing;`);
    lines.push(`delete from public.perfume_notes where perfume_id = ${id};`);
    lines.push(`insert into public.perfume_notes (perfume_id, phase, position, note_name, source_id) values\n  ${item.notes.map(([phase, position, name]) => `(${id}, ${quote(phase)}, ${position}, ${quote(name)}, ${source})`).join(',\n  ')};`);
    lines.push(`insert into public.accords (name, color_rgb) values ${item.accords.map(([, name, , color]) => `(${quote(name)}, ${quote(color)})`).join(', ')} on conflict (name) do nothing;`);
    lines.push(`delete from public.perfume_accords where perfume_id = ${id};`);
    lines.push(`insert into public.perfume_accords (perfume_id, position, accord_name, intensity, source_id) values\n  ${item.accords.map(([position, name, intensity]) => `(${id}, ${position}, ${quote(name)}, ${intensity}, ${source})`).join(',\n  ')};`);
    lines.push(`insert into public.perfume_usage (perfume_id, winter, spring, summer, autumn, day_score, night_score, source_id)
values (${id}, ${item.usage.join(', ')}, ${source})
on conflict (perfume_id) do update set
  winter = excluded.winter, spring = excluded.spring, summer = excluded.summer,
  autumn = excluded.autumn, day_score = excluded.day_score, night_score = excluded.night_score,
  source_id = excluded.source_id;`);
  }
  lines.push('\ncommit;', '');
  return lines.join('\n');
}

function main(args) {
  const inputIndex = args.indexOf('--input');
  const sqlIndex = args.indexOf('--write-sql');
  const refIndex = args.indexOf('--license-ref');
  if (inputIndex < 0 || !args[inputIndex + 1]) {
    throw new Error('Uso: node supabase/import-apify-export.mjs --input export.json [--write-sql salida.sql --license-ref FOLIO]');
  }
  const source = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  const raw = JSON.parse(readFileSync(resolve(args[inputIndex + 1]), 'utf8'));
  const prepared = prepareImport(raw, loadCatalogIds(source));
  for (const item of prepared.matched) process.stdout.write(`Coincide: ${item.id} (${item.sourceId})\n`);
  for (const item of prepared.skipped) process.stdout.write(`Omitido: ${item.id} — ${item.reason}\n`);
  process.stdout.write(`Resultado: ${prepared.matched.length}/${prepared.total} listos para revisar.\n`);
  if (sqlIndex >= 0) {
    if (!args[sqlIndex + 1] || refIndex < 0 || !args[refIndex + 1]) throw new Error('Para generar SQL indica --write-sql y --license-ref');
    const sql = buildSql(prepared, args[refIndex + 1]);
    writeFileSync(resolve(args[sqlIndex + 1]), sql, { flag: 'wx' });
    process.stdout.write(`SQL guardado en ${resolve(args[sqlIndex + 1])}. Revísalo antes de aplicarlo.\n`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { main(process.argv.slice(2)); } catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
}
