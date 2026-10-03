// Genera una carga reproducible desde los datos que YA viven en app.js.
// No descarga ni consulta Fragrantica. Ejecutar solo si la licencia cubre su reutilización.
import { readFileSync, writeFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const match = app.match(/\b(?:const|let) PERFUMES = (\[[\s\S]*?\n  \]);/);
if (!match) throw new Error('No se encontró PERFUMES en app.js');
const perfumes = runInNewContext(`(${match[1]})`, {}, { timeout: 1000 });
if (new Set(perfumes.map((p) => p.id)).size !== perfumes.length) throw new Error('ID de perfume duplicado');
for (const p of perfumes) {
  if (!Array.isArray(p.uso) || p.uso.length !== 6 || p.uso.some((n) => !Number.isInteger(n) || n < 0 || n > 100)) {
    throw new Error(`Uso inválido para ${p.id}`);
  }
  for (const phase of ['salida', 'corazon', 'fondo']) {
    const names = p.notas[phase].split(',').map((n) => n.trim()).filter(Boolean);
    if (new Set(names).size !== names.length) throw new Error(`Nota repetida en ${p.id}/${phase}`);
  }
  if (new Set(p.acordes.map(([name]) => name)).size !== p.acordes.length) throw new Error(`Acorde repetido en ${p.id}`);
}
const q = (value) => `'${String(value).replaceAll("'", "''")}'`;
const ref = 'Autorización comercial declarada por el propietario el 2026-10-03; registrar folio';
const lines = [
  '-- Datos aromáticos que ya estaban en app.js. No realiza ninguna descarga externa.',
  '-- Aplicar SOLO si la autorización de Fragrantica cubre almacenamiento y uso comercial.',
  '-- Sustituir la referencia de licencia en perfume_sources cuando se tenga su folio.',
  '',
];

for (const p of perfumes) {
  lines.push(`insert into public.perfume_sources (perfume_id, publisher, source_url, rights_basis, license_reference, is_primary, checked_at)
select ${q(p.id)}, 'Fragrantica', ${q(p.fuente)}, 'licencia', ${q(ref)}, true, date '2026-10-02'
where not exists (select 1 from public.perfume_sources where perfume_id = ${q(p.id)} and is_primary);`);
}

const notes = [...new Set(perfumes.flatMap((p) => Object.values(p.notas).flatMap((text) => text.split(',').map((s) => s.trim()).filter(Boolean))))];
lines.push('', 'insert into public.notes (name) values');
lines.push(notes.map((n) => `  (${q(n)})`).join(',\n') + '\non conflict (name) do nothing;');

const accords = new Map();
for (const p of perfumes) for (const [name, , color] of p.acordes) {
  const channels = color.split(',').map(Number);
  if (channels.length !== 3 || channels.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    throw new Error(`Color RGB inválido para ${name}`);
  }
  if (accords.has(name) && accords.get(name) !== color) throw new Error(`Color inconsistente para ${name}`);
  accords.set(name, color);
}
lines.push('', 'insert into public.accords (name, color_rgb) values');
lines.push([...accords].map(([name, color]) => `  (${q(name)}, ${q(color)})`).join(',\n') + '\non conflict (name) do update set color_rgb = excluded.color_rgb;');

const noteRows = [];
const accordRows = [];
const usageRows = [];
for (const p of perfumes) {
  for (const phase of ['salida', 'corazon', 'fondo']) {
    p.notas[phase].split(',').map((n) => n.trim()).filter(Boolean).forEach((name, i) => {
      noteRows.push(`  (${q(p.id)}, ${q(phase)}, ${i + 1}, ${q(name)})`);
    });
  }
  p.acordes.forEach(([name, intensity], i) => {
    accordRows.push(`  (${q(p.id)}, ${i + 1}, ${q(name)}, ${intensity})`);
  });
  usageRows.push(`  (${q(p.id)}, ${p.uso.join(', ')})`);
}
lines.push('', 'insert into public.perfume_notes (perfume_id, phase, position, note_name) values');
lines.push(noteRows.join(',\n') + '\non conflict (perfume_id, phase, position) do update set note_name = excluded.note_name;');
lines.push('', 'insert into public.perfume_accords (perfume_id, position, accord_name, intensity) values');
lines.push(accordRows.join(',\n') + '\non conflict (perfume_id, position) do update set accord_name = excluded.accord_name, intensity = excluded.intensity;');
lines.push('', 'insert into public.perfume_usage (perfume_id, winter, spring, summer, autumn, day_score, night_score) values');
lines.push(usageRows.join(',\n') + '\non conflict (perfume_id) do update set winter = excluded.winter, spring = excluded.spring, summer = excluded.summer, autumn = excluded.autumn, day_score = excluded.day_score, night_score = excluded.night_score;');
for (const table of ['perfume_notes', 'perfume_accords', 'perfume_usage']) {
  lines.push('', `update public.${table} data set source_id = source.id
from public.perfume_sources source
where source.perfume_id = data.perfume_id and source.is_primary and source.publisher = 'Fragrantica';`);
}
lines.push('');
writeFileSync(new URL('seed_fragrance.sql', import.meta.url), lines.join('\n'));
process.stdout.write(`Generados ${perfumes.length} perfumes, ${notes.length} notas y ${accords.size} acordes.\n`);
