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

  const WHATSAPP = "527445424972"; // el mismo número que CONFIG.whatsapp en app.js
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

  /* En curso: WhatsApp para dudas y Descargar. Liquidada: WhatsApp para pedir otro perfume */
  const opcionesDe = (plan) => ({
    contacto: whatsapp(`Hola, soy ${plan.client_name}. Tengo una pregunta sobre mi tabla de pagos de ${nombreDe(plan)}.`),
    descargar: true,
    siguiente: whatsapp(`Hola, soy ${plan.client_name}. Ya terminé de pagar mi ${nombreDe(plan)}. Me gustaría elegir mi siguiente perfume.`),
  });

  /* Varias tablas: arriba un índice y abajo una hoja por perfume. Cada perfume del índice lleva
     su número, su nombre, lo que falta (o "Pagado") y una línea dorada que se llena con lo
     pagado. El índice también da avisos cortos ("Sauvage pagado · Sigue Good Girl") en el mismo
     lugar, sin tapar la tabla. */
  function carruselHTML(grupo, inicial) {
    const hojas = grupo.map((plan, i) => `<div class="tp-hoja" role="group" aria-roledescription="perfume" aria-label="${i + 1} de ${grupo.length}: ${T.escapar(nombreDe(plan))}">${T.pintar(plan, opcionesDe(plan))}</div>`).join("");
    const botones = grupo.map((plan, i) => {
      const e = T.calcular(plan);
      const avance = e.total > 0 ? Math.min(1, e.abonado / e.total) : 0;
      const estado = e.liquidado ? "Pagado" : `Faltan ${T.dinero(e.pendiente)}`;
      return `<button class="tp-frascos__boton${e.liquidado ? " is-pagado" : ""}" type="button" data-hoja="${i}" data-avance="${avance.toFixed(3)}" aria-label="${T.escapar(`${nombreDe(plan)}, ${estado.toLowerCase()}`)}">`
        + `<span class="tp-frascos__num" aria-hidden="true">${String(i + 1).padStart(2, "0")}</span>`
        + `<span class="tp-frascos__texto" aria-hidden="true"><b>${T.escapar(cortoDe(plan))}</b><small>${e.liquidado ? '<i class="ph ph-check" aria-hidden="true"></i>' : ""}${T.escapar(estado)}</small></span>`
        + '<span class="tp-frascos__barra" aria-hidden="true"></span></button>';
    }).join("");
    return `<nav class="tp-frascos" aria-label="Elige un perfume">
        <div class="tp-frascos__lista">${botones}</div>
        <p class="tp-frascos__aviso" aria-hidden="true"><i class="ph ph-check" aria-hidden="true"></i><span></span></p>
      </nav>
      ${T.cabecera(T.calcular(grupo[inicial]).liquidado ? "liquidado" : "en-curso")}
      <div class="tp-carrusel" role="region" aria-roledescription="carrusel" aria-label="Tus perfumes"><div class="tp-carrusel__pista">${hojas}</div></div>
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
    const ajustarAlto = () => { raiz.style.height = `${hojas[actual].offsetHeight}px`; };
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
      if (sobra < 0) raiz.style.height = `${nuevo}px`;
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
    escena.classList.toggle("tp-escena--varias", varias);
    escena.innerHTML = varias ? carruselHTML(grupo, inicial) : T.pintar(grupo[0], opcionesDe(grupo[0]));
    /* Con varios perfumes, el logo y el título viven en el encabezado fijo, fuera de las hojas */
    const cabecera = escena.querySelector(".tp--cabecera");
    const tablas = [...escena.querySelectorAll(".tp:not(.tp--cabecera)")];
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
    if (varias) {
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
        inicial,
        alCambiar(i) {
          if (!pasoAutomatico) tomoElControl = true;
          marcar(i);
          /* El título fijo cambia con un desvanecido: "Tabla de Pagos" o "Pago completo" */
          const estado = T.calcular(grupo[i]).liquidado ? "liquidado" : "en-curso";
          cabecera.dataset.estado = estado;
          cabecera.querySelectorAll("[data-titulo]").forEach((t) => t.toggleAttribute("aria-hidden", t.dataset.titulo !== estado));
          document.body.dataset.tono = tonoDe(grupo[i]);
          if (!frascos.classList.contains("is-avisa")) anuncio.textContent = `Perfume ${i + 1} de ${grupo.length}: ${nombreDe(grupo[i])}`;
          setTimeout(descargas[i], 1500);
        },
      });
      marcar(inicial);
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
      if (varias && conAnimacion) escena.querySelector(".tp-frascos").classList.replace("tp-frascos--espera", "tp-frascos--entra");
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
            pasar.ir(principal);
            pasoAutomatico = false;
            window.scrollTo({ top: 0, behavior: "smooth" });
          }, 1100);
        }, 3700);
      } else if (recien >= 0) {
        /* Movimiento reducido: sin celebración, solo el aviso sobre el perfume principal */
        avisar(`${cortoDe(grupo[recien])} pagado · Sigue ${cortoDe(grupo[principal])}`, 4500);
      } else if (varias && conAnimacion) {
        /* Y el frasco del otro perfume, en la pastilla, destella una vez */
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
      await precargar([T.imagen(datos.image_url), T.imagen(datos.watermark_image_url)]);
      mostrarTablas(datos);
    } catch (error) {
      const motivo = ["sin-token", "no-encontrada"].includes(error.message) ? error.message : "error";
      if (motivo === "error") console.warn(error);
      mostrarAviso(motivo);
    }
  })();

  window.addEventListener("hashchange", () => location.reload());
})();
