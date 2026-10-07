/* Página que ve el cliente: pagos.html#TOKEN.
   La primera vez que la abre (y otra vez cada que hay un abono nuevo), el logo se arma sobre el
   telón; cuando su tabla de Supabase está lista (solo esa, con su token), el logo viaja a su
   lugar, el telón se abre y la tabla entra sobre el fondo de hilos dorados. Lo de abajo se anima
   cuando el cliente llega a verlo. Si no hay abonos nuevos, la tabla aparece lista. */
(() => {
  "use strict";

  const WHATSAPP = "527445424972"; // el mismo número que CONFIG.whatsapp en app.js
  const T = window.TablaPagos;
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
    vistas[token] = firmaDe(datos);
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

  /* El logo de la apertura viaja al de la página; justo entonces empieza la entrada. Sin
     apertura (visitas siguientes), los hilos aparecen ya trazados. */
  function abrir(alAbrir) {
    escena.removeAttribute("aria-busy");
    if (!apertura) {
      telon.hidden = true;
      hilos.empezar(0, { trazar: false });
      alAbrir?.();
      return;
    }
    apertura.entregar(() => escena.querySelector(".tp-logo"), () => {
      hilos.empezar(0);
      alAbrir?.();
    });
  }

  /* Botón Descargar: la imagen se prepara de antemano para que el menú de compartir del
     teléfono abra al instante */
  function prepararDescarga(datos) {
    const boton = escena.querySelector("[data-tp-descargar]");
    if (!boton) return;
    let listo = null;
    const preparar = () => {
      listo ??= T.archivo(datos).catch((error) => { listo = null; throw error; });
      return listo;
    };
    setTimeout(() => preparar().catch(() => {}), 3500);
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
  }

  function mostrarTabla(datos) {
    const perfume = [datos.brand, datos.product_name].filter(Boolean).join(" ");
    /* En curso: WhatsApp para dudas y Descargar. Liquidada: WhatsApp para pedir otro perfume */
    escena.innerHTML = T.pintar(datos, {
      contacto: whatsapp(`Hola, soy ${datos.client_name}. Tengo una pregunta sobre mi tabla de pagos de ${perfume}.`),
      descargar: true,
      siguiente: whatsapp(`Hola, soy ${datos.client_name}. Ya terminé de pagar mi ${perfume}. Me gustaría elegir mi siguiente perfume.`),
    });
    const tabla = escena.querySelector(".tp");
    document.body.dataset.tono = tabla.dataset.tono;
    document.title = `Tabla de pagos de ${datos.client_name} | Sensorial Boutique`;
    /* Primera vez o abono nuevo: apertura y entrada completas. Si no, la tabla ya lista. */
    const conAnimacion = vistas[token] !== firmaDe(datos);
    if (conAnimacion) apertura ??= T.intro(telon);
    else if (apertura) { apertura.cancelar(); apertura = null; }
    abrir(() => T.montar(tabla, { entrada: conAnimacion, inicio: 450, recibe: conAnimacion }));
    recordar(datos);
    prepararDescarga(datos);
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
    abrir();
  }

  (async () => {
    try {
      const datos = await cargar();
      await precargar([T.imagen(datos.image_url), T.imagen(datos.watermark_image_url)]);
      mostrarTabla(datos);
    } catch (error) {
      const motivo = ["sin-token", "no-encontrada"].includes(error.message) ? error.message : "error";
      if (motivo === "error") console.warn(error);
      mostrarAviso(motivo);
    }
  })();

  window.addEventListener("hashchange", () => location.reload());
})();
