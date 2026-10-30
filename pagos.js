/* Página que ve el cliente: /p/TOKEN (o pagos.html#TOKEN).
   La primera vez que la abre (y otra vez cada que hay un abono nuevo), el logo se arma sobre el
   telón; cuando su tabla de Supabase está lista (solo esa, con su token), el logo viaja a su
   lugar, el telón se abre y la tabla entra sobre el fondo de hilos dorados. Lo de abajo se anima
   cuando el cliente llega a verlo. Si no hay abonos nuevos, la tabla aparece lista.
   Si la clienta tiene varias tablas juntas (mismo grupo en el panel), cada perfume es una hoja:
   desliza de lado o toca su frasco arriba para pasar de uno a otro. Abre siempre en el perfume
   que sigue pagando; si acaba de liquidar uno, primero ve su celebración y luego la página pasa
   sola al siguiente. */
(() => {
  "use strict";

  const WHATSAPP = "525650569410"; // +52 56 5056 9410, el mismo número que CONFIG.whatsapp en app.js
  /* Datos para transferir, en la hoja "Datos de pago" (junto a las tablas). numero: la CLABE
     o la tarjeta, sin espacios (se muestra agrupada y se copia completa). */
  const DATOS_PAGO = { titular: "José Isaías", banco: "BBVA", etiqueta: "CLABE", numero: "012180015270556274" };
  /* "¿Mi perfume es original?": el video vertical en el teléfono y el horizontal en computadora */
  const VIDEO_ORIGINAL = {
    vertical: "videos/original-vertical.mp4",
    horizontal: "videos/original-horizontal.mp4",
    poster: "videos/original-vertical.webp",
    posterHorizontal: "videos/original-horizontal.webp",
    /* Fondo de la tarjeta del video en la cartera: la base de un frasco con su código de lote */
    tarjeta: "videos/original-tarjeta.webp",
    /* El primer cuadro exacto de cada video: va debajo mientras arranca (sin parpadeo) */
    inicioVertical: "videos/original-vertical-inicio.webp",
    inicioHorizontal: "videos/original-horizontal-inicio.webp",
  };
  const T = window.TablaPagos;
  const reducido = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const config = window.SENSORIAL_SUPABASE || {};
  const escena = document.querySelector("#tabla");
  const hilos = T.fondo(document.querySelector(".tp-fondo__hilos"));
  const token = leerToken();
  /* La animación sale la primera vez que se abre la tabla en este dispositivo y otra vez cada
     que se registra un abono (incluido el que la liquida). Se guarda qué abonos se vieron: al
     recargar o volver a abrirla sin abonos nuevos, la tabla aparece lista. */
  const CLAVE = "sb-tablas-abonos";
  const vistas = (() => {
    try { return JSON.parse(localStorage.getItem(CLAVE) || "{}") || {}; } catch { return {}; }
  })();
  try { localStorage.removeItem("sb-tablas-vistas"); } catch { /* formato anterior */ }
  const firmaDe = (datos) => {
    const abonos = Array.isArray(datos.payments) ? datos.payments : [];
    return `${abonos.length}:${Math.round(abonos.reduce((suma, a) => suma + Number(a.amount || 0), 0) * 100)}`;
  };
  const telon = document.querySelector(".tp-telon");
  /* Si nunca la ha visto, el logo empieza a armarse mientras carga; si ya la vio, se espera a
     saber si hay abonos nuevos (mientras tanto, solo el fondo oscuro) */
  let apertura = token && !vistas[token] ? T.intro(telon) : null;
  T.parallax(document.documentElement, { hilos });

  function recordar(datos) {
    vistas[datos.token || token] = firmaDe(datos);
    try { localStorage.setItem(CLAVE, JSON.stringify(vistas)); } catch { /* sin almacenamiento: se verá otra vez */ }
  }

  /* El enlace que se comparte es /p/TOKEN (con vista previa en WhatsApp, ver api/tabla.js);
     los enlaces anteriores, pagos.html#TOKEN, siguen funcionando */
  function leerToken() {
    let crudo = (location.pathname.match(/^\/p\/([^/]+)\/?$/) || [])[1]
      || location.hash.replace(/^#/, "") || new URLSearchParams(location.search).get("t") || "";
    try { crudo = decodeURIComponent(crudo); } catch { crudo = ""; }
    return /^[A-Za-z0-9_-]{16,64}$/.test(crudo) ? crudo : "";
  }

  async function cargar() {
    if (!token) throw new Error("sin-token");
    if (!config.url || !config.publishableKey) throw new Error("Falta la configuración pública de Supabase.");
    const controller = new AbortController();
    const reloj = setTimeout(() => controller.abort(), 10000);
    try {
      const respuesta = await fetch(new URL("/rest/v1/rpc/sensorial_payment_plan", config.url), {
        method: "POST",
        headers: { apikey: config.publishableKey, "Content-Type": "application/json" },
        body: JSON.stringify({ p_token: token }),
        cache: "no-store",
        signal: controller.signal,
      });
      if (!respuesta.ok) throw new Error(`Supabase respondió ${respuesta.status}`);
      const datos = await respuesta.json();
      if (!datos || typeof datos !== "object" || !Array.isArray(datos.installments)) throw new Error("no-encontrada");
      return datos;
    } finally {
      clearTimeout(reloj);
    }
  }

  /* Fotos y letras listas antes de abrir, para que la entrada no muestre huecos ni cambios de
     letra a medio camino. Nunca espera más de 4 segundos. */
  function precargar(urls) {
    const fotos = urls.filter(Boolean).map((src) => {
      const img = new Image();
      img.src = src;
      return img.decode().catch(() => {});
    });
    const letras = ["400 1em 'Ms Madi'", "400 1em Urbanist", "800 1em Urbanist"]
      .map((fuente) => document.fonts?.load(fuente).catch(() => {}));
    return Promise.race([Promise.all([...fotos, ...letras]), new Promise((listo) => { setTimeout(listo, 4000); })]);
  }

  const whatsapp = (mensaje) => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(mensaje)}`;

  /* El logo de la apertura viaja al de la página (destino); justo entonces empieza la entrada.
     Sin apertura (visitas siguientes), los hilos aparecen ya trazados. */
  function abrir(destino, alAbrir) {
    escena.removeAttribute("aria-busy");
    if (!apertura) {
      telon.hidden = true;
      hilos.empezar(0, { trazar: false });
      alAbrir?.();
      return;
    }
    apertura.entregar(destino, () => {
      hilos.empezar(0);
      alAbrir?.();
    });
  }

  /* Botón Descargar de una tabla. Devuelve una función que prepara la imagen de antemano, para
     que la descarga sea inmediata. */
  function prepararDescarga(tabla, datos) {
    const boton = tabla.querySelector("[data-tp-descargar]");
    if (!boton) return () => {};
    let listo = null;
    const preparar = () => {
      listo ??= T.archivo(datos).catch((error) => { listo = null; throw error; });
      return listo;
    };
    boton.addEventListener("click", async () => {
      const etiqueta = boton.innerHTML;
      boton.disabled = true;
      boton.innerHTML = '<i class="ph ph-download-simple" aria-hidden="true"></i>Preparando…';
      try {
        await T.guardar(preparar());
        boton.innerHTML = etiqueta;
      } catch (error) {
        console.warn(error);
        boton.textContent = "No se pudo descargar";
        setTimeout(() => { boton.innerHTML = etiqueta; }, 2500);
      } finally {
        boton.disabled = false;
      }
    });
    return () => { preparar().catch(() => {}); };
  }

  const nombreDe = (plan) => [plan.brand, plan.product_name].map((p) => String(p || "").trim()).filter(Boolean).join(" ") || "Perfume";
  /* El nombre del perfume sin la casa, para la pastilla de arriba */
  const cortoDe = (plan) => String(plan.product_name || "").trim() || nombreDe(plan);
  const tonoDe = (plan) => (T.TONOS.includes(plan.tone) ? plan.tone : "rosa");

  /* En curso: WhatsApp para dudas y Descargar. Liquidada: WhatsApp para pedir otro perfume.
     Con su perfume ligado al catálogo, también la reseña (pedirla o la que ya dejó). */
  let resenas = new Map();
  const opcionesDe = (plan) => {
    const tabla = plan.token || token;
    const info = resenas.get(tabla);
    return {
      contacto: whatsapp(`Hola, soy ${plan.client_name}. Tengo una pregunta sobre mi tabla de pagos de ${nombreDe(plan)}.`),
      descargar: true,
      siguiente: whatsapp(`Hola, soy ${plan.client_name}. Ya terminé de pagar mi ${nombreDe(plan)}. Me gustaría elegir mi siguiente perfume.`),
      resena: info ? { tabla, perfumeId: info.perfume_id, hecha: info.resena || null } : null,
    };
  };

  /* La tarjeta de fidelidad se controla desde el panel: un interruptor general y, por clienta,
     "como el general", "prendida" o "apagada", más sellos agregados a mano. Si no se puede
     leer, queda apagada. */
  let tarjeta = { activa: false, extra: 0 };
  async function cargarTarjeta(datos) {
    const apagada = { activa: false, extra: 0 };
    if (!config.url || !config.publishableKey) return apagada;
    const grupo = Array.isArray(datos.grupo) && datos.grupo.length ? datos.grupo : [datos];
    const tokens = [...new Set([token, ...grupo.map((plan) => plan?.token).filter(Boolean)])].slice(0, 12);
    const controller = new AbortController();
    const reloj = setTimeout(() => controller.abort(), 3000);
    try {
      const respuesta = await fetch(new URL("/rest/v1/rpc/sensorial_tabla_fidelidad", config.url), {
        method: "POST",
        headers: { apikey: config.publishableKey, "Content-Type": "application/json" },
        body: JSON.stringify({ p_tokens: tokens }),
        cache: "no-store",
        signal: controller.signal,
      });
      if (!respuesta.ok) return apagada;
      const r = await respuesta.json();
      const activa = r?.modo === "on" || (r?.modo !== "off" && r?.general === true);
      return { activa, extra: Math.max(0, Math.min(64, Number(r?.extra) || 0)) };
    } catch {
      return apagada;
    } finally {
      clearTimeout(reloj);
    }
  }

  /* Tarjeta de fidelidad: WhatsApp para pedir el premio ganado o para sumar otro sello */
  const opcionesFidelidad = (grupo) => {
    const cliente = grupo[0]?.client_name || "";
    return {
      premio: (p) => whatsapp(`Hola, soy ${cliente}. Ya junté ${p.sello} sellos en mi tarjeta de fidelidad y quiero mi premio: ${p.titulo}.`),
      siguiente: whatsapp(`Hola, soy ${cliente}. Quiero sumar otro sello a mi tarjeta de fidelidad: me gustaría elegir mi siguiente perfume.`),
    };
  };

  /* La tarjeta se inclina con el mouse y el reflejo del papel lo sigue; los sellos se estampan
     la primera vez que la clienta llega a ella */
  function iniciarFidelidad(hoja) {
    const tarjeta = hoja?.querySelector(".tf-tarjeta");
    if (!tarjeta) return () => {};
    hoja.querySelectorAll(".tf-sello.is-sellado").forEach((sello, k) => {
      sello.style.setProperty("--k", k);
      sello.style.setProperty("--tf-giro", `${[-9, 6, -4, 10, -7, 3, -11, 8][k % 8]}deg`);
    });
    hoja.querySelectorAll(".tf-info > *").forEach((el, i) => el.style.setProperty("--i", i));
    if (window.matchMedia("(hover: hover) and (pointer: fine)").matches && !reducido()) {
      tarjeta.addEventListener("pointermove", (evento) => {
        if (evento.pointerType !== "mouse" || evento.buttons) return;
        const caja = tarjeta.getBoundingClientRect();
        const x = (evento.clientX - caja.left) / caja.width;
        const y = (evento.clientY - caja.top) / caja.height;
        tarjeta.style.setProperty("--tf-ry", `${((x - 0.5) * 14).toFixed(2)}deg`);
        tarjeta.style.setProperty("--tf-rx", `${((0.5 - y) * 10).toFixed(2)}deg`);
        tarjeta.style.setProperty("--tf-x", `${(x * 100).toFixed(1)}%`);
        tarjeta.style.setProperty("--tf-y", `${(y * 100).toFixed(1)}%`);
        tarjeta.style.setProperty("--tf-luz", "1");
      });
      tarjeta.addEventListener("pointerleave", () => {
        ["--tf-rx", "--tf-ry", "--tf-x", "--tf-y", "--tf-luz"].forEach((v) => tarjeta.style.removeProperty(v));
      });
    }
    let vista = false;
    return () => {
      if (vista) return;
      vista = true;
      tarjeta.classList.add("is-vista");
      hoja.querySelector(".tf-info")?.classList.add("is-vista");
    };
  }

  /* ---------- Reseñas ----------
     Pregunta a Supabase qué perfume del catálogo puede reseñar cada tabla y si ya lo hizo. Si
     no responde a tiempo, la tabla se muestra igual, sin el bloque de la reseña. */
  async function cargarResenas(datos) {
    if (!config.url || !config.publishableKey || !config.turnstileSiteKey) return new Map();
    const grupo = Array.isArray(datos.grupo) && datos.grupo.length ? datos.grupo : [datos];
    const tokens = [...new Set([token, ...grupo.map((plan) => plan?.token).filter(Boolean)])].slice(0, 12);
    const controller = new AbortController();
    const reloj = setTimeout(() => controller.abort(), 3000);
    try {
      const respuesta = await fetch(new URL("/rest/v1/rpc/sensorial_tabla_resenas", config.url), {
        method: "POST",
        headers: { apikey: config.publishableKey, "Content-Type": "application/json" },
        body: JSON.stringify({ p_tokens: tokens }),
        cache: "no-store",
        signal: controller.signal,
      });
      if (!respuesta.ok) return new Map();
      const lista = await respuesta.json();
      return new Map((Array.isArray(lista) ? lista : []).filter((r) => r && r.perfume_id).map((r) => [r.token, r]));
    } catch {
      return new Map();
    } finally {
      clearTimeout(reloj);
    }
  }

  /* Verificación de Cloudflare (Turnstile): se carga hasta que la clienta elige sus estrellas y
     es invisible; solo muestra una casilla si de verdad duda */
  let captchaCarga = null;
  const captchas = new Map();
  function cargarCaptcha() {
    if (window.turnstile) return Promise.resolve();
    captchaCarga ??= new Promise((listo, falla) => {
      const script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.onload = listo;
      script.onerror = () => { captchaCarga = null; falla(new Error("No se pudo cargar la verificación")); };
      document.head.append(script);
    });
    return captchaCarga;
  }
  async function prepararCaptcha(form) {
    if (captchas.has(form)) return;
    const caja = form.querySelector(".tp-resena__captcha");
    const estado = { id: null, token: "" };
    captchas.set(form, estado);
    try {
      await cargarCaptcha();
      estado.id = window.turnstile.render(caja, {
        sitekey: config.turnstileSiteKey,
        theme: "dark",
        size: "flexible",
        appearance: "interaction-only",
        callback: (valor) => { estado.token = valor; },
        "expired-callback": () => { estado.token = ""; },
        "error-callback": () => { estado.token = ""; },
      });
    } catch {
      captchas.delete(form);
      avisarResena(form, "No se pudo cargar la verificación. Actualiza la página para intentarlo.", true);
    }
  }
  async function tokenCaptcha(form) {
    await prepararCaptcha(form);
    const estado = captchas.get(form);
    for (let i = 0; i < 40 && estado && !estado.token; i += 1) await new Promise((listo) => { setTimeout(listo, 250); });
    return estado?.token || "";
  }

  function avisarResena(form, texto, error = false) {
    const estado = form.querySelector(".tp-resena__estado");
    estado.textContent = texto;
    estado.classList.toggle("is-error", error);
  }

  /* Pinta n estrellas llenas (clase) o en vista previa al pasar el mouse */
  function marcarEstrellas(form, n, clase = "is-llena") {
    form.querySelectorAll(".tp-estrellas__op").forEach((op, i) => op.classList.toggle(clase, i < n));
  }

  /* Destellos dorados que saltan de la estrella elegida */
  const BRILLO = "M12 0c.6 6.4 5.6 11.4 12 12-6.4.6-11.4 5.6-12 12-.6-6.4-5.6-11.4-12-12 6.4-.6 11.4-5.6 12-12z";
  function destellar(op) {
    if (reducido()) return;
    for (let i = 0; i < 6; i += 1) {
      const angulo = (i / 6) * Math.PI * 2 - Math.PI / 2;
      const chispa = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      chispa.setAttribute("viewBox", "0 0 24 24");
      chispa.setAttribute("class", "tp-estrellas__chispa");
      chispa.setAttribute("aria-hidden", "true");
      chispa.innerHTML = `<path d="${BRILLO}"/>`;
      chispa.style.setProperty("--x", `${Math.round(Math.cos(angulo) * 34)}px`);
      chispa.style.setProperty("--y", `${Math.round(Math.sin(angulo) * 34)}px`);
      chispa.style.setProperty("--g", `${(i % 2 ? 1 : -1) * 120}deg`);
      op.append(chispa);
      chispa.addEventListener("animationend", () => chispa.remove(), { once: true });
    }
  }

  function abrirResena(form, valor) {
    marcarEstrellas(form, valor);
    form.querySelector(".tp-estrellas__texto").textContent = T.CALIFICACIONES[valor] || " ";
    const resto = form.querySelector(".tp-resena__resto");
    if (form.classList.contains("is-abierta")) return;
    form.classList.add("is-abierta");
    resto.inert = false;
    prepararCaptcha(form);
  }

  async function enviarResena(form) {
    const seccion = form.closest("[data-tp-resena]");
    const boton = form.querySelector(".tp-resena__enviar");
    const datos = new FormData(form);
    const estrellas = Number(datos.get("estrellas"));
    const nombre = String(datos.get("nombre") || "").trim();
    const texto = String(datos.get("texto") || "").trim();
    if (!estrellas) return avisarResena(form, "Elige cuántas estrellas le das.", true);
    if (nombre.length < 2) {
      form.querySelector("[name='nombre']").focus();
      return avisarResena(form, "Escribe tu nombre como quieres que aparezca.", true);
    }
    if (texto.length < 15) {
      form.querySelector("[name='texto']").focus();
      return avisarResena(form, "Cuéntanos un poco más: al menos una frase.", true);
    }
    boton.disabled = true;
    avisarResena(form, "Enviando tu reseña…");
    const captcha = await tokenCaptcha(form);
    if (!captcha) {
      boton.disabled = false;
      return avisarResena(form, form.querySelector(".tp-resena__captcha iframe")
        ? "Marca la casilla de verificación y vuelve a enviar."
        : "No pudimos verificar el envío. Revisa tu conexión e inténtalo de nuevo.", true);
    }
    try {
      const respuesta = await fetch(new URL("/functions/v1/submit-review", config.url), {
        method: "POST",
        headers: { apikey: config.publishableKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          tabla: seccion.dataset.tpResena, nombre, estrellas, texto,
          publicationConsent: true, token: captcha,
        }),
      });
      const resultado = await respuesta.json().catch(() => ({}));
      if (resultado.nombreOcupado) {
        const campo = form.querySelector("[name='nombre']");
        campo.focus();
        campo.select();
        throw new Error(resultado.error);
      }
      /* 409 con "repetida": ya tenía una reseña de esta tabla; se le muestra igual */
      if (!respuesta.ok && !resultado.repetida) throw new Error(resultado.error || "No se pudo enviar la reseña.");
      const hecha = document.createElement("div");
      hecha.innerHTML = T.resenaHecha({ estrellas, estado: "pending" }, true);
      const tarjeta = hecha.firstElementChild;
      tarjeta.querySelectorAll(".tp-estrella").forEach((el, i) => el.style.setProperty("--n", i));
      const id = captchas.get(form)?.id;
      if (id != null) window.turnstile?.remove(id);
      captchas.delete(form);
      seccion.querySelector(".tp-resena__invita")?.remove();
      form.replaceWith(tarjeta);
      seccion.classList.add("is-hecha");
      seccion.removeAttribute("data-tp-resena");
    } catch (error) {
      const estado = captchas.get(form);
      if (estado) {
        estado.token = "";
        if (estado.id != null) window.turnstile?.reset(estado.id);
      }
      boton.disabled = false;
      avisarResena(form, error.message || "No se pudo enviar la reseña. Inténtalo de nuevo.", true);
    }
  }

  /* ---------- Datos de pago: copiar con un toque ---------- */
  async function copiar(boton) {
    const texto = boton.dataset.copiar;
    try {
      await navigator.clipboard.writeText(texto);
    } catch {
      /* Navegadores sin permiso al portapapeles: se copia a la antigua */
      const campo = Object.assign(document.createElement("textarea"), { value: texto });
      campo.setAttribute("readonly", "");
      campo.style.position = "fixed";
      campo.style.opacity = "0";
      document.body.append(campo);
      campo.select();
      try { document.execCommand("copy"); } catch { /* sin portapapeles */ }
      campo.remove();
    }
    const etiqueta = boton.querySelector("span");
    const antes = etiqueta.textContent;
    boton.classList.add("is-copiado");
    boton.querySelector("i").className = "ph ph-check";
    etiqueta.textContent = boton.dataset.copiado || "Copiado";
    clearTimeout(boton.reloj);
    boton.reloj = setTimeout(() => {
      boton.classList.remove("is-copiado");
      boton.querySelector("i").className = "ph ph-copy";
      etiqueta.textContent = antes;
    }, 2200);
  }

  /* ---------- "¿Mi perfume es original?" ----------
     La tarjeta crece desde su lugar hasta llenar la pantalla y ahí sigue el video, sin
     controles: tocarlo pausa o continúa, y una línea dorada marca el avance. Vertical en el
     teléfono, horizontal en computadora. Para que no haya jalones ni parpadeos:
       - el video se precarga en cuanto la clienta llega a la hoja de pago;
       - empieza a reproducirse en el mismo toque (también así se oye en el iPhone);
       - el marco crece cambiando su caja, no con escala, y el video nunca se estira;
       - debajo del video está su primer cuadro exacto, así no hay hueco mientras arranca.
     Se cierra con la x, con Esc o tocando fuera, y la tarjeta regresa a su lugar. */
  const esVertical = () => window.matchMedia("(max-width: 47.99rem), (orientation: portrait)").matches;
  const fuenteVideo = () => (esVertical()
    ? { src: VIDEO_ORIGINAL.vertical, inicio: VIDEO_ORIGINAL.inicioVertical, ancho: 9, alto: 16 }
    : { src: VIDEO_ORIGINAL.horizontal, inicio: VIDEO_ORIGINAL.inicioHorizontal, ancho: 16, alto: 9 });
  let videoListo = null;
  function precargarVideo() {
    const { src, inicio } = fuenteVideo();
    if (videoListo?.dataset.src === src) return videoListo;
    videoListo = Object.assign(document.createElement("video"), { preload: "auto", playsInline: true, src });
    videoListo.dataset.src = src;
    videoListo.setAttribute("playsinline", "");
    videoListo.load();
    new Image().src = inicio;
    return videoListo;
  }

  /* El lugar final del video: centrado, lo más grande que quepa con su forma */
  function cajaFinal({ ancho, alto }) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w = ancho < alto
      ? Math.min((vh * 0.88) * (ancho / alto), vw - 32)
      : Math.min(vw * 0.9, (vh - 96) * (ancho / alto), 1152);
    const h = w * (alto / ancho);
    return { left: (vw - w) / 2, top: (vh - h) / 2, width: w, height: h };
  }
  const comoCaja = (r) => ({ left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });

  function abrirVideoOriginal(tarjeta) {
    if (document.querySelector(".tq-video")) return;
    const fuente = fuenteVideo();
    const video = precargarVideo();
    videoListo = null;
    if (video.currentTime) video.currentTime = 0;
    const capa = document.createElement("div");
    capa.className = "tq-video";
    capa.setAttribute("role", "dialog");
    capa.setAttribute("aria-modal", "true");
    capa.setAttribute("aria-label", "Cómo saber si tu perfume es original");
    capa.innerHTML = `<div class="tq-video__fondo"></div>
      <div class="tq-video__marco" role="button" tabindex="0" aria-label="Pausar o seguir el video">
        <span class="tq-video__pausa" aria-hidden="true"><i class="ph-fill ph-play"></i></span>
        <span class="tq-video__avance" aria-hidden="true"><span></span></span>
      </div>
      <button class="tq-video__cerrar" type="button" aria-label="Cerrar el video"><i class="ph ph-x" aria-hidden="true"></i></button>`;
    const marco = capa.querySelector(".tq-video__marco");
    const fondo = capa.querySelector(".tq-video__fondo");
    const cerrarBoton = capa.querySelector(".tq-video__cerrar");
    const linea = capa.querySelector(".tq-video__avance");
    marco.style.backgroundImage = `url("${fuente.inicio}")`;
    marco.prepend(video);

    /* Arranca ya, en el toque; si el navegador no deja con sonido, arranca sin sonido */
    video.muted = false;
    video.play().catch(() => { video.muted = true; video.play().catch(() => {}); });

    const desde = tarjeta.getBoundingClientRect();
    const hasta = cajaFinal(fuente);
    Object.assign(marco.style, comoCaja(hasta));
    document.body.append(capa);
    document.body.classList.add("con-video");
    escena.inert = true;
    tarjeta.style.visibility = "hidden";

    const lento = reducido() ? 0 : 620;
    const curva = "cubic-bezier(0.22, 1, 0.36, 1)";
    marco.animate([comoCaja(desde), comoCaja(hasta)], { duration: lento, easing: curva });
    fondo.animate([{ opacity: 0 }, { opacity: 1 }], { duration: lento * 0.8, easing: "ease-out" });
    cerrarBoton.animate([{ opacity: 0, transform: "scale(0.8)" }, { opacity: 1, transform: "none" }], { duration: 280, delay: lento * 0.7, easing: curva, fill: "backwards" });
    cerrarBoton.focus({ preventScroll: true });

    /* La línea de avance sigue al video cuadro a cuadro (sin los saltos de "timeupdate") */
    let cuadro = 0;
    const avanzar = () => {
      if (video.duration) linea.style.setProperty("--avance", (video.currentTime / video.duration).toFixed(4));
      cuadro = requestAnimationFrame(avanzar);
    };
    cuadro = requestAnimationFrame(avanzar);
    const marcarPausa = () => capa.classList.toggle("is-pausado", video.paused);
    video.addEventListener("play", marcarPausa);
    video.addEventListener("pause", marcarPausa);
    const alternar = () => (video.paused || video.ended ? video.play().catch(() => {}) : video.pause());
    marco.addEventListener("click", alternar);
    marco.addEventListener("keydown", (evento) => {
      if (evento.key === " " || evento.key === "Enter") { evento.preventDefault(); alternar(); }
    });

    let cerrando = false;
    const teclas = (evento) => { if (evento.key === "Escape") cerrar(); };
    /* Si gira el teléfono o cambia la ventana, el video se reacomoda */
    const reacomodar = () => { if (!cerrando) Object.assign(marco.style, comoCaja(cajaFinal(fuente))); };
    function cerrar() {
      if (cerrando) return;
      cerrando = true;
      video.pause();
      cancelAnimationFrame(cuadro);
      const ahora = marco.getBoundingClientRect();
      const destino = tarjeta.getBoundingClientRect();
      const salida = reducido() ? 0 : 460;
      const suave = "cubic-bezier(0.65, 0, 0.35, 1)";
      cerrarBoton.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 140, fill: "forwards" });
      fondo.animate([{ opacity: 1 }, { opacity: 0 }], { duration: salida, easing: "ease-in", fill: "forwards" });
      linea.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120, fill: "forwards" });
      marco.animate([{ ...comoCaja(ahora), opacity: 1 }, { ...comoCaja(destino), opacity: 0.6 }], { duration: salida, easing: suave, fill: "forwards" })
        .finished.catch(() => {}).finally(() => {
          tarjeta.style.visibility = "";
          capa.remove();
          video.removeAttribute("src");
          video.load();
          document.body.classList.remove("con-video");
          escena.inert = false;
          document.removeEventListener("keydown", teclas);
          window.removeEventListener("resize", reacomodar);
          tarjeta.focus({ preventScroll: true });
        });
    }
    /* Cuando termina, se cierra solo y la tarjeta regresa */
    video.addEventListener("ended", () => setTimeout(cerrar, 500), { once: true });
    document.addEventListener("keydown", teclas);
    window.addEventListener("resize", reacomodar);
    cerrarBoton.addEventListener("click", cerrar);
    fondo.addEventListener("click", cerrar);
  }

  /* ---------- Tu cartera ----------
     Las tarjetas apiladas (pago, original y, si está prendida, sellos). Elegir una (tocándola
     o con su pestaña) la saca de la pila con un pequeño arco y la pone al frente; las demás
     se recorren hacia atrás conservando su orden. Al frente, la del video abre el video. */
  function iniciarCartera(hoja, { alElegir } = {}) {
    const cartera = hoja?.querySelector("[data-cartera]");
    if (!cartera) return;
    const pila = cartera.querySelector(".tw-pila");
    const cartas = [...pila.querySelectorAll("[data-carta]")];
    const pestanas = [...cartera.querySelectorAll("[data-pestana]")];
    pila.style.setProperty("--tw-n", cartas.length);
    let orden = cartas.map((c) => c.dataset.carta);
    const colocar = () => orden.forEach((clave, pos) => {
      const carta = cartas.find((c) => c.dataset.carta === clave);
      carta.dataset.pos = pos;
      carta.style.setProperty("--pos", pos);
    });
    colocar();

    function elegir(clave, { enfocar = false } = {}) {
      if (orden[0] === clave) return;
      const carta = cartas.find((c) => c.dataset.carta === clave);
      const antes = getComputedStyle(carta).transform;
      orden = [clave, ...orden.filter((c) => c !== clave)];
      colocar();
      /* Sale por arriba de la pila y baja al frente (las demás se recorren con su transición) */
      if (!reducido()) {
        carta.style.zIndex = "5";
        carta.animate([
          { transform: antes },
          { transform: "translateY(-58%) rotate(-4deg) scale(0.97)", offset: 0.42 },
          { transform: "translateY(0) scale(1)" },
        ], { duration: 720, easing: "cubic-bezier(0.22, 1, 0.36, 1)" });
        setTimeout(() => { carta.style.zIndex = ""; }, 300);
      }
      pestanas.forEach((p) => {
        const activa = p.dataset.pestana === clave;
        p.setAttribute("aria-selected", String(activa));
        p.tabIndex = activa ? 0 : -1;
        if (activa && enfocar) p.focus();
      });
      cartera.querySelectorAll("[data-panel]").forEach((panel) => { panel.hidden = panel.dataset.panel !== clave; });
      if (clave === "original") precargarVideo();
      alElegir?.(clave);
    }

    cartas.forEach((carta) => carta.addEventListener("click", () => {
      if (carta.dataset.pos !== "0") elegir(carta.dataset.carta);
      else if (carta.dataset.carta === "original") abrirVideoOriginal(carta);
    }));
    pestanas.forEach((p, i) => {
      p.addEventListener("click", () => elegir(p.dataset.pestana));
      p.addEventListener("keydown", (evento) => {
        const paso = { ArrowRight: 1, ArrowLeft: -1 }[evento.key];
        if (!paso) return;
        evento.preventDefault();
        evento.stopPropagation();
        elegir(pestanas[(i + paso + pestanas.length) % pestanas.length].dataset.pestana, { enfocar: true });
      });
    });
  }

  /* Un solo juego de eventos para todas las hojas (cada perfume tiene su reseña) */
  function iniciarResenas() {
    escena.addEventListener("click", (evento) => {
      const boton = evento.target.closest("[data-copiar]");
      if (boton) copiar(boton);
      const original = evento.target.closest("[data-video-original]");
      if (original) abrirVideoOriginal(original.closest(".tp-hoja")?.querySelector(".tw-carta--original") || original);
    });
    /* Por si llega a la tarjeta sin pasar por la hoja: se precarga al acercarse */
    escena.addEventListener("pointerover", (evento) => {
      if (evento.target.closest("[data-video-original]")) precargarVideo();
    });
    escena.addEventListener("touchstart", (evento) => {
      if (evento.target.closest("[data-video-original]")) precargarVideo();
    }, { passive: true });
    escena.querySelectorAll(".tp-resena__resto").forEach((resto) => { resto.inert = true; });
    escena.addEventListener("change", (evento) => {
      const estrella = evento.target.closest(".tp-estrellas__op input");
      if (!estrella) return;
      const form = estrella.form;
      const op = estrella.closest(".tp-estrellas__op");
      op.classList.remove("is-pulsa");
      void op.offsetWidth;
      op.classList.add("is-pulsa");
      destellar(op);
      abrirResena(form, Number(estrella.value));
      avisarResena(form, "");
    });
    /* Con mouse: al pasar por las estrellas se asoman las que quedarían llenas */
    escena.addEventListener("pointerover", (evento) => {
      if (evento.pointerType !== "mouse") return;
      const op = evento.target.closest(".tp-estrellas__op");
      if (!op) return;
      const ops = [...op.parentElement.children];
      marcarEstrellas(op.closest("form"), ops.indexOf(op) + 1, "is-asoma");
    });
    escena.addEventListener("pointerout", (evento) => {
      const fila = evento.target.closest(".tp-estrellas__fila");
      if (fila && !fila.contains(evento.relatedTarget)) marcarEstrellas(fila.closest("form"), 0, "is-asoma");
    });
    escena.addEventListener("submit", (evento) => {
      const form = evento.target.closest(".tp-resena__form");
      if (!form) return;
      evento.preventDefault();
      enviarResena(form);
    });
  }

  /* Varias tablas: arriba un índice y abajo una hoja por perfume. Cada perfume del índice lleva
     su número, su nombre, lo que falta (o "Pagado") y una línea dorada que se llena con lo
     pagado. El índice también da avisos cortos ("Sauvage pagado · Sigue Good Girl") en el mismo
     lugar, sin tapar la tabla. */
  function carruselHTML(grupo, inicial, conTarjeta) {
    const hojas = grupo.map((plan, i) => `<div class="tp-hoja" role="group" aria-roledescription="perfume" aria-label="${i + 1} de ${grupo.length}: ${T.escapar(nombreDe(plan))}">${T.pintar(plan, opcionesDe(plan))}</div>`).join("");
    const botones = grupo.map((plan, i) => {
      const e = T.calcular(plan);
      const avance = e.total > 0 ? Math.min(1, e.abonado / e.total) : 0;
      const estado = e.liquidado ? "Pagado" : `Faltan ${T.dinero(e.pendiente)}`;
      return `<button class="tp-frascos__boton${e.liquidado ? " is-pagado" : ""}" type="button" data-hoja="${i + 1}" data-avance="${avance.toFixed(3)}" aria-label="${T.escapar(`${nombreDe(plan)}, ${estado.toLowerCase()}`)}">`
        + `<span class="tp-frascos__num" aria-hidden="true">${String(i + 1).padStart(2, "0")}</span>`
        + `<span class="tp-frascos__texto" aria-hidden="true"><b>${T.escapar(cortoDe(plan))}</b><small>${e.liquidado ? '<i class="ph ph-check" aria-hidden="true"></i>' : ""}${T.escapar(estado)}</small></span>`
        + '<span class="tp-frascos__barra" aria-hidden="true"></span></button>';
    }).join("");
    /* A la izquierda de las tablas (deslizando hacia la derecha), una sola hoja con los datos de
       pago, "¿mi perfume es original?" y, si está prendida en el panel, la tarjeta de fidelidad.
       Es la hoja 0: los perfumes van de la 1 en adelante. */
    const f = T.cuentaFidelidad(grupo, tarjeta.extra);
    const hojaPago = `<div class="tp-hoja tp-hoja--pago" role="group" aria-roledescription="hoja" aria-label="Datos de pago${conTarjeta ? " y tarjeta de fidelidad" : ""}">${T.datosPago(grupo, {
      ...DATOS_PAGO,
      poster: VIDEO_ORIGINAL.tarjeta,
      fidelidad: conTarjeta ? { planes: grupo, opciones: opcionesFidelidad(grupo), extra: tarjeta.extra } : null,
    })}</div>`;
    const resumen = conTarjeta ? `CLABE · ${f.selladosAqui}/${T.SELLOS} sellos` : "CLABE y garantía";
    const botonPago = `<button class="tp-frascos__boton tp-frascos__boton--pago" type="button" data-hoja="0" data-avance="${conTarjeta ? (f.selladosAqui / T.SELLOS).toFixed(3) : "0"}" aria-label="Datos de pago${conTarjeta ? `, tarjeta de fidelidad con ${f.selladosAqui} de ${T.SELLOS} sellos` : ""}">`
      + '<span class="tp-frascos__num" aria-hidden="true"><i class="ph ph-credit-card"></i></span>'
      + `<span class="tp-frascos__texto" aria-hidden="true"><b>Pagar</b><small>${resumen}</small></span>`
      + '<span class="tp-frascos__barra" aria-hidden="true"></span></button>';
    /* De cuatro en adelante, el índice va compacto (ver .tp-frascos--compacto) */
    return `<nav class="tp-frascos${grupo.length + 1 > 3 ? " tp-frascos--compacto" : ""}" aria-label="Elige tus datos de pago o un perfume">
        <div class="tp-frascos__lista">${botonPago}${botones}</div>
        <p class="tp-frascos__aviso" aria-hidden="true"><i class="ph ph-check" aria-hidden="true"></i><span></span></p>
      </nav>
      ${T.cabecera(T.calcular(grupo[inicial]).liquidado ? "liquidado" : "en-curso")}
      <div class="tp-carrusel" role="region" aria-roledescription="carrusel" aria-label="Tus perfumes y tus datos de pago"><div class="tp-carrusel__pista">${hojaPago}${hojas}</div></div>
      <p class="tp-oculto" aria-live="polite" data-tp-anuncio></p>`;
  }

  /* ---------- Varios perfumes: la clienta desliza de lado ----------
     La pista se mueve con transform (no es una caja con scroll): la página baja con su scroll de
     siempre y el parallax y las animaciones al llegar funcionan igual. El dedo o el mouse la
     arrastran; al soltar pasa al perfume de al lado si se arrastró lo suficiente o rápido.
     También con el trackpad, las flechas del teclado y los frascos de arriba. El alto de la
     página es el del perfume que se ve. */
  function carrusel(raiz, { inicial = 0, alCambiar } = {}) {
    const pista = raiz.querySelector(".tp-carrusel__pista");
    const hojas = [...pista.children];
    const ultima = hojas.length - 1;
    const t = (x) => `translate3d(${x}px, 0, 0)`;
    let actual = inicial;
    let movimiento = null;
    let arrastre = null;
    let soltado = -Infinity;

    const paso = () => pista.offsetWidth + (parseFloat(getComputedStyle(pista).columnGap) || 0);
    const lugar = (i) => -i * paso();
    const colocar = (x) => { pista.style.transform = t(x); };
    const posicion = () => {
      const matriz = getComputedStyle(pista).transform;
      return matriz && matriz !== "none" ? new DOMMatrixReadOnly(matriz).m41 : 0;
    };
    /* El alto también va en --tp-carrusel-alto: las hojas de los lados se recortan a él */
    const fijarAlto = (px) => {
      raiz.style.height = `${px}px`;
      raiz.style.setProperty("--tp-carrusel-alto", `${px}px`);
    };
    const ajustarAlto = () => fijarAlto(hojas[actual].offsetHeight);
    const detener = () => {
      if (!movimiento) return;
      const x = posicion();
      movimiento.cancel();
      movimiento = null;
      colocar(x);
    };
    const mover = (desde, hasta, duracion, fotogramas) => {
      const animacion = pista.animate(fotogramas || [{ transform: t(desde) }, { transform: t(hasta) }], { duration: duracion, easing: fotogramas ? "linear" : "cubic-bezier(0.22, 1, 0.36, 1)" });
      movimiento = animacion;
      animacion.finished.then(() => {
        if (movimiento !== animacion) return;
        movimiento = null;
        ajustarAlto();
      }).catch(() => {});
    };

    function ir(destino, { rapido = false } = {}) {
      destino = Math.max(0, Math.min(ultima, destino));
      detener();
      const desde = posicion();
      const hasta = lugar(destino);
      const antes = actual;
      actual = destino;
      hojas.forEach((hoja, i) => { hoja.inert = i !== destino; });
      /* Si el perfume nuevo es más alto, la página crece desde ya; si es más corto, se encoge al
         terminar el paso, y si la clienta estaba más abajo de donde termina, la página sube */
      const nuevo = hojas[destino].offsetHeight;
      const sobra = raiz.offsetHeight - nuevo;
      if (sobra < 0) fijarAlto(nuevo);
      else if (sobra > 0) {
        const tope = document.documentElement.scrollHeight - sobra - window.innerHeight;
        if (window.scrollY > tope) window.scrollTo({ top: Math.max(0, tope), behavior: reducido() ? "auto" : "smooth" });
      }
      if (destino !== antes) alCambiar?.(destino, antes);
      colocar(hasta);
      const distancia = Math.abs(hasta - desde);
      if (distancia < 1 || reducido()) { ajustarAlto(); return; }
      mover(desde, hasta, Math.round((rapido ? 300 : 420) + Math.min(1, distancia / paso()) * 160));
    }

    /* Arrastre: decide en los primeros 8 px si es de lado (carrusel) o hacia abajo (la página) */
    raiz.addEventListener("pointerdown", (evento) => {
      if (!evento.isPrimary || evento.button !== 0) return;
      /* Escribiendo la reseña (o eligiendo texto) no se cambia de perfume */
      if (evento.target.closest("input, textarea, label, .tp-resena__captcha")) return;
      arrastre = { id: evento.pointerId, x0: evento.clientX, y0: evento.clientY, lado: false, desde: 0, muestras: [[evento.timeStamp, evento.clientX]] };
    });
    raiz.addEventListener("pointermove", (evento) => {
      const a = arrastre;
      if (!a || evento.pointerId !== a.id) return;
      const dx = evento.clientX - a.x0;
      if (!a.lado) {
        const dy = evento.clientY - a.y0;
        if (Math.hypot(dx, dy) < 8) return;
        if (Math.abs(dx) <= Math.abs(dy)) { arrastre = null; return; }
        a.lado = true;
        detener();
        a.desde = posicion() - dx;
        raiz.setPointerCapture(evento.pointerId);
        raiz.classList.add("is-arrastrando");
        window.getSelection()?.removeAllRanges();
      }
      /* En el primer y el último perfume cuesta más jalar hacia fuera */
      let x = a.desde + dx;
      const fin = lugar(ultima);
      if (x > 0) x /= 3;
      else if (x < fin) x = fin + (x - fin) / 3;
      colocar(x);
      a.muestras.push([evento.timeStamp, evento.clientX]);
      if (a.muestras.length > 5) a.muestras.shift();
    });
    const soltar = (evento) => {
      const a = arrastre;
      if (!a || evento.pointerId !== a.id) return;
      arrastre = null;
      if (!a.lado) return;
      soltado = performance.now();
      raiz.classList.remove("is-arrastrando");
      const [[t0, x0], [t1, x1]] = [a.muestras[0], a.muestras.at(-1)];
      const velocidad = t1 > t0 ? (x1 - x0) / (t1 - t0) : 0;
      const avance = -posicion() / paso();
      let destino = Math.round(avance);
      if (Math.abs(velocidad) > 0.35) destino = velocidad < 0 ? Math.floor(avance) + 1 : Math.ceil(avance) - 1;
      ir(Math.max(actual - 1, Math.min(actual + 1, destino)), { rapido: Math.abs(velocidad) > 0.35 });
    };
    raiz.addEventListener("pointerup", soltar);
    raiz.addEventListener("pointercancel", soltar);
    /* Un arrastre no abre el enlace ni el botón donde empezó */
    raiz.addEventListener("click", (evento) => {
      if (performance.now() - soltado < 400) { evento.preventDefault(); evento.stopPropagation(); }
    }, true);
    raiz.addEventListener("dragstart", (evento) => evento.preventDefault());

    /* Trackpad: un deslizamiento de lado pasa un perfume (y no regresa a la página anterior) */
    let rueda = 0;
    let ruedaPausa = 0;
    let ruedaUsada = false;
    window.addEventListener("wheel", (evento) => {
      if (Math.abs(evento.deltaX) <= Math.abs(evento.deltaY)) return;
      evento.preventDefault();
      clearTimeout(ruedaPausa);
      ruedaPausa = setTimeout(() => { rueda = 0; ruedaUsada = false; }, 220);
      if (ruedaUsada) return;
      rueda += evento.deltaX;
      if (Math.abs(rueda) > 40) {
        ruedaUsada = true;
        ir(actual + Math.sign(rueda), { rapido: true });
      }
    }, { passive: false });
    window.addEventListener("keydown", (evento) => {
      if (evento.altKey || evento.ctrlKey || evento.metaKey || evento.target.closest?.("input, textarea, select")) return;
      if (evento.key === "ArrowLeft") ir(actual - 1);
      if (evento.key === "ArrowRight") ir(actual + 1);
    });

    /* Si cambia el ancho (giro del teléfono) la pista se recoloca; si cambia el alto del perfume
       que se ve (fotos o letras que terminan de cargar), la página se ajusta */
    let ancho = raiz.offsetWidth;
    const observador = new ResizeObserver(() => {
      if (raiz.offsetWidth !== ancho) {
        ancho = raiz.offsetWidth;
        if (!arrastre?.lado) { detener(); colocar(lugar(actual)); }
      }
      if (!movimiento && !arrastre?.lado) ajustarAlto();
    });
    observador.observe(raiz);
    hojas.forEach((hoja) => observador.observe(hoja));

    hojas.forEach((hoja, i) => { hoja.inert = i !== actual; });
    colocar(lugar(actual));
    ajustarAlto();

    return {
      ir,
      get actual() { return actual; },
      /* La primera vez, la pista hace el gesto de deslizarse hacia el otro perfume para enseñar
         que se puede. Devuelve hacia cuál (o -1 si no se movió). */
      asomar() {
        if (arrastre || movimiento || reducido()) return -1;
        const x = lugar(actual);
        const lado = actual < ultima ? -1 : 1;
        mover(x, x, 1300, [
          { transform: t(x), easing: "cubic-bezier(0.3, 0, 0.2, 1)" },
          { transform: t(x + lado * 64), offset: 0.38, easing: "cubic-bezier(0.4, 0, 0.1, 1)" },
          { transform: t(x) },
        ]);
        return actual - lado;
      },
    };
  }

  /* La tabla del enlace y, si la clienta tiene más, las demás de su grupo (del panel).
     Orden: primero los perfumes que sigue pagando y al final los liquidados. El principal (el
     que se ve al abrir) es el primero en curso, con cualquiera de sus enlaces. Si un perfume se
     acaba de liquidar y todavía no lo ha visto, la página abre en él con su celebración y
     después pasa sola al principal. */
  function mostrarTablas(datos) {
    const recibidas = (Array.isArray(datos.grupo) && datos.grupo.length ? datos.grupo : [datos]).filter((plan) => plan && Array.isArray(plan.installments));
    if (!recibidas.length) recibidas.push(datos);
    const pagada = (plan) => T.calcular(plan).liquidado;
    /* En curso, de la más antigua a la más nueva (como en el panel), si la tabla trae su fecha */
    const antiguedad = (a, b) => String(a.created_at || "").localeCompare(String(b.created_at || ""));
    const grupo = [...recibidas.filter((plan) => !pagada(plan)).sort(antiguedad), ...recibidas.filter(pagada)];
    const varias = grupo.length > 1;
    const enCurso = grupo.findIndex((plan) => !pagada(plan));
    const delEnlace = Math.max(0, grupo.findIndex((plan) => plan.token === token));
    const principal = enCurso >= 0 ? enCurso : delEnlace;
    /* Recién liquidado: pagado y con abonos que no ha visto (o nunca había abierto su tabla) */
    const recien = varias && enCurso >= 0
      ? grupo.findIndex((plan) => pagada(plan) && vistas[plan.token || token] !== firmaDe(plan))
      : -1;
    const celebra = recien >= 0 && !reducido();
    const inicial = celebra ? recien : principal;
    /* Carrusel con varios perfumes o con la tarjeta de fidelidad prendida (aunque tenga un solo
       perfume, a su izquierda queda su tarjeta). Ahí el logo y el título viven en el encabezado
       fijo, fuera de las hojas. Con un perfume y sin tarjeta, la tabla va sola. */
    /* Siempre hay carrusel: junto a las tablas van los datos de pago */
    const enCarrusel = true;
    escena.classList.toggle("tp-escena--varias", enCarrusel);
    escena.innerHTML = carruselHTML(grupo, inicial, tarjeta.activa);
    iniciarResenas();
    const cabecera = escena.querySelector(".tp--cabecera");
    const tablas = [...escena.querySelectorAll(".tp:not(.tp--cabecera):not(.tp--fidelidad):not(.tp--pago)")];
    const verTarjeta = iniciarFidelidad(escena.querySelector(".tp-hoja--pago"));
    iniciarCartera(escena.querySelector(".tp-hoja--pago"), { alElegir: (clave) => { if (clave === "sellos") setTimeout(verTarjeta, 350); } });
    /* La hoja 0 es la de pago: la de cada perfume es su lugar en el grupo + 1 */
    const HOJA = (k) => k + 1;
    const descargas = tablas.map((tabla, i) => prepararDescarga(tabla, grupo[i]));
    const cliente = grupo[inicial].client_name;
    document.title = `${varias ? "Tablas" : "Tabla"} de pagos de ${cliente} | Sensorial Boutique`;
    document.body.dataset.tono = tonoDe(grupo[inicial]);

    /* Primera vez o abono nuevo en cualquiera de sus tablas: apertura y entrada completas. Si
       no, todo aparece listo. */
    const conAnimacion = grupo.some((plan) => vistas[plan.token || token] !== firmaDe(plan));
    if (conAnimacion) apertura ??= T.intro(telon);
    else if (apertura) { apertura.cancelar(); apertura = null; }

    let pasar = null;
    let avisar = () => {};
    /* Si la clienta toca, arrastra o cambia de perfume, la página ya no se mueve sola */
    let tomoElControl = false;
    let pasoAutomatico = false;
    if (enCarrusel) {
      const frascos = escena.querySelector(".tp-frascos");
      const botones = [...frascos.querySelectorAll("[data-hoja]")];
      /* Lo pagado de cada perfume llena su línea. Se pone desde aquí y no con style="" en el
         HTML: la política de seguridad de pagos.html (CSP) ignora los estilos escritos en línea */
      botones.forEach((boton) => boton.style.setProperty("--avance", boton.dataset.avance));
      const lista = frascos.querySelector(".tp-frascos__lista");
      const anuncio = escena.querySelector("[data-tp-anuncio]");
      const marcar = (i) => {
        botones.forEach((boton, k) => boton.setAttribute("aria-current", String(k === i)));
        if (lista.scrollWidth > lista.clientWidth) {
          lista.scrollTo({ left: botones[i].offsetLeft - (lista.clientWidth - botones[i].offsetWidth) / 2, behavior: "smooth" });
        }
      };
      /* Aviso corto dentro de la misma pastilla: los frascos se desvanecen y aparece el texto */
      let relojAviso = 0;
      avisar = (mensaje, duracion = 2800) => {
        frascos.querySelector(".tp-frascos__aviso span").textContent = mensaje;
        anuncio.textContent = mensaje;
        frascos.classList.add("is-avisa");
        clearTimeout(relojAviso);
        relojAviso = setTimeout(() => frascos.classList.remove("is-avisa"), duracion);
      };
      pasar = carrusel(escena.querySelector(".tp-carrusel"), {
        inicial: HOJA(inicial),
        alCambiar(i) {
          if (!pasoAutomatico) tomoElControl = true;
          marcar(i);
          /* El título fijo cambia con un desvanecido: "Tabla de Pagos", "Pago completo", "Datos
             de Pago" o "Tarjeta de Fidelidad" */
          const esPago = i === 0;
          const k = i - 1;
          const estado = esPago ? "pago" : T.calcular(grupo[k]).liquidado ? "liquidado" : "en-curso";
          cabecera.dataset.estado = estado;
          cabecera.querySelectorAll("[data-titulo]").forEach((t) => t.toggleAttribute("aria-hidden", t.dataset.titulo !== estado));
          document.body.dataset.tono = esPago ? "dorado" : tonoDe(grupo[k]);
          if (esPago) {
            precargarVideo();
            if (!frascos.classList.contains("is-avisa")) anuncio.textContent = "Tu cartera: datos de pago, garantía" + (tarjeta.activa ? " y tarjeta de fidelidad" : "");
            return;
          }
          if (!frascos.classList.contains("is-avisa")) anuncio.textContent = `Perfume ${k + 1} de ${grupo.length}: ${nombreDe(grupo[k])}`;
          setTimeout(descargas[k], 1500);
        },
      });
      marcar(HOJA(inicial));
      botones.forEach((boton, i) => boton.addEventListener("click", () => pasar.ir(i)));
      escena.addEventListener("pointerdown", () => { tomoElControl = true; }, { once: true });
      /* Los otros perfumes ya tienen lista la parte de arriba; su saldo y su tarjeta se animan
         cuando la clienta llega a ellos. Con celebración, el principal se guarda su entrada
         completa para cuando la página pase a él. */
      tablas.forEach((tabla, i) => {
        if (i !== inicial && !(celebra && i === principal)) T.montar(tabla, { entrada: conAnimacion, inicio: -4000 });
      });
      if (conAnimacion) frascos.classList.add("tp-frascos--espera");
    }

    const tabla = tablas[inicial];
    abrir(() => (cabecera || tabla).querySelector(".tp-cabeza .tp-logo"), () => {
      if (cabecera) T.montar(cabecera, { entrada: conAnimacion, inicio: 450, recibe: conAnimacion });
      T.montar(tabla, { entrada: conAnimacion, inicio: 450, recibe: conAnimacion && !cabecera });
      if (enCarrusel && conAnimacion) escena.querySelector(".tp-frascos").classList.replace("tp-frascos--espera", "tp-frascos--entra");
      if (celebra) {
        /* El sello se estampa y saltan las chispas (cerca de 3.5 s); entonces la pastilla avisa
           y la página pasa sola al perfume que sigue, que entra con su animación */
        setTimeout(() => {
          if (tomoElControl) {
            T.montar(tablas[principal], { entrada: true, inicio: -4000 });
            return;
          }
          avisar(`${cortoDe(grupo[recien])} pagado · Sigue ${cortoDe(grupo[principal])}`, 3200);
          setTimeout(() => {
            if (tomoElControl) {
              T.montar(tablas[principal], { entrada: true, inicio: -4000 });
              return;
            }
            T.montar(tablas[principal], { entrada: true, inicio: 350 });
            pasoAutomatico = true;
            pasar.ir(HOJA(principal));
            pasoAutomatico = false;
            window.scrollTo({ top: 0, behavior: "smooth" });
          }, 1100);
        }, 3700);
      } else if (recien >= 0) {
        /* Movimiento reducido: sin celebración, solo el aviso sobre el perfume principal */
        avisar(`${cortoDe(grupo[recien])} pagado · Sigue ${cortoDe(grupo[principal])}`, 4500);
      } else if (enCarrusel && conAnimacion) {
        /* Y el perfume de junto (o la tarjeta de fidelidad), en la pastilla, destella una vez */
        setTimeout(() => {
          if (tomoElControl) return;
          const otro = pasar.asomar();
          const boton = escena.querySelector(`.tp-frascos__boton[data-hoja="${otro}"]`);
          if (!boton) return;
          boton.classList.add("is-llama");
          boton.addEventListener("animationend", () => boton.classList.remove("is-llama"), { once: true });
        }, 3400);
      }
    });
    grupo.forEach((plan) => recordar(plan));
    setTimeout(descargas[inicial], 3500);
  }

  function mostrarAviso(motivo) {
    const avisos = {
      "sin-token": ["Falta el enlace de tu tabla", "Abre el enlace completo que te enviamos por WhatsApp o pídenos uno nuevo."],
      "no-encontrada": ["No encontramos esta tabla", "Puede que el enlace esté incompleto o que la tabla ya no esté disponible. Escríbenos y te ayudamos."],
      error: ["No pudimos cargar tu tabla", "Revisa tu conexión y vuelve a intentarlo."],
    };
    const [titulo, texto] = avisos[motivo] || avisos.error;
    const accion = motivo === "error"
      ? '<button class="tp-contacto" type="button" data-reintentar>Intentar de nuevo</button>'
      : `<a class="tp-contacto" href="${T.escapar(whatsapp("Hola, necesito el enlace de mi tabla de pagos."))}" target="_blank" rel="noopener"><i class="ph ph-whatsapp-logo" aria-hidden="true"></i>Escribir a Sensorial</a>`;
    escena.innerHTML = `<div class="tp-aviso" role="alert">${T.logo()}<h1>${titulo}</h1><p>${texto}</p>${accion}</div>`;
    escena.querySelector("[data-reintentar]")?.addEventListener("click", () => location.reload());
    abrir(() => escena.querySelector(".tp-logo"));
  }

  (async () => {
    try {
      const datos = await cargar();
      [resenas, tarjeta] = await Promise.all([
        cargarResenas(datos),
        cargarTarjeta(datos),
        precargar([T.imagen(datos.image_url), T.imagen(datos.watermark_image_url)]),
      ]);
      mostrarTablas(datos);
    } catch (error) {
      const motivo = ["sin-token", "no-encontrada"].includes(error.message) ? error.message : "error";
      if (motivo === "error") console.warn(error);
      mostrarAviso(motivo);
    }
  })();

  window.addEventListener("hashchange", () => location.reload());
})();
