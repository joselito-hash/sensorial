/* Marcador "Sensorial · Fragrantica".
   Se ejecuta en la página de un perfume de Fragrantica que TÚ tienes abierta: lee lo que
   ya se ve en pantalla (notas, acordes, "cuándo usarlo", año, público y foto) y lo copia
   para pegarlo en el panel (admin.html → Traer de Fragrantica → Pegar de Fragrantica).
   No abre otras páginas ni hace peticiones a Fragrantica. Ver herramientas/marcador.html. */
(() => {
  "use strict";
  const FORMATO = "sensorial-fragrantica";
  const VERSION = 1;
  const ID_PANEL = "sensorial-fragrantica-panel";

  document.getElementById(ID_PANEL)?.remove();

  const texto = (el) => (el ? el.textContent.replace(/\s+/g, " ").trim() : "");
  const sinAcentos = (t) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const esFragrantica = /(^|\.)fragrantica\.|fragranticarabia\.com$/.test(location.hostname);
  const idioma = /fragrantica\.es$/.test(location.hostname) ? "es" : (/fragrantica\.com$/.test(location.hostname) ? "en" : document.documentElement.lang || "");

  /* ---------- Lectura de la página ---------- */

  function urlCanonica() {
    const og = document.querySelector('meta[property="og:url"]')?.content;
    return (og || location.href).split(/[?#]/)[0];
  }

  /* "Cloud by Ariana Grande - Fragrantica" → nombre y casa */
  function nombreYCasa() {
    const casa = texto(document.querySelector('[itemprop="brand"] [itemprop="name"]'));
    const alt = document.querySelector('meta[property="og:image:alt"]')?.content || "";
    let nombre = "";
    const m = alt.match(/^(.*?) by (.*?)(?: - Fragrantica)?$/);
    if (m) nombre = m[1].trim();
    if (!nombre) {
      const h1 = document.querySelector('h1[itemprop="name"], h1');
      if (h1) {
        const copia = h1.cloneNode(true);
        copia.querySelectorAll("span, small").forEach((s) => s.remove());
        nombre = texto(copia);
        if (casa && nombre.toLowerCase().endsWith(` ${casa.toLowerCase()}`)) nombre = nombre.slice(0, -casa.length - 1).trim();
      }
    }
    return { nombre, casa: casa || (m ? m[2].trim() : "") };
  }

  function descripcion() {
    return texto(document.querySelector('[itemprop="description"]'));
  }

  function anio(desc) {
    const m = desc.match(/(?:se lanzó en|was launched in|lancé en|lanciato nel|wurde)\D{0,12}(\d{4})/i) || document.title.match(/\b(19\d{2}|20\d{2})\b\s*$/);
    return m ? Number(m[1]) : null;
  }

  function genero() {
    const h1 = document.querySelector('h1[itemprop="name"], h1');
    const span = h1 ? texto(h1.querySelector("span, small")) : "";
    return span || (document.title.match(/(para Hombres y Mujeres|para Mujeres|para Hombres|for women and men|for women|for men)/i) || [])[0] || "";
  }

  /* Pirámide: <pyramid-level-new notes="top|middle|base"> con un enlace por nota */
  function notas() {
    const fases = { top: [], middle: [], base: [] };
    const niveles = document.querySelectorAll("pyramid-level-new");
    niveles.forEach((nivel) => {
      const fase = nivel.getAttribute("notes");
      const lista = [];
      nivel.querySelectorAll("a").forEach((a) => {
        const nombre = texto(a.querySelector(".pyramid-note-label")) || texto(a) || a.querySelector("img")?.alt || "";
        if (nombre && !lista.includes(nombre)) lista.push(nombre);
      });
      if (fases[fase]) fases[fase].push(...lista);
      else fases.middle.push(...lista); /* pirámide de un solo nivel: va al corazón */
    });
    return fases;
  }

  /* Acordes: barras con color de fondo y ancho en %, con el nombre dentro */
  function acordes() {
    const vistos = new Set();
    const lista = [];
    document.querySelectorAll("span.truncate").forEach((span) => {
      const barra = span.parentElement;
      const ancho = parseFloat(barra?.style?.width);
      if (!barra || !Number.isFinite(ancho)) return;
      const nombre = texto(span);
      if (!nombre || vistos.has(nombre)) return;
      vistos.add(nombre);
      const color = getComputedStyle(barra).backgroundColor.match(/\d+/g);
      lista.push({ name: nombre, strength: Math.round(ancho), color: color && color.length >= 3 ? color.slice(0, 3).join(",") : null });
    });
    return lista;
  }

  /* Foto: la principal (375x500) y, si existe, el original de la misma ficha */
  function foto() {
    const img = document.querySelector('img[itemprop="image"]');
    const id = (img?.src || "").match(/\.(\d+)(?:\.2x)?\.(?:jpg|webp|avif)/)?.[1] || urlCanonica().match(/-(\d+)\.html$/)?.[1];
    return id ? `https://fimgs.net/mdimg/perfume/o.${id}.jpg` : (img?.src || "");
  }

  /* "Cuándo usarlo": Fragrantica lo dibuja al cargar la página. Se busca la tarjeta con ese
     título y, dentro, cada etiqueta (invierno, primavera, verano, otoño, día, noche) con su
     barra o su porcentaje. Si no se puede leer, el panel deja escribir los números a mano. */
  const MOMENTOS = [
    ["winter", ["invierno", "winter"]],
    ["spring", ["primavera", "spring"]],
    ["summer", ["verano", "summer"]],
    ["autumn", ["otono", "autumn", "fall"]],
    ["day", ["dia", "day"]],
    ["night", ["noche", "night"]],
  ];

  function tarjetaUso() {
    const titulo = [...document.querySelectorAll(".tw-rating-card-label, h2, h3, h4, h5, h6, span, div")]
      .find((el) => el.children.length === 0 && /^(cuando usarlo|when to wear)$/.test(sinAcentos(texto(el))));
    return titulo ? (titulo.closest(".tw-rating-card") || titulo.parentElement?.parentElement?.parentElement) : null;
  }

  function valorCerca(etiqueta) {
    let nodo = etiqueta;
    for (let nivel = 0; nivel < 4 && nodo; nivel++, nodo = nodo.parentElement) {
      const candidatos = [nodo, ...nodo.querySelectorAll("*")];
      for (const el of candidatos) {
        const estilo = el.getAttribute?.("style") || "";
        const m = estilo.match(/(?:^|;)\s*(width|height)\s*:\s*([\d.]+)%/);
        if (m && el !== etiqueta) return parseFloat(m[2]);
        const aria = el.getAttribute?.("aria-valuenow");
        if (aria && Number.isFinite(parseFloat(aria))) return parseFloat(aria);
      }
      const pct = texto(nodo).match(/(\d+(?:[.,]\d+)?)\s*%/);
      if (pct && nivel > 0) return parseFloat(pct[1].replace(",", "."));
    }
    return null;
  }

  function uso() {
    const tarjeta = tarjetaUso();
    if (!tarjeta) return { valores: null, tarjeta: null };
    const hojas = [...tarjeta.querySelectorAll("*")].filter((el) => el.children.length === 0 || el.tagName === "text");
    const valores = {};
    for (const [clave, nombres] of MOMENTOS) {
      const etiqueta = hojas.find((el) => nombres.includes(sinAcentos(texto(el))));
      const v = etiqueta ? valorCerca(etiqueta) : null;
      if (v !== null) valores[clave] = v;
    }
    return { valores: Object.keys(valores).length === 6 ? valores : (Object.keys(valores).length ? valores : null), tarjeta };
  }

  /* Escala de 0 a 100 respecto al valor mayor (igual que el resto del catálogo) */
  function escalar(valores) {
    const max = Math.max(...Object.values(valores).filter(Number.isFinite), 0);
    if (!max) return null;
    return Object.fromEntries(Object.entries(valores).map(([k, v]) => [k, Math.round((v / max) * 100)]));
  }

  /* ---------- Panel ---------- */

  function panel(datos, usoLeido, diagnostico) {
    const anfitrion = document.createElement("div");
    anfitrion.id = ID_PANEL;
    anfitrion.style.cssText = "position:fixed;z-index:2147483647;right:12px;bottom:12px;left:auto;max-width:min(380px,calc(100vw - 24px));";
    const raiz = anfitrion.attachShadow({ mode: "open" });
    const fases = datos.notes_top.length + datos.notes_middle.length + datos.notes_base.length;
    const campos = MOMENTOS.map(([clave], i) => {
      const etiqueta = ["Invierno", "Primavera", "Verano", "Otoño", "Día", "Noche"][i];
      const valor = usoLeido && Number.isFinite(usoLeido[clave]) ? usoLeido[clave] : "";
      return `<label>${etiqueta}<input type="number" min="0" max="100" inputmode="numeric" data-uso="${clave}" value="${valor}"></label>`;
    }).join("");
    raiz.innerHTML = `
      <style>
        :host { all: initial; }
        .caja { font: 14px/1.45 system-ui, -apple-system, "Segoe UI", sans-serif; color: #f4ecef; background: #221c20; border: 1px solid #4d4148; border-radius: 16px; padding: 14px; box-shadow: 0 18px 40px -12px rgb(0 0 0 / .55); }
        h2 { margin: 0 0 2px; font-size: 15px; }
        p { margin: 4px 0; color: #cfc2c9; font-size: 13px; }
        .ok { color: #b5d6c4; } .aviso { color: #f3d29b; }
        .uso { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin: 10px 0; }
        label { display: grid; gap: 2px; font-size: 12px; color: #cfc2c9; }
        input { width: 100%; box-sizing: border-box; padding: 6px 8px; border: 1px solid #4d4148; border-radius: 8px; background: #322a30; color: #fff; font: inherit; }
        .acciones { display: flex; gap: 8px; margin-top: 10px; }
        button { flex: 1; min-height: 40px; border: 0; border-radius: 999px; font: 600 14px system-ui, sans-serif; cursor: pointer; }
        .copiar { background: #f4aabe; color: #2b1720; } .cerrar { flex: 0 0 auto; padding: 0 16px; background: #3a3036; color: #f4ecef; }
        textarea { width: 100%; box-sizing: border-box; height: 90px; margin-top: 8px; border-radius: 8px; background: #322a30; color: #fff; border: 1px solid #4d4148; font: 11px ui-monospace, monospace; }
      </style>
      <div class="caja" role="dialog" aria-label="Copiar para Sensorial">
        <h2>Sensorial · ${escapar(datos.name || "Perfume")}</h2>
        <p>${escapar(datos.brand || "")}${datos.release_year ? ` · ${datos.release_year}` : ""}${datos.gender ? ` · ${escapar(datos.gender)}` : ""}</p>
        <p class="${fases ? "ok" : "aviso"}">${fases ? `${fases} notas` : "No encontré la pirámide de notas."} · ${datos.accords.length ? `${datos.accords.length} acordes` : "sin acordes"}</p>
        <p class="${usoLeido && Object.keys(usoLeido).length === 6 ? "ok" : "aviso"}">${usoLeido && Object.keys(usoLeido).length === 6
          ? "Cuándo usarlo: leído de la página (0 a 100). Revísalo."
          : "No pude leer todo «Cuándo usarlo». Escribe los valores que ves en la gráfica (0 a 100) o déjalos vacíos."}</p>
        <div class="uso">${campos}</div>
        <div class="acciones"><button type="button" class="copiar">Copiar para Sensorial</button><button type="button" class="cerrar">Cerrar</button></div>
        <p class="estado" role="status"></p>
      </div>`;
    const estado = raiz.querySelector(".estado");
    raiz.querySelector(".cerrar").addEventListener("click", () => anfitrion.remove());
    raiz.querySelector(".copiar").addEventListener("click", async () => {
      const manual = {};
      raiz.querySelectorAll("[data-uso]").forEach((input) => {
        const v = parseFloat(input.value);
        if (Number.isFinite(v)) manual[input.dataset.uso] = Math.max(0, Math.min(100, v));
      });
      const final = { ...datos, usage: Object.keys(manual).length === 6 ? escalar(manual) : null };
      if (!final.usage && diagnostico) final.diagnostico = diagnostico;
      const json = JSON.stringify(final);
      if (await copiar(json)) {
        estado.className = "estado ok";
        estado.textContent = "Copiado. En el panel abre la ficha y pulsa «Pegar de Fragrantica».";
      } else {
        estado.className = "estado aviso";
        estado.textContent = "Tu navegador no dejó copiar solo. Copia este texto a mano:";
        const area = document.createElement("textarea");
        area.readOnly = true;
        area.value = json;
        estado.after(area);
        area.focus();
        area.select();
      }
    });
    document.body.append(anfitrion);
  }

  async function copiar(textoACopiar) {
    try { await navigator.clipboard.writeText(textoACopiar); return true; } catch { /* sigue con el método antiguo */ }
    try {
      const area = document.createElement("textarea");
      area.value = textoACopiar;
      area.style.cssText = "position:fixed;top:0;left:0;opacity:0;";
      document.body.append(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      return ok;
    } catch { return false; }
  }

  function escapar(valor) {
    return String(valor ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  }

  /* ---------- Inicio ---------- */

  if (!esFragrantica || !document.querySelector("pyramid-level-new, span.truncate")) {
    window.alert("Abre la página de un perfume en Fragrantica y vuelve a usar el marcador de Sensorial.");
    return;
  }

  /* "Cuándo usarlo" a veces se dibuja al llegar a la vista: se acerca y se espera un poco */
  const tarjeta = tarjetaUso();
  const posicion = window.scrollY;
  if (tarjeta) tarjeta.scrollIntoView({ block: "center" });
  let intentos = 0;
  const leer = () => {
    const { valores, tarjeta: t } = uso();
    if ((!valores || Object.keys(valores).length < 6) && intentos++ < 10) { window.setTimeout(leer, 300); return; }
    window.scrollTo({ top: posicion });
    const desc = descripcion();
    const { nombre, casa } = nombreYCasa();
    const fases = notas();
    const datos = {
      formato: FORMATO, version: VERSION, idioma,
      perfume_url: urlCanonica(), name: nombre, brand: casa,
      release_year: anio(desc), gender: genero(),
      notes_top: fases.top, notes_middle: fases.middle, notes_base: fases.base,
      accords: acordes(), image_url: foto(),
      leido_el: new Date().toISOString().slice(0, 10),
    };
    const diagnostico = !valores || Object.keys(valores).length < 6 ? (t ? t.outerHTML.slice(0, 6000) : "sin tarjeta de «Cuándo usarlo»") : null;
    panel(datos, valores && Object.keys(valores).length === 6 ? escalar(valores) : valores, diagnostico);
  };
  leer();
})();
