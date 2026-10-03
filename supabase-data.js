/* Carga el catálogo público antes de app.js. Si Supabase no está configurado o falla,
   la tienda sigue usando sus datos locales de ejemplo. */
(() => {
  "use strict";
  const config = window.SENSORIAL_SUPABASE || {};
  const iniciar = () => {
    const script = document.createElement("script");
    script.src = "app.js";
    document.body.append(script);
  };
  if (!config.url || !config.publishableKey) {
    iniciar();
    return;
  }

  let base;
  try {
    base = new URL(config.url);
    if (base.protocol !== "https:") throw new Error("Supabase requiere HTTPS");
  } catch (error) {
    console.error("URL de Supabase inválida:", error);
    iniciar();
    return;
  }

  const controller = new AbortController();
  const reloj = window.setTimeout(() => controller.abort(), 4000);
  const leer = async (ruta) => {
    const response = await fetch(new URL(`/rest/v1/${ruta}`, base), {
      headers: { apikey: config.publishableKey },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Supabase respondió ${response.status} en ${ruta}`);
    return response.json();
  };

  Promise.allSettled([
    leer("catalog_public?select=*&order=id.asc"),
    leer("families?select=*&order=display_order.asc"),
    leer("featured_reviews?select=*&order=published_at.desc"),
    leer("reviews?select=id,perfume_id,author_name,city,body,rating,published_at&order=published_at.desc&limit=200"),
  ]).then((results) => {
    const datos = results.map((r) => r.status === "fulfilled" ? r.value : null);
    results.filter((r) => r.status === "rejected").forEach((r) => console.warn(r.reason));
    window.SENSORIAL_REMOTE = {
      perfumes: datos[0],
      families: datos[1],
      featuredReviews: datos[2],
      reviews: datos[3],
    };
  }).finally(() => {
    window.clearTimeout(reloj);
    iniciar();
  });
})();
