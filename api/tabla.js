/* Vista previa del enlace de la tabla de pagos (WhatsApp, Messenger, iMessage…).
   Esas apps arman la tarjeta del enlace leyendo la página desde su servidor: no ejecutan
   JavaScript ni ven lo que va después de "#". Por eso el enlace que se comparte es /p/TOKEN
   (vercel.json lo dirige aquí): esta función lee esa tabla, solo esa y con la misma consulta
   pública que usa pagos.html, y devuelve pagos.html con el nombre del cliente, su perfume y la
   foto del frasco en el título, la descripción y la imagen. La página funciona igual que
   pagos.html#TOKEN. */
const fs = require("node:fs");
const path = require("node:path");

const RAIZ = path.join(__dirname, "..");
const PLANTILLA = fs.readFileSync(path.join(RAIZ, "pagos.html"), "utf8");
/* La URL y la publishable key públicas salen del mismo supabase-config.js de la página */
const CONFIG = fs.readFileSync(path.join(RAIZ, "supabase-config.js"), "utf8");
const deConfig = (clave) => (CONFIG.match(new RegExp(`${clave}\\s*:\\s*"([^"]+)"`)) || [])[1] || "";
const SUPABASE_URL = process.env.SUPABASE_URL || deConfig("url");
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || deConfig("publishableKey");

const escapar = (valor) => String(valor ?? "").replace(/[&<>"']/g, (c) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[c]);

async function leerTabla(token) {
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token) || !SUPABASE_URL || !SUPABASE_KEY) return null;
  const controller = new AbortController();
  const reloj = setTimeout(() => controller.abort(), 4000);
  try {
    const respuesta = await fetch(new URL("/rest/v1/rpc/sensorial_payment_plan", SUPABASE_URL), {
      method: "POST",
      headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ p_token: token }),
      signal: controller.signal,
    });
    if (!respuesta.ok) return null;
    const datos = await respuesta.json();
    return datos && typeof datos === "object" && Array.isArray(datos.installments) ? datos : null;
  } catch {
    return null;
  } finally {
    clearTimeout(reloj);
  }
}

/* Igual que calcular() de tabla-pagos.js, en centavos */
function liquidada(datos) {
  const suma = (lista) => (Array.isArray(lista) ? lista : []).reduce((t, x) => t + Math.round(Number(x?.amount || 0) * 100), 0);
  const total = suma(datos.installments);
  return total > 0 && suma(datos.payments) >= total;
}

function vistaPrevia(datos, token, origen) {
  const url = `${origen}/p/${token}`;
  if (!datos) {
    return {
      titulo: "Tu tabla de pagos | Sensorial Boutique",
      descripcion: "Consulta tus pagos y lo que te falta para liquidar tu perfume.",
      url,
    };
  }
  const cliente = String(datos.client_name || "").trim();
  const perfume = [datos.brand, datos.product_name].map((p) => String(p || "").trim()).filter(Boolean).join(" ");
  let imagen = "";
  try {
    const foto = String(datos.image_url || "");
    if (/^https:\/\//i.test(foto) || /^img\//.test(foto)) imagen = new URL(foto, `${origen}/`).href;
  } catch { imagen = ""; }
  return {
    titulo: cliente ? `Tabla de pagos de ${cliente}` : "Tu tabla de pagos | Sensorial Boutique",
    descripcion: `${perfume || "Tu perfume"} · ${liquidada(datos) ? "Pago completo" : "Sensorial Boutique"}`,
    imagen,
    url,
  };
}

/* pagos.html con sus metadatos. <base href="/"> mantiene sus archivos (css, js) en la raíz
   aunque la dirección sea /p/TOKEN. */
function conVistaPrevia(html, { titulo, descripcion, imagen, url }) {
  const metas = [
    '<base href="/">',
    '<meta property="og:type" content="website">',
    '<meta property="og:site_name" content="Sensorial Boutique">',
    `<meta property="og:url" content="${escapar(url)}">`,
    imagen ? `<meta property="og:image" content="${escapar(imagen)}">` : "",
    imagen ? `<meta property="og:image:alt" content="${escapar(descripcion)}">` : "",
    `<meta name="twitter:card" content="${imagen ? "summary_large_image" : "summary"}">`,
  ].filter(Boolean).join("\n  ");
  return html
    .replace('<meta charset="utf-8">', `<meta charset="utf-8">\n  ${metas}`)
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${escapar(titulo)}</title>`)
    .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${escapar(descripcion)}">`)
    .replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${escapar(titulo)}">`)
    .replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${escapar(descripcion)}">`);
}

module.exports = async function tabla(req, res) {
  const token = String(req.query?.t ?? new URL(req.url || "/", "http://localhost").searchParams.get("t") ?? "");
  const host = String(req.headers?.["x-forwarded-host"] || req.headers?.host || "sensorial-azure.vercel.app").split(",")[0].trim();
  const origen = `https://${host}`;
  const datos = await leerTabla(token);
  const html = conVistaPrevia(PLANTILLA, vistaPrevia(datos, token, origen));
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  /* Siempre al día (cada abono cambia la tabla) y fuera de los buscadores */
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  res.end(html);
};
