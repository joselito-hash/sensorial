// Formulario público: Turnstile + validación en servidor + moderación obligatoria.
// El navegador nunca recibe una secret key de Supabase ni de Turnstile.

function respuesta(body, status, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Headers": "apikey, content-type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      Vary: "Origin",
    },
  });
}

function secretKey() {
  try {
    const keys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
    return keys.default || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  } catch {
    return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  }
}

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin") || "";
  const origins = (Deno.env.get("SITE_ORIGIN") || "").split(",").map((o) => o.trim()).filter(Boolean);
  if (!origin || !origins.includes(origin)) return respuesta({ error: "Origen no autorizado" }, 403, origin);
  if (req.method === "OPTIONS") return respuesta({}, 200, origin);
  if (req.method !== "POST") return respuesta({ error: "Método no permitido" }, 405, origin);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const key = secretKey();
  const captchaSecret = Deno.env.get("TURNSTILE_SECRET_KEY");
  if (!supabaseUrl || !key || !captchaSecret) return respuesta({ error: "Servicio no configurado" }, 503, origin);

  let datos;
  try {
    const raw = await req.text();
    if (raw.length > 7000) return respuesta({ error: "Solicitud demasiado grande" }, 413, origin);
    datos = JSON.parse(raw);
  } catch {
    return respuesta({ error: "JSON inválido" }, 400, origin);
  }

  const perfumeId = String(datos.perfumeId || "").trim();
  const nombre = String(datos.nombre || "").trim();
  const ciudad = String(datos.ciudad || "").trim();
  const texto = String(datos.texto || "").trim();
  const rating = datos.estrellas === "" || datos.estrellas == null ? null : Number(datos.estrellas);
  const token = String(datos.token || "");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(perfumeId)
      || nombre.length < 2 || nombre.length > 80
      || ciudad.length > 80 || (ciudad && ciudad.length < 2)
      || texto.length < 15 || texto.length > 1500
      || (rating !== null && (!Number.isInteger(rating) || rating < 1 || rating > 5))
      || datos.publicationConsent !== true
      || !token || token.length > 2048) {
    return respuesta({ error: "Revisa los campos de la reseña" }, 400, origin);
  }

  const verificacion = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: new URLSearchParams({ secret: captchaSecret, response: token }),
  }).then((r) => r.json()).catch(() => null);
  if (!verificacion?.success || verificacion.hostname !== new URL(origin).hostname) {
    return respuesta({ error: "Verificación caducada. Inténtalo de nuevo." }, 403, origin);
  }

  const headers = { apikey: key, "Content-Type": "application/json", Prefer: "return=minimal" };
  const encontrado = await fetch(
    `${supabaseUrl}/rest/v1/perfumes?id=eq.${encodeURIComponent(perfumeId)}&is_published=eq.true&select=id&limit=1`,
    { headers },
  ).then((r) => r.ok ? r.json() : null).catch(() => null);
  if (!encontrado?.length) return respuesta({ error: "Perfume no disponible" }, 404, origin);

  const guardado = await fetch(`${supabaseUrl}/rest/v1/reviews`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      perfume_id: perfumeId,
      author_name: nombre,
      city: ciudad || null,
      body: texto,
      rating,
      publication_consent: true,
      status: "pending",
      is_featured: false,
      verified_purchase: false,
    }),
  }).catch(() => null);
  if (!guardado?.ok) return respuesta({ error: "No se pudo guardar la reseña" }, 503, origin);
  return respuesta({ ok: true, message: "Gracias. Tu reseña se publicará después de revisarla." }, 202, origin);
});
