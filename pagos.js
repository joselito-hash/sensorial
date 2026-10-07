/* Página que ve el cliente: pagos.html#TOKEN.
   La primera vez, mientras lee su tabla de Supabase (solo esa, con su token), el logo se arma
   sobre el telón; cuando todo está listo, el logo viaja a su lugar, el telón se abre y la tabla
   entra sobre el fondo de hilos dorados. Lo de abajo se anima cuando el cliente llega a verlo.
   Al volver a abrirla, la tabla aparece lista, sin animación de entrada. */
(() => {
  "use strict";

  const WHATSAPP = "527445424972"; // el mismo número que CONFIG.whatsapp en app.js
  const T = window.TablaPagos;
  const config = window.SENSORIAL_SUPABASE || {};
  const escena = document.querySelector("#tabla");
  const hilos = T.fondo(document.querySelector(".tp-fondo__hilos"));
  const token = leerToken();
  /* La animación sale una sola vez por tabla en este dispositivo. Se recuerda en qué estado se
     vio: si después queda liquidada, la celebración del sello sí se ve, también una sola vez. */
  const CLAVE = "sb-tablas-vistas";
  const vistas = (() => {
    try { return JSON.parse(localStorage.getItem(CLAVE) || "{}") || {}; } catch { return {}; }
  })();
  const primeraVez = Boolean(token) && !vistas[token];
  const telon = document.querySelector(".tp-telon");
  const apertura = primeraVez ? T.intro(telon) : null;
  if (!apertura) telon.hidden = true;
  T.parallax(document.documentElement, { hilos });

  function recordar(estado) {
    if (!token) return;
    vistas[token] = [...new Set([...(vistas[token] || []), estado])];
    try { localStorage.setItem(CLAVE, JSON.stringify(vistas)); } catch { /* sin almacenamiento: se verá otra vez */ }
  }

  function leerToken() {
    let crudo = location.hash.replace(/^#/, "") || new URLSearchParams(location.search).get("t") || "";
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
    const mensaje = T.calcular(datos).liquidado
      ? `Hola, soy ${datos.client_name}. Ya liquidé mi ${perfume}. ¿Cuándo me lo pueden entregar?`
      : `Hola, soy ${datos.client_name}. Tengo una pregunta sobre mi tabla de pagos de ${perfume}.`;
    escena.innerHTML = T.pintar(datos, { contacto: whatsapp(mensaje), descargar: true });
    const tabla = escena.querySelector(".tp");
    const estado = tabla.dataset.estado;
    document.body.dataset.tono = tabla.dataset.tono;
    document.title = `Tabla de pagos de ${datos.client_name} | Sensorial Boutique`;
    /* Primera vez: apertura y entrada completas. Recién liquidada: solo la entrada (sello y
       chispas). Visitas siguientes: la tabla ya lista. */
    const entrada = primeraVez || !(vistas[token] || []).includes(estado);
    abrir(() => T.montar(tabla, { entrada, inicio: apertura ? 450 : 100, recibe: Boolean(apertura) }));
    recordar(estado);
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
