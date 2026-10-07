/* Tabla de pagos de Sensorial (apartados en abonos).
   La usan pagos.html (lo que ve el cliente) y la vista previa del panel: calcula lo abonado y
   lo pendiente, pinta la plantilla con las fotos que sube el administrador, corre su entrada y
   anima el fondo de hilos dorados. Expone window.TablaPagos. */
(() => {
  "use strict";

  const ORDINALES = ["Primer", "Segundo", "Tercer", "Cuarto", "Quinto", "Sexto", "Séptimo", "Octavo", "Noveno", "Décimo", "Undécimo", "Duodécimo"];
  const TONOS = ["rosa", "dorado", "celeste", "verde", "lila"];
  const numero = new Intl.NumberFormat("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const dia = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", timeZone: "UTC" });
  /* Momento (desde --inicio) en que aparece el saldo; igual que .tp-saldo__monto en tabla-pagos.css */
  const RETRASO_SALDO = 1500;

  const reducido = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const escapar = (valor) => String(valor ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);
  const texto = (valor) => String(valor ?? "").trim();
  const centavos = (valor) => {
    const n = Math.round(Number(valor) * 100);
    return Number.isFinite(n) && n > 0 ? n : 0;
  };
  const dinero = (valor) => `$${numero.format(valor)}`;
  const nombrePago = (i) => (i < ORDINALES.length ? `${ORDINALES[i]} pago` : `Pago ${i + 1}`);

  function fecha(iso) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || "")) return "";
    return dia.format(new Date(`${iso}T00:00:00Z`)).replace(/\./g, "");
  }

  /* Igual que la base de datos: URL https o ruta de la carpeta img/. El panel también pasa
     blob: para ver una foto antes de subirla. */
  function imagen(valor) {
    const crudo = texto(valor);
    if (/^blob:/.test(crudo)) return crudo;
    if (/^https:\/\/[^\s"'<>`]+$/i.test(crudo)) {
      try { return new URL(crudo).href; } catch { return ""; }
    }
    return /^img\/[a-zA-Z0-9/_.-]+$/.test(crudo) ? crudo : "";
  }

  /* Texto sugerido detrás del frasco: la casa si es corta, sus iniciales si es larga
     ("Burberry" → BURBERRY, "Carolina Herrera" → CH, "Dolce & Gabbana" → D&G) */
  function marcaDeAgua(casa) {
    const limpia = texto(casa).toLocaleUpperCase("es");
    if (limpia.length <= 10) return limpia;
    return limpia.split(/\s+/).map((p) => (p === "&" ? "&" : p[0])).join("").slice(0, 16);
  }

  /* Los abonos se aplican en orden al plan: un pago queda tachado cuando lo abonado lo cubre;
     si solo cubre una parte, se indica cuánto falta de ese pago. Todo en centavos. */
  function calcular(datos) {
    const cuotas = (Array.isArray(datos?.installments) ? datos.installments : [])
      .map((c) => ({ monto: centavos(c?.amount), fecha: c?.due || "" }));
    const abonos = (Array.isArray(datos?.payments) ? datos.payments : [])
      .map((a) => ({ monto: centavos(a?.amount), fecha: a?.date || "" }));
    const total = cuotas.reduce((suma, c) => suma + c.monto, 0);
    const abonado = abonos.reduce((suma, a) => suma + a.monto, 0);
    let disponible = abonado;
    const pagos = cuotas.map((c, i) => {
      const cubierto = Math.min(Math.max(disponible, 0), c.monto);
      disponible -= c.monto;
      return {
        nombre: nombrePago(i), monto: c.monto / 100, fecha: c.fecha,
        pagado: c.monto > 0 && cubierto >= c.monto,
        parcial: cubierto > 0 && cubierto < c.monto,
        falta: (c.monto - cubierto) / 100,
      };
    });
    const pendiente = Math.max(total - abonado, 0);
    const fechas = abonos.map((a) => a.fecha).filter((f) => /^\d{4}-\d{2}-\d{2}$/.test(f)).sort();
    return {
      pagos, total: total / 100, abonado: abonado / 100, pendiente: pendiente / 100,
      excedente: Math.max(abonado - total, 0) / 100,
      liquidado: total > 0 && pendiente === 0,
      pagados: pagos.filter((p) => p.pagado).length,
      siguiente: pagos.find((p) => !p.pagado) || null,
      ultimoAbono: fechas.at(-1) || "",
    };
  }

  /* opciones.foto / opciones.silueta reemplazan las URL guardadas (vista previa del panel);
     opciones.vacio es el texto del hueco cuando aún no hay foto; opciones.contacto, el enlace
     de WhatsApp del botón final */
  function pintar(datos, opciones = {}) {
    const e = calcular(datos);
    const tono = TONOS.includes(datos?.tone) ? datos.tone : "rosa";
    const casa = texto(datos?.brand);
    const perfume = texto(datos?.product_name);
    const cliente = texto(datos?.client_name);
    const agua = texto(datos?.watermark).toLocaleUpperCase("es");
    const foto = imagen(opciones.foto ?? datos?.image_url);
    const silueta = imagen(opciones.silueta ?? datos?.watermark_image_url);
    const nombre = [casa, perfume].filter(Boolean).join(" ") || "Perfume";

    const fondoFrasco = silueta
      ? `<img class="tp-silueta" src="${escapar(silueta)}" alt="" aria-hidden="true" decoding="async">`
      : agua ? `<span class="tp-agua" aria-hidden="true">${escapar(agua)}</span>` : "";
    const frasco = foto
      ? `<img src="${escapar(foto)}" alt="${escapar(nombre)}" decoding="async">`
      : opciones.vacio ? `<span class="tp-frasco__vacio">${escapar(opciones.vacio)}</span>` : "";
    const filas = e.pagos.map((p) => {
      const detalle = [fecha(p.fecha), p.parcial ? `faltan ${dinero(p.falta)}` : ""].filter(Boolean).join(" · ");
      return `<li class="tp-pago${p.pagado ? " is-pagado" : ""}${p.parcial ? " is-parcial" : ""}">`
        + `<span class="tp-pago__concepto"><span class="tp-tachable">${p.nombre}</span>${detalle ? `<small>${escapar(detalle)}</small>` : ""}</span>`
        + `<span class="tp-pago__monto"><span class="tp-tachable">$ ${numero.format(p.monto)}</span></span>`
        + `${p.pagado ? '<span class="tp-oculto">, pagado</span>' : ""}</li>`;
    }).join("");
    const resumen = e.liquidado
      ? "Liquidado. Gracias por tu confianza."
      : e.abonado > 0
        ? `Has abonado ${dinero(e.abonado)} de ${dinero(e.total)}.${e.ultimoAbono ? `<small>Último abono: ${fecha(e.ultimoAbono)}</small>` : ""}`
        : `Total: ${dinero(e.total)}`;

    return `<article class="tp" data-tono="${tono}" data-estado="${e.liquidado ? "liquidado" : "en-curso"}">
      <header class="tp-cabeza">
        <span class="tp-logo" role="img" aria-label="Sensorial Boutique"></span>
        <h1 class="tp-titulo"><span class="tp-titulo__a">Tabla de</span> <span class="tp-titulo__b"><span class="tp-oculto">Pagos</span><span class="tp-letras" aria-hidden="true">${[..."Pagos"].map((l) => `<span class="tp-letra">${l}</span>`).join("")}</span></span></h1>
      </header>
      <div class="tp-visual${foto ? "" : " tp-visual--sin-foto"}">
        ${fondoFrasco}
        <span class="tp-halo" aria-hidden="true"></span>
        <div class="tp-frasco">${frasco}</div>
      </div>
      <p class="tp-nombre">${casa ? `<span class="tp-casa">${escapar(casa)}</span>` : ""}<span class="tp-perfume">${escapar(perfume)}</span></p>
      <div class="tp-saldo">
        <p class="tp-saldo__etiqueta">Pendiente:</p>
        <p class="tp-saldo__monto"><span class="tp-raya" aria-hidden="true"></span><strong data-tp-monto="${e.pendiente}" aria-hidden="true">${dinero(e.pendiente)}</strong><span class="tp-oculto">${dinero(e.pendiente)}</span><span class="tp-raya" aria-hidden="true"></span></p>
      </div>
      <section class="tp-tarjeta" aria-label="Pagos">
        <svg class="tp-marco" aria-hidden="true" focusable="false"><path class="tp-marco__trazo" pathLength="1"/><path class="tp-marco__trazo" pathLength="1"/></svg>
        <p class="tp-cliente">Cliente: <strong>${escapar(cliente)}</strong></p>
        <ol class="tp-lista">${filas}</ol>
      </section>
      <p class="tp-resumen">${resumen}</p>
      ${opciones.contacto ? `<a class="tp-contacto" href="${escapar(opciones.contacto)}" target="_blank" rel="noopener"><i class="ph ph-whatsapp-logo" aria-hidden="true"></i>Escríbenos por WhatsApp</a>` : ""}
    </article>`;
  }

  /* El marco dorado de la tarjeta se dibuja como dos trazos que salen del centro de arriba y
     se encuentran abajo; se recalcula cuando cambia el tamaño de la tarjeta */
  function marco(tabla) {
    const tarjeta = tabla.querySelector(".tp-tarjeta");
    const svg = tarjeta?.querySelector(".tp-marco");
    if (!svg) return () => {};
    const [derecha, izquierda] = svg.querySelectorAll("path");
    const dibujar = () => {
      const w = tarjeta.offsetWidth;
      const h = tarjeta.offsetHeight;
      if (!w || !h) return;
      const s = 1.25;
      const r = Math.min(parseFloat(getComputedStyle(tarjeta).borderTopLeftRadius) || 28, w / 2, h / 2);
      const a = r - s;
      const m = w / 2;
      svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
      /* Los trazos se cruzan 1px en el centro para que no quede una rendija donde se unen */
      derecha.setAttribute("d", `M${m - 1} ${s}H${w - r}A${a} ${a} 0 0 1 ${w - s} ${r}V${h - r}A${a} ${a} 0 0 1 ${w - r} ${h - s}H${m - 1}`);
      izquierda.setAttribute("d", `M${m + 1} ${s}H${r}A${a} ${a} 0 0 0 ${s} ${r}V${h - r}A${a} ${a} 0 0 0 ${r} ${h - s}H${m + 1}`);
    };
    dibujar();
    const observador = new ResizeObserver(dibujar);
    observador.observe(tarjeta);
    return () => observador.disconnect();
  }

  /* El saldo pendiente cuenta desde $0.00; el ancho queda fijo para que las rayas no salten */
  function contar(el, valor, retraso, duracion = 1300) {
    let id = 0;
    el.style.minWidth = "";
    el.style.minWidth = `${el.offsetWidth}px`;
    el.textContent = dinero(0);
    const desde = performance.now() + retraso;
    const paso = (ahora) => {
      const p = Math.min(Math.max((ahora - desde) / duracion, 0), 1);
      const avance = p === 1 ? 1 : 1 - 2 ** (-10 * p);
      el.textContent = dinero(Math.round(valor * avance * 100) / 100);
      if (p < 1) id = requestAnimationFrame(paso);
    };
    id = requestAnimationFrame(paso);
    return () => { cancelAnimationFrame(id); el.textContent = dinero(valor); };
  }

  /* Prepara una tabla recién pintada. Con entrada, la anima a partir de `inicio` (ms).
     Devuelve una función que libera observadores y animaciones. */
  function montar(tabla, { entrada = false, inicio = 0 } = {}) {
    const limpiar = [];
    tabla.querySelectorAll(".tp-letra").forEach((el, i) => el.style.setProperty("--i", i));
    const filas = tabla.querySelectorAll(".tp-pago");
    filas.forEach((el, i) => el.style.setProperty("--i", i));
    tabla.querySelectorAll(".tp-pago.is-pagado").forEach((el, k) => el.style.setProperty("--k", k));
    tabla.style.setProperty("--filas", filas.length);
    const agua = tabla.querySelector(".tp-agua");
    if (agua) agua.style.setProperty("--letras", Math.max([...agua.textContent].length, 2));
    limpiar.push(marco(tabla));
    tabla.classList.remove("tp--entrada");
    if (entrada && !reducido()) {
      void tabla.offsetWidth; // reinicia las animaciones si la tabla ya estaba en pantalla
      tabla.style.setProperty("--inicio", `${inicio}ms`);
      tabla.classList.add("tp--entrada");
      const monto = tabla.querySelector("[data-tp-monto]");
      if (monto) limpiar.push(contar(monto, Number(monto.dataset.tpMonto), inicio + RETRASO_SALDO));
    }
    return () => limpiar.forEach((fn) => fn());
  }

  /* ---------- Fondo: hilos dorados que ondulan despacio ----------
     Cada hilo es una curva suave que pasa por estos puntos (fracciones del ancho y del alto);
     los extremos quedan fuera de la pantalla. Al empezar, los hilos se trazan y después un
     destello recorre cada uno de vez en cuando. */
  const HILOS = [
    [[0.31, -0.05], [0.25, 0.07], [0.13, 0.15], [0.08, 0.29], [0.02, 0.36], [-0.05, 0.4]],
    [[-0.05, 0.53], [0.05, 0.58], [0.08, 0.71], [0.05, 0.84], [0.13, 0.95], [0.31, 1.05]],
    [[0.85, -0.05], [0.88, 0.07], [0.95, 0.14], [1.05, 0.16]],
    [[1.05, 0.34], [0.96, 0.41], [0.93, 0.54], [0.97, 0.65], [1.05, 0.7]],
    [[0.72, 1.05], [0.79, 0.93], [0.91, 0.86], [0.96, 0.75], [1.05, 0.72]],
  ];

  function curva(ctx, p) {
    ctx.beginPath();
    ctx.moveTo(p[0][0], p[0][1]);
    for (let i = 0; i < p.length - 1; i += 1) {
      const a = p[i - 1] || p[i];
      const b = p[i];
      const c = p[i + 1];
      const d = p[i + 2] || c;
      ctx.bezierCurveTo(b[0] + (c[0] - a[0]) / 6, b[1] + (c[1] - a[1]) / 6,
        c[0] - (d[0] - b[0]) / 6, c[1] - (d[1] - b[1]) / 6, c[0], c[1]);
    }
  }
  const longitud = (p) => p.slice(1).reduce((suma, q, i) => suma + Math.hypot(q[0] - p[i][0], q[1] - p[i][1]), 0);

  function fondo(lienzo) {
    const ctx = lienzo?.getContext("2d");
    if (!ctx) return { empezar() {}, detener() {} };
    const quieto = reducido();
    let ancho = 0;
    let alto = 0;
    let dpr = 1;
    let id = 0;
    let espera = 0;
    let inicio = 0;
    let ultimo = 0;

    const cuadro = (ahora) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, ancho, alto);
      if (!inicio || !ancho) return;
      const t = quieto ? 0 : ahora - inicio;
      const trazo = quieto ? 1 : Math.min(t / 1800, 1);
      const avance = 1 - (1 - trazo) ** 3;
      const amplitud = Math.min(ancho, alto) * 0.022;
      ctx.lineCap = "round";
      HILOS.forEach((hilo, j) => {
        const puntos = hilo.map(([x, y], i) => [
          x * ancho + amplitud * Math.sin(t * 0.00023 + j * 1.7 + i * 0.9),
          y * alto + amplitud * Math.cos(t * 0.00019 + j * 1.1 + i * 1.3),
        ]);
        const largo = longitud(puntos) * 1.15;
        curva(ctx, puntos);
        ctx.setLineDash(trazo < 1 ? [largo * avance, largo] : []);
        ctx.lineDashOffset = 0;
        ctx.lineWidth = 1.6;
        ctx.strokeStyle = "rgba(196, 160, 100, 0.5)";
        ctx.stroke();
        if (quieto || trazo < 1) return;
        const patron = largo * 1.7;
        const destello = largo * 0.06;
        ctx.setLineDash([destello, patron - destello]);
        ctx.lineDashOffset = -(((t - 1800) * 0.06 + j * patron * 0.37) % patron);
        ctx.lineWidth = 1.8;
        ctx.strokeStyle = "rgba(255, 228, 176, 0.8)";
        ctx.stroke();
      });
    };
    /* Unos 30 cuadros por segundo bastan para un movimiento tan lento */
    const bucle = (ahora) => {
      if (ahora - ultimo >= 32) { ultimo = ahora; cuadro(ahora); }
      id = requestAnimationFrame(bucle);
    };
    const medir = () => {
      const caja = lienzo.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      ancho = caja.width;
      alto = caja.height;
      lienzo.width = Math.round(ancho * dpr);
      lienzo.height = Math.round(alto * dpr);
      cuadro(performance.now());
    };
    const observador = new ResizeObserver(medir);
    observador.observe(lienzo);

    return {
      empezar(retraso = 0) {
        clearTimeout(espera);
        espera = setTimeout(() => {
          inicio = performance.now();
          cancelAnimationFrame(id);
          if (quieto) cuadro(inicio);
          else id = requestAnimationFrame(bucle);
        }, retraso);
      },
      detener() {
        clearTimeout(espera);
        cancelAnimationFrame(id);
        observador.disconnect();
      },
    };
  }

  window.TablaPagos = {
    TONOS, calcular, pintar, montar, fondo, dinero, fecha, imagen, marcaDeAgua, nombrePago, escapar,
  };
})();
