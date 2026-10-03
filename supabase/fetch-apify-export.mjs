// Ejecuta el actor desde Node (nunca desde el navegador) y guarda su JSON bruto.
// Requiere APIFY_TOKEN y un límite de gasto explícito. No escribe en Supabase.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadCatalogIds } from './import-apify-export.mjs';

const base = 'https://api.apify.com/v2';
const actor = 'lexis-solutions~fragrantica';
const terminal = new Set(['SUCCEEDED', 'FAILED', 'TIMED-OUT', 'ABORTED']);

function option(args, flag) {
  const index = args.indexOf(flag);
  return index < 0 ? null : args[index + 1];
}

async function api(path, token, init) {
  const response = await fetch(`${base}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init?.body ? { 'Content-Type': 'application/json' } : {}) },
    signal: AbortSignal.timeout(65000),
  });
  if (!response.ok) throw new Error(`Apify respondió HTTP ${response.status} en ${path.split('?')[0]}`);
  return response.json();
}

export function catalogActorInput(appSource) {
  const ids = loadCatalogIds(appSource);
  const urls = [...ids.keys()].map((id) => {
    // Se conserva el slug exacto de app.js: el ID por sí solo no reconstruye la URL.
    const match = appSource.match(new RegExp(`https://www\\.fragrantica\\.es/perfume/[^"']+-${id}\\.html`));
    if (!match) throw new Error(`No se encontró URL para Fragrantica #${id}`);
    return { url: match[0] };
  });
  return {
    startUrls: urls,
    maxItems: urls.length,
    allReviews: false,
    omitFields: ['reviews', 'images', 'primaryImageUrl', 'brandLogo', 'pros', 'cons',
      'thisPerfumeRemindsMeOf', 'peopleWhoLikeThisAlsoLike'],
  };
}

async function main(args) {
  const token = process.env.APIFY_TOKEN;
  if (!token) throw new Error('Define APIFY_TOKEN en el entorno local; no lo pongas en la web ni en Git');
  const output = option(args, '--output');
  if (!output) throw new Error('Indica --output para guardar el JSON');
  let runId = option(args, '--run-id');
  if (!runId) {
    const cap = Number(option(args, '--max-usd'));
    if (!Number.isFinite(cap) || cap <= 0) throw new Error('Indica --max-usd con un límite de gasto positivo');
    const inputPath = option(args, '--input');
    const input = inputPath
      ? JSON.parse(readFileSync(resolve(inputPath), 'utf8'))
      : catalogActorInput(readFileSync(new URL('../app.js', import.meta.url), 'utf8'));
    if (!Array.isArray(input.startUrls) || input.startUrls.length === 0 || input.startUrls.length > 100) {
      throw new Error('El input debe contener entre 1 y 100 startUrls');
    }
    const run = await api(`/actors/${actor}/runs?maxTotalChargeUsd=${encodeURIComponent(cap)}&maxItems=${input.startUrls.length}&waitForFinish=60`,
      token, { method: 'POST', body: JSON.stringify(input) });
    runId = run.data?.id;
    if (!runId) throw new Error('Apify no devolvió un ID de ejecución');
    process.stdout.write(`Ejecución Apify: ${runId}. Si se interrumpe, usa --run-id ${runId} para descargarla sin volver a iniciarla.\n`);
    if (terminal.has(run.data.status) && run.data.status !== 'SUCCEEDED') throw new Error(`Ejecución terminada: ${run.data.status}`);
  }
  if (!/^[A-Za-z0-9]+$/.test(runId)) throw new Error('ID de ejecución inválido');
  let run;
  for (let attempt = 0; attempt < 60; attempt++) {
    run = (await api(`/actor-runs/${runId}`, token)).data;
    if (terminal.has(run?.status)) break;
    await new Promise((done) => setTimeout(done, 15000));
  }
  if (run?.status !== 'SUCCEEDED') throw new Error(`La ejecución no terminó correctamente (${run?.status ?? 'sin respuesta'}). Revisa Apify y conserva el ID ${runId}`);
  if (!/^[A-Za-z0-9]+$/.test(run.defaultDatasetId ?? '')) throw new Error('Dataset de Apify inválido');
  const items = await api(`/datasets/${run.defaultDatasetId}/items?format=json&clean=true&limit=1000`, token);
  if (!Array.isArray(items)) throw new Error('El dataset no devolvió un array JSON');
  writeFileSync(resolve(output), `${JSON.stringify(items, null, 2)}\n`, { flag: 'wx' });
  process.stdout.write(`Guardados ${items.length} resultados en ${resolve(output)}. Revisa el JSON antes de importarlo.\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).catch((error) => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
}
