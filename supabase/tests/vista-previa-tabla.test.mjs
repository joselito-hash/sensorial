import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

// api/tabla.js: la tarjeta del enlace /p/TOKEN en WhatsApp lleva el nombre del cliente y su perfume.
const require = createRequire(import.meta.url);
const tabla = require('../../api/tabla.js');

const TOKEN = 'Vs8_wD9xRCO75mqtyzuBMw';
const plan = {
  client_name: 'Erika', brand: 'Burberry', product_name: 'Her', tone: 'rosa',
  image_url: 'https://demo.supabase.co/storage/v1/object/public/sensorial-perfumes/pagos/perfume.webp',
  installments: [{ amount: 570 }, { amount: 570 }], payments: [{ amount: 570, date: '2026-10-06' }],
};

async function pedir(token, respuesta) {
  const originalFetch = globalThis.fetch;
  const llamadas = [];
  globalThis.fetch = async (url, opciones) => {
    llamadas.push({ url: String(url), cuerpo: JSON.parse(opciones.body) });
    return new Response(JSON.stringify(respuesta), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  const res = { headers: {}, setHeader(k, v) { this.headers[k.toLowerCase()] = v; }, end(cuerpo) { this.cuerpo = cuerpo; } };
  try {
    await tabla({ query: { t: token }, headers: { host: 'sensorial-azure.vercel.app' } }, res);
  } finally {
    globalThis.fetch = originalFetch;
  }
  return { res, llamadas };
}

test('la vista previa lleva el nombre del cliente, su perfume y la foto', async () => {
  const { res, llamadas } = await pedir(TOKEN, plan);
  assert.equal(llamadas.length, 1);
  assert.match(llamadas[0].url, /\/rest\/v1\/rpc\/sensorial_payment_plan$/);
  assert.deepEqual(llamadas[0].cuerpo, { p_token: TOKEN });
  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['cache-control'], 'no-store');
  assert.match(res.cuerpo, /<meta property="og:title" content="Tabla de pagos de Erika">/);
  assert.match(res.cuerpo, /<meta property="og:description" content="Burberry Her · Sensorial Boutique">/);
  assert.match(res.cuerpo, /<meta property="og:image" content="https:\/\/demo\.supabase\.co\/storage\/v1\/object\/public\/sensorial-perfumes\/pagos\/perfume\.webp">/);
  assert.match(res.cuerpo, /<meta property="og:url" content="https:\/\/sensorial-azure\.vercel\.app\/p\/Vs8_wD9xRCO75mqtyzuBMw">/);
  assert.match(res.cuerpo, /<title>Tabla de pagos de Erika<\/title>/);
  assert.match(res.cuerpo, /<base href="\/">/);
});

test('una tabla liquidada lo dice en la vista previa', async () => {
  const { res } = await pedir(TOKEN, { ...plan, payments: [{ amount: 1140, date: '2026-10-06' }] });
  assert.match(res.cuerpo, /<meta property="og:description" content="Burberry Her · Pago completo">/);
});

test('el nombre se escapa y un token inválido no consulta Supabase', async () => {
  const { res } = await pedir(TOKEN, { ...plan, client_name: 'Ana "<b>"' });
  assert.match(res.cuerpo, /Tabla de pagos de Ana &quot;&lt;b&gt;&quot;/);
  const invalido = await pedir('../../etc', plan);
  assert.equal(invalido.llamadas.length, 0);
  assert.match(invalido.res.cuerpo, /<meta property="og:title" content="Tu tabla de pagos \| Sensorial Boutique">/);
});

test('con varias tablas juntas nombra todos sus perfumes', async () => {
  const otra = { ...plan, brand: 'Carolina Herrera', product_name: 'Good Girl', payments: [] };
  const { res } = await pedir(TOKEN, { ...plan, grupo: [{ ...plan, token: TOKEN }, otra] });
  assert.match(res.cuerpo, /<meta property="og:title" content="Tablas de pagos de Erika">/);
  assert.match(res.cuerpo, /<meta property="og:description" content="Burberry Her y Carolina Herrera Good Girl · Sensorial Boutique">/);
  assert.match(res.cuerpo, /og:image" content="https:\/\/demo\.supabase\.co\/.+perfume\.webp"/);
  const cinco = Array.from({ length: 5 }, (_, i) => ({ ...plan, product_name: `P${i + 1}`, payments: [{ amount: 1140, date: '2026-10-06' }] }));
  const { res: muchas } = await pedir(TOKEN, { ...plan, grupo: cinco });
  assert.match(muchas.cuerpo, /og:description" content="Burberry P1, Burberry P2 y 3 perfumes más · Pago completo"/);
});

test('si la tabla no existe, la vista previa es genérica', async () => {
  const { res } = await pedir(TOKEN, null);
  assert.match(res.cuerpo, /<title>Tu tabla de pagos \| Sensorial Boutique<\/title>/);
  assert.doesNotMatch(res.cuerpo, /og:image"/);
});
