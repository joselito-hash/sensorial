import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { buildSql, loadCatalogIds, prepareImport } from '../import-apify-export.mjs';
import { catalogActorInput } from '../fetch-apify-export.mjs';

const appSource = readFileSync(new URL('../../app.js', import.meta.url), 'utf8');
const catalog = loadCatalogIds(appSource);
const item = {
  id: '48100',
  url: 'https://www.fragrantica.com/perfume/Dior/Sauvage-Eau-de-Parfum-48100.html?tracking=unused',
  pyramid: {
    type: 'full',
    topNotes: [{ name: 'Bergamot' }],
    middleNotes: [{ name: 'Pepper' }],
    baseNotes: [{ name: "Oak's moss" }],
  },
  mainAccords: [
    { accord: 'citrus', rgb: 'rgb(10, 20, 30)', value: 100 },
    { accord: 'woody', hex: '#804020', value: 64.6 },
  ],
  seasonBreakout: { winter: 10, spring: 20, summer: 40, autumn: 20, day: 80, night: 20 },
  reviews: [{ name: 'Fragrantica user', comment: 'Do not copy me' }],
};

test('crea URLs exactas del catálogo y evita búsquedas ambiguas', () => {
  const input = catalogActorInput(appSource);
  assert.equal(input.startUrls.length, 14);
  assert.equal(input.maxItems, 14);
  assert.ok(input.omitFields.includes('reviews'));
});

test('acepta solo el ID de la fórmula exacta y normaliza votos', () => {
  const prepared = prepareImport([item, { ...item, id: '48101' }], catalog);
  assert.equal(prepared.matched.length, 1);
  assert.equal(prepared.matched[0].id, 'sauvage');
  assert.deepEqual(prepared.matched[0].usage, [13, 25, 50, 25, 100, 25]);
  assert.equal(prepared.skipped.length, 1);
});

test('SQL escapa texto, omite reseñas y registra la fuente', () => {
  const sql = buildSql(prepareImport([item], catalog), "Licencia O'Brien");
  assert.match(sql, /Oak''s moss/);
  assert.match(sql, /Licencia O''Brien/);
  assert.doesNotMatch(sql, /Do not copy me|tracking=unused/);
  assert.match(sql, /delete from public\.perfume_notes/);
  assert.match(sql, /source_id/);
  assert.match(sql, /commit;/);
});

test('omite pirámides incompletas sin borrar datos existentes', () => {
  const prepared = prepareImport([{ ...item, pyramid: { type: 'single', allNotes: [{ name: 'Musk' }] } }], catalog);
  assert.equal(prepared.matched.length, 0);
  assert.match(prepared.skipped[0].reason, /Pirámide completa/);
  assert.throws(() => buildSql(prepared, 'Licencia real'), /Ningún perfume/);
});
