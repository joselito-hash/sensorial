(() => {
  "use strict";

  /* ------------------------------------------------------------------
     CONFIGURACIÓN: edita solo este bloque.
     whatsapp: código de país + número, solo dígitos (ej. "5215512345678").
               Si queda vacío, WhatsApp abre y el cliente elige el contacto.
     ------------------------------------------------------------------ */
  const CONFIG = {
    marca: "Sensorial Boutique",
    whatsapp: "527445424972",
    /* Perfumes de "Más vendidos" (inicio y búsqueda), en orden. Usa el id de cada perfume
       de la lista PERFUMES. Los de ahora son de ejemplo: pon los que más vendes. */
    masVendidos: ["sauvage", "bleu-de-chanel", "oud-for-glory", "eros", "acqua-di-gio", "libre", "1-million", "la-vie-est-belle"],
    /* Perfumes de "Recién llegados" (inicio), en orden. También llevan la etiqueta "Nuevo"
       en el catálogo. Los de ahora son de ejemplo: pon los que te acaban de llegar. */
    novedades: ["oud-mood", "coco-mademoiselle", "terre-d-hermes", "light-blue"],
  };

  /* ------------------------------------------------------------------
     LO QUE DICEN NUESTROS CLIENTES: solo testimonios reales.
       {
         texto: "Lo que te escribió, copiado tal cual",
         nombre: "Mariana R.",
         ciudad: "Acapulco",          (opcional)
         perfume: "libre",            (opcional: el id del perfume que compró)
         foto: "img/clientes/mariana.jpg",  (opcional: solo con su permiso)
         estrellas: 5,                (opcional: solo si te dio una calificación)
       }
     Si no hay foto, el círculo muestra el perfume que compró.
     Mientras la lista esté vacía, la sección no aparece en la página publicada.
     ------------------------------------------------------------------ */
  let TESTIMONIOS = [];

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
     video: el anuncio oficial del perfume en YouTube (id del video y segundo en que empieza).
            Se reproduce sin sonido sobre la foto; la foto queda de respaldo mientras carga,
            con "reducir movimiento", con ahorro de datos o si la marca quita el video.
            Lattafa no tiene anuncio de Oud for Glory, así que Orientales usa su foto.
     ------------------------------------------------------------------ */
  let FAMILIAS = [
    { id: "frescos", nombre: "Frescos", desc: "Cítricos, marinos y limpios.",
      larga: "Cítricos, marinos y limpios. Para el calor, la oficina y oler a recién bañado.",
      hero: "1747916148863-7164d8920b57", heroAlt: "Frasco de Dior Sauvage iluminado con luz azul", heroPos: "50% 46%",
      video: { id: "mC-NysO3aHM", inicio: 1, titulo: "Anuncio oficial de Dior Sauvage" },
      ingrediente: "1716339140080-be256d3270ce", ingredienteAlt: "Rodajas de naranja en agua con burbujas", destacado: "sauvage" },
    { id: "dulces", nombre: "Dulces", desc: "Vainilla, praliné y flores.",
      larga: "Vainilla, praliné y flores. Envuelven, se notan y dejan estela.",
      hero: "1724157073080-fcffb8d6c956", heroAlt: "Frasco de YSL Libre sobre fondo dorado", heroPos: "50% 50%",
      video: { id: "uHGSW2RiM14", inicio: 2, titulo: "Anuncio oficial de YSL Libre" },
      ingrediente: "1592788174877-3f99727fd23d", ingredienteAlt: "Vainas de vainilla sobre fondo claro", destacado: "libre" },
    { id: "amaderados", nombre: "Amaderados", desc: "Cedro, vetiver y sándalo.",
      larga: "Cedro, vetiver y sándalo. Sobrios, elegantes y fáciles de llevar a diario.",
      hero: "1785881570973-281d0db41119", heroAlt: "Frasco de Bleu de Chanel junto a una ventana al atardecer", heroPos: "50% 55%",
      video: { id: "JAGVLUKdlP0", inicio: 1, titulo: "Anuncio oficial de Bleu de Chanel" },
      ingrediente: "1697507695420-04623ccff2af", ingredienteAlt: "Veta de madera oscura en primer plano", destacado: "bleu-de-chanel" },
    { id: "orientales", nombre: "Orientales", desc: "Oud, ámbar y especias.",
      larga: "Oud, ámbar y especias. Intensos y cálidos, hechos para la noche.",
      hero: "1731972206777-d9f796597a60", heroAlt: "Frasco negro y dorado de Lattafa Oud for Glory", heroPos: "50% 48%",
      ingrediente: "1560076124-fe336393ef76", ingredienteAlt: "Hebras de azafrán en primer plano", destacado: "oud-for-glory" },
  ];

  /* ------------------------------------------------------------------
     CATÁLOGO DE EJEMPLO: reemplázalo por tu inventario real.
     familia: "frescos" | "acuaticos" | "aromaticos" | "florales" | "frutales" | "dulces" | "amaderados" | "orientales"
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
  let PERFUMES = [
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

  /* Datos publicados desde Supabase. Se mantienen los datos locales como respaldo
     hasta que el proyecto tenga completo su catálogo y para poder abrir el sitio sin red. */
  const REMOTO = window.SENSORIAL_REMOTE || {};
  if (Array.isArray(REMOTO.perfumes) && REMOTO.perfumes.length) {
    const locales = new Map(PERFUMES.map((p) => [p.id, p]));
    PERFUMES = REMOTO.perfumes.map((p) => {
      const local = locales.get(p.id) || {};
      return {
        ...local,
        id: p.id, casa: p.casa, nombre: p.nombre,
        version: p.version || "", origen: p.origen, familia: p.familia,
        foto: p.foto, lamina: p.lamina || null,
        notas: p.notas || local.notas || { salida: "", corazon: "", fondo: "" },
        acordes: p.acordes || local.acordes || [],
        uso: p.uso || local.uso || null,
        galeria: p.galeria || local.galeria || [],
        fuente: p.fuente || local.fuente || null,
        fuenteNombre: p.fuente_nombre || local.fuenteNombre || "Fragrantica",
      };
    });
    CONFIG.masVendidos = REMOTO.perfumes.filter((p) => p.best_seller_rank != null)
      .sort((a, b) => a.best_seller_rank - b.best_seller_rank).map((p) => p.id);
    CONFIG.novedades = REMOTO.perfumes.filter((p) => p.new_arrival_rank != null)
      .sort((a, b) => a.new_arrival_rank - b.new_arrival_rank).map((p) => p.id);
  }
  if (Array.isArray(REMOTO.families) && REMOTO.families.length) {
    FAMILIAS = REMOTO.families.map((f) => ({
      id: f.id, nombre: f.name, desc: f.short_description,
      larga: f.long_description, hero: f.hero_image, heroAlt: f.hero_alt,
      heroPos: f.hero_position,
      video: f.video_youtube_id ? { id: f.video_youtube_id, inicio: f.video_start_seconds, titulo: f.video_title } : null,
      ingrediente: f.ingredient_image, ingredienteAlt: f.ingredient_alt,
      destacado: f.featured_perfume_id,
    }));
  }
  if (Array.isArray(REMOTO.featuredReviews)) {
    TESTIMONIOS = REMOTO.featuredReviews.map((r) => ({
      texto: r.texto, nombre: r.nombre, ciudad: r.ciudad, perfume: r.perfume,
      foto: r.foto, estrellas: r.estrellas, verificado: r.verified_purchase,
    }));
  }
  const RESENAS = Array.isArray(REMOTO.reviews) ? REMOTO.reviews : [];
  const SUPABASE = window.SENSORIAL_SUPABASE || {};
  const escaparHTML = (valor) => String(valor ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);

  const CLAVE_LISTA = "sb-lista";
  const porId = new Map(PERFUMES.map((p) => [p.id, p]));
  const familiaPorId = new Map(FAMILIAS.map((f) => [f.id, f]));
  /* La portada solo pasa por las familias que tienen foto grande y algún perfume publicado */
  const PORTADA = FAMILIAS.filter((f) => f.hero && PERFUMES.some((p) => p.familia === f.id));
  const MAS_VENDIDOS = CONFIG.masVendidos.filter((id) => porId.has(id));
  const NOVEDADES = CONFIG.novedades.filter((id) => porId.has(id));
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

  /* "Huele a bergamota, lavanda y ambroxan." (vacío si el perfume aún no tiene notas) */
  const hueleA = (p) => (notasPrincipales(p).length ? `Huele a ${resumenNotas(p)}.` : "");

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
          <p class="pedido__notas">${hueleA(p)}</p>
        </div>
        <button class="pedido__quitar" type="button" data-quitar-lista="${p.id}" aria-label="Quitar ${nombreCompleto(p)} de la lista"><i class="ph ph-x" aria-hidden="true"></i><span>Quitar</span></button>
      </li>`;
    }).join("");

    const conteo = $("#nav-conteo");
    const antes = conteo.textContent;
    conteo.hidden = n === 0;
    conteo.textContent = n ? String(n) : "";
    moverIndicador();
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
    PORTADA.slice(1).forEach((f) => {
      capas.insertAdjacentHTML("beforeend", `
        <div class="hero__capa" data-familia="${f.id}">
          <img class="hero__foto" data-parallax="0.09" data-profundidad="-10" alt="${f.heroAlt}"
            src="${url(f.hero, 1600)}" srcset="${srcset(f.hero, [900, 1600, 2400])}" sizes="100vw"
            loading="lazy" style="object-position: ${f.heroPos}">
        </div>`);
    });

    $("#selector").innerHTML = PORTADA.map((f) => `
      <button class="selector__btn" type="button" data-familia="${f.id}" aria-pressed="${f.id === estado.familia}">${f.nombre}</button>`).join("");
  }

  function pintarDestacado() {
    const caja = $("#destacado");
    if (!caja) return;
    const familia = familiaPorId.get(estado.familia);
    const p = familia && porId.get(familia.destacado);
    if (!p) { caja.hidden = true; return; }
    caja.hidden = false;
    caja.innerHTML = `
      <button class="destacado__abrir" type="button" data-ficha="${p.id}" aria-label="Ver la ficha de ${nombreCompleto(p)}">
        <img class="destacado__foto" src="${url(p.foto, 400)}" srcset="${srcset(p.foto, [200, 400])}" sizes="7rem" alt="" width="216" height="216">
      </button>
      <div class="destacado__texto">
        <h2 class="destacado__nombre"><button type="button" data-ficha="${p.id}">${nombreCompleto(p)}</button></h2>
        <p class="destacado__notas">${hueleA(p)}</p>
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
    /* En el teléfono el selector se desliza de lado: se centra en la familia activa */
    const selector = $("#selector");
    const activo = $(".selector__btn[aria-pressed=\"true\"]");
    if (selector && activo && selector.scrollWidth > selector.clientWidth) {
      selector.scrollTo({ left: activo.offsetLeft - (selector.clientWidth - activo.offsetWidth) / 2, behavior: menosMovimiento.matches ? "auto" : "smooth" });
    }
    pintarDestacado();
    actualizarPedido();
    ponerVideoHero();
  }

  /* ---------- Inicio: anuncios en video ----------
     Solo hay un video a la vez: el de la familia activa. Se pone sobre la foto (que queda
     de respaldo) y aparece con un fundido cuando de verdad empieza a reproducirse. Los de
     las familias que ya no se ven se quitan tras el cambio, para no gastar datos ni memoria.
     Nunca con "reducir movimiento" ni con ahorro de datos. */

  const conVideos = () => !menosMovimiento.matches && !(navigator.connection && navigator.connection.saveData);

  function crearVideo(capa, f) {
    const { id, inicio, titulo } = f.video;
    const marco = document.createElement("div");
    marco.className = "hero__video";
    marco.setAttribute("aria-hidden", "true");
    const parametros = new URLSearchParams({
      autoplay: "1", mute: "1", controls: "0", loop: "1", playlist: id, playsinline: "1", rel: "0",
      iv_load_policy: "3", disablekb: "1", fs: "0", modestbranding: "1", start: String(inicio || 0),
      enablejsapi: "1", origin: location.origin,
    });
    const iframe = document.createElement("iframe");
    iframe.src = `https://www.youtube-nocookie.com/embed/${id}?${parametros}`;
    iframe.title = titulo;
    iframe.tabIndex = -1;
    iframe.allow = "autoplay; encrypted-media; picture-in-picture";
    iframe.referrerPolicy = "strict-origin-when-cross-origin";
    marco.append(iframe);
    capa.append(marco);

    /* El reproductor avisa por mensajes cuándo el video de verdad empieza a reproducirse;
       hasta entonces se sigue viendo la foto (así no aparece el negro del arranque). Si el
       video falla (por ejemplo, la marca lo quitó), se retira y queda la foto. */
    const mostrar = () => marco.classList.add("es-visible");
    iframe.addEventListener("load", () => {
      try { iframe.contentWindow.postMessage(JSON.stringify({ event: "listening", id: f.id }), "*"); } catch { /* sin acceso */ }
    });
    marco.escuchar = (evento) => {
      if (evento.source !== iframe.contentWindow) return;
      try {
        const datos = typeof evento.data === "string" ? JSON.parse(evento.data) : evento.data;
        const info = datos && datos.info;
        if (datos.event === "onError") { quitarVideo(capa); return; }
        const estadoVideo = datos.event === "onStateChange" ? info : info && info.playerState;
        if (estadoVideo === 1) mostrar();
        /* Si el navegador lo pausa (al cambiar de app, por ejemplo), se pide que siga y,
           mientras tanto, vuelve a verse la foto en lugar del botón de reproducir */
        if (estadoVideo === 2) {
          marco.classList.remove("es-visible");
          iframe.contentWindow.postMessage(JSON.stringify({ event: "command", func: "playVideo", args: [] }), "*");
        }
      } catch { /* mensaje ajeno */ }
    };
    window.addEventListener("message", marco.escuchar);
  }

  function quitarVideo(capa) {
    const marco = $(".hero__video", capa);
    if (!marco) return;
    window.removeEventListener("message", marco.escuchar);
    marco.remove();
  }

  function ponerVideoHero() {
    $$(".hero__capa").forEach((capa) => {
      const f = familiaPorId.get(capa.dataset.familia);
      const activa = capa.classList.contains("es-activa") && vistaActual === "inicio";
      if (activa && f.video && conVideos()) {
        if (!$(".hero__video", capa)) crearVideo(capa, f);
      } else if ($(".hero__video", capa)) {
        /* Se quita cuando termina el fundido de la foto (o al momento si se dejó el inicio) */
        window.setTimeout(() => {
          if (!capa.classList.contains("es-activa") || vistaActual !== "inicio") quitarVideo(capa);
        }, vistaActual === "inicio" ? 1700 : 0);
      }
    });
  }

  /* La portada también se desliza: hacia la izquierda pasa a la siguiente familia y hacia
     la derecha regresa a la anterior. Funciona con el dedo y arrastrando con el mouse; el
     desplazamiento vertical de la página no se ve afectado (touch-action: pan-y). */
  function iniciarDeslizarHero() {
    const marco = $(".hero__marco");
    if (!marco) return;
    let inicio = null;
    marco.addEventListener("pointerdown", (evento) => {
      if (evento.button !== 0 || evento.target.closest("button, a")) return;
      inicio = { x: evento.clientX, y: evento.clientY };
    });
    const soltar = (evento) => {
      if (!inicio) return;
      const dx = evento.clientX - inicio.x;
      const dy = evento.clientY - inicio.y;
      inicio = null;
      if (Math.abs(dx) < 45 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
      const i = PORTADA.findIndex((f) => f.id === estado.familia);
      const siguiente = (i + (dx < 0 ? 1 : -1) + PORTADA.length) % PORTADA.length;
      activarFamilia(PORTADA[siguiente].id, true);
    };
    marco.addEventListener("pointerup", soltar);
    marco.addEventListener("pointercancel", () => { inicio = null; });
    marco.addEventListener("dragstart", (evento) => evento.preventDefault());
  }

  /* El inicio avanza solo hasta que la persona toca algo; nunca con "reducir movimiento".
     Con videos, cada familia se queda más tiempo para que el anuncio alcance a verse. */
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
      const i = PORTADA.findIndex((f) => f.id === estado.familia);
      activarFamilia(PORTADA[(i + 1) % PORTADA.length].id, false);
    }, conVideos() ? 14000 : 6500);
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
    /* Las preguntas (origen y familia) solo se hacen una vez por visita, y nunca a quien ya
       tiene perfumes en su lista: en esos casos "Catálogo" lleva directo a los perfumes */
    if (!consulta && (recorridoHecho() || estado.lista.size > 0)) {
      return { vista: "catalogo", paso: "catalogo", origen: "todos", familia: "todas" };
    }
    const origen = ORIGEN_DE_URL[q.get("origen")] || "todos";
    const familia = familiaPorId.has(q.get("familia")) ? q.get("familia") : (q.get("familia") === "todas" ? "todas" : null);
    if (q.has("todo") || (origen !== "todos" && familia)) {
      return { vista: "catalogo", paso: "catalogo", origen, familia: familia || "todas" };
    }
    if (origen !== "todos") return { vista: "catalogo", paso: "familia", origen, familia: "todas" };
    return { vista: "catalogo", paso: "origen", origen: "todos", familia: "todas" };
  }
  const leerRuta = () => rutaDeHash(location.hash);

  const CLAVE_RECORRIDO = "sb-recorrido";
  function recorridoHecho() {
    try { return sessionStorage.getItem(CLAVE_RECORRIDO) === "1"; } catch { return false; }
  }
  function marcarRecorrido() {
    try { sessionStorage.setItem(CLAVE_RECORRIDO, "1"); } catch { /* sin almacenamiento: se vuelve a preguntar */ }
  }

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

  /* Línea bajo la pestaña activa: mide solo la palabra (sin el contador del pedido) para
     quedar centrada bajo ella, y se desliza hasta la nueva (solo transform) */
  function moverIndicador() {
    const indicador = $(".nav__indicador");
    const texto = $(".nav__enlaces [aria-current='page'] .nav__texto");
    if (!indicador || !texto || !texto.offsetWidth) return;
    const base = indicador.parentElement.getBoundingClientRect();
    const caja = texto.getBoundingClientRect();
    indicador.style.transform = `translateX(${(caja.left - base.left).toFixed(1)}px) scaleX(${caja.width.toFixed(1)})`;
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
    /* El anuncio de la portada solo corre mientras se ve el inicio */
    if (document.readyState === "complete") ponerVideoHero();
    cerrarPanelLista();
    cerrarFiltros();
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
        marcarRecorrido();
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
    /* El menú cambia de ancho al aparecer el contador del pedido o al cambiar la ventana */
    if ("ResizeObserver" in window) new ResizeObserver(moverIndicador).observe($(".nav__enlaces"));
    window.addEventListener("resize", moverIndicador);
  }

  /* ---------- Inicio: más vendidos ----------
     Un ranking con el mismo lenguaje de "Recién llegados".
     Escritorio: a la izquierda una vitrina fija con la foto grande y el nombre en
       mayúsculas; a la derecha la lista en orden. El perfume que cruza la mitad de la
       pantalla al hacer scroll (o bajo el puntero) manda en la vitrina.
     Teléfono: la vitrina se vuelve una fila de tarjetas grandes que se desliza de lado, y
       la lista queda debajo como índice: el perfume que se ve se ilumina en la lista y
       tocar un nombre lleva a su tarjeta. */

  const telefonoVendidos = window.matchMedia("(max-width: 56rem)");

  function pintarVendidos() {
    const lista = $("#vendidos-lista");
    const vitrina = $("#vendidos-vitrina");
    const pista = $("#vendidos-pista");
    if (!lista || !vitrina || !pista) return;

    vitrina.innerHTML = `
      ${MAS_VENDIDOS.map((id, i) => {
        const p = porId.get(id);
        const juego = esUnsplash(p.foto) ? ` srcset="${srcset(p.foto, [700, 1100, 1500])}" sizes="42vw"` : "";
        return `<img class="vendidos__imagen${i === 0 ? " es-activa" : ""}" data-indice="${i}" src="${url(p.foto, 1100)}"${juego} alt=""${i ? ' loading="lazy"' : ""}>`;
      }).join("")}
      <div class="vendidos__rotulo" id="vendidos-rotulo"></div>`;

    pista.innerHTML = MAS_VENDIDOS.map((id, i) => {
      const p = porId.get(id);
      const f = familiaPorId.get(p.familia);
      const juego = esUnsplash(p.foto) ? ` srcset="${srcset(p.foto, [500, 800, 1100])}" sizes="84vw"` : "";
      return `
      <li class="vendidos__tarjeta" data-indice="${i}" style="--campo: var(--c-${f.id})">
        <button class="vendidos__tarjeta-foto" type="button" data-ficha="${p.id}" aria-label="Ver la ficha de ${nombreCompleto(p)}">
          <img src="${url(p.foto, 800)}"${juego} alt="" loading="lazy">
        </button>
        <div class="vendidos__tarjeta-texto">
          <p class="vendidos__meta"><span>${f.nombre}</span>${p.casa}</p>
          <p class="vendidos__nombre">${p.nombre}</p>
          <p class="vendidos__huele">${hueleA(p)}</p>
        </div>
      </li>`;
    }).join("");

    lista.innerHTML = MAS_VENDIDOS.map((id, i) => {
      const p = porId.get(id);
      const f = familiaPorId.get(p.familia);
      return `
      <li class="vendido${i === 0 ? " es-activo" : ""}" data-indice="${i}" style="--campo: var(--c-${f.id})">
        <div class="vendido__info">
          <h3 class="vendido__nombre"><button type="button" data-ficha="${p.id}">${p.nombre}</button></h3>
          <p class="vendido__meta"><span>${f.nombre}</span>${p.casa}${p.origen === "Árabe" ? " · Árabe" : ""}</p>
        </div>
        <button class="agregar" type="button" data-id="${p.id}" aria-pressed="false"><i class="ph ph-plus" aria-hidden="true"></i><span>Agregar</span></button>
      </li>`;
    }).join("");
    activarVendido(0, true);

    /* Clic en la vitrina: abre la ficha del perfume que muestra en ese momento */
    vitrina.addEventListener("click", () => {
      abrirDetalle(MAS_VENDIDOS[vendidoActivo], $(".vendidos__imagen.es-activa", vitrina));
    });

    ["pointerover", "focusin"].forEach((tipo) => lista.addEventListener(tipo, (evento) => {
      if (telefonoVendidos.matches) return;
      const fila = evento.target.closest(".vendido");
      if (fila) activarVendido(Number(fila.dataset.indice));
    }));

    /* En el teléfono, tocar un nombre del índice desliza la vitrina hasta su tarjeta (el
       botón "Agregar" sigue funcionando normal) */
    lista.addEventListener("click", (evento) => {
      if (!telefonoVendidos.matches || evento.target.closest(".agregar")) return;
      const fila = evento.target.closest(".vendido");
      if (!fila) return;
      evento.preventDefault();
      evento.stopPropagation();
      verVendido(Number(fila.dataset.indice));
    });

    if (!("IntersectionObserver" in window)) return;
    let observador = null;
    const observar = () => {
      if (observador) observador.disconnect();
      if (telefonoVendidos.matches) {
        /* La tarjeta que ocupa la vitrina deslizable manda en el índice */
        observador = new IntersectionObserver((entradas) => {
          entradas.forEach((entrada) => {
            if (entrada.isIntersecting) activarVendido(Number(entrada.target.dataset.indice));
          });
        }, { root: pista, threshold: 0.6 });
        $$(".vendidos__tarjeta", pista).forEach((tarjeta) => observador.observe(tarjeta));
      } else {
        /* El puesto que cruza la mitad de la pantalla manda en la vitrina */
        observador = new IntersectionObserver((entradas) => {
          entradas.forEach((entrada) => {
            if (entrada.isIntersecting) activarVendido(Number(entrada.target.dataset.indice));
          });
        }, { rootMargin: "-50% 0px -50% 0px" });
        $$(".vendido", lista).forEach((fila) => observador.observe(fila));
      }
    };
    observar();
    telefonoVendidos.addEventListener("change", observar);
  }

  function verVendido(indice) {
    const pista = $("#vendidos-pista");
    const tarjeta = $(`.vendidos__tarjeta[data-indice="${indice}"]`, pista);
    if (!tarjeta) return;
    pista.scrollTo({ left: tarjeta.offsetLeft - pista.offsetLeft - parseFloat(getComputedStyle(pista).scrollPaddingLeft || 0), behavior: menosMovimiento.matches ? "auto" : "smooth" });
    activarVendido(indice);
  }

  let vendidoActivo = -1;
  function activarVendido(indice, inicial) {
    if (indice === vendidoActivo) return;
    vendidoActivo = indice;
    const p = porId.get(MAS_VENDIDOS[indice]);
    const f = familiaPorId.get(p.familia);
    $$(".vendido").forEach((fila) => fila.classList.toggle("es-activo", Number(fila.dataset.indice) === indice));
    $$(".vendidos__tarjeta").forEach((t) => t.classList.toggle("es-activa", Number(t.dataset.indice) === indice));
    $$(".vendidos__imagen").forEach((img) => img.classList.toggle("es-activa", Number(img.dataset.indice) === indice));
    const rotulo = $("#vendidos-rotulo");
    rotulo.style.setProperty("--campo", `var(--c-${f.id})`);
    rotulo.innerHTML = `
      <p class="vendidos__meta"><span>${f.nombre}</span>${p.casa}</p>
      <p class="vendidos__nombre">${p.nombre}</p>
      <p class="vendidos__huele">${hueleA(p)}</p>`;
    if (!inicial) {
      rotulo.classList.remove("cambia");
      void rotulo.offsetWidth;
      rotulo.classList.add("cambia");
    }
  }

  /* ---------- Inicio: recién llegados ----------
     Un carrusel vertical que avanza con el scroll.
     Escritorio: las fotos grandes avanzan a la izquierda y el texto se queda fijo a la
       derecha; cambia al perfume que cruza el centro de la pantalla.
     Teléfono: cada perfume es una tarjeta con su foto y su texto encima. Las tarjetas se
       quedan fijas bajo el menú y se apilan: la siguiente sube y se monta sobre la anterior,
       que se encoge y oscurece un poco. Así el texto siempre va con su foto. */

  function pintarNovedades() {
    const seccion = $("#novedades");
    if (!seccion) return;
    seccion.hidden = NOVEDADES.length === 0;
    if (!NOVEDADES.length) return;

    const texto = (p, f, clase, i) => `
      <div class="${clase}" data-indice="${i}" style="--campo: var(--c-${f.id})">
        <p class="novedad__meta"><span>${f.nombre}</span>${p.casa}${p.origen === "Árabe" ? " · Árabe" : ""}</p>
        <h3 class="novedad__nombre">${p.nombre}</h3>
        <p class="novedad__desc">${hueleA(p)} ${f.larga}</p>
        <ul class="novedad__notas" aria-label="Notas principales">
          ${notasPrincipales(p).map((nota) => `<li><i class="ph ${iconoNota(nota)}" aria-hidden="true"></i>${mayuscula(nota)}</li>`).join("")}
        </ul>
        <div class="novedad__acciones">
          <button class="btn btn--claro" type="button" data-ficha="${p.id}">Ver ficha<i class="ph ph-arrow-right" aria-hidden="true"></i></button>
          <button class="agregar" type="button" data-id="${p.id}" aria-pressed="false"><i class="ph ph-plus" aria-hidden="true"></i><span>Agregar</span></button>
        </div>
      </div>`;

    $("#novedades-lista").innerHTML = NOVEDADES.map((id, i) => {
      const p = porId.get(id);
      const juego = esUnsplash(p.foto) ? ` srcset="${srcset(p.foto, [700, 1100, 1600])}" sizes="(max-width: 56rem) 92vw, 52vw"` : "";
      return `
      <li class="novedad" data-indice="${i}">
        <button class="novedad__foto" type="button" data-ficha="${p.id}" aria-label="Ver la ficha de ${nombreCompleto(p)}">
          <img src="${url(p.foto, 1100)}"${juego} alt="" loading="lazy">
        </button>
        ${texto(p, familiaPorId.get(p.familia), "novedad__pie", i)}
      </li>`;
    }).join("");
    iniciarPilaNovedades();
    $("#novedades-textos").innerHTML = NOVEDADES.map((id, i) => {
      const p = porId.get(id);
      return texto(p, familiaPorId.get(p.familia), `novedad__texto${i === 0 ? " es-activo" : ""}`, i);
    }).join("");
    activarNovedad(0);

    /* En escritorio, la foto que cruza la mitad de la pantalla manda en el texto fijo */
    if (!("IntersectionObserver" in window)) return;
    const observador = new IntersectionObserver((entradas) => {
      entradas.forEach((entrada) => {
        if (entrada.isIntersecting) activarNovedad(Number(entrada.target.dataset.indice));
      });
    }, { rootMargin: "-50% 0px -50% 0px" });
    $$(".novedad", seccion).forEach((li) => observador.observe(li));
  }

  /* Pila de tarjetas en el teléfono: mientras la siguiente tarjeta sube, la de abajo se
     encoge y oscurece en proporción (--tapada, de 0 a 1). Solo corre con la sección a la
     vista, en el teléfono y sin "reducir movimiento"; el cálculo va en un cuadro por scroll. */
  function iniciarPilaNovedades() {
    const seccion = $("#novedades");
    const telefono = window.matchMedia("(max-width: 56rem)");
    if (!seccion || menosMovimiento.matches || !("IntersectionObserver" in window)) return;
    const tarjetas = $$(".novedad", seccion);
    let visible = false;
    let pendiente = 0;
    const calcular = () => {
      pendiente = 0;
      if (!telefono.matches) {
        tarjetas.forEach((t) => t.style.removeProperty("--tapada"));
        return;
      }
      tarjetas.forEach((tarjeta, i) => {
        const siguiente = tarjetas[i + 1];
        if (!siguiente) return;
        const alto = tarjeta.offsetHeight;
        const distancia = siguiente.getBoundingClientRect().top - tarjeta.getBoundingClientRect().top;
        const tapada = Math.min(1, Math.max(0, 1 - distancia / alto));
        tarjeta.style.setProperty("--tapada", tapada.toFixed(3));
      });
    };
    const pedir = () => {
      if (visible && !pendiente) pendiente = window.requestAnimationFrame(calcular);
    };
    new IntersectionObserver(([entrada]) => {
      visible = entrada.isIntersecting;
      pedir();
    }).observe(seccion);
    window.addEventListener("scroll", pedir, { passive: true });
    window.addEventListener("resize", pedir);
    telefono.addEventListener("change", calcular);
  }

  let novedadActiva = -1;
  function activarNovedad(indice) {
    if (indice === novedadActiva) return;
    const panel = $("#novedades-panel");
    panel.dataset.sentido = indice > novedadActiva ? "baja" : "sube";
    novedadActiva = indice;
    $$(".novedad__texto", panel).forEach((t) => {
      const activo = Number(t.dataset.indice) === indice;
      t.classList.toggle("es-activo", activo);
      t.inert = !activo;
    });
    $$(".novedad").forEach((li) => li.classList.toggle("es-activa", Number(li.dataset.indice) === indice));
    panel.style.setProperty("--avance", (indice + 1) / NOVEDADES.length);
  }

  /* ---------- Inicio: lo que dicen nuestros clientes ----------
     Una tarjeta por testimonio (TESTIMONIOS): retrato en un círculo con hojas, comillas,
     estrellas si las hay, la frase y quién la dijo. Con varios, se deslizan de lado y
     unos puntos indican cuál se ve. Si la lista está vacía, la sección no se muestra; solo
     en la vista previa local aparece una tarjeta de ejemplo para ver el diseño. */

  const enVistaPrevia = ["localhost", "127.0.0.1"].includes(location.hostname);
  const EJEMPLO_CLIENTE = {
    ejemplo: true,
    texto: "Me ayudaron a elegir un aroma fresco para todos los días. Llegó justo como esperaba.",
    nombre: "Nombre del cliente",
    ciudad: "Ciudad",
    perfume: "acqua-di-gio",
    estrellas: 5,
  };

  function tarjetaCliente(t, i) {
    const p = t.perfume ? porId.get(t.perfume) : null;
    const f = p ? familiaPorId.get(p.familia) : null;
    const imagen = t.foto || (p ? (p.lamina || url(p.foto, 500)) : "");
    const estrellas = t.estrellas ? Math.max(1, Math.min(5, Math.round(t.estrellas))) : 0;
    return `
      <li class="cliente${t.ejemplo ? " cliente--ejemplo" : ""}" data-indice="${i}"${f ? ` style="--campo: var(--c-${f.id})"` : ""}>
        <div class="cliente__retrato" aria-hidden="true">
          <i class="ph ph-leaf cliente__hoja cliente__hoja--1"></i>
          <i class="ph ph-leaf cliente__hoja cliente__hoja--2"></i>
          <i class="ph ph-leaf cliente__hoja cliente__hoja--3"></i>
          <span class="cliente__circulo">${imagen ? `<img src="${imagen}" alt="" loading="lazy">` : `<span class="cliente__inicial"></span>`}</span>
        </div>
        <figure class="cliente__cuerpo">
          <span class="cliente__comillas" aria-hidden="true">“</span>
          ${estrellas ? `<p class="cliente__estrellas" role="img" aria-label="${estrellas} de 5 estrellas">${"★".repeat(estrellas)}<span>${"★".repeat(5 - estrellas)}</span></p>` : ""}
          <blockquote class="cliente__texto"></blockquote>
          <figcaption class="cliente__quien"><strong></strong><span></span></figcaption>
          ${p ? `<button class="cliente__perfume" type="button" data-ficha="${p.id}">${t.verificado ? "Compró" : "Reseñó"} ${p.nombre}<i class="ph ph-arrow-up-right" aria-hidden="true"></i></button>` : ""}
          ${t.ejemplo ? `<span class="cliente__aviso">Ejemplo de diseño, solo visible en tu computadora</span>` : ""}
        </figure>
      </li>`;
  }

  function pintarClientes() {
    const seccion = $("#clientes");
    if (!seccion) return;
    const lista = TESTIMONIOS.length ? TESTIMONIOS : enVistaPrevia ? [EJEMPLO_CLIENTE] : [];
    seccion.hidden = lista.length === 0;
    const pista = $("#clientes-pista");
    pista.innerHTML = lista.map(tarjetaCliente).join("");
    /* Lo que escribieron los clientes se pone como texto, nunca como HTML */
    $$(".cliente", pista).forEach((li, n) => {
      const t = lista[n];
      $(".cliente__texto", li).textContent = `“${t.texto}”`;
      $(".cliente__quien strong", li).textContent = t.nombre || "Cliente";
      $(".cliente__quien span", li).textContent = t.ciudad || "";
      const inicial = $(".cliente__inicial", li);
      if (inicial) inicial.textContent = (t.nombre || "C").trim().charAt(0).toUpperCase();
    });

    const puntos = $("#clientes-puntos");
    puntos.hidden = lista.length < 2;
    puntos.innerHTML = lista.length < 2 ? "" : lista.map((_, i) =>
      `<button type="button" data-cliente-punto="${i}" aria-label="Ver testimonio ${i + 1} de ${lista.length}" aria-current="${i === 0}"></button>`).join("");
    let pendiente = 0;
    pista.addEventListener("scroll", () => {
      if (pendiente) return;
      pendiente = window.requestAnimationFrame(() => {
        pendiente = 0;
        const actual = Math.round(pista.scrollLeft / Math.max(pista.clientWidth, 1));
        $$("[data-cliente-punto]", puntos).forEach((b, i) => b.setAttribute("aria-current", String(i === actual)));
      });
    }, { passive: true });
  }

  function verCliente(indice) {
    const pista = $("#clientes-pista");
    pista.scrollTo({ left: indice * pista.clientWidth, behavior: menosMovimiento.matches ? "auto" : "smooth" });
  }

  /* ---------- Catálogo: hoja de filtros en el teléfono ----------
     En escritorio los filtros van en línea. En el teléfono se abren desde un botón fijo
     ("Filtros" con el resumen de lo elegido) en una hoja que sube desde abajo; los cambios
     se aplican al momento y "Ver N perfumes" la cierra. */

  const filtrosMovil = window.matchMedia("(max-width: 40rem)");
  const hojaFiltros = $("#filtros");

  function ajustarHojaFiltros() {
    if (!hojaFiltros) return;
    const abierta = hojaFiltros.classList.contains("abierta");
    hojaFiltros.inert = filtrosMovil.matches && !abierta;
    if (filtrosMovil.matches) {
      hojaFiltros.setAttribute("role", "dialog");
      hojaFiltros.setAttribute("aria-modal", "true");
    } else {
      hojaFiltros.removeAttribute("role");
      hojaFiltros.removeAttribute("aria-modal");
      if (abierta) cerrarFiltros();
    }
  }

  function abrirFiltros() {
    if (!hojaFiltros) return;
    hojaFiltros.classList.add("abierta");
    $("#filtros-fondo").classList.add("es-visible");
    document.documentElement.classList.add("filtros-abiertos");
    $("#abrir-filtros").setAttribute("aria-expanded", "true");
    ajustarHojaFiltros();
    $("#cerrar-filtros").focus({ preventScroll: true });
  }

  function cerrarFiltros() {
    if (!hojaFiltros || !hojaFiltros.classList.contains("abierta")) return;
    hojaFiltros.classList.remove("abierta");
    $("#filtros-fondo").classList.remove("es-visible");
    document.documentElement.classList.remove("filtros-abiertos");
    $("#abrir-filtros").setAttribute("aria-expanded", "false");
    ajustarHojaFiltros();
    if (filtrosMovil.matches) $("#abrir-filtros").focus({ preventScroll: true });
  }

  /* El botón de la hoja resume lo elegido: "Orientales · Árabes" y cuántos filtros hay */
  function resumirFiltros(visibles) {
    const { familia, origen } = estado.filtros;
    const partes = [];
    if (familia !== "todas") partes.push(familiaPorId.get(familia).nombre);
    if (origen !== "todos") partes.push(origen === "Árabe" ? "Árabes" : "Diseñador");
    const resumen = $("#filtros-resumen");
    if (!resumen) return;
    resumen.textContent = partes.length ? partes.join(" · ") : "Todo el catálogo";
    const activos = $("#filtros-activos");
    activos.hidden = partes.length === 0;
    activos.textContent = String(partes.length);
    $("#conteo-boton").textContent = textoPerfumes(visibles);
  }

  /* ---------- Catálogo ---------- */

  function ficha(p) {
    const imagen = p.lamina
      ? `<img src="${p.lamina}" alt="${nombreCompleto(p)} rodeado de sus notas" loading="lazy" width="1080" height="1080">`
      : `<img src="${url(p.foto, 800)}" srcset="${srcset(p.foto, [500, 800, 1200])}" sizes="(max-width: 40rem) 80vw, (max-width: 72rem) 45vw, 24rem" alt="${nombreCompleto(p)}" loading="lazy">`;
    return `
      <li class="ficha" data-familia="${p.familia}" data-origen="${p.origen}">
        <button class="ficha__abrir" type="button" data-ficha="${p.id}" aria-label="Ver la ficha de ${nombreCompleto(p)}">
          <span class="ficha__lamina${p.lamina ? " ficha__lamina--compuesta" : ""}">${imagen}${NOVEDADES.includes(p.id) ? '<span class="ficha__nuevo">Nuevo</span>' : ""}</span>
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
        </div>
      </li>`;
  }

  /* Filtros: un botón por familia, en el mismo orden que FAMILIAS */
  function pintarChipsFamilia() {
    const caja = $("#chips-familia");
    if (!caja) return;
    caja.innerHTML = FAMILIAS.map((f) =>
      `<button class="chip" type="button" data-grupo="familia" data-valor="${f.id}" aria-pressed="false">${f.nombre}</button>`).join("");
  }

  /* Un capítulo de color por familia, con sus perfumes dentro */
  function pintarCatalogo() {
    if (!$("#capitulos")) return;
    pintarChipsFamilia();
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
    resumirFiltros(visibles);
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
  /* Mientras se busca, la página queda quieta: al escribir, el navegador intentaba mantener
     el cursor a la vista y la iba subiendo poco a poco */
  function abrirBusqueda() {
    document.body.classList.add("buscando");
    document.documentElement.classList.add("pagina-quieta");
    veloBusqueda.classList.add("es-activo");
  }

  function cerrarSugerencias() {
    panelSugerencias.hidden = true;
    campoBusqueda.setAttribute("aria-expanded", "false");
    campoBusqueda.value = "";
    veloBusqueda.classList.remove("es-activo");
    document.body.classList.remove("buscando");
    document.documentElement.classList.remove("pagina-quieta");
  }

  /* ---------- Búsqueda que perdona errores ----------
     La gente escribe "sobaje", "acua di yio" o "lavi es bel". Cada perfume recibe un puntaje:
     coincidencia exacta, palabras que empiezan igual, palabras con pocas letras de diferencia
     (distancia de edición) y palabras que suenan igual en español ("v" y "b", "z" y "s",
     "au" y "o", "h" muda…). Se muestran los de mejor puntaje. */

  const limpiarBusqueda = (t) => sinAcentos(t).replace(/[^a-z0-9ñ ]+/g, " ").replace(/\s+/g, " ").trim();

  /* Cómo suena una palabra, aproximado para quien escribe de oído */
  const sonido = (t) => t
    .replace(/eau/g, "o").replace(/au/g, "o").replace(/ou/g, "u")
    .replace(/ph/g, "f").replace(/cqu/g, "ku").replace(/qu/g, "k").replace(/ck/g, "k")
    .replace(/c(?=[ei])/g, "s").replace(/c/g, "k").replace(/z/g, "s").replace(/x/g, "ks")
    .replace(/g(?=[ei])/g, "j").replace(/v/g, "b").replace(/w/g, "u").replace(/ll/g, "y")
    .replace(/y(?=[^aeiou]|$)/g, "i").replace(/ch/g, "x").replace(/sh/g, "x").replace(/h/g, "")
    .replace(/(.)\1+/g, "$1");

  /* Distancia de edición (letras cambiadas, de más, de menos o volteadas) */
  function distancia(a, b) {
    if (a === b) return 0;
    if (!a.length || !b.length) return Math.max(a.length, b.length);
    let antes2 = [];
    let antes = Array.from({ length: b.length + 1 }, (_, j) => j);
    for (let i = 1; i <= a.length; i += 1) {
      const fila = [i];
      for (let j = 1; j <= b.length; j += 1) {
        const costo = a[i - 1] === b[j - 1] ? 0 : 1;
        fila[j] = Math.min(antes[j] + 1, fila[j - 1] + 1, antes[j - 1] + costo);
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) fila[j] = Math.min(fila[j], antes2[j - 2] + 1);
      }
      antes2 = antes;
      antes = fila;
    }
    return antes[b.length];
  }

  const tolerancia = (largo) => (largo <= 3 ? 0 : largo <= 5 ? 1 : largo <= 8 ? 2 : 3);

  /* Qué tan parecida es una palabra escrita a una palabra del perfume (0 a 1) */
  function parecido(escrita, palabra) {
    if (palabra === escrita) return 1;
    if (escrita.length >= 2 && palabra.startsWith(escrita)) return 0.95;
    const se = sonido(escrita);
    const sp = sonido(palabra);
    if (se && se === sp) return 0.9;
    if (se.length >= 2 && sp.startsWith(se)) return 0.85;
    const permitido = tolerancia(escrita.length);
    if (!permitido) return 0;
    /* El inicio aproximado ("bottl" por "boteld") solo cuenta en palabras largas; en las
       cortas confundía "dior" con el inicio de "giorgio" */
    const largas = escrita.length >= 5;
    const d = Math.min(
      distancia(escrita, palabra),
      distancia(se, sp),
      largas ? distancia(escrita, palabra.slice(0, escrita.length)) : Infinity,
      largas ? distancia(se, sp.slice(0, se.length)) : Infinity,
    );
    return d <= permitido ? 0.8 - (d / (escrita.length + 1)) * 0.5 : 0;
  }

  function puntajeBusqueda(consulta, p) {
    const nombre = limpiarBusqueda(p.nombre);
    const todo = limpiarBusqueda(`${p.casa} ${p.nombre} ${p.version || ""} ${p.origen}`);
    if (nombre.startsWith(consulta)) return 120;
    if (todo.includes(consulta)) return 100;
    /* El nombre completo escrito junto o con espacios distintos: "laviestbelle" */
    const junta = consulta.replace(/ /g, "");
    const nombreJunto = nombre.replace(/ /g, "");
    if (junta.length >= 4) {
      const d = Math.min(distancia(junta, nombreJunto), distancia(sonido(junta), sonido(nombreJunto)));
      if (d <= tolerancia(junta.length)) return 90 - d * 5;
    }
    /* Palabra por palabra: cada palabra escrita busca su mejor pareja en el perfume */
    const palabras = todo.split(" ");
    const escritas = consulta.split(" ").filter(Boolean);
    let suma = 0;
    let fallas = 0;
    escritas.forEach((escrita) => {
      const mejor = Math.max(...palabras.map((palabra) => parecido(escrita, palabra)));
      if (mejor === 0) fallas += 1;
      suma += mejor;
    });
    if (fallas > (escritas.length >= 3 ? 1 : 0)) return 0;
    return (suma / escritas.length) * 80;
  }

  function buscarPerfumes(texto) {
    const consulta = limpiarBusqueda(texto);
    if (!consulta) return [];
    const encontrados = PERFUMES
      .map((p) => ({ p, puntaje: puntajeBusqueda(consulta, p) }))
      .filter((r) => r.puntaje >= 40)
      .sort((a, b) => b.puntaje - a.puntaje);
    /* Si algo coincide tal cual, no se mezclan resultados aproximados */
    const hayExactos = encontrados.length && encontrados[0].puntaje >= 100;
    return encontrados.filter((r) => !hayExactos || r.puntaje >= 100).slice(0, 6).map((r) => r.p);
  }

  /* Resalta la parte del nombre que coincide con lo escrito (sin distinguir acentos) */
  function resaltar(texto, consulta) {
    const limpio = sinAcentos(texto);
    const i = limpio.indexOf(consulta);
    if (!consulta || i < 0 || limpio.length !== texto.length) return texto;
    return `${texto.slice(0, i)}<mark>${texto.slice(i, i + consulta.length)}</mark>${texto.slice(i + consulta.length)}`;
  }

  function filaSugerencia(p, consulta) {
    const f = familiaPorId.get(p.familia);
    return `
      <button class="buscar__sugerencia" type="button" data-sugerencia="${p.id}" style="--campo: var(--c-${f.id})">
        <img src="${p.lamina || url(p.foto, 160)}" alt="" width="56" height="56" loading="lazy">
        <span class="buscar__sugerencia-texto">
          <strong>${resaltar(p.nombre, consulta)}</strong>
          <small>${resaltar(p.casa, consulta)}${p.version ? ` · ${p.version}` : ""}</small>
        </span>
        <span class="buscar__familia">${f.nombre}</span>
        <i class="ph ph-arrow-up-right" aria-hidden="true"></i>
      </button>`;
  }

  /* Vista previa a la derecha: el perfume que la persona tiene bajo el puntero o el foco */
  function pintarVistaPrevia(id) {
    const caja = $("#busqueda-vista");
    const p = porId.get(id);
    if (!caja || !p) return;
    $$(".buscar__sugerencia", panelSugerencias).forEach((fila) => fila.classList.toggle("es-activa", fila.dataset.sugerencia === id));
    if (caja.dataset.perfume === id) return;
    const f = familiaPorId.get(p.familia);
    caja.dataset.perfume = id;
    caja.style.setProperty("--campo", `var(--c-${f.id})`);
    caja.style.setProperty("--tono", `var(--t-${f.id})`);
    caja.innerHTML = `
      <img class="busqueda__foto" src="${p.lamina || url(p.foto, 700)}" alt="">
      <div class="busqueda__info">
        <p class="busqueda__meta"><span>${f.nombre}</span>${p.casa} · ${p.origen}</p>
        <h3>${p.nombre}</h3>
        <p class="busqueda__huele">${hueleA(p)}</p>
        <ul class="busqueda__notas">
          ${notasPrincipales(p).map((nota) => `<li><i class="ph ${iconoNota(nota)}" aria-hidden="true"></i>${mayuscula(nota)}</li>`).join("")}
        </ul>
        <div class="busqueda__acciones">
          <button class="btn btn--claro" type="button" data-sugerencia="${p.id}">Ver ficha<i class="ph ph-arrow-right" aria-hidden="true"></i></button>
          <button class="agregar" type="button" data-id="${p.id}" aria-pressed="false"><i class="ph ph-plus" aria-hidden="true"></i><span>Agregar</span></button>
        </div>
      </div>`;
    caja.classList.remove("cambia");
    void caja.offsetWidth;
    caja.classList.add("cambia");
    pintarBotones();
  }

  /* Sin texto muestra los más vendidos; con texto, hasta seis coincidencias. A la izquierda
     van los resultados en filas y a la derecha la vista previa del que está activo. */
  function pintarSugerencias() {
    const consulta = sinAcentos(campoBusqueda.value.trim());
    const resultados = consulta ? buscarPerfumes(campoBusqueda.value) : MAS_VENDIDOS.slice(0, 5).map((id) => porId.get(id));
    /* Si nada contiene lo escrito tal cual, los resultados son aproximados: "Quizá buscabas" */
    const exactos = resultados.some((p) => sinAcentos(`${p.casa} ${p.nombre}`).includes(consulta));
    const titulo = !consulta ? "Más vendidos"
      : !resultados.length ? ""
      : exactos ? `${textoPerfumes(resultados.length)} para "${campoBusqueda.value.trim()}"`
      : "Quizá buscabas";

    if (resultados.length) {
      panelSugerencias.innerHTML = `
        <div class="busqueda__lista">
          <p class="busqueda__titulo"></p>
          ${resultados.map((p) => filaSugerencia(p, consulta)).join("")}
        </div>
        <div class="busqueda__vista" id="busqueda-vista" aria-live="polite"></div>`;
      $(".busqueda__titulo", panelSugerencias).textContent = titulo;
      pintarVistaPrevia(resultados[0].id);
    } else {
      panelSugerencias.innerHTML = `
        <div class="busqueda__lista busqueda__lista--sola">
          <p class="buscar__sin-resultados"><i class="ph ph-magnifying-glass" aria-hidden="true"></i><span></span>Prueba con el nombre o la casa, por ejemplo Dior o Lattafa.</p>
          <p class="busqueda__titulo">Quizá te interese</p>
          ${MAS_VENDIDOS.slice(0, 3).map((id) => filaSugerencia(porId.get(id), "")).join("")}
        </div>`;
      $(".buscar__sin-resultados span", panelSugerencias).textContent = `No encontramos "${campoBusqueda.value.trim()}".`;
    }
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
  let captchaWidget = null;
  let captchaCarga = null;

  function cargarCaptcha() {
    if (window.turnstile) return Promise.resolve();
    if (!captchaCarga) captchaCarga = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.onload = resolve;
      script.onerror = () => reject(new Error("No se pudo cargar la verificación"));
      document.head.append(script);
    });
    return captchaCarga;
  }

  function quitarCaptcha() {
    if (captchaWidget !== null && window.turnstile) window.turnstile.remove(captchaWidget);
    captchaWidget = null;
  }

  async function prepararCaptcha() {
    const caja = $(".resena__captcha", detalle);
    if (!caja) return;
    try {
      await cargarCaptcha();
      if (!window.turnstile) throw new Error("Turnstile no disponible");
      if (caja.isConnected) captchaWidget = window.turnstile.render(caja, {
        sitekey: SUPABASE.turnstileSiteKey,
        theme: "dark",
      });
    } catch {
      const estado = $(".resena__estado", detalle);
      if (estado) estado.textContent = "No se pudo cargar la verificación. Actualiza la página para intentarlo.";
    }
  }

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
    quitarCaptcha();
    const f = familiaPorId.get(p.familia);
    const otros = PERFUMES.filter((o) => o.familia === p.familia && o.id !== p.id).slice(0, 3);
    const resenas = RESENAS.filter((r) => r.perfume_id === p.id).slice(0, 5);
    const puedeEnviar = Boolean(SUPABASE.url && SUPABASE.publishableKey && SUPABASE.turnstileSiteKey);
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
            <div class="detalle__puntos">${fotos.map((_, i) => `<button type="button" data-diapo="${i}" aria-label="Ver foto ${i + 1} de ${fotos.length}" aria-current="${i === 0}"></button>`).join("")}</div>
          </div>` : ""}
        </div>
        <div class="detalle__info">
          <p class="detalle__meta" style="--i: 0"><span class="detalle__etiqueta">${f.nombre}</span><span>${p.casa} · ${p.origen}</span>${p.version ? `<span class="detalle__version">${p.version}</span>` : ""}</p>
          <h2 id="detalle-nombre" style="--i: 1">${p.nombre}</h2>
          <p class="detalle__huele" style="--i: 2">${hueleA(p)}</p>
          <p class="detalle__familia" style="--i: 3"><strong>Familia ${f.nombre.toLowerCase()}.</strong> ${f.larga}</p>
          ${notasPrincipales(p).length ? `<div class="detalle__momentos" style="--i: 4">
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
          </div>` : ""}
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
          <section class="detalle__resenas" aria-label="Reseñas de ${escaparHTML(p.nombre)}" style="--i: 9">
            <h3>Reseñas de clientes</h3>
            ${resenas.length ? `<ul class="resenas__lista">${resenas.map((r) => `
              <li>
                <div class="resena__cabecera"><strong>${escaparHTML(r.author_name)}</strong>${r.rating ? `<span aria-label="${r.rating} de 5 estrellas">${"★".repeat(r.rating)}</span>` : ""}</div>
                ${r.city ? `<small>${escaparHTML(r.city)}</small>` : ""}
                <p>${escaparHTML(r.body)}</p>
              </li>`).join("")}</ul>` : `<p class="resenas__vacio">Todavía no hay reseñas publicadas de este perfume.</p>`}
            ${puedeEnviar ? `<form class="resena__form" data-resena-perfume="${p.id}">
              <h4>Cuéntanos qué te pareció</h4>
              <div class="resena__campos">
                <label>Tu nombre<input name="nombre" maxlength="80" minlength="2" required autocomplete="name"></label>
                <label>Ciudad (opcional)<input name="ciudad" minlength="2" maxlength="80" autocomplete="address-level2"></label>
              </div>
              <label>Tu calificación<select name="estrellas" required><option value="">Elige una opción</option><option value="5">5 estrellas</option><option value="4">4 estrellas</option><option value="3">3 estrellas</option><option value="2">2 estrellas</option><option value="1">1 estrella</option></select></label>
              <label>Tu reseña<textarea name="texto" minlength="15" maxlength="1500" rows="4" required></textarea></label>
              <label class="resena__consentimiento"><input type="checkbox" name="publicar" required> Acepto que se publique mi nombre y reseña después de la revisión.</label>
              <div class="resena__captcha"></div>
              <p class="resena__estado" role="status" aria-live="polite">Tu reseña aparecerá cuando la revisemos.</p>
              <button class="btn btn--claro" type="submit">Enviar reseña</button>
            </form>` : ""}
          </section>
          ${p.fuente ? `<p class="detalle__fuente" style="--i: 9">Datos aromáticos según <a href="${p.fuente}" target="_blank" rel="noopener">${escaparHTML(p.fuenteNombre || "Fragrantica")}</a>.</p>` : ""}
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
      prepararCaptcha();
      return;
    }
    tarjetaOrigen = document.activeElement;
    detalle.classList.remove("es-cerrando");
    if (typeof detalle.showModal === "function") detalle.showModal();
    else detalle.setAttribute("open", "");
    observarBloques();
    volarImagen(desde);
    iniciarCarruselDetalle();
    prepararCaptcha();
  }

  function cerrarDetalle() {
    if (!detalle.open || detalle.classList.contains("es-cerrando")) return;
    if (relojDetalle) window.clearInterval(relojDetalle);
    relojDetalle = null;
    const cerrar = () => {
      quitarCaptcha();
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
    detalle.addEventListener("submit", async (evento) => {
      const form = evento.target.closest(".resena__form");
      if (!form) return;
      evento.preventDefault();
      const estado = $(".resena__estado", form);
      const boton = $("button[type='submit']", form);
      const widget = captchaWidget;
      const token = widget !== null && window.turnstile ? window.turnstile.getResponse(widget) : "";
      if (!token) {
        estado.textContent = "Completa la verificación antes de enviar.";
        return;
      }
      const datos = new FormData(form);
      boton.disabled = true;
      estado.textContent = "Enviando reseña…";
      try {
        const urlFuncion = new URL("/functions/v1/submit-review", SUPABASE.url);
        const respuesta = await fetch(urlFuncion, {
          method: "POST",
          headers: { apikey: SUPABASE.publishableKey, "Content-Type": "application/json" },
          body: JSON.stringify({
            perfumeId: form.dataset.resenaPerfume,
            nombre: datos.get("nombre"), ciudad: datos.get("ciudad"),
            estrellas: datos.get("estrellas"), texto: datos.get("texto"),
            publicationConsent: datos.get("publicar") === "on", token,
          }),
        });
        const resultado = await respuesta.json();
        if (!respuesta.ok) throw new Error(resultado.error || "No se pudo enviar la reseña");
        form.reset();
        estado.textContent = resultado.message;
      } catch (error) {
        estado.textContent = error.message || "No se pudo enviar la reseña. Inténtalo de nuevo.";
      } finally {
        if (window.turnstile && widget !== null && widget === captchaWidget) window.turnstile.reset(widget);
        boton.disabled = false;
      }
    });
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

    /* Al liberar, la intro deja de recibir toques de inmediato y se retira del todo.
       Antes, si el teléfono arrancaba la animación tarde (al cargar las fotos), el respaldo
       liberaba la página pero la capa de la intro seguía encima tapando los botones. */
    let liberada = false;
    const liberar = (forzada) => {
      if (liberada) return;
      liberada = true;
      raiz.classList.remove("intro-activa");
      hoja.inert = false;
      mostrarBarra();
      intro.style.pointerEvents = "none";
      if (forzada) {
        intro.style.transition = "opacity 400ms ease";
        intro.style.opacity = "0";
        window.setTimeout(() => { intro.hidden = true; }, 420);
      } else {
        intro.hidden = true;
      }
      iniciarCarrusel();
    };
    intro.addEventListener("animationend", (evento) => {
      if (evento.animationName === "intro-desvanece") liberar(false);
    });

    /* La intro no arranca de golpe: espera a que la página cargue (fotos de la portada,
       letra e iconos) y un momento más. Si la conexión es lenta, arranca a los 3.5 s. */
    let arrancada = false;
    const arrancar = () => {
      if (arrancada) return;
      arrancada = true;
      raiz.classList.remove("intro-esperando");
      /* Respaldo por si la animación se atrasa o el navegador no avisa de su final */
      window.setTimeout(() => liberar(true), 5600);
    };
    const trasCargar = () => window.setTimeout(arrancar, 350);
    if (document.readyState === "complete") trasCargar();
    else window.addEventListener("load", trasCargar, { once: true });
    window.setTimeout(arrancar, 3500);
  }

  /* ---------- Eventos ---------- */

  document.addEventListener("click", (evento) => {
    const boton = evento.target.closest("button");
    if (!boton) {
      /* Tocar cualquier parte de una tarjeta de perfume (no solo la foto) abre su ficha;
         los botones de dentro, como "Agregar", siguen haciendo lo suyo */
      const tarjeta = evento.target.closest(".ficha, .vendidos__tarjeta, .vendido, .destacado, .pedido__item, .novedad");
      const abrir = tarjeta && !evento.target.closest("a") ? $("[data-ficha]", tarjeta) : null;
      if (abrir) abrirDetalle(abrir.dataset.ficha, $(".ficha__lamina, .vendidos__tarjeta-foto, .pedido__foto, .destacado__foto, .novedad__foto", tarjeta));
      return;
    }

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
    } else if (boton.dataset.clientePunto) {
      verCliente(Number(boton.dataset.clientePunto));
    } else if (boton.id === "abrir-filtros") {
      abrirFiltros();
    } else if (boton.id === "cerrar-filtros" || boton.id === "aplicar-filtros") {
      cerrarFiltros();
    } else if (boton.id === "limpiar-filtros") {
      estado.filtros = { familia: "todas", origen: "todos" };
      aplicarFiltros();
      sincronizarDireccion();
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
      const tarjeta = boton.closest(".ficha, .vendidos__tarjeta, .vendido, .pedido__item, .destacado, .novedad");
      abrirDetalle(boton.dataset.ficha, tarjeta ? $(".ficha__lamina, .vendidos__tarjeta-foto, .pedido__foto, .destacado__foto, .novedad__foto", tarjeta) : null);
    } else if (boton.classList.contains("detalle__cerrar")) {
      cerrarDetalle();
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

  /* La hoja de filtros se cierra con Esc o tocando el fondo */
  if (hojaFiltros) {
    $("#filtros-fondo").addEventListener("click", cerrarFiltros);
    document.addEventListener("keydown", (evento) => {
      if (evento.key === "Escape" && !(detalle && detalle.open)) cerrarFiltros();
    });
    filtrosMovil.addEventListener("change", ajustarHojaFiltros);
    ajustarHojaFiltros();
  }

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
  ["pointerover", "focusin"].forEach((tipo) => panelSugerencias.addEventListener(tipo, (evento) => {
    const fila = evento.target.closest(".buscar__sugerencia");
    if (fila) pintarVistaPrevia(fila.dataset.sugerencia);
  }));
  $("#buscar").addEventListener("submit", (evento) => {
    evento.preventDefault();
    if (!campoBusqueda.value.trim()) return;
    const primera = $(".buscar__sugerencia", panelSugerencias);
    if (primera) primera.click();
  });

  /* ---------- Inicio ---------- */

  iniciarIntro();
  pintarHero();
  pintarVendidos();
  pintarNovedades();
  pintarClientes();
  pintarCatalogo();
  aplicarFiltros();
  iniciarPestanas();
  pintarDestacado();
  pintarLista(null);
  actualizarPedido();
  observarRevelados();
  iniciarParallax();
  iniciarDeslizarHero();
  /* El video entra cuando la página ya cargó, para no retrasar la carga ni la intro */
  if (document.readyState === "complete") ponerVideoHero();
  else window.addEventListener("load", ponerVideoHero, { once: true });
  /* Con intro, el carrusel empieza a contar cuando la intro libera la página */
  if (!document.documentElement.classList.contains("con-intro")) iniciarCarrusel();
})();
