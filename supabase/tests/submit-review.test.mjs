import test from 'node:test';
import assert from 'node:assert/strict';

let handler;
globalThis.Deno = {
  env: { get: (name) => ({
    SITE_ORIGIN: 'https://sensorial.example',
    SUPABASE_URL: 'https://demo.supabase.co',
    SUPABASE_SECRET_KEYS: JSON.stringify({ default: 'sb_secret_test' }),
    TURNSTILE_SECRET_KEY: 'turnstile_test',
  })[name] },
  serve: (fn) => { handler = fn; },
};
await import('../functions/submit-review/index.js');

const originalFetch = globalThis.fetch;
const body = {
  perfumeId: 'sauvage', nombre: 'Mariana R.', ciudad: 'Acapulco',
  texto: 'Me gustó mucho su aroma fresco para el día.',
  estrellas: 5, publicationConsent: true, token: 'token-valido',
};
const request = (data, origin = 'https://sensorial.example') => new Request(
  'https://demo.supabase.co/functions/v1/submit-review',
  { method: 'POST', headers: { Origin: origin }, body: JSON.stringify(data) },
);

test('guarda una reseña solo como pendiente después de Turnstile', async () => {
  let saved;
  globalThis.fetch = async (url, options = {}) => {
    if (String(url).includes('siteverify')) return Response.json({ success: true, hostname: 'sensorial.example' });
    if (options.method === 'POST') {
      saved = JSON.parse(options.body);
      return new Response(null, { status: 201 });
    }
    return Response.json([{ id: 'sauvage' }]);
  };
  try {
    const res = await handler(request(body));
    assert.equal(res.status, 202);
    assert.equal(saved.status, 'pending');
    assert.equal(saved.publication_consent, true);
    assert.equal(saved.verified_purchase, false);
    assert.equal(saved.is_featured, false);
  } finally { globalThis.fetch = originalFetch; }
});

test('rechaza el envío sin consentimiento', async () => {
  let called = false;
  globalThis.fetch = async () => { called = true; throw new Error('No debe consultar la red'); };
  try {
    const res = await handler(request({ ...body, publicationConsent: false }));
    assert.equal(res.status, 400);
    assert.equal(called, false);
  } finally { globalThis.fetch = originalFetch; }
});

test('rechaza orígenes distintos al sitio configurado', async () => {
  const res = await handler(request(body, 'https://otro.example'));
  assert.equal(res.status, 403);
});

test('rechaza una verificación Turnstile inválida', async () => {
  let calls = 0;
  globalThis.fetch = async () => { calls++; return Response.json({ success: false }); };
  try {
    const res = await handler(request(body));
    assert.equal(res.status, 403);
    assert.equal(calls, 1);
  } finally { globalThis.fetch = originalFetch; }
});
