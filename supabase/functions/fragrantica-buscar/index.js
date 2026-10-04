// Panel privado: busca perfumes de Fragrantica en PerfumAPI y copia su foto al bucket.
//
// PerfumAPI (github.com/seccaz/PerfumAPI) guarda perfumes leídos de Fragrantica y permite
// buscarlos sin clave, pero solo acepta peticiones del navegador desde su propia página
// (CORS). Por eso la búsqueda pasa por aquí, del lado del servidor.
//
// Solo responde a cuentas de private.sensorial_admins: valida el token de la sesión del
// panel con la función sensorial_admin_access. Acciones (POST JSON):
//   { "accion": "buscar", "consulta": "sauvage" }        -> { resultados: [...] }
//   { "accion": "foto", "url": "https://fimgs.net/...", "perfumeId": "sauvage" } -> { url }

const PERFUMAPI = Deno.env.get("PERFUMAPI_URL") || "https://perfumapidatabase.onrender.com";
const MAX_FOTO = 5 * 1024 * 1024;
const TIPOS_FOTO = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" };

function respuesta(body, status, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Headers": "authorization, apikey, content-type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      Vary: "Origin",
    },
  });
}

function clave(nombreJson, respaldo) {
  try {
    const keys = JSON.parse(Deno.env.get(nombreJson) || "{}");
    return keys.default || Deno.env.get(respaldo);
  } catch {
    return Deno.env.get(respaldo);
  }
}

async function esAdmin(supabaseUrl, publicKey, authorization) {
  if (!/^Bearer\s+\S+/.test(authorization || "")) return false;
  const r = await fetch(`${supabaseUrl}/rest/v1/rpc/sensorial_admin_access`, {
    method: "POST",
    headers: { apikey: publicKey, Authorization: authorization, "Content-Type": "application/json" },
    body: "{}",
  }).catch(() => null);
  if (!r?.ok) return false;
  return (await r.json().catch(() => false)) === true;
}

/* PerfumAPI duerme cuando nadie lo usa: la primera petición puede tardar casi un minuto */
async function buscar(consulta) {
  const control = new AbortController();
  const limite = setTimeout(() => control.abort(), 100000);
  try {
    const r = await fetch(`${PERFUMAPI}/perfumes/search/${encodeURIComponent(consulta)}`, { signal: control.signal });
    if (!r.ok) throw new Error(`PerfumAPI respondió ${r.status}`);
    const datos = await r.json();
    const lista = (Array.isArray(datos) ? datos : []).slice(0, 8);
    const texto = (v, max) => String(v ?? "").trim().slice(0, max);
    const notas = (v) => (Array.isArray(v) ? v : []).map((n) => texto(n, 80)).filter(Boolean).slice(0, 40);
    const https = (v) => (/^https:\/\//i.test(String(v || "")) ? texto(v, 500) : "");
    return lista.map((p) => ({
      name: texto(p.name, 200),
      brand: texto(p.brand, 120),
      release_year: Number.isInteger(p.release_year) ? p.release_year : null,
      gender: texto(p.gender, 40),
      notes_top: notas(p.notes_top),
      notes_middle: notas(p.notes_middle),
      notes_base: notas(p.notes_base),
      image_url: https(p.image_url),
      perfume_url: https(p.perfume_url),
    }));
  } finally {
    clearTimeout(limite);
  }
}

/* Copia la foto publicada por Fragrantica (servida desde fimgs.net) a Storage, para que la
   tienda no dependa de su servidor */
async function copiarFoto(supabaseUrl, secret, origen, perfumeId) {
  let url;
  try { url = new URL(origen); } catch { throw new Error("URL de foto inválida"); }
  if (url.protocol !== "https:" || !/(^|\.)fimgs\.net$/i.test(url.hostname)) throw new Error("Solo se copian fotos de Fragrantica (fimgs.net)");
  const r = await fetch(url.href, { headers: { "User-Agent": "Mozilla/5.0 (compatible; SensorialBoutique/1.0)" } });
  if (!r.ok) throw new Error(`Fragrantica respondió ${r.status} al pedir la foto`);
  const tipo = (r.headers.get("Content-Type") || "").split(";")[0].trim().toLowerCase();
  if (!TIPOS_FOTO[tipo]) throw new Error("La foto no es JPG, PNG, WebP ni AVIF");
  const bytes = new Uint8Array(await r.arrayBuffer());
  if (bytes.byteLength > MAX_FOTO) throw new Error("La foto supera los 5 MB");
  const ruta = `perfumes/${perfumeId}/fragrantica-${crypto.randomUUID()}.${TIPOS_FOTO[tipo]}`;
  const subida = await fetch(`${supabaseUrl}/storage/v1/object/sensorial-perfumes/${ruta}`, {
    method: "POST",
    headers: { apikey: secret, Authorization: `Bearer ${secret}`, "Content-Type": tipo, "x-upsert": "false" },
    body: bytes,
  });
  if (!subida.ok) throw new Error("No se pudo guardar la foto en el bucket sensorial-perfumes");
  return `${supabaseUrl}/storage/v1/object/public/sensorial-perfumes/${ruta}`;
}

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin") || "";
  const origins = (Deno.env.get("SITE_ORIGIN") || "").split(",").map((o) => o.trim()).filter(Boolean);
  if (!origin || !origins.includes(origin)) return respuesta({ error: "Origen no autorizado" }, 403, origin);
  if (req.method === "OPTIONS") return respuesta({}, 200, origin);
  if (req.method !== "POST") return respuesta({ error: "Método no permitido" }, 405, origin);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const publicKey = clave("SUPABASE_PUBLISHABLE_KEYS", "SUPABASE_ANON_KEY");
  const secret = clave("SUPABASE_SECRET_KEYS", "SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !publicKey || !secret) return respuesta({ error: "Servicio no configurado" }, 503, origin);
  if (!(await esAdmin(supabaseUrl, publicKey, req.headers.get("Authorization")))) {
    return respuesta({ error: "Esta cuenta no tiene permiso" }, 403, origin);
  }

  let datos;
  try {
    const raw = await req.text();
    if (raw.length > 2000) return respuesta({ error: "Solicitud demasiado grande" }, 413, origin);
    datos = JSON.parse(raw);
  } catch {
    return respuesta({ error: "JSON inválido" }, 400, origin);
  }

  try {
    if (datos.accion === "buscar") {
      const consulta = String(datos.consulta || "").trim();
      if (consulta.length < 2 || consulta.length > 80) return respuesta({ error: "Escribe entre 2 y 80 letras" }, 400, origin);
      return respuesta({ resultados: await buscar(consulta) }, 200, origin);
    }
    if (datos.accion === "foto") {
      const perfumeId = String(datos.perfumeId || "").trim();
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(perfumeId)) return respuesta({ error: "ID de perfume inválido" }, 400, origin);
      return respuesta({ url: await copiarFoto(supabaseUrl, secret, String(datos.url || ""), perfumeId) }, 200, origin);
    }
    return respuesta({ error: "Acción desconocida" }, 400, origin);
  } catch (error) {
    const mensaje = error?.name === "AbortError" ? "PerfumAPI no respondió a tiempo" : (error?.message || "Error inesperado");
    return respuesta({ error: mensaje }, 502, origin);
  }
});
