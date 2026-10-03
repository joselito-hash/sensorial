(() => {
  "use strict";

  /* ------------------------------------------------------------------
     CONFIGURACIÓN: edita solo este bloque.
     whatsapp: código de país + número, solo dígitos (ej. "5215512345678").
               Si queda vacío, WhatsApp abre y el cliente elige el contacto.
     ------------------------------------------------------------------ */
  const CONFIG = {
    marca: "Sensorial Boutique",
    whatsapp: "",
  };

  /* ------------------------------------------------------------------
     FOTOS
     Cada "foto" puede ser:
       - el identificador de una foto de Unsplash (como las de abajo), o
       - la ruta de una foto tuya, por ejemplo "img/sauvage.jpg" (vertical 4:5).
     ------------------------------------------------------------------ */
  const esUnsplash = (foto) => /^\d{10,}-[0-9a-f]+$/.test(foto);
  const url = (foto, ancho) =>
    esUnsplash(foto) ? `https://images.unsplash.com/photo-${foto}?auto=format&fit=crop&q=80&w=${ancho}` : foto;
  const srcset = (foto, anchos) =>
    esUnsplash(foto) ? anchos.map((a) => `${url(foto, a)} ${a}w`).join(", ") : "";

  /* ------------------------------------------------------------------
     FAMILIAS: la foto grande del inicio, el ingrediente y el perfume destacado.
     ------------------------------------------------------------------ */
  const FAMILIAS = [
    { id: "frescos", nombre: "Frescos", desc: "Cítricos, marinos y limpios.",
      larga: "Cítricos, marinos y limpios. Para el calor, la oficina y oler a recién bañado.",
      hero: "1747916148863-7164d8920b57", heroAlt: "Frasco de Dior Sauvage iluminado con luz azul", heroPos: "50% 46%",
      ingrediente: "1716339140080-be256d3270ce", ingredienteAlt: "Rodajas de naranja en agua con burbujas", destacado: "sauvage" },
    { id: "dulces", nombre: "Dulces", desc: "Vainilla, praliné y flores.",
      larga: "Vainilla, praliné y flores. Envuelven, se notan y dejan estela.",
      hero: "1724157073080-fcffb8d6c956", heroAlt: "Frasco de YSL Libre sobre fondo dorado", heroPos: "50% 50%",
      ingrediente: "1592788174877-3f99727fd23d", ingredienteAlt: "Vainas de vainilla sobre fondo claro", destacado: "libre" },
    { id: "amaderados", nombre: "Amaderados", desc: "Cedro, vetiver y sándalo.",
      larga: "Cedro, vetiver y sándalo. Sobrios, elegantes y fáciles de llevar a diario.",
      hero: "1785881570973-281d0db41119", heroAlt: "Frasco de Bleu de Chanel junto a una ventana al atardecer", heroPos: "50% 55%",
      ingrediente: "1697507695420-04623ccff2af", ingredienteAlt: "Veta de madera oscura en primer plano", destacado: "bleu-de-chanel" },
    { id: "orientales", nombre: "Orientales", desc: "Oud, ámbar y especias.",
      larga: "Oud, ámbar y especias. Intensos y cálidos, hechos para la noche.",
      hero: "1731972206777-d9f796597a60", heroAlt: "Frasco negro y dorado de Lattafa Oud for Glory", heroPos: "50% 48%",
      ingrediente: "1560076124-fe336393ef76", ingredienteAlt: "Hebras de azafrán en primer plano", destacado: "oud-for-glory" },
  ];

  /* ------------------------------------------------------------------
     CATÁLOGO DE EJEMPLO: reemplázalo por tu inventario real.
     familia: "frescos" | "dulces" | "amaderados" | "orientales"
     origen:  "Diseñador" | "Árabe"
     version: opcional (ej. "Eau de Parfum").
     lamina:  opcional. Imagen cuadrada sobre fondo blanco con el frasco rodeado de
              sus notas (como img/eros.webp). Si existe, el catálogo la usa en lugar
              de la foto. Ver IMAGENES.md para generarlas.
     galeria: opcional. Dos imágenes adicionales [{ src, alt }, { src, alt }]
              para activar el carrusel de tres fotos dentro de la ficha.

     Las notas, los acordes y "cuándo usarlo" vienen de la página de cada perfume
     en Fragrantica (campo fuente), consultada el 2 de octubre de 2026.
     acordes: [nombre, intensidad de 0 a 100, color "r,g,b"], del más al menos intenso.
     uso:     de 0 a 100, en este orden: invierno, primavera, verano, otoño, día, noche.
     ------------------------------------------------------------------ */
  const PERFUMES = [
    { id: "sauvage", casa: "Dior", nombre: "Sauvage", version: "Eau de Parfum", origen: "Diseñador", familia: "frescos", foto: "1698867928110-2408e8e2f44a",
      fuente: "https://www.fragrantica.es/perfume/Dior/Sauvage-Eau-de-Parfum-48100.html",
      notas: { salida: "bergamota", corazon: "pimienta de Sichuan, lavanda, anís estrellado, nuez moscada", fondo: "ambroxan, vainilla" },
      acordes: [["fresco especiado", 100, "131,201,40"], ["cítrico", 82, "249,255,82"], ["ámbar", 72, "188,77,16"], ["lavanda", 57, "155,125,184"], ["almizclado", 55, "231,216,234"], ["aromático", 51, "55,160,137"], ["herbal", 51, "108,164,127"], ["anís", 49, "195,215,179"]],
      uso: [92, 99, 83, 100, 94, 98] },
    { id: "acqua-di-gio", casa: "Giorgio Armani", nombre: "Acqua di Giò", origen: "Diseñador", familia: "frescos", foto: "1706924179763-7f2744656823",
      fuente: "https://www.fragrantica.es/perfume/Giorgio-Armani/Acqua-di-Gio-410.html",
      notas: { salida: "lima, limón, bergamota, jazmín, naranja, mandarina, neroli", corazon: "notas marinas, jazmín, calone, romero, durazno, fresia, jacinto, violeta, ciclamen, cilantro, rosa, nuez moscada, reseda", fondo: "almizcle blanco, cedro, musgo de roble, pachulí, ámbar" },
      acordes: [["cítrico", 100, "249,255,82"], ["aromático", 66, "55,160,137"], ["marino", 58, "14,82,155"], ["fresco especiado", 51, "131,201,40"], ["florales", 47, "255,95,141"], ["amaderado", 46, "119,68,20"], ["fresco", 45, "155,229,237"]],
      uso: [10, 69, 100, 19, 93, 20] },
    { id: "light-blue", casa: "Dolce & Gabbana", nombre: "Light Blue", origen: "Diseñador", familia: "frescos", foto: "1706408604086-144590f4020a",
      fuente: "https://www.fragrantica.es/perfume/Dolce-Gabbana/Light-Blue-485.html",
      notas: { salida: "limón siciliano, manzana, cedro, campanilla", corazon: "bambú, jazmín, rosa blanca", fondo: "cedro, almizcle, ámbar" },
      acordes: [["cítrico", 100, "249,255,82"], ["amaderado", 74, "119,68,20"], ["fresco", 63, "155,229,237"], ["afrutados", 59, "252,75,41"], ["aromático", 54, "55,160,137"], ["almizclado", 49, "231,216,234"], ["atalcado", 47, "238,221,204"], ["verde", 44, "14,140,29"]],
      uso: [11, 55, 100, 12, 94, 12] },
    { id: "dylan-blue", casa: "Versace", nombre: "Dylan Blue", origen: "Diseñador", familia: "frescos", foto: "1674469295525-11f85ed5a3ac",
      fuente: "https://www.fragrantica.es/perfume/Versace/Versace-Pour-Homme-Dylan-Blue-40031.html",
      notas: { salida: "bergamota de Calabria, notas acuáticas, toronja, hojas de higuera", corazon: "ambroxan, pimienta negra, pachulí, hojas de violeta, papiro de Egipto", fondo: "incienso, almizcle, haba tonka, azafrán" },
      acordes: [["ámbar", 100, "188,77,16"], ["cítrico", 92, "249,255,82"], ["fresco especiado", 75, "131,201,40"], ["almizclado", 71, "231,216,234"], ["acuático", 70, "99,204,226"], ["cálido especiado", 65, "204,51,0"], ["amaderado", 54, "119,68,20"], ["fresco", 52, "155,229,237"]],
      uso: [43, 98, 100, 79, 97, 75] },

    { id: "libre", casa: "Yves Saint Laurent", nombre: "Libre", origen: "Diseñador", familia: "dulces", foto: "1709095458514-573bc6277d3d",
      fuente: "https://www.fragrantica.es/perfume/Yves-Saint-Laurent/Libre-56077.html",
      notas: { salida: "lavanda, mandarina, grosellas negras, petit grain", corazon: "lavanda, flor de azahar, jazmín", fondo: "vainilla de Madagascar, almizcle, cedro, ámbar gris" },
      acordes: [["floral blanco", 100, "237,242,251"], ["cítrico", 81, "249,255,82"], ["lavanda", 75, "155,125,184"], ["avainillado", 64, "255,254,192"], ["aromático", 57, "55,160,137"], ["dulce", 56, "238,54,59"], ["atalcado", 53, "238,221,204"], ["animálico", 52, "142,75,19"]],
      uso: [82, 77, 46, 100, 91, 84] },
    { id: "la-vie-est-belle", casa: "Lancôme", nombre: "La Vie Est Belle", origen: "Diseñador", familia: "dulces", foto: "1613521140785-e85e427f8002",
      fuente: "https://www.fragrantica.es/perfume/Lancome/La-Vie-Est-Belle-14982.html",
      notas: { salida: "grosellas negras, pera", corazon: "iris, jazmín, flor de azahar", fondo: "praliné, vainilla, pachulí, haba tonka" },
      acordes: [["dulce", 100, "238,54,59"], ["avainillado", 82, "255,254,192"], ["afrutados", 66, "252,75,41"], ["pachulí", 58, "99,101,46"], ["amaderado", 58, "119,68,20"], ["floral blanco", 55, "237,242,251"], ["atalcado", 53, "238,221,204"], ["iris", 49, "183,167,215"]],
      uso: [100, 56, 31, 86, 86, 87] },
    { id: "eros", casa: "Versace", nombre: "Eros", version: "Eau de Parfum", origen: "Diseñador", familia: "dulces", foto: "1624798956425-ef88fc12b540", lamina: "img/eros.webp",
      fuente: "https://www.fragrantica.es/perfume/Versace/Eros-Eau-de-Parfum-62762.html",
      notas: { salida: "menta, manzana acaramelada, limón, mandarina", corazon: "ambroxan, geranio, esclarea", fondo: "vainilla, cedro, sándalo, naranja amarga, pachulí, cuero" },
      acordes: [["cítrico", 100, "249,255,82"], ["aromático", 94, "55,160,137"], ["verde", 80, "14,140,29"], ["avainillado", 75, "255,254,192"], ["amaderado", 73, "119,68,20"], ["dulce", 71, "238,54,59"], ["fresco especiado", 66, "131,201,40"], ["gourmand", 63, "240,203,122"]],
      uso: [84, 100, 81, 92, 88, 97] },

    { id: "bleu-de-chanel", casa: "Chanel", nombre: "Bleu de Chanel", version: "Eau de Toilette", origen: "Diseñador", familia: "amaderados", foto: "1785881570973-281d0db41119",
      galeria: [
        { src: "img/bleu-de-chanel-2.png", alt: "Madera de cedro, sándalo y vetiver" },
        { src: "img/bleu-de-chanel-3.png", alt: "Madera oscura con incienso al atardecer" },
      ],
      fuente: "https://www.fragrantica.es/perfume/Chanel/Bleu-de-Chanel-9099.html",
      notas: { salida: "toronja, limón, menta, pimienta rosa", corazon: "jengibre, nuez moscada, jazmín, Iso E Super", fondo: "incienso, cedro, vetiver, sándalo, pachulí, ládano, almizcle blanco" },
      acordes: [["cítrico", 100, "249,255,82"], ["amaderado", 82, "119,68,20"], ["fresco especiado", 80, "131,201,40"], ["aromático", 70, "55,160,137"], ["ámbar", 67, "188,77,16"], ["ahumado", 53, "130,116,135"], ["balsámico", 50, "173,131,89"], ["cálido especiado", 50, "204,51,0"]],
      uso: [57, 98, 91, 84, 100, 87] },
    { id: "terre-d-hermes", casa: "Hermès", nombre: "Terre d'Hermès", origen: "Diseñador", familia: "amaderados", foto: "1635795729633-39a2c479c1d3",
      fuente: "https://www.fragrantica.es/perfume/Hermes/Terre-d-Hermes-17.html",
      notas: { salida: "naranja, toronja", corazon: "pimienta, pelargonio, sílex", fondo: "vetiver, cedro, pachulí, benjuí" },
      acordes: [["cítrico", 100, "249,255,82"], ["amaderado", 92, "119,68,20"], ["fresco especiado", 79, "131,201,40"], ["aromático", 77, "55,160,137"], ["terrosos", 60, "84,72,56"], ["cálido especiado", 54, "204,51,0"]],
      uso: [50, 94, 74, 92, 100, 54] },
    { id: "boss-bottled", casa: "Hugo Boss", nombre: "Boss Bottled", origen: "Diseñador", familia: "amaderados", foto: "1592400374347-0d983b987da8",
      fuente: "https://www.fragrantica.es/perfume/Hugo-Boss/Boss-Bottled-383.html",
      notas: { salida: "manzana, ciruela, bergamota, limón, musgo de roble, geranio", corazon: "canela, caoba, clavel", fondo: "vainilla, sándalo, cedro, vetiver, olivo" },
      acordes: [["amaderado", 100, "119,68,20"], ["afrutados", 91, "252,75,41"], ["avainillado", 79, "255,254,192"], ["cálido especiado", 79, "204,51,0"], ["canela", 69, "210,105,30"], ["aromático", 64, "55,160,137"], ["cítrico", 62, "249,255,82"], ["atalcado", 62, "238,221,204"]],
      uso: [55, 91, 53, 88, 100, 55] },

    { id: "oud-for-glory", casa: "Lattafa", nombre: "Oud for Glory", origen: "Árabe", familia: "orientales", foto: "1731972206777-d9f796597a60",
      fuente: "https://www.fragrantica.es/perfume/Lattafa-Perfumes/Bade-e-Al-Oud-Oud-for-Glory-64948.html",
      notas: { salida: "azafrán, nuez moscada, lavanda", corazon: "madera de oud, pachulí", fondo: "madera de oud, pachulí, almizcle" },
      acordes: [["oud", 100, "84,65,54"], ["cálido especiado", 94, "204,51,0"], ["fresco especiado", 87, "131,201,40"], ["pachulí", 69, "99,101,46"], ["metálico", 56, "151,176,183"], ["almizclado", 55, "231,216,234"], ["amaderado", 53, "119,68,20"], ["lavanda", 53, "155,125,184"]],
      uso: [100, 37, 15, 87, 39, 90] },
    { id: "oud-mood", casa: "Lattafa", nombre: "Oud Mood", origen: "Árabe", familia: "orientales", foto: "1784822041091-1096030fb326",
      fuente: "https://www.fragrantica.es/perfume/Lattafa-Perfumes/Oud-Mood-46814.html",
      notas: { salida: "rosa, azafrán, pimienta de Jamaica", corazon: "madera de oud, caramelo, notas florales, pachulí", fondo: "notas amaderadas, ámbar, incienso, resinas, almizcle" },
      acordes: [["ámbar", 100, "188,77,16"], ["oud", 71, "84,65,54"], ["amaderado", 70, "119,68,20"], ["cálido especiado", 69, "204,51,0"], ["caramelo", 62, "221,163,86"], ["balsámico", 58, "173,131,89"], ["rosas", 53, "254,1,107"], ["ahumado", 50, "130,116,135"]],
      uso: [100, 35, 18, 90, 46, 89] },
    { id: "1-million", casa: "Rabanne", nombre: "1 Million", origen: "Diseñador", familia: "orientales", foto: "1633072437275-ec3344b4b966",
      fuente: "https://www.fragrantica.es/perfume/Paco-Rabanne/1-Million-3747.html",
      notas: { salida: "mandarina roja, toronja, menta", corazon: "canela, notas especiadas, rosa", fondo: "ámbar, cuero, notas amaderadas, pachulí hindú" },
      acordes: [["cálido especiado", 100, "204,51,0"], ["canela", 81, "210,105,30"], ["cítrico", 73, "249,255,82"], ["ámbar", 63, "188,77,16"], ["amaderado", 61, "119,68,20"], ["cuero", 57, "120,72,58"], ["rosas", 53, "254,1,107"], ["animálico", 50, "142,75,19"]],
      uso: [99, 35, 20, 84, 40, 100] },
    { id: "coco-mademoiselle", casa: "Chanel", nombre: "Coco Mademoiselle", origen: "Diseñador", familia: "orientales", foto: "1708733145706-82da0d0596e9",
      fuente: "https://www.fragrantica.es/perfume/Chanel/Coco-Mademoiselle-611.html",
      notas: { salida: "naranja, mandarina, bergamota, flor de azahar", corazon: "rosa turca, jazmín, mimosa, ylang-ylang", fondo: "pachulí, almizcle blanco, vainilla, vetiver, haba tonka, opopónaco" },
      acordes: [["cítrico", 100, "249,255,82"], ["amaderado", 63, "119,68,20"], ["pachulí", 62, "99,101,46"], ["dulce", 62, "238,54,59"], ["floral blanco", 60, "237,242,251"], ["rosas", 53, "254,1,107"], ["terrosos", 49, "84,72,56"], ["avainillado", 48, "255,254,192"]],
      uso: [69, 86, 49, 81, 100, 68] },
  ];

  const CLAVE_LISTA = "sb-lista";
  const porId = new Map(PERFUMES.map((p) => [p.id, p]));
  const familiaPorId = new Map(FAMILIAS.map((f) => [f.id, f]));
  const nombreCompleto = (p) => `${p.casa} ${p.nombre}`;
  const sinAcentos = (t) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const mayuscula = (t) => t.charAt(0).toUpperCase() + t.slice(1);

  /* Las tres notas principales: la primera nota distinta de cada momento del perfume */
  function notasPrincipales(p) {
    const notas = [];
    Object.values(p.notas).forEach((momento) => {
      const nota = momento.split(",").map((n) => n.trim()).find((n) => !notas.includes(n));
      if (nota) notas.push(nota);
    });
    return notas;
  }

  /* "bergamota, lavanda y ambroxan" */
  function resumenNotas(p) {
    const notas = notasPrincipales(p);
    return notas.length > 1 ? `${notas.slice(0, -1).join(", ")} y ${notas[notas.length - 1]}` : notas.join("");
  }

  /* Icono (Phosphor) según el tipo de nota. El orden importa: gana el primer patrón que coincide.
     Los patrones van sin acentos porque la nota se compara ya normalizada. */
  const ICONOS_NOTA = [
    [/bergamota|limon|lima|naranja|mandarina|toronja|citric|petit grain/, "ph-orange-slice"],
    [/marin|acuatic|agua|calone/, "ph-waves"],
    [/pimienta|canela|nuez|clavo|jengibre|azafran|cardamomo|comino|especia|anis/, "ph-pepper"],
    [/cafe|cacao/, "ph-coffee-bean"],
    [/manzana|pera|ciruela|grosella|pina|fruta|durazno/, "ph-cherries"],
    [/vainilla/, "ph-ice-cream"],
    [/praline|tonka|caramel|gourmand|azucar|datil/, "ph-cookie"],
    [/menta|romero|pachuli|bambu|higuera|vetiver|hoja|salvia|esclarea|musgo|cilantro|papiro|olivo/, "ph-leaf"],
    [/lavanda|iris|jacinto|heliotropo|violeta/, "ph-flower-tulip"],
    [/jazmin|rosa|geranio|azahar|neroli|campanilla|nardo|flor|orquidea|pelargonio|lirio|clavel|fresia|ciclamen|reseda|mimosa|ylang/, "ph-flower"],
    [/cedro|sandalo|oud|abedul|madera|amaderad|caoba/, "ph-tree"],
    [/incienso|tabaco|humo/, "ph-fire"],
    [/almizcle/, "ph-feather"],
    [/cuero/, "ph-handbag"],
    [/silex|mineral/, "ph-diamond"],
    [/ambar|ambroxan|benjui|mirra|resina|ladano|opoponaco/, "ph-drop"],
  ];
  const iconoNota = (nota) => {
    const limpia = sinAcentos(nota);
    const hallado = ICONOS_NOTA.find(([patron]) => patron.test(limpia));
    return hallado ? hallado[1] : "ph-sparkle";
  };

  const $ = (sel, raiz = document) => raiz.querySelector(sel);
  const $$ = (sel, raiz = document) => [...raiz.querySelectorAll(sel)];

  const menosMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)");

  const estado = {
    familia: "frescos",
    familiaElegida: false,
    filtros: { familia: "todas", origen: "todos" },
    lista: new Set(leerLista()),
  };

  function leerLista() {
    try {
      const guardada = JSON.parse(localStorage.getItem(CLAVE_LISTA) || "[]");
      return Array.isArray(guardada) ? guardada.filter((id) => porId.has(id)) : [];
    } catch {
      return [];
    }
  }

  function guardarLista() {
    try {
      localStorage.setItem(CLAVE_LISTA, JSON.stringify([...estado.lista]));
    } catch {
      /* sin almacenamiento disponible: la lista vive solo en esta visita */
    }
  }

  /* ---------- Mensaje de WhatsApp ---------- */

  function mensaje() {
    if (estado.lista.size > 0) {
      const lineas = [...estado.lista].map((id) => `- ${nombreCompleto(porId.get(id))}`);
      const intro = estado.lista.size === 1 ? "me interesa este perfume:" : "me interesan estos perfumes:";
      return `Hola ${CONFIG.marca}, ${intro}\n${lineas.join("\n")}\n¿Me pasan precio y disponibilidad?`;
    }
    if (estado.familiaElegida) {
      return `Hola ${CONFIG.marca}, me gustan los perfumes ${estado.familia}. ¿Qué me recomiendan?`;
    }
    return `Hola ${CONFIG.marca}, quiero que me recomienden un perfume.`;
  }

  function actualizarPedido() {
    const texto = mensaje();
    const numero = CONFIG.whatsapp.replace(/\D/g, "");
    const enlace = `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
    $$(".js-wa").forEach((a) => { a.href = enlace; });
    const vista = $("#mensaje-texto");
    if (vista) vista.textContent = texto;
  }

  /* ---------- Lista ---------- */

  function pintarBotones() {
    $$("[data-id]").forEach((btn) => {
      const p = porId.get(btn.dataset.id);
      const enLista = estado.lista.has(p.id);
      btn.setAttribute("aria-pressed", String(enLista));
      $("i", btn).className = enLista ? "ph ph-check" : "ph ph-plus";
      const etiqueta = $("span", btn);
      if (etiqueta) etiqueta.textContent = enLista ? "En tu lista" : ("largo" in btn.dataset ? "Agregar a mi lista" : "Agregar");
      btn.setAttribute("aria-label", `${enLista ? "Quitar" : "Agregar"} ${nombreCompleto(p)} ${enLista ? "de" : "a"} tu lista`);
    });
  }

  /* La lista vive en una barra inferior compacta: pila de fotos, conteo y botón de WhatsApp.
     Agregar un perfume no abre el panel: la barra solo confirma el cambio por un momento.
     El panel con el detalle se abre únicamente al tocar el resumen. */
  let relojAviso = null;

  const panelListaAbierto = () => $("#barra").classList.contains("panel-abierto");

  function abrirPanelLista() {
    const barra = $("#barra");
    if (!barra || estado.lista.size === 0) return;
    barra.classList.add("panel-abierto");
    $("#barra-panel").inert = false;
    $("#mostrar-lista").setAttribute("aria-expanded", "true");
  }

  function cerrarPanelLista() {
    const barra = $("#barra");
    if (!barra) return;
    barra.classList.remove("panel-abierto");
    $("#barra-panel").inert = true;
    $("#mostrar-lista").setAttribute("aria-expanded", "false");
  }

  /* La barra no se muestra en la pestaña Pedido: ahí la lista ya ocupa toda la página */
  function mostrarBarra() {
    const barra = $("#barra");
    const visible = estado.lista.size > 0 && vistaActual !== "pedido";
    barra.classList.toggle("es-visible", visible);
    barra.inert = !visible || document.documentElement.classList.contains("intro-activa");
    document.body.classList.toggle("con-lista", visible);
    if (!visible) cerrarPanelLista();
  }

  /* Pestaña Pedido: la lista completa con foto, notas y botón para quitar */
  function pintarPedido() {
    const ids = [...estado.lista];
    const n = ids.length;
    $("#pedido-vacio").hidden = n > 0;
    $("#pedido-acciones").hidden = n === 0;
    $("#pedido-resumen").textContent = n
      ? `${textoPerfumes(n)} en tu lista. Revísala y envíala por WhatsApp; te confirmamos precio y disponibilidad.`
      : "Aquí aparecen los perfumes que agregues desde el catálogo.";
    $("#pedido-items").innerHTML = ids.map((id, i) => {
      const p = porId.get(id);
      const f = familiaPorId.get(p.familia);
      return `<li class="pedido__item" style="--campo: var(--c-${f.id}); --i: ${i}">
        <button class="pedido__foto" type="button" data-ficha="${p.id}" aria-label="Ver la ficha de ${nombreCompleto(p)}">
          <img src="${p.lamina || url(p.foto, 300)}" alt="" width="120" height="120" loading="lazy">
        </button>
        <div class="pedido__info">
          <p class="pedido__meta"><span class="pedido__familia">${f.nombre}</span>${p.casa}${p.version ? ` · ${p.version}` : ""}</p>
          <h2 class="pedido__nombre"><button type="button" data-ficha="${p.id}">${p.nombre}</button></h2>
          <p class="pedido__notas">Huele a ${resumenNotas(p)}.</p>
        </div>
        <button class="pedido__quitar" type="button" data-quitar-lista="${p.id}" aria-label="Quitar ${nombreCompleto(p)} de la lista"><i class="ph ph-x" aria-hidden="true"></i><span>Quitar</span></button>
      </li>`;
    }).join("");

    const conteo = $("#nav-conteo");
    const antes = conteo.textContent;
    conteo.hidden = n === 0;
    conteo.textContent = n ? String(n) : "";
    if (n && antes !== conteo.textContent && !menosMovimiento.matches) {
      conteo.classList.remove("pulso");
      void conteo.offsetWidth;
      conteo.classList.add("pulso");
    }
  }

  function pintarLista(cambio) {
    const barra = $("#barra");
    if (!barra) return;
    const ids = [...estado.lista];
    const n = ids.length;
    pintarPedido();
    mostrarBarra();
    if (n === 0) {
      $("#barra-items").innerHTML = "";
      $("#barra-pila").innerHTML = "";
      return;
    }

    const total = n === 1 ? "1 perfume" : `${n} perfumes`;
    $("#barra-conteo").textContent = total;
    $("#barra-total").textContent = total;

    /* Pila con las tres últimas fotos; la recién agregada entra con un pequeño salto */
    $("#barra-pila").innerHTML = ids.slice(-3).map((id) => {
      const p = porId.get(id);
      const nueva = cambio && cambio.tipo === "agregado" && cambio.id === id;
      return `<img class="${nueva ? "es-nueva" : ""}" src="${p.lamina || url(p.foto, 120)}" alt="" width="40" height="40">`;
    }).join("");

    $("#barra-items").innerHTML = ids.map((id, i) => {
      const p = porId.get(id);
      const f = familiaPorId.get(p.familia);
      return `<li class="barra__item" style="--campo: var(--c-${f.id}); --i: ${i}">
        <button class="barra__abrir" type="button" data-ficha="${p.id}" aria-label="Ver la ficha de ${nombreCompleto(p)}">
          <img src="${p.lamina || url(p.foto, 160)}" alt="" width="56" height="56" loading="lazy">
          <span class="barra__item-texto">
            <strong>${p.nombre}</strong>
            <small>${p.casa}${p.version ? ` · ${p.version}` : ""}</small>
            <span class="barra__familia">${f.nombre}</span>
          </span>
        </button>
        <button class="barra__quitar" type="button" data-quitar-lista="${p.id}" aria-label="Quitar ${nombreCompleto(p)} de la lista"><i class="ph ph-x" aria-hidden="true"></i></button>
      </li>`;
    }).join("");

    /* Aviso breve en la barra: "Agregaste Sauvage" y luego vuelve a "Ver tu lista" */
    const aviso = $("#barra-estado");
    if (cambio) {
      const p = porId.get(cambio.id);
      aviso.innerHTML = cambio.tipo === "agregado"
        ? `<i class="ph ph-check" aria-hidden="true"></i>Agregaste ${p.nombre}`
        : `Quitaste ${p.nombre}`;
      barra.classList.remove("avisando");
      void barra.offsetWidth;
      barra.classList.add("avisando");
      window.clearTimeout(relojAviso);
      relojAviso = window.setTimeout(() => {
        aviso.textContent = "Ver tu lista";
        barra.classList.remove("avisando");
      }, 2200);
    } else {
      aviso.textContent = "Ver tu lista";
    }
  }

  function alternar(id) {
    const tipo = estado.lista.has(id) ? "quitado" : "agregado";
    if (tipo === "quitado") estado.lista.delete(id);
    else estado.lista.add(id);
    guardarLista();
    pintarBotones();
    pintarLista({ tipo, id });
    actualizarPedido();
  }

  /* ---------- Inicio: fotos por familia, selector y perfume destacado ---------- */

  function pintarHero() {
    const capas = $("#capas");
    if (!capas) return;
    FAMILIAS.slice(1).forEach((f) => {
      capas.insertAdjacentHTML("beforeend", `
        <div class="hero__capa" data-familia="${f.id}">
          <img class="hero__foto" data-parallax="0.09" data-profundidad="-10" alt="${f.heroAlt}"
            src="${url(f.hero, 1600)}" srcset="${srcset(f.hero, [900, 1600, 2400])}" sizes="100vw"
            loading="lazy" style="object-position: ${f.heroPos}">
        </div>`);
    });

    $("#selector").innerHTML = FAMILIAS.map((f) => `
      <button class="selector__btn" type="button" data-familia="${f.id}" aria-pressed="${f.id === estado.familia}">${f.nombre}</button>`).join("");
  }

  function pintarDestacado() {
    const p = porId.get(familiaPorId.get(estado.familia).destacado);
    const caja = $("#destacado");
    if (!caja) return;
    caja.innerHTML = `
      <img class="destacado__foto" src="${url(p.foto, 400)}" srcset="${srcset(p.foto, [200, 400])}" sizes="7rem" alt="${nombreCompleto(p)}" width="216" height="216">
      <div class="destacado__texto">
        <h2 class="destacado__nombre">${nombreCompleto(p)}</h2>
        <p class="destacado__notas">Huele a ${resumenNotas(p)}.</p>
        <button class="agregar" type="button" data-id="${p.id}" aria-pressed="false"><i class="ph ph-plus" aria-hidden="true"></i><span>Agregar</span></button>
      </div>`;
    caja.classList.remove("cambia");
    void caja.offsetWidth;
    caja.classList.add("cambia");
    pintarBotones();
  }

  function activarFamilia(familia, elegidaPorUsuario) {
    estado.familia = familia;
    if (elegidaPorUsuario) estado.familiaElegida = true;
    document.body.dataset.familia = familia;
    $$(".hero__capa").forEach((capa) => capa.classList.toggle("es-activa", capa.dataset.familia === familia));
    $$(".selector__btn").forEach((btn) => btn.setAttribute("aria-pressed", String(btn.dataset.familia === familia)));
    pintarDestacado();
    actualizarPedido();
  }

  /* El inicio avanza solo hasta que la persona toca algo; nunca con "reducir movimiento" */
  function iniciarCarrusel() {
    const hero = $(".hero");
    if (menosMovimiento.matches || !hero) return;
    let enVista = true;
    let encima = false;
    let detenido = false;

    new IntersectionObserver(([entrada]) => { enVista = entrada.isIntersecting; }, { threshold: 0.4 }).observe(hero);
    hero.addEventListener("pointerenter", () => { encima = true; });
    hero.addEventListener("pointerleave", () => { encima = false; });
    hero.addEventListener("focusin", () => { detenido = true; });
    hero.addEventListener("click", () => { detenido = true; });

    const reloj = window.setInterval(() => {
      if (detenido) { window.clearInterval(reloj); return; }
      if (!enVista || encima || document.hidden) return;
      const i = FAMILIAS.findIndex((f) => f.id === estado.familia);
      activarFamilia(FAMILIAS[(i + 1) % FAMILIAS.length].id, false);
    }, 6500);
  }

  /* ---------- Pestañas ----------
     Inicio, Catálogo y Pedido viven en esta misma página. Cada pestaña tiene su dirección
     (#catalogo, #pedido) para que el botón "atrás" del navegador y los enlaces directos
     funcionen. Al cambiar de pestaña, la actual se desliza hacia un lado y la nueva entra
     por el otro, en el orden del menú.

     El catálogo es un recorrido de tres pasos: diseñador o árabes, la familia y el catálogo
     con esos filtros (#catalogo?origen=arabe&familia=orientales). "Ver todo" salta al paso 3. */

  const ORDEN_VISTAS = ["inicio", "catalogo", "pedido"];
  const TITULOS = {
    inicio: "Sensorial Boutique | Perfumes de diseñador y árabes",
    catalogo: "Catálogo | Sensorial Boutique",
    pedido: "Tu pedido | Sensorial Boutique",
  };
  const ORIGEN_URL = { "Diseñador": "disenador", "Árabe": "arabe" };
  const ORIGEN_DE_URL = { disenador: "Diseñador", arabe: "Árabe" };
  const contenedorVistas = $(".vistas");
  const recorrido = $("#vista-catalogo");
  let vistaActual = null;
  let rutaActual = { vista: "inicio" };

  const contar = (origen, familia) => PERFUMES.filter((p) =>
    (origen === "todos" || p.origen === origen) && (familia === "todas" || p.familia === familia)).length;
  const textoPerfumes = (n) => (n === 1 ? "1 perfume" : `${n} perfumes`);

  /* "#catalogo?origen=arabe" -> { vista: "catalogo", paso: "familia", origen: "Árabe", ... }.
     Devuelve null si el ancla no es una pestaña (por ejemplo, el enlace "Saltar al contenido"). */
  function rutaDeHash(hash) {
    const [nombre, consulta = ""] = (hash || "").replace(/^#/, "").split("?");
    if (nombre === "" || nombre === "inicio") return { vista: "inicio" };
    if (nombre === "pedido") return { vista: "pedido" };
    if (nombre !== "catalogo") return null;
    const q = new URLSearchParams(consulta);
    const origen = ORIGEN_DE_URL[q.get("origen")] || "todos";
    const familia = familiaPorId.has(q.get("familia")) ? q.get("familia") : (q.get("familia") === "todas" ? "todas" : null);
    if (q.has("todo") || (origen !== "todos" && familia)) {
      return { vista: "catalogo", paso: "catalogo", origen, familia: familia || "todas" };
    }
    if (origen !== "todos") return { vista: "catalogo", paso: "familia", origen, familia: "todas" };
    return { vista: "catalogo", paso: "origen", origen: "todos", familia: "todas" };
  }
  const leerRuta = () => rutaDeHash(location.hash);

  function hashDe(ruta) {
    if (ruta.vista === "pedido") return "#pedido";
    if (ruta.vista !== "catalogo") return "";
    const q = new URLSearchParams();
    if (ruta.paso === "catalogo" && ruta.origen === "todos") q.set("todo", "");
    if (ruta.origen !== "todos") q.set("origen", ORIGEN_URL[ruta.origen]);
    if (ruta.paso === "catalogo" && (ruta.familia !== "todas" || ruta.origen !== "todos")) q.set("familia", ruta.familia);
    const texto = q.toString().replace("todo=", "todo");
    return `#catalogo${texto ? `?${texto}` : ""}`;
  }
  const direccion = (ruta) => `${location.pathname}${location.search}${hashDe(ruta)}`;

  function tituloCatalogo({ origen, familia }) {
    const fam = familia !== "todas" ? familiaPorId.get(familia).nombre : null;
    const ori = origen === "Árabe" ? "árabes" : origen === "Diseñador" ? "de diseñador" : null;
    if (fam && ori) return `${fam} ${ori}`;
    if (fam) return `Perfumes ${fam.toLowerCase()}`;
    if (ori) return `Perfumes ${ori}`;
    return "Todo el catálogo";
  }

  /* Paso 2: las cuatro familias con cuántos perfumes tiene cada una para el origen elegido */
  function pintarEleccionFamilias(origen) {
    const lista = $("#eleccion-familias");
    if (!lista) return;
    lista.innerHTML = FAMILIAS.map((f, i) => {
      const n = contar(origen, f.id);
      return `
      <li class="familia" style="--i: ${i}">
        <button class="familia__tarjeta" type="button" data-elegir-familia="${f.id}"${n ? "" : ' aria-disabled="true"'}>
          <img src="${url(f.ingrediente, 900)}" srcset="${srcset(f.ingrediente, [500, 900, 1300])}"
            sizes="(max-width: 56rem) 50vw, 25vw" alt="${f.ingredienteAlt}" loading="lazy">
          <span class="familia__texto">
            <span class="familia__nombre">${f.nombre}<i class="ph ph-arrow-up-right" aria-hidden="true"></i></span>
            <span class="familia__desc">${f.desc}</span>
            <span class="familia__conteo">${n ? textoPerfumes(n) : "Sin perfumes por ahora"}</span>
          </span>
        </button>
      </li>`;
    }).join("");

    const etiqueta = origen === "Árabe" ? "árabes" : "de diseñador";
    $("#familia-sub").textContent = `Tenemos ${textoPerfumes(contar(origen, "todas"))} ${etiqueta}. Elige la familia que más te llame.`;
    $("#ver-todo-origen span").textContent = `Ver todos los perfumes ${etiqueta}`;
  }

  function pintarConteosOrigen() {
    $$("[data-conteo-origen]").forEach((el) => {
      el.textContent = textoPerfumes(contar(el.dataset.conteoOrigen, "todas"));
    });
  }

  /* Cambio de paso dentro del catálogo: el actual sale hacia un lado y el nuevo entra por
     el otro (hacia adelante, de derecha a izquierda). Sin animación cuando el catálogo
     está entrando como pestaña: ese deslizamiento ya basta. */
  const ORDEN_PASOS = ["origen", "familia", "catalogo"];
  let pasoEnCurso = 0;
  function mostrarPaso(id, animar) {
    const destino = $(`#paso-${id}`);
    const actual = $(".paso:not([hidden])");
    const destinoI = ORDEN_PASOS.indexOf(id);
    $$(".pasos-nav [data-ir-paso]").forEach((btn) => {
      const i = ORDEN_PASOS.indexOf(btn.dataset.irPaso);
      if (i === destinoI) btn.setAttribute("aria-current", "step");
      else btn.removeAttribute("aria-current");
      btn.classList.toggle("hecho", i < destinoI);
      btn.disabled = i > destinoI;
    });
    if (actual === destino) return;

    const sentido = actual && ORDEN_PASOS.indexOf(actual.id.replace("paso-", "")) > destinoI ? -1 : 1;
    recorrido.style.setProperty("--sentido", sentido);
    const turno = ++pasoEnCurso;
    let hecho = false;
    const entrar = () => {
      if (hecho || turno !== pasoEnCurso) return;
      hecho = true;
      $$(".paso").forEach((p) => { p.hidden = p !== destino; });
      destino.classList.remove("entra");
      if (!animar) return;
      void destino.offsetWidth;
      destino.classList.add("entra");
      window.scrollTo({ top: 0, behavior: "instant" });
    };
    if (!animar || !actual || menosMovimiento.matches || !actual.animate) {
      entrar();
      return;
    }
    const salida = actual.animate(
      [{ opacity: 1, transform: "none", filter: "blur(0)" }, { opacity: 0, transform: `translateX(${-sentido * 2.5}rem)`, filter: "blur(6px)" }],
      { duration: 260, easing: "cubic-bezier(0.4, 0, 1, 1)", fill: "forwards" },
    );
    salida.finished.then(() => { entrar(); salida.cancel(); }, entrar);
    window.setTimeout(() => { entrar(); salida.cancel(); }, 340);
  }

  /* Línea bajo la pestaña activa: se desliza hasta el enlace nuevo (solo transform) */
  function moverIndicador() {
    const indicador = $(".nav__indicador");
    const activo = $(".nav__enlaces [aria-current='page']");
    if (!indicador || !activo || !activo.offsetWidth) return;
    indicador.style.transform = `translateX(${activo.offsetLeft}px) scaleX(${activo.offsetWidth})`;
  }

  function marcarPestanas(id) {
    $$("[data-pestana]").forEach((enlace) => {
      if (enlace.dataset.pestana === id) enlace.setAttribute("aria-current", "page");
      else enlace.removeAttribute("aria-current");
    });
    moverIndicador();
  }

  /* Deslizamiento entre pestañas. Las dos comparten la misma celda de la rejilla mientras
     dura: la actual se va hacia un lado y la nueva entra por el otro. La página sube al
     principio sin que se note, porque la pestaña que sale se queda donde estaba. */
  let terminarCambio = null;
  function mostrarVista(id) {
    const destino = $(`#vista-${id}`);
    const anterior = vistaActual;
    marcarPestanas(id);
    if (anterior === id) return;
    if (terminarCambio) terminarCambio();

    vistaActual = id;
    document.body.dataset.vista = id;
    document.title = TITULOS[id];
    cerrarPanelLista();
    cerrarNotas();
    mostrarBarra();

    const actual = anterior ? $(`#vista-${anterior}`) : null;
    if (!actual) {
      $$(".pestana").forEach((vista) => { vista.hidden = vista !== destino; });
      return;
    }
    /* Las entradas del inicio solo se ven la primera vez */
    document.documentElement.classList.add("listo");

    const limpiar = () => {
      actual.hidden = true;
      actual.style.translate = "";
      $$(".entra", actual).forEach((el) => el.classList.remove("entra"));
      contenedorVistas.classList.remove("cambiando");
    };
    const y = window.scrollY;
    destino.hidden = false;
    window.scrollTo({ top: 0, behavior: "instant" });
    destino.focus({ preventScroll: true });

    if (menosMovimiento.matches || !destino.animate) {
      limpiar();
      return;
    }

    const sentido = ORDEN_VISTAS.indexOf(id) > ORDEN_VISTAS.indexOf(anterior) ? 1 : -1;
    actual.style.translate = `0 ${-y}px`;
    contenedorVistas.classList.add("cambiando");
    const tiempo = { duration: 820, easing: "cubic-bezier(0.7, 0, 0.2, 1)" };
    const sale = actual.animate(
      [{ transform: "translateX(0)", opacity: 1 }, { transform: `translateX(${-sentido * 100}%)`, opacity: 0.2 }],
      { ...tiempo, fill: "forwards" },
    );
    const entra = destino.animate(
      [{ transform: `translateX(${sentido * 100}%)`, opacity: 0.2 }, { transform: "translateX(0)", opacity: 1 }],
      tiempo,
    );
    let hecho = false;
    const fin = () => {
      if (hecho) return;
      hecho = true;
      terminarCambio = null;
      sale.cancel();
      entra.cancel();
      limpiar();
    };
    terminarCambio = fin;
    entra.finished.then(fin, fin);
    window.setTimeout(fin, 1100);
  }

  /* El enlace "Catálogo" del menú recuerda en qué paso quedó la persona */
  function recordarCatalogo(ruta) {
    const enlace = $("[data-pestana='catalogo']");
    if (enlace) enlace.setAttribute("href", hashDe(ruta));
  }

  function aplicarRuta(ruta) {
    const cambiaVista = ruta.vista !== vistaActual;
    rutaActual = ruta;
    if (ruta.vista === "catalogo") {
      recorrido.dataset.paso = ruta.paso;
      if (ruta.paso === "familia") pintarEleccionFamilias(ruta.origen);
      if (ruta.paso === "catalogo") {
        estado.filtros = { familia: ruta.familia, origen: ruta.origen };
        aplicarFiltros();
      }
      mostrarPaso(ruta.paso, !cambiaVista);
      recordarCatalogo(ruta);
    }
    mostrarVista(ruta.vista);
  }

  function irA(ruta) {
    const destino = direccion(ruta);
    const yaAqui = destino === `${location.pathname}${location.search}${location.hash}`
      || (ruta.vista === "inicio" && vistaActual === "inicio");
    if (yaAqui) {
      window.scrollTo({ top: 0, behavior: menosMovimiento.matches ? "auto" : "smooth" });
      return;
    }
    history.pushState(null, "", destino);
    aplicarRuta(ruta);
  }

  function iniciarPestanas() {
    pintarConteosOrigen();
    const ruta = leerRuta() || { vista: "inicio" };
    history.replaceState(null, "", direccion(ruta));
    aplicarRuta(ruta);

    window.addEventListener("popstate", () => {
      const nueva = leerRuta();
      if (nueva) aplicarRuta(nueva);
    });

    /* Los enlaces internos (#catalogo, #pedido...) cambian de pestaña sin recargar */
    document.addEventListener("click", (evento) => {
      const enlace = evento.target.closest("a[href^='#']");
      if (!enlace || evento.defaultPrevented || evento.button !== 0
        || evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey) return;
      const destino = rutaDeHash(enlace.getAttribute("href"));
      if (!destino) return;
      evento.preventDefault();
      cerrarSugerencias();
      irA(destino);
    });

    const indicador = $(".nav__indicador");
    const activar = () => {
      moverIndicador();
      window.requestAnimationFrame(() => indicador && indicador.classList.add("listo"));
    };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(activar, activar);
    else activar();
    window.addEventListener("resize", moverIndicador);
  }

  /* ---------- Inicio: selección en una fila que se desliza ---------- */

  function pintarRiel() {
    const riel = $("#riel");
    if (!riel) return;
    const ids = [...new Set([...FAMILIAS.map((f) => f.destacado), ...PERFUMES.map((p) => p.id)])].slice(0, 8);
    riel.innerHTML = ids.map((id, i) => {
      const p = porId.get(id);
      const f = familiaPorId.get(p.familia);
      const juego = esUnsplash(p.foto) ? ` srcset="${srcset(p.foto, [400, 700, 1000])}" sizes="(max-width: 40rem) 72vw, 20rem"` : "";
      return `
      <li class="riel__item" style="--campo: var(--c-${f.id}); --i: ${i}">
        <button class="riel__foto" type="button" data-ficha="${p.id}" aria-label="Ver la ficha de ${nombreCompleto(p)}">
          <img src="${url(p.foto, 700)}"${juego} alt="" loading="lazy">
        </button>
        <div class="riel__texto">
          <div>
            <p class="riel__familia">${f.nombre}${p.origen === "Árabe" ? " · Árabe" : ""}</p>
            <h3>${p.nombre}</h3>
            <p class="riel__casa">${p.casa}</p>
          </div>
          <button class="agregar" type="button" data-id="${p.id}" aria-pressed="false"><i class="ph ph-plus" aria-hidden="true"></i><span>Agregar</span></button>
        </div>
      </li>`;
    }).join("");

    const flechas = $$("[data-riel]");
    const actualizar = () => {
      const fin = riel.scrollWidth - riel.clientWidth - 4;
      flechas.forEach((btn) => {
        btn.disabled = btn.dataset.riel === "-1" ? riel.scrollLeft <= 4 : riel.scrollLeft >= fin;
      });
    };
    riel.addEventListener("scroll", actualizar, { passive: true });
    window.addEventListener("resize", actualizar);
    actualizar();
  }

  function moverRiel(sentido) {
    const riel = $("#riel");
    const paso = riel.querySelector(".riel__item");
    const ancho = paso ? paso.getBoundingClientRect().width + 16 : riel.clientWidth * 0.8;
    riel.scrollBy({ left: sentido * ancho * 2, behavior: menosMovimiento.matches ? "auto" : "smooth" });
  }

  /* ---------- Catálogo ---------- */

  function ficha(p) {
    const imagen = p.lamina
      ? `<img src="${p.lamina}" alt="${nombreCompleto(p)} rodeado de sus notas" loading="lazy" width="1080" height="1080">`
      : `<img src="${url(p.foto, 800)}" srcset="${srcset(p.foto, [500, 800, 1200])}" sizes="(max-width: 40rem) 80vw, (max-width: 72rem) 45vw, 24rem" alt="${nombreCompleto(p)}" loading="lazy">`;
    return `
      <li class="ficha" data-familia="${p.familia}" data-origen="${p.origen}">
        <button class="ficha__abrir" type="button" data-ficha="${p.id}" aria-label="Ver la ficha de ${nombreCompleto(p)}">
          <span class="ficha__lamina${p.lamina ? " ficha__lamina--compuesta" : ""}">${imagen}</span>
        </button>
        <div class="ficha__cuerpo">
          <div class="ficha__cabeza">
            <div>
              <h4 class="ficha__nombre"><button class="ficha__titulo" type="button" data-ficha="${p.id}">${p.nombre}</button></h4>
              <p class="ficha__casa">${p.casa}${p.origen === "Árabe" ? " · Árabe" : ""}</p>
            </div>
            <button class="agregar" type="button" data-id="${p.id}" aria-pressed="false"><i class="ph ph-plus" aria-hidden="true"></i><span>Agregar</span></button>
          </div>
          <ul class="ficha__principales" aria-label="Notas principales">
            ${notasPrincipales(p).map((nota) => `<li><i class="ph ${iconoNota(nota)}" aria-hidden="true"></i>${mayuscula(nota)}</li>`).join("")}
          </ul>
          <button class="ficha__mas" type="button" aria-expanded="false" aria-controls="notas-${p.id}">Ver todas las notas<i class="ph ph-caret-down" aria-hidden="true"></i></button>
          <div class="ficha__todas" id="notas-${p.id}">
            <div>
              <dl>
                <div><dt>Al inicio</dt><dd>${p.notas.salida}</dd></div>
                <div><dt>Después</dt><dd>${p.notas.corazon}</dd></div>
                <div><dt>Al final</dt><dd>${p.notas.fondo}</dd></div>
              </dl>
            </div>
          </div>
        </div>
      </li>`;
  }

  /* Un capítulo de color por familia, con sus perfumes dentro */
  function pintarCatalogo() {
    if (!$("#capitulos")) return;
    $("#capitulos").innerHTML = FAMILIAS.map((f) => {
      const perfumes = PERFUMES.filter((p) => p.familia === f.id);
      return `
        <section class="capitulo revelar" data-capitulo="${f.id}" aria-labelledby="capitulo-${f.id}"
          style="--campo: var(--c-${f.id}); --tono: var(--t-${f.id}); --n: ${Math.min(Math.max(perfumes.length, 1), 4)}">
          <div class="capitulo__cabecera">
            <img class="capitulo__muestra" src="${url(f.ingrediente, 240)}" alt="" width="68" height="68" loading="lazy">
            <div>
              <h3 class="capitulo__titulo" id="capitulo-${f.id}">${f.nombre}</h3>
              <p class="capitulo__desc">${f.larga}</p>
            </div>
            <span class="capitulo__conteo"></span>
          </div>
          <ul class="fichas">${perfumes.map(ficha).join("")}</ul>
        </section>`;
    }).join("");
  }

  function aplicarFiltros() {
    if (!$("#capitulos")) return;
    const { familia, origen } = estado.filtros;
    let visibles = 0;
    $$(".ficha").forEach((ficha) => {
      const pasa = (familia === "todas" || ficha.dataset.familia === familia)
        && (origen === "todos" || ficha.dataset.origen === origen);
      ficha.hidden = !pasa;
      if (pasa) visibles += 1;
    });
    $$(".capitulo").forEach((capitulo) => {
      const n = $$(".ficha:not([hidden])", capitulo).length;
      capitulo.hidden = n === 0;
      $(".capitulo__conteo", capitulo).textContent = n === 1 ? "1 perfume" : `${n} perfumes`;
    });
    $$(".chip").forEach((chip) => {
      chip.setAttribute("aria-pressed", String(estado.filtros[chip.dataset.grupo] === chip.dataset.valor));
    });
    $("#conteo").textContent = textoPerfumes(visibles);
    $("#vacio").hidden = visibles > 0;
    const titulo = $("#titulo-catalogo");
    if (titulo) titulo.textContent = tituloCatalogo(estado.filtros);
  }

  /* Los filtros del catálogo actualizan la dirección sin crear pasos nuevos en el historial */
  function sincronizarDireccion() {
    if (vistaActual !== "catalogo" || recorrido.dataset.paso !== "catalogo") return;
    const ruta = { vista: "catalogo", paso: "catalogo", origen: estado.filtros.origen, familia: estado.filtros.familia };
    rutaActual = ruta;
    history.replaceState(null, "", direccion(ruta));
    recordarCatalogo(ruta);
  }

  /* ---------- Sugerencias de búsqueda ---------- */

  const campoBusqueda = $("#buscar-campo");
  const panelSugerencias = $("#buscar-sugerencias");
  const veloBusqueda = $("#buscar-velo");

  /* Al enfocar, la barra crece (transición CSS de ancho) y justo después el velo difumina la
     página de forma gradual. Al cerrar ocurre al revés: primero se va el velo y luego la barra
     vuelve a su tamaño. */
  function abrirBusqueda() {
    document.body.classList.add("buscando");
    veloBusqueda.classList.add("es-activo");
  }

  function cerrarSugerencias() {
    panelSugerencias.hidden = true;
    campoBusqueda.setAttribute("aria-expanded", "false");
    campoBusqueda.value = "";
    veloBusqueda.classList.remove("es-activo");
    document.body.classList.remove("buscando");
  }

  function pintarSugerencias() {
    const consulta = sinAcentos(campoBusqueda.value.trim());
    if (!consulta) {
      panelSugerencias.hidden = true;
      campoBusqueda.setAttribute("aria-expanded", "false");
      return;
    }
    const resultados = PERFUMES.filter((p) =>
      sinAcentos(`${p.casa} ${p.nombre} ${p.version || ""} ${p.origen}`).includes(consulta)
    ).slice(0, 5);
    panelSugerencias.innerHTML = resultados.length
      ? resultados.map((p) => `
        <button class="buscar__sugerencia" type="button" data-sugerencia="${p.id}">
          <img src="${p.lamina || url(p.foto, 160)}" alt="" width="52" height="52" loading="lazy">
          <span><strong>${p.nombre}</strong><small>${p.casa} · ${p.version || p.origen}</small></span>
        </button>`).join("")
      : `<p class="buscar__sin-resultados">No encontramos perfumes con ese nombre.</p>`;
    panelSugerencias.hidden = false;
    campoBusqueda.setAttribute("aria-expanded", "true");
  }

  /* ---------- Aparición al hacer scroll ---------- */

  function observarRevelados() {
    const elementos = $$(".revelar");
    if (!("IntersectionObserver" in window)) {
      elementos.forEach((el) => el.classList.add("vista"));
      return;
    }
    const observador = new IntersectionObserver((entradas) => {
      entradas.forEach((entrada) => {
        if (!entrada.isIntersecting) return;
        entrada.target.classList.add("vista");
        observador.unobserve(entrada.target);
      });
    }, { rootMargin: "0px 0px -6% 0px" });
    elementos.forEach((el) => observador.observe(el));
  }

  /* ---------- Parallax ----------
     Cada elemento con data-parallax se desplaza según la posición de su marco en la ventana.
       valor <= 1  -> fracción del alto del marco (fotos dentro de un marco con recorte)
       valor > 1   -> píxeles (tarjetas que flotan a otra profundidad; negativo invierte el sentido)
     data-profundidad suma el movimiento del puntero dentro del inicio.
     Solo corre en escritorio mientras hay algo en pantalla y se apaga con "reducir movimiento". */

  function iniciarParallax() {
    if (menosMovimiento.matches || !("IntersectionObserver" in window)) return;

    const piezas = $$("[data-parallax]").map((el) => ({
      el,
      marco: el.closest("[data-marco]") || el.parentElement,
      valor: parseFloat(el.dataset.parallax),
      profundidad: parseFloat(el.dataset.profundidad || "0"),
      soloEscritorio: "soloEscritorio" in el.dataset,
      x: 0,
      y: 0,
      visible: false,
    }));
    const escritorio = window.matchMedia("(min-width: 40.01rem)");
    const movil = window.matchMedia("(max-width: 56rem)");
    const puntero = { x: 0, y: 0 };
    let cuadroPendiente = 0;

    const limitar = (n, min, max) => Math.min(max, Math.max(min, n));

    function cuadro() {
      cuadroPendiente = 0;
      if (movil.matches) return;
      const alto = window.innerHeight;
      let algoVisible = false;

      for (const pieza of piezas) {
        if (!pieza.visible) continue;
        algoVisible = true;
        if (pieza.soloEscritorio && !escritorio.matches) {
          pieza.el.style.transform = "";
          continue;
        }
        const caja = pieza.marco.getBoundingClientRect();
        const avance = limitar((caja.top + caja.height / 2 - alto / 2) / (alto / 2 + caja.height / 2), -1, 1);
        const rango = Math.abs(pieza.valor) <= 1 ? pieza.valor * caja.height : pieza.valor;
        const destinoY = -avance * rango + puntero.y * pieza.profundidad;
        const destinoX = puntero.x * pieza.profundidad;
        pieza.x += (destinoX - pieza.x) * 0.09;
        pieza.y += (destinoY - pieza.y) * 0.09;
        pieza.el.style.transform = `translate3d(${pieza.x.toFixed(2)}px, ${pieza.y.toFixed(2)}px, 0)`;
      }

      if (algoVisible) cuadroPendiente = window.requestAnimationFrame(cuadro);
    }

    const observador = new IntersectionObserver((entradas) => {
      entradas.forEach((entrada) => {
        piezas.forEach((pieza) => {
          if (pieza.marco === entrada.target) pieza.visible = entrada.isIntersecting;
        });
      });
      if (!movil.matches && !cuadroPendiente && piezas.some((p) => p.visible)) {
        cuadroPendiente = window.requestAnimationFrame(cuadro);
      }
    }, { rootMargin: "15% 0px" });
    new Set(piezas.map((p) => p.marco)).forEach((marco) => observador.observe(marco));

    movil.addEventListener("change", () => {
      if (movil.matches) {
        if (cuadroPendiente) window.cancelAnimationFrame(cuadroPendiente);
        cuadroPendiente = 0;
        piezas.forEach((pieza) => {
          pieza.x = 0;
          pieza.y = 0;
          pieza.el.style.transform = "";
        });
      } else if (piezas.some((pieza) => pieza.visible)) {
        cuadroPendiente = window.requestAnimationFrame(cuadro);
      }
    });

    const hero = $(".hero");
    if (hero && window.matchMedia("(pointer: fine)").matches) {
      hero.addEventListener("pointermove", (evento) => {
        const caja = hero.getBoundingClientRect();
        puntero.x = ((evento.clientX - caja.left) / caja.width) * 2 - 1;
        puntero.y = ((evento.clientY - caja.top) / caja.height) * 2 - 1;
      });
      hero.addEventListener("pointerleave", () => {
        puntero.x = 0;
        puntero.y = 0;
      });
    }
  }

  /* ---------- Ficha del perfume ----------
     Ventana con toda la información de un perfume. La imagen vuela desde la tarjeta
     hasta su lugar en la ficha; el resto entra con animaciones CSS. */

  const detalle = $("#detalle");
  const enEscritorio = window.matchMedia("(min-width: 40.01rem)");
  let tarjetaOrigen = null;

  const MOMENTOS_USO = [
    ["Invierno", "ph-snowflake"],
    ["Primavera", "ph-flower"],
    ["Verano", "ph-umbrella"],
    ["Otoño", "ph-leaf"],
    ["Día", "ph-sun"],
    ["Noche", "ph-moon-stars"],
  ];

  /* Texto oscuro o claro según lo luminoso que sea el color del acorde */
  const textoSobre = (rgb) => {
    const [r, g, b] = rgb.split(",").map(Number);
    return (0.299 * r + 0.587 * g + 0.114 * b) > 150 ? "oklch(0.2 0.015 270)" : "oklch(0.99 0.003 95)";
  };

  const chipsDeNotas = (texto) => texto.split(",").map((n) => n.trim()).filter(Boolean)
    .map((nota) => `<li class="notachip"><i class="ph ${iconoNota(nota)}" aria-hidden="true"></i>${mayuscula(nota)}</li>`).join("");

  let relojDetalle = null;
  let diapositivaDetalle = 0;

  function mostrarDiapositiva(indice) {
    const fotos = $$(".detalle__foto", detalle);
    if (!fotos.length) return;
    diapositivaDetalle = (indice + fotos.length) % fotos.length;
    fotos.forEach((foto, i) => {
      const activa = i === diapositivaDetalle;
      foto.classList.toggle("es-activa", activa);
      foto.setAttribute("aria-hidden", String(!activa));
    });
    $$(".detalle__puntos button", detalle).forEach((punto, i) => {
      punto.setAttribute("aria-current", String(i === diapositivaDetalle));
    });
  }

  function iniciarCarruselDetalle() {
    if (relojDetalle) window.clearInterval(relojDetalle);
    relojDetalle = null;
    if (!detalle.open || menosMovimiento.matches || $$(".detalle__foto", detalle).length < 2) return;
    relojDetalle = window.setInterval(() => {
      if (document.hidden || !detalle.open) return;
      mostrarDiapositiva(diapositivaDetalle + 1);
    }, 5000);
  }

  function pintarDetalle(p) {
    const f = familiaPorId.get(p.familia);
    const otros = PERFUMES.filter((o) => o.familia === p.familia && o.id !== p.id).slice(0, 3);
    const texto = `Hola ${CONFIG.marca}, me interesa ${nombreCompleto(p)}. ¿Me pasan precio y disponibilidad?`;
    const enlace = `https://wa.me/${CONFIG.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(texto)}`;
    const fotos = [
      {
        src: p.lamina || url(p.foto, 1000),
        srcset: p.lamina ? "" : srcset(p.foto, [600, 1000, 1400]),
        alt: nombreCompleto(p),
        compuesta: Boolean(p.lamina),
      },
      ...(p.galeria || []),
    ];
    const imagenes = fotos.map((foto, i) => `<img class="detalle__foto${i === 0 ? " es-activa" : ""}${foto.compuesta ? " detalle__foto--compuesta" : ""}"
      src="${foto.src}"${foto.srcset ? ` srcset="${foto.srcset}" sizes="(max-width: 40rem) 100vw, 45vw"` : ""}
      alt="${foto.alt}" aria-hidden="${i !== 0}"${i ? " loading=\"lazy\"" : ""}>`).join("");

    detalle.style.setProperty("--campo", `var(--c-${f.id})`);
    detalle.style.setProperty("--tono", `var(--t-${f.id})`);
    detalle.innerHTML = `
      <button class="detalle__cerrar" type="button" aria-label="Cerrar la ficha"><i class="ph ph-x" aria-hidden="true"></i></button>
      <div class="detalle__panel">
        <div class="detalle__visual">
          <div class="detalle__lamina">${imagenes}</div>
          ${fotos.length > 1 ? `<div class="detalle__carrusel" aria-label="Galería de ${nombreCompleto(p)}">
            <button type="button" data-diapo="anterior" aria-label="Foto anterior"><i class="ph ph-arrow-left" aria-hidden="true"></i></button>
            <div class="detalle__puntos">${fotos.map((_, i) => `<button type="button" data-diapo="${i}" aria-label="Ver foto ${i + 1} de ${fotos.length}" aria-current="${i === 0}"></button>`).join("")}</div>
            <button type="button" data-diapo="siguiente" aria-label="Foto siguiente"><i class="ph ph-arrow-right" aria-hidden="true"></i></button>
          </div>` : ""}
        </div>
        <div class="detalle__info">
          <p class="detalle__meta" style="--i: 0"><span class="detalle__etiqueta">${f.nombre}</span><span>${p.casa} · ${p.origen}</span>${p.version ? `<span class="detalle__version">${p.version}</span>` : ""}</p>
          <h2 id="detalle-nombre" style="--i: 1">${p.nombre}</h2>
          <p class="detalle__huele" style="--i: 2">Huele a ${resumenNotas(p)}.</p>
          <p class="detalle__familia" style="--i: 3"><strong>Familia ${f.nombre.toLowerCase()}.</strong> ${f.larga}</p>
          <div class="detalle__momentos" style="--i: 4">
            <div class="momento">
              <div><h3>Al inicio</h3><p>Lo primero que se siente</p></div>
              <ul>${chipsDeNotas(p.notas.salida)}</ul>
            </div>
            <div class="momento">
              <div><h3>Después</h3><p>El aroma principal</p></div>
              <ul>${chipsDeNotas(p.notas.corazon)}</ul>
            </div>
            <div class="momento">
              <div><h3>Al final</h3><p>Lo que queda en la piel</p></div>
              <ul>${chipsDeNotas(p.notas.fondo)}</ul>
            </div>
          </div>
          <div class="detalle__acciones" style="--i: 5">
            <button class="agregar" type="button" data-id="${p.id}" data-largo aria-pressed="false"><i class="ph ph-plus" aria-hidden="true"></i><span>Agregar a mi lista</span></button>
            <a class="btn" href="${enlace}" target="_blank" rel="noopener"><i class="ph ph-whatsapp-logo" aria-hidden="true"></i>Pedir por WhatsApp</a>
          </div>
          ${p.acordes && p.acordes.length ? `
          <div class="detalle__bloque" style="--i: 6">
            <h3>Acordes principales</h3>
            <ul class="acordes">
              ${p.acordes.map(([nombre, fuerza, color], n) => `<li style="--ancho: ${fuerza}%; --color: rgb(${color}); --texto: ${textoSobre(color)}; --n: ${n}"><span>${mayuscula(nombre)}</span></li>`).join("")}
            </ul>
          </div>` : ""}
          ${p.uso ? `
          <div class="detalle__bloque" style="--i: 7">
            <h3>Cuándo usarlo</h3>
            <ul class="uso">
              ${MOMENTOS_USO.map(([nombre, icono], i) => `<li><i class="ph ${icono}" aria-hidden="true"></i><span>${nombre}</span><span class="uso__barra" role="img" aria-label="${nombre}: ${p.uso[i]} de 100"><span style="--nivel: ${p.uso[i]}%; --n: ${i}"></span></span></li>`).join("")}
            </ul>
          </div>` : ""}
          ${otros.length ? `
          <div class="detalle__otros" style="--i: 8">
            <h3>También en ${f.nombre.toLowerCase()}</h3>
            <ul>
              ${otros.map((o) => `<li><button class="otro" type="button" data-ficha="${o.id}"><img src="${o.lamina || url(o.foto, 160)}" alt="" width="40" height="40">${o.nombre}</button></li>`).join("")}
            </ul>
          </div>` : ""}
          ${p.fuente ? `<p class="detalle__fuente" style="--i: 9">Notas, acordes y uso según <a href="${p.fuente}" target="_blank" rel="noopener">Fragrantica</a>.</p>` : ""}
        </div>
      </div>`;
    pintarBotones();
  }

  /* La imagen de la tarjeta "vuela" hasta la ficha: se anima una copia fija y luego se retira */
  function volarImagen(desde) {
    const lamina = $(".detalle__lamina", detalle);
    if (!desde || !lamina || menosMovimiento.matches || !enEscritorio.matches || !lamina.animate) return;
    const a = desde.getBoundingClientRect();
    const b = lamina.getBoundingClientRect();
    if (!a.width || !b.width) return;

    const copia = lamina.cloneNode(true);
    copia.classList.add("detalle__vuelo");
    Object.assign(copia.style, { left: `${b.left}px`, top: `${b.top}px`, width: `${b.width}px`, height: `${b.height}px` });
    detalle.append(copia);
    lamina.style.visibility = "hidden";

    const terminar = () => {
      copia.remove();
      lamina.style.visibility = "";
    };
    const vuelo = copia.animate(
      [
        { transform: `translate(${a.left - b.left}px, ${a.top - b.top}px) scale(${a.width / b.width})` },
        { transform: "none" },
      ],
      { duration: 700, easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
    );
    vuelo.finished.then(terminar, terminar);
    window.setTimeout(terminar, 1000);
  }

  /* Las barras de acordes y de "cuándo usarlo" no se animan al abrir la ficha, sino cuando
     la persona desliza y su bloque queda a la vista */
  let observadorBloques = null;
  function observarBloques() {
    const bloques = $$(".detalle__bloque", detalle);
    if (observadorBloques) observadorBloques.disconnect();
    if (menosMovimiento.matches || !("IntersectionObserver" in window)) {
      bloques.forEach((bloque) => bloque.classList.add("es-visible"));
      return;
    }
    observadorBloques = new IntersectionObserver((entradas) => {
      entradas.forEach((entrada) => {
        if (!entrada.isIntersecting) return;
        entrada.target.classList.add("es-visible");
        observadorBloques.unobserve(entrada.target);
      });
    }, { threshold: 0.4 });
    bloques.forEach((bloque) => observadorBloques.observe(bloque));
  }

  function abrirDetalle(id, desde) {
    const p = porId.get(id);
    if (!p || !detalle) return;
    const yaAbierta = detalle.open;
    pintarDetalle(p);
    diapositivaDetalle = 0;
    if (yaAbierta) {
      $(".detalle__info", detalle).scrollTop = 0;
      detalle.scrollTop = 0;
      observarBloques();
      iniciarCarruselDetalle();
      return;
    }
    tarjetaOrigen = document.activeElement;
    detalle.classList.remove("es-cerrando");
    if (typeof detalle.showModal === "function") detalle.showModal();
    else detalle.setAttribute("open", "");
    observarBloques();
    volarImagen(desde);
    iniciarCarruselDetalle();
  }

  function cerrarDetalle() {
    if (!detalle.open || detalle.classList.contains("es-cerrando")) return;
    if (relojDetalle) window.clearInterval(relojDetalle);
    relojDetalle = null;
    const cerrar = () => {
      detalle.classList.remove("es-cerrando");
      if (typeof detalle.close === "function") detalle.close();
      else detalle.removeAttribute("open");
      if (tarjetaOrigen && tarjetaOrigen.focus) tarjetaOrigen.focus();
      cerrarSugerencias();
    };
    if (menosMovimiento.matches) {
      cerrar();
      return;
    }
    detalle.classList.add("es-cerrando");
    window.setTimeout(cerrar, 240);
  }

  if (detalle) {
    /* Esc cierra con la misma animación; un clic fuera de la ficha también */
    detalle.addEventListener("cancel", (evento) => {
      evento.preventDefault();
      cerrarDetalle();
    });
    detalle.addEventListener("click", (evento) => {
      if (evento.target === detalle) cerrarDetalle();
    });
    menosMovimiento.addEventListener("change", iniciarCarruselDetalle);
  }

  /* ---------- Intro ----------
     La animación es CSS y se retira sola. Aquí se bloquea la página mientras dura
     y se libera (scroll, clics y teclado) cuando termina. */

  function iniciarIntro() {
    const raiz = document.documentElement;
    const intro = $("#intro");
    if (!intro || !raiz.classList.contains("con-intro")) return;

    /* Mientras dura, la página queda bloqueada: la intro tapa todos los clics y el
       contenido se marca inerte para que tampoco responda al teclado. No se puede saltar. */
    const hoja = $(".hoja");
    const barra = $("#barra");
    hoja.inert = true;
    barra.inert = true;

    let liberada = false;
    const liberar = () => {
      if (liberada) return;
      liberada = true;
      raiz.classList.remove("intro-activa");
      hoja.inert = false;
      mostrarBarra();
    };
    intro.addEventListener("animationend", (evento) => {
      if (evento.animationName === "intro-desvanece") liberar();
    });
    /* Respaldo por si el navegador no avisa del final de la animación */
    window.setTimeout(liberar, 4800);
  }

  /* ---------- Eventos ---------- */

  /* Cierra las notas desplegadas de cualquier tarjeta */
  function cerrarNotas() {
    $$(".ficha.es-abierta").forEach((tarjeta) => {
      tarjeta.classList.remove("es-abierta");
      const btn = $(".ficha__mas", tarjeta);
      btn.setAttribute("aria-expanded", "false");
      btn.firstChild.textContent = "Ver todas las notas";
    });
  }

  /* Un clic fuera de la tarjeta abierta (en cualquier otra cosa) o la tecla Esc las cierra */
  document.addEventListener("click", (evento) => {
    const abierta = $(".ficha.es-abierta");
    if (abierta && !abierta.contains(evento.target)) cerrarNotas();
  }, true);
  document.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape" && !(detalle && detalle.open)) cerrarNotas();
  });

  document.addEventListener("click", (evento) => {
    const boton = evento.target.closest("button");
    if (!boton) return;

    if (boton.dataset.quitarLista) {
      if (estado.lista.has(boton.dataset.quitarLista)) alternar(boton.dataset.quitarLista);
    } else if (boton.id === "mostrar-lista") {
      if (panelListaAbierto()) cerrarPanelLista();
      else abrirPanelLista();
    } else if (boton.id === "cerrar-lista") {
      cerrarPanelLista();
    } else if (boton.classList.contains("pregunta__boton")) {
      alternarPregunta(boton);
    } else if (boton.dataset.elegirOrigen) {
      irA({ vista: "catalogo", paso: "familia", origen: boton.dataset.elegirOrigen, familia: "todas" });
    } else if (boton.dataset.elegirFamilia) {
      if (boton.getAttribute("aria-disabled") === "true") return;
      irA({ vista: "catalogo", paso: "catalogo", origen: rutaActual.origen, familia: boton.dataset.elegirFamilia });
    } else if (boton.id === "ver-todo-origen") {
      irA({ vista: "catalogo", paso: "catalogo", origen: rutaActual.origen, familia: "todas" });
    } else if ("verTodo" in boton.dataset) {
      irA({ vista: "catalogo", paso: "catalogo", origen: "todos", familia: "todas" });
    } else if (boton.dataset.irPaso) {
      if (boton.dataset.irPaso === "origen") irA({ vista: "catalogo", paso: "origen", origen: "todos", familia: "todas" });
      else if (boton.dataset.irPaso === "familia" && rutaActual.origen !== "todos") {
        irA({ vista: "catalogo", paso: "familia", origen: rutaActual.origen, familia: "todas" });
      }
    } else if (boton.dataset.riel) {
      moverRiel(Number(boton.dataset.riel));
    } else if (boton.dataset.sugerencia) {
      const p = porId.get(boton.dataset.sugerencia);
      if (!p) return;
      cerrarSugerencias();
      abrirDetalle(p.id, null);
      tarjetaOrigen = campoBusqueda;
    } else if (boton.dataset.diapo !== undefined) {
      const destino = boton.dataset.diapo === "anterior" ? diapositivaDetalle - 1
        : boton.dataset.diapo === "siguiente" ? diapositivaDetalle + 1 : Number(boton.dataset.diapo);
      mostrarDiapositiva(destino);
      iniciarCarruselDetalle();
    } else if (boton.dataset.id) {
      alternar(boton.dataset.id);
    } else if (boton.dataset.ficha) {
      if (boton.closest(".barra")) cerrarPanelLista();
      const tarjeta = boton.closest(".ficha, .riel__item, .pedido__item");
      abrirDetalle(boton.dataset.ficha, tarjeta ? $(".ficha__lamina, .riel__foto, .pedido__foto", tarjeta) : null);
    } else if (boton.classList.contains("detalle__cerrar")) {
      cerrarDetalle();
    } else if (boton.classList.contains("ficha__mas")) {
      /* Solo una tarjeta abierta a la vez: al abrir otra, la anterior se cierra */
      const tarjeta = boton.closest(".ficha");
      const abrir = !tarjeta.classList.contains("es-abierta");
      cerrarNotas();
      if (abrir) {
        tarjeta.classList.add("es-abierta");
        boton.setAttribute("aria-expanded", "true");
        boton.firstChild.textContent = "Ocultar notas";
      }
    } else if (boton.classList.contains("selector__btn")) {
      activarFamilia(boton.dataset.familia, true);
    } else if (boton.classList.contains("chip")) {
      estado.filtros[boton.dataset.grupo] = boton.dataset.valor;
      aplicarFiltros();
      sincronizarDireccion();
    } else if (boton.id === "quitar-filtros") {
      estado.filtros = { familia: "todas", origen: "todos" };
      aplicarFiltros();
      sincronizarDireccion();
    } else if (boton.id === "vaciar" || boton.id === "vaciar-pedido") {
      estado.lista.clear();
      guardarLista();
      pintarBotones();
      pintarLista(null);
      actualizarPedido();
    }
  });

  /* El panel de la lista se cierra al tocar fuera de la barra o con Esc */
  document.addEventListener("pointerdown", (evento) => {
    const barra = $("#barra");
    if (barra && panelListaAbierto() && !barra.contains(evento.target)) cerrarPanelLista();
  });
  document.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape" && $("#barra") && panelListaAbierto() && !(detalle && detalle.open)) cerrarPanelLista();
  });

  /* ---------- Preguntas frecuentes ----------
     Acordeón con altura animada (la respuesta pasa de 0fr a 1fr). Solo una abierta a la vez. */
  function alternarPregunta(boton) {
    const abrir = boton.getAttribute("aria-expanded") !== "true";
    $$(".pregunta__boton[aria-expanded='true']").forEach((otro) => {
      otro.setAttribute("aria-expanded", "false");
      otro.closest(".pregunta").classList.remove("es-abierta");
    });
    if (abrir) {
      boton.setAttribute("aria-expanded", "true");
      boton.closest(".pregunta").classList.add("es-abierta");
    }
  }

  campoBusqueda.addEventListener("input", () => {
    abrirBusqueda();
    pintarSugerencias();
  });
  campoBusqueda.addEventListener("focus", () => {
    abrirBusqueda();
    pintarSugerencias();
  });
  campoBusqueda.addEventListener("keydown", (evento) => {
    if (evento.key === "ArrowDown" && !panelSugerencias.hidden) {
      const primera = $(".buscar__sugerencia", panelSugerencias);
      if (primera) { evento.preventDefault(); primera.focus(); }
    } else if (evento.key === "Escape") {
      cerrarSugerencias();
      campoBusqueda.blur();
    }
  });
  panelSugerencias.addEventListener("keydown", (evento) => {
    const botones = $$(".buscar__sugerencia", panelSugerencias);
    const i = botones.indexOf(document.activeElement);
    if (evento.key === "Escape") {
      cerrarSugerencias();
      campoBusqueda.blur();
    } else if (evento.key === "ArrowDown" || evento.key === "ArrowUp") {
      evento.preventDefault();
      const siguiente = evento.key === "ArrowDown" ? i + 1 : i - 1;
      (botones[siguiente] || (siguiente < 0 ? campoBusqueda : botones[0])).focus();
    }
  });
  document.addEventListener("pointerdown", (evento) => {
    if (!$("#buscar").contains(evento.target)) cerrarSugerencias();
  });
  $("#buscar").addEventListener("submit", (evento) => {
    evento.preventDefault();
    const primera = $(".buscar__sugerencia", panelSugerencias);
    if (primera) primera.click();
  });

  /* ---------- Inicio ---------- */

  iniciarIntro();
  pintarHero();
  pintarRiel();
  pintarCatalogo();
  aplicarFiltros();
  iniciarPestanas();
  pintarDestacado();
  pintarLista(null);
  actualizarPedido();
  observarRevelados();
  iniciarParallax();
  /* Con intro, el carrusel empieza a contar cuando la página ya se ve */
  window.setTimeout(iniciarCarrusel, document.documentElement.classList.contains("con-intro") ? 4000 : 0);
})();
