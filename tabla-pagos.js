/* Tabla de pagos de Sensorial (apartados en abonos).
   La usan pagos.html (lo que ve el cliente) y la vista previa del panel: calcula lo abonado y
   lo pendiente, pinta la plantilla con las fotos que sube el administrador, abre con el logo,
   anima cada parte cuando el cliente llega a ella, mueve las capas en parallax y anima el fondo
   de hilos dorados. Expone window.TablaPagos. */
(() => {
  "use strict";

  const ORDINALES = ["Primer", "Segundo", "Tercer", "Cuarto", "Quinto", "Sexto", "Séptimo", "Octavo", "Noveno", "Décimo", "Undécimo", "Duodécimo"];
  const TONOS = ["rosa", "dorado", "celeste", "verde", "lila"];
  const numero = new Intl.NumberFormat("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const dia = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", timeZone: "UTC" });
  /* Lo que tarda el logo en armarse en la apertura (ver .tp-logo--arma en tabla-pagos.css) y en
     viajar a la cabecera: sin pausas, la tabla aparece en cerca de un segundo y medio */
  const ARMADO = 1000;
  const VIAJE = 850;

  const reducido = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const pausa = (ms) => new Promise((listo) => { setTimeout(listo, ms); });
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

  /* ---------- Logotipo ----------
     El logo de Sensorial en piezas (las mismas de la intro de la tienda), dibujado en blanco
     dentro de la página: no depende de cargar otra imagen. [pieza, orden, trazo] */
  const LOGO = [
    ["letra", 0, "M208.82,449.24 C197.6,443.67 186.27,439.17 175.71,433.09 C170.49,430.08 165.6,426.66 161.34,422.36 C144.08,404.91 147.13,380.86 168.22,368.33 C187.34,356.98 218.77,358.45 236.65,371.7 C242.64,376.14 246.9,381.73 246.28,389.81 C246.09,392.22 245.31,394.41 243.48,396.03 C240.71,398.49 237.65,397.45 236.78,393.85 C232.75,377.1 221.33,367.42 204.12,366.18 C194.64,365.5 185.5,366.44 177.14,371.55 C162.76,380.34 160.32,398.23 171.85,410.42 C177.58,416.48 184.81,420.25 192.09,423.97 C204.25,430.18 217.03,435.14 228.76,442.22 C237.88,447.73 246.02,454.28 250.89,464.03 C258.68,479.62 253.68,499.23 238.78,511.6 C222.77,524.89 204.09,529.97 183.53,529.57 C166.45,529.24 151,524.7 138.03,513.21 C126.62,503.11 122.25,487.85 126.83,474.78 C131.33,461.93 145.92,451.41 160.33,450.76 C165.48,450.52 170.68,450.18 175.59,452.35 C176.81,452.89 178.32,453.5 177.91,455.14 C177.4,457.14 175.71,456.79 174.22,456.38 C162.22,453.15 151.77,455.83 144.41,465.93 C136.15,477.24 136.5,489.63 142.68,501.84 C147.86,512.07 156.56,518.53 167.32,521.66 C187.96,527.63 207.24,524.79 224.27,511 C232.22,504.56 237.23,496.21 238.59,486.02 C240,475.44 235.33,467.27 227.37,460.74 C221.81,456.17 215.5,452.75 208.82,449.24 z"],
    ["luna", null, "M539.42,359.58 C504.54,376.15 467.58,357.28 461.2,319.99 C457.71,299.56 468.76,276.76 487.35,266.25 C490.68,264.37 494.18,262.78 497.68,261.23 C499.27,260.53 501.03,259.6 503.01,261.26 C502.69,263.78 500.49,264.95 498.92,266.5 C480.98,284.24 480.09,314.33 497.02,331.46 C512.42,347.04 537.93,347.02 555.98,331.64 C560.77,327.56 564.5,322.5 569.07,317.79 C572.37,328.17 556.76,349.8 539.42,359.58 z"],
    ["letra", 2, "M445.31,432.92 C448.02,438.23 449.34,443.49 449.33,449.1 C449.3,463.25 449.34,477.41 449.3,491.56 C449.29,494.74 449.54,497.87 450.28,500.96 C451.65,506.67 454.95,509.44 460.75,509.73 C462.33,509.81 464.49,509.18 464.63,511.62 C464.75,513.72 462.74,514.08 461.16,514.59 C450.24,518.13 437.12,509.9 434.87,497.87 C434.2,494.3 434.07,490.59 434.03,486.95 C433.93,475.12 434,463.3 433.97,451.48 C433.96,446.63 433.68,441.8 431.46,437.35 C424.75,423.92 405.5,421.92 393.96,433.42 C390.14,437.22 388.01,441.42 388.12,447.13 C388.42,463.12 388.18,479.11 388.22,495.09 C388.24,501.86 385.96,509.71 396.48,511.54 C392.81,514.83 369.67,515.13 365.49,512.55 C365.55,512.23 365.56,511.67 365.7,511.64 C372.69,509.75 373.06,504.55 372.99,498.48 C372.74,477.5 372.89,456.52 372.86,435.53 C372.86,431.05 373.59,426.29 366.61,425.95 C364.19,425.83 364.7,423.43 366.54,422.49 C370.85,420.28 375.3,418.26 380.34,418.88 C384.41,419.37 387.04,421.62 387.83,425.76 C388.14,427.34 388.32,428.95 388.68,431.32 C398.48,420.58 410.11,416.1 423.95,418.27 C433.18,419.71 440.34,424.46 445.31,432.92 z"],
    ["letra", 7, "M810.69,420.01 C825.91,425.94 831.69,434.46 831.93,451.71 C832.12,465.54 831.92,479.36 831.97,493.19 C831.98,497 831.77,500.87 833.63,504.44 C836.18,509.33 840.16,510.47 844.73,507.53 C846.08,506.67 847.38,504.85 849.01,506.61 C850.78,508.54 848.92,509.98 847.72,511.26 C840.01,519.51 824.17,516.86 819.25,506.46 C818.07,503.96 817.26,501.28 816.14,498.29 C809.76,507.76 801.32,513.73 790.21,515.65 C782.11,517.05 774.27,516.24 766.73,513.01 C747.62,504.83 744.73,482.24 761.18,469.48 C769.41,463.09 779.1,460.05 789.1,457.92 C796.25,456.4 803.44,454.86 810.8,454.7 C815.2,454.6 816.8,452.59 816.78,448.13 C816.73,435.62 812.99,428.61 803.88,425.09 C793.23,420.98 777.84,424 771.34,431.58 C768.77,434.58 767.39,438.15 767.4,442.12 C767.4,444.67 767.85,447.39 764.41,448.01 C760.77,448.66 758.06,446.94 756.87,443.66 C754.98,438.45 756.63,433.8 760.34,429.93 C767.75,422.2 777.24,418.81 787.59,417.82 C795.23,417.1 802.92,417.28 810.69,420.01 M816.74,473.46 C816.73,469.97 816.64,466.47 816.73,462.98 C816.8,460.16 815.51,458.93 812.79,459.32 C807.85,460.02 802.88,460.58 798.02,461.62 C787.85,463.79 777.93,466.64 770.68,474.86 C764.54,481.82 763.54,492.71 768.22,500.48 C772.41,507.43 781.6,510.92 790.51,508.93 C807.03,505.24 816.71,492.51 816.74,473.46 z"],
    ["letra", 4, "M615.32,510.48 C588.22,523.88 557.47,514.52 545.36,489.03 C532.19,461.31 544.63,423.97 580.65,417.02 C605.4,412.24 628.82,425.05 637.19,447.49 C645.95,470.93 637.68,498.26 615.32,510.48 M623.85,473.22 C624.85,459.78 623.14,446.95 615.21,435.57 C603.83,419.22 582.39,417.51 568.61,431.82 C551.36,449.73 552.24,485.75 570.35,502.91 C582.61,514.54 600.31,514.02 611.81,501.57 C618.96,493.85 622.56,484.49 623.85,473.22 z"],
    ["letra", 8, "M916.87,519.93 C900.57,532.25 878.29,531.01 865.65,517.32 C858.89,510 857.02,501.03 857.02,491.44 C857.02,455.62 857.03,419.81 856.99,383.99 C856.99,381.17 857.08,378.26 856.45,375.54 C855.53,371.53 853.58,368.23 848.44,369.75 C846.99,370.18 845.69,370.04 845.14,368.49 C844.6,366.99 845.71,366.03 846.67,365.09 C853.95,357.99 865.28,359.91 869.79,369.08 C871.89,373.36 872.29,377.98 872.29,382.7 C872.26,419.35 872.29,456 872.26,492.65 C872.26,497.01 872.55,501.33 874.04,505.44 C877.33,514.48 883.61,520.21 893.26,521.57 C903.91,523.08 912.46,519.26 919.12,510.8 C920.54,508.98 921.38,504.4 924.54,506.7 C927.66,508.98 923.97,511.72 922.55,513.84 C921.09,516.02 918.97,517.76 916.87,519.93 z"],
    ["letra", 1, "M265.39,453.7 C275.21,424.36 308.7,408.82 336.91,420.38 C346.58,424.33 353.96,430.74 356.55,441.44 C358.07,447.75 355.74,451.68 349.39,453.4 C328.03,459.2 306.44,464.09 285.24,470.48 C278.78,472.42 278.63,472.6 280.27,479.17 C287.76,509.23 319.77,518.78 342.58,497.77 C346.14,494.49 349.45,490.99 352.09,486.89 C352.91,485.62 354.03,484.29 355.76,485.24 C357.93,486.44 356.79,488.16 355.97,489.53 C344.29,509 322.92,520.42 300.46,514.45 C276.33,508.02 261.98,488.59 263.52,464.88 C263.76,461.21 264.18,457.6 265.39,453.7 M322.75,422.57 C298.33,420.13 272.98,445.99 280.16,466.07 C281.69,466.58 283.11,465.91 284.52,465.51 C295.58,462.43 306.65,459.34 317.68,456.13 C323.11,454.55 328.71,453.5 333.88,451.08 C341.45,447.54 343.28,442.43 339.76,434.78 C336.56,427.81 330.86,424.24 322.75,422.57 z"],
    ["letra", 3, "M466.9,481.82 C470.8,480.4 471.11,482.76 471.33,485.31 C471.98,492.77 475.17,498.99 480.56,504.14 C488.22,511.46 497.48,512.48 507.11,510.13 C513.69,508.53 518.03,503.72 519.37,496.92 C520.72,490.06 517.81,484.51 512.88,480.01 C506.78,474.44 499.25,471.11 492.03,467.33 C487.45,464.94 482.88,462.54 478.8,459.33 C471.2,453.32 467.07,445.62 468.6,435.83 C470.14,425.98 477,420.51 485.98,417.82 C498.58,414.03 511.05,414.87 522.83,420.94 C529.91,424.59 532.73,431.21 530.38,436.95 C529.44,439.24 528.11,441.25 525.39,441.14 C522.15,441.01 522.93,438.23 522.58,436.22 C521.85,432.12 519.82,428.78 516.6,426.14 C509.21,420.1 495.07,419.03 486.81,423.9 C478.86,428.59 478.13,438.56 485.39,445.55 C489.77,449.76 495.26,452.3 500.65,454.92 C507.7,458.34 514.71,461.82 520.97,466.6 C533.19,475.93 536.79,489.91 529.69,501.81 C524.87,509.89 517.18,514.24 508.08,515.59 C493.29,517.77 479.38,515.88 468.45,504.41 C461.52,497.12 460.98,488.31 466.9,481.82 z"],
    ["letra", 5, "M652.68,459 C652.68,450.17 652.68,441.84 652.67,433.51 C652.66,429.74 652.13,426.37 647.22,426.25 C646.14,426.22 645.27,425.67 645.15,424.49 C645.06,423.58 645.61,422.86 646.38,422.49 C650.9,420.33 655.44,418.03 660.67,418.98 C665.78,419.91 667.35,423.92 668.07,428.46 C670.26,428.33 670.83,426.52 671.93,425.44 C678.37,419.2 685.93,415.99 694.98,416.69 C703.2,417.32 708.95,423.12 708.56,430.37 C708.32,434.9 705.64,438.1 701.81,438.31 C697.03,438.58 695.55,435.57 694.92,431.5 C693.98,425.41 689.71,422.97 683.72,424.93 C674.2,428.04 667.26,439.44 667.53,450.11 C667.93,466.25 668.07,482.4 667.69,498.54 C667.55,504.81 667.99,509.85 675.34,511.41 C672.18,514.93 649.41,515.26 645.4,512.41 C645.43,511.41 646.09,510.92 646.92,510.7 C651.42,509.48 652.72,506.27 652.7,501.98 C652.63,487.82 652.68,473.66 652.68,459 z"],
    ["letra", 6, "M735.35,456 C735.35,469.33 735.38,482.16 735.32,494.99 C735.31,497.85 735.56,500.65 736.32,503.39 C737.38,507.25 739.34,510.09 743.97,509.66 C745.48,509.52 747.2,509.38 747.44,511.48 C747.66,513.35 746.08,513.94 744.69,514.55 C732.83,519.73 720.88,511.54 720.76,497.88 C720.59,477.88 720.7,457.89 720.7,437.89 C720.7,436.4 720.74,434.89 720.64,433.4 C720.46,430.69 719.61,428.46 716.37,428.26 C715.16,428.19 713.92,428.01 713.75,426.51 C713.59,425.11 714.69,424.44 715.75,423.93 C718,422.85 720.23,421.69 722.58,420.87 C730.97,417.93 735.32,421.08 735.34,430.01 C735.36,438.5 735.35,447 735.35,456 z"],
    ["onda-der", 0, "M733.35,313.41 C744.25,314.41 753.19,319.1 761.8,324.68 C766.41,327.66 770.89,330.96 775.8,333.34 C780.67,335.7 786.03,338.07 790.86,332.7 C792,331.45 793.61,331.27 794.78,332.72 C795.92,334.13 795.38,335.58 794.17,336.72 C790.99,339.7 787.07,340.18 782.98,339.8 C777.2,339.26 772.16,336.74 767.27,333.76 C764.92,332.33 762.79,330.38 759.5,329.75 C759.88,333.71 760.62,337.27 760.36,340.9 C759.97,346.28 757.55,350.47 753.13,353.4 C747.86,356.9 740.36,354.93 738.28,349.47 C737.11,346.39 737.11,343.46 741.68,342.16 C742.42,346.02 742.13,350.16 747.11,350.22 C751.06,350.26 754.39,346.8 755.48,341.6 C756.98,334.42 752.62,326.33 744.8,322.48 C734.45,317.37 723.65,317.31 712.67,320.15 C702.51,322.78 693.58,327.9 684.96,333.67 C670.89,343.08 656.29,351.15 639.2,353.89 C617.57,357.36 597.52,352.88 578.38,342.96 C577.15,342.32 575.47,341.8 575.81,339.51 C578.15,337.84 580.1,339.67 582.07,340.54 C603.02,349.74 624.61,352.52 646.89,346.52 C661.6,342.56 673.97,333.92 686.67,325.93 C700.75,317.07 715.73,311.04 733.35,313.41 z"],
    ["onda-izq", 0, "M408.86,354.27 C385.68,355.62 365.41,348.72 346.63,336.4 C337.02,330.09 327.2,324.1 315.97,320.91 C304.43,317.64 292.99,316.98 281.84,322.27 C272.84,326.55 268.39,335.99 271.37,343.97 C272.09,345.89 273.1,347.57 274.85,348.72 C278.86,351.38 282.71,349.91 283.74,345.24 C284.04,343.9 284.01,342.39 285.88,342.57 C287.43,342.71 287.98,343.97 288.27,345.37 C289.45,351.07 283.17,356.25 276.78,354.84 C268.79,353.07 264.08,344.27 265.97,334.51 C266.28,332.9 266.81,331.32 267.55,328.55 C262.92,331.47 259.2,334.04 255.26,336.24 C248.77,339.86 242.06,342.77 234.36,340.24 C232.6,339.66 230.85,338.99 229.98,337.18 C229.37,335.9 229.34,334.57 230.62,333.59 C231.76,332.72 232.97,333.03 233.75,333.99 C237.68,338.82 242.51,337.11 246.99,335.54 C253.34,333.32 258.58,329.04 264.03,325.21 C272.6,319.19 281.8,314.91 292.37,313.6 C306.28,311.88 319.21,314.97 331.45,321.2 C338.12,324.59 344.59,328.44 350.86,332.53 C381.28,352.39 413.04,354.08 446.11,340.04 C447.82,339.31 449.5,337.72 451.68,338.84 C449.92,344.91 426.71,353.33 408.86,354.27 z"],
    ["rayo", 1, "M542.16,272.23 C552.51,248.23 562.7,224.58 572.89,200.92 C573.29,200 573.6,199.05 574.05,198.16 C574.8,196.7 575.53,194.77 577.64,195.64 C579.9,196.57 578.8,198.43 578.19,199.91 C575.73,205.91 573.26,211.9 570.68,217.85 C562.54,236.6 554.34,255.33 546.16,274.06 C545.76,274.98 545.4,275.91 544.95,276.8 C544.2,278.31 543.37,280.16 541.31,279.18 C539.08,278.12 540.52,276.35 541.04,274.87 C541.31,274.09 541.68,273.34 542.16,272.23 z"],
    ["sub", 5, "M558.84,564.6 C558.83,554.64 563.57,548.96 572.21,548.1 C578.99,547.42 585.33,552.47 586.79,559.74 C587.66,564.09 586.76,568.22 583.87,571.42 C580.51,575.13 581.22,577.02 585.77,578.2 C586.23,578.32 586.61,578.71 587.75,579.43 C584.25,582.77 581.28,582.12 578.88,579.59 C576.74,577.33 574.51,576.7 571.52,576.51 C564.45,576.05 560.57,571.64 558.84,564.6 M581.99,563.31 C582.15,559.84 581.45,556.66 578.48,554.48 C575.1,552.01 571.55,551.4 567.91,554 C564.19,556.65 562.72,561.46 564.16,565.91 C565.6,570.35 568.75,572.23 573.24,572 C578.23,571.75 581.21,569.17 581.99,563.31 z"],
    ["linea-der", null, "M771,563.99 C757.53,563.71 744.54,564.49 731.59,563.37 C731.01,563.32 730.42,562.74 730.74,560.69 C770.43,558.89 810.32,561.43 850.2,560.64 C850.21,561.45 850.22,562.25 850.23,563.05 C823.99,563.36 797.74,563.68 771,563.99 z"],
    ["brillo", 1, "M667.45,279.6 C668,277.74 669,276.42 669.96,278.5 C671.48,281.8 672.45,285.31 675.12,288.02 C677.74,290.69 681.63,290.93 684.99,293.19 C681.42,295.75 677.21,296.25 674.49,299.31 C671.9,302.22 670.97,305.93 668.81,309.98 C666.72,301 661.3,295.67 652.13,293.3 C659.8,291.17 665.14,287.24 667.45,279.6 z"],
    ["rayo", 3, "M570.53,287.51 C587.47,270.04 604.16,252.83 620.86,235.61 C621.67,234.78 622.4,233.81 623.34,233.16 C625.03,231.97 626.3,228.27 628.78,230.75 C630.77,232.74 627.94,234.6 626.54,236.04 C614.05,248.97 601.49,261.84 588.93,274.71 C583.82,279.96 578.68,285.18 573.47,290.34 C572.27,291.53 570.92,293.77 568.99,291.93 C567.3,290.32 569.31,289.01 570.53,287.51 z"],
    ["brillo", 1, "M363.82,298.79 C360.35,301.68 359.99,306 357.2,310.22 C355,301.2 349.95,295.77 341.23,293.29 C349.63,290.84 354.92,285.71 357.46,277.3 C360.11,285.69 365.3,290.94 374.71,292.68 C370.67,295.69 366.71,295.95 363.82,298.79 z"],
    ["linea-izq", null, "M182.21,563.29 C179.82,563.14 177.78,563.7 175.9,562.47 C179.08,559.93 288.37,559.17 295.86,561.58 C294.37,564.9 291.37,563.84 289.04,563.83 C258.58,563.72 228.12,563.5 197.66,563.31 C192.67,563.28 187.67,563.3 182.21,563.29 z"],
    ["punto", null, "M717.43,391.57 C721.23,387.44 725.5,386.34 730.28,388.47 C734.67,390.43 736.75,394.05 736.43,398.87 C736.12,403.3 733.65,406.32 729.55,407.75 C725.09,409.3 721.01,408.37 717.84,404.7 C714.32,400.63 714.46,396.29 717.43,391.57 z"],
    ["onda-der", 1, "M692.3,342.11 C686.1,344.65 681.4,349.19 675.21,351.08 C678.77,346.62 683.44,343.68 688.19,340.95 C691.24,339.21 694.03,337.27 696.71,334.99 C704.82,328.05 714.01,325.78 725.21,329.25 C720.71,336.22 714.86,339.76 707.48,341.45 C702.51,342.58 697.54,340.26 692.3,342.11 z"],
    ["onda-izq", 1, "M330.71,341.34 C320.54,342.79 311.75,340.95 304.53,333.79 C303.4,332.67 301.76,331.85 301.82,329.29 C308.9,326.54 316.23,326.73 322.68,330.49 C332.4,336.18 341.55,342.86 350.91,349.16 C351.37,349.47 351.55,350.2 352.5,351.83 C344.05,349.29 339.02,342.23 330.71,341.34 z"],
    ["sub", 0, "M374.47,564.18 C376.33,572.22 373.49,576 365.82,576.26 C354.45,576.65 354.46,576.65 354.59,565.6 C354.64,561.28 354.68,556.96 354.6,552.65 C354.55,549.99 355.53,548.59 358.35,548.67 C361.33,548.75 364.34,548.52 367.31,548.76 C372.86,549.2 375.69,553.38 373.66,558.52 C372.8,560.69 372.62,562.23 374.47,564.18 M362.68,564.03 C359.51,564.02 358.84,565.98 359.09,568.62 C359.38,571.76 363.44,573.13 367.86,571.62 C369.6,571.03 370.66,569.93 370.67,568.04 C370.69,566.15 369.7,564.87 367.92,564.44 C366.5,564.1 364.99,564.13 362.68,564.03 M369.56,556.36 C368.28,552.77 364.63,551.1 361.04,552.47 C358.47,553.44 358.86,555.69 359.25,557.53 C359.98,560.96 365.94,560.67 369.56,556.36 z"],
    ["onda-der", 0, "M642.26,328.24 C637.93,332.67 633.02,335.45 627.31,336.45 C622.92,337.22 619.19,340.09 614.75,340.43 C613.96,338.73 615.23,338.33 615.98,338 C619.71,336.34 621.74,333.27 623.65,329.83 C628.68,320.73 639.07,315.07 648.38,316.39 C648.11,321.14 645.07,324.45 642.26,328.24 z"],
    ["rayo", 3, "M431.87,262.13 C438.57,269.12 445.03,275.85 451.44,282.63 C452.64,283.89 454.76,285.42 452.91,287.18 C450.93,289.04 449.66,286.5 448.54,285.35 C432.24,268.66 416,251.92 399.77,235.16 C398.57,233.92 396.41,232.36 398.26,230.61 C400.38,228.61 401.81,231.16 403.09,232.47 C412.64,242.23 422.12,252.07 431.87,262.13 z"],
    ["sub", 1, "M424.15,560.36 C424.19,570.79 418.77,576.71 409.78,576.51 C401.3,576.33 396.1,570.05 396.67,560.69 C397.07,554 401.8,549.11 408.7,548.26 C416.07,547.35 421.72,551.63 424.15,560.36 M402.14,567.05 C405.57,572.15 409.71,573.61 414.33,571.36 C418.64,569.27 420.72,563.76 419,558.98 C417.34,554.35 412.87,551.58 408.51,552.49 C403.66,553.5 400.87,557.65 401.24,563.43 C401.3,564.41 401.61,565.38 402.14,567.05 z"],
    ["onda-izq", 0, "M387.77,331.36 C382.93,327.33 379.67,322.7 377.93,316.99 C383.56,314.85 394,318.69 399.01,324.5 C400.1,325.75 401.26,327.06 401.91,328.55 C404.05,333.47 407.6,336.97 412.21,339.93 C404.08,337.12 395.39,336.4 387.77,331.36 z"],
    ["rayo", 1, "M458.47,225.43 C454.7,216.86 451.07,208.66 447.52,200.42 C446.84,198.84 445.29,196.7 447.59,195.61 C450.27,194.33 450.83,197.15 451.57,198.82 C459.89,217.5 468.14,236.2 476.38,254.9 C477.11,256.56 478.15,258.67 475.76,259.6 C473.69,260.41 472.98,258.2 472.34,256.78 C467.72,246.47 463.19,236.11 458.47,225.43 z"],
    ["sub", 2, "M466.11,548.91 C469.29,556.86 469.47,564.92 465.89,572.38 C463.86,576.62 458.95,577.12 454.41,576.38 C450,575.66 447.2,573.06 446.36,568.65 C445.29,563.06 445.95,557.39 446.01,551.75 C446.03,550.38 446.45,549.02 448.23,549.01 C450.08,548.99 450.31,550.4 450.33,551.76 C450.39,555.75 450.32,559.74 450.39,563.73 C450.51,569.8 452.48,572.15 457.2,572.02 C461.82,571.89 463.73,569.13 463.47,563.29 C463.29,559.48 463.34,555.67 463.3,551.86 C463.28,550.21 463.64,548.84 466.11,548.91 z"],
    ["sub", 7, "M663.96,564.2 C662.02,564.29 660.46,564.13 659.05,564.5 C656.86,565.07 657.38,567.07 657.32,568.67 C657.25,570.68 658.21,571.81 660.27,571.85 C662.93,571.9 665.6,571.85 668.26,571.99 C669.6,572.06 671.06,572.41 670.99,574.21 C670.92,576 669.46,576.22 668.11,576.23 C664.11,576.27 660.12,576.21 656.12,576.23 C653.49,576.24 652.71,574.73 652.71,572.39 C652.74,565.73 652.75,559.07 652.71,552.41 C652.7,549.99 653.62,548.67 656.22,548.7 C660.21,548.75 664.21,548.66 668.2,548.7 C669.33,548.71 670.77,548.74 670.86,550.29 C670.97,552.18 669.4,552.25 668.07,552.3 C665.91,552.37 663.74,552.41 661.58,552.31 C658.8,552.19 657.17,552.95 657.24,556.2 C657.31,559.14 658.78,559.95 661.34,559.85 C662.33,559.81 663.34,559.79 664.33,559.89 C666.05,560.07 668.68,559.39 668.87,561.77 C669.11,564.81 666.2,563.89 663.96,564.2 z"],
    ["sub", 6, "M619.92,576.38 C611.61,575.91 608.83,573.05 608.71,565.17 C608.64,560.84 608.68,556.51 608.74,552.18 C608.76,550.67 608.84,548.98 610.97,548.98 C613.11,548.98 613.19,550.67 613.21,552.17 C613.28,556.67 613.3,561.17 613.28,565.67 C613.26,570.02 615.65,572.35 619.71,572.3 C623.6,572.24 625.7,569.7 625.76,565.75 C625.83,561.25 625.78,556.75 625.85,552.25 C625.88,550.74 625.98,549.04 628.06,549 C630.22,548.97 630.24,550.72 630.25,552.21 C630.29,557.21 630.48,562.22 630.2,567.2 C629.87,572.88 626.72,575.6 619.92,576.38 z"],
    ["rayo", 0, "M510.69,170.39 C510.86,168.57 511.08,167.12 512.86,167.17 C514.55,167.22 514.99,168.68 515.04,170.01 C515.19,173.5 515.22,176.99 515.22,180.48 C515.21,191.94 515.2,203.41 515.12,214.88 C515.1,216.77 515.46,219.56 512.68,219.46 C509.86,219.36 510.6,216.64 510.6,214.72 C510.62,200.09 510.65,185.47 510.69,170.39 z"],
    ["brillo-bajo", 1, "M716.66,551.74 C718.31,557.22 722.32,559.67 727.54,561.72 C721.29,563.73 717.33,567.69 715.38,574.17 C712.87,568.3 710.19,563.03 702.76,562.04 C708.85,559.75 712.68,556.44 714.37,550.65 C714.92,548.76 716.08,550.26 716.66,551.74 z"],
    ["brillo-bajo", 0, "M300.56,563.08 C299.47,562.41 298.21,561.31 299.78,560.95 C305.93,559.53 309.13,555.4 311.03,549.15 C312.85,555.94 316.66,560.03 323.75,561.1 C321.2,564.05 317.79,563.73 315.66,565.89 C313.45,568.14 313.12,571.22 310.68,574.97 C308.75,569.29 306.88,564.15 300.56,563.08 z"],
    ["brillo", 0, "M513.02,230.35 C515.27,235.77 518.47,239.92 524.96,241.55 C518.97,243.83 514.61,247.17 513.09,253.85 C510.9,247.87 507.86,243.41 501.04,241.86 C507.47,240.04 510.68,235.78 513.02,230.35 z"],
    ["rayo", 2, "M567.74,261.8 C570.54,257.46 573.12,253.4 575.75,249.39 C576.58,248.12 577.62,246.73 579.34,247.97 C580.76,249.01 579.99,250.41 579.29,251.52 C572.85,261.77 566.39,271.99 559.89,282.2 C559.09,283.45 557.9,284.92 556.28,283.79 C554.65,282.66 555.73,281.08 556.5,279.83 C560.16,273.9 563.86,268.01 567.74,261.8 z"],
    ["rayo", 4, "M600.43,295.47 C595.75,298.39 591.4,301.15 587,303.84 C585.65,304.66 584,306.2 582.69,304.17 C581.59,302.46 583.39,301.45 584.58,300.69 C594.39,294.42 604.23,288.19 614.1,282.02 C615.31,281.27 617.02,280.23 618.08,281.97 C619.33,284.03 617.3,284.93 615.98,285.78 C610.94,289 605.83,292.11 600.43,295.47 z"],
    ["sub", 3, "M502.3,562.08 C502.28,566.05 502.3,569.53 502.24,573.01 C502.21,574.37 502,575.84 500.25,575.93 C498.24,576.03 497.81,574.51 497.79,572.92 C497.73,567.95 497.6,562.97 497.8,558 C497.95,554.26 497.31,551.77 492.74,552.33 C491.39,552.49 489.32,552.69 489.26,550.58 C489.21,548.44 491.26,548.74 492.66,548.72 C497.96,548.67 503.26,548.7 508.57,548.76 C509.75,548.77 511,549.02 510.91,550.64 C510.84,551.87 509.82,552.39 508.81,552.26 C500.68,551.26 502.38,557.03 502.3,562.08 z"],
    ["rayo", 5, "M591.87,322.26 C590.33,322.38 588.99,322.47 588.83,320.88 C588.66,319.15 590.22,318.74 591.42,318.31 C597.69,316.1 603.99,313.97 610.28,311.81 C615,310.18 619.7,308.49 624.44,306.95 C625.96,306.46 628.05,305.69 628.78,307.8 C629.55,310.07 627.24,310.45 625.78,310.95 C614.61,314.75 603.4,318.46 591.87,322.26 z"],
    ["rayo", 4, "M427.05,296 C421.27,292.35 415.78,288.93 410.35,285.42 C409.16,284.66 407.43,283.77 408.72,281.96 C409.72,280.56 411.22,281.26 412.32,281.96 C422.44,288.31 432.52,294.7 442.6,301.12 C443.73,301.84 444.95,302.84 443.97,304.33 C442.99,305.82 441.55,305.04 440.44,304.36 C436.05,301.69 431.71,298.93 427.05,296 z"],
    ["rayo", 5, "M404.14,312.06 C401.73,310.65 397.07,311.15 398.14,307.89 C399.21,304.67 402.79,307.31 405.06,308.05 C414.37,311.11 423.61,314.38 432.87,317.61 C434.67,318.24 436.87,318.36 437.63,320.89 C435.93,323.35 433.8,321.96 431.93,321.34 C422.77,318.34 413.64,315.24 404.14,312.06 z"],
    ["sub", 4, "M532.63,563.95 C532.62,559.49 532.6,555.52 532.61,551.56 C532.62,550.13 532.91,548.85 534.75,548.88 C536.45,548.91 537.06,550.05 537.07,551.5 C537.11,558.78 537.11,566.05 537.07,573.33 C537.06,574.76 536.47,576.01 534.78,576.02 C532.63,576.03 532.62,574.4 532.62,572.86 C532.61,570.05 532.63,567.24 532.63,563.95 z"],
    ["rayo", 2, "M446.61,249.85 C447.17,246.46 449.05,246.97 450.23,248.72 C454.58,255.17 458.67,261.79 462.78,268.39 C463.49,269.54 463.87,271.08 462.2,271.77 C460.58,272.43 459.83,270.93 459.14,269.87 C454.95,263.32 450.82,256.74 446.61,249.85 z"],
    ["rayo", 3, "M587.49,234.27 C589.63,236.51 589.02,238.1 586.72,238.97 C585.07,239.6 583.69,238.66 583.51,236.97 C583.23,234.37 584.73,233.51 587.49,234.27 z"],
    ["rayo", 4, "M627.98,276.69 C626.33,274.14 627.24,272.59 629.6,272.14 C631.26,271.83 632.47,273.08 632.36,274.78 C632.19,277.54 630.47,277.87 627.98,276.69 z"],
    ["rayo", 2, "M536.97,217.2 C538.47,214.75 540.1,214.34 541.64,216.55 C542.62,217.95 542.17,219.54 540.63,220.23 C538.18,221.31 537,220.06 536.97,217.2 z"],
    ["rayo", 2, "M488.7,216.5 C489.39,219.36 488.37,220.72 485.78,220.37 C484.25,220.16 483.51,218.82 483.99,217.41 C484.81,215.02 486.41,214.46 488.7,216.5 z"],
    ["rayo", 4, "M394.03,274.09 C395.63,271.62 397.32,271.4 398.83,273.57 C399.7,274.8 399.29,276.32 397.94,276.94 C395.61,278 394.16,277.07 394.03,274.09 z"],
    ["rayo", 3, "M437.89,236.08 C439.08,233.61 440.69,233.18 442.35,234.84 C443.67,236.16 443.21,237.77 441.7,238.61 C439.53,239.81 438.26,238.77 437.89,236.08 z"],
  ];
  /* La luna, los rayos y los brillos se arman solos; el resto lo descubre un barrido de luz */
  const LOGO_ARMA = new Set(["luna", "rayo", "brillo", "brillo-bajo"]);
  let logos = 0;

  function logo(clase = "") {
    logos += 1;
    const n = logos;
    const pieza = ([tipo, orden, trazo]) => `<path class="tp-l tp-l--${tipo}"${orden === null ? "" : ` data-d="${orden}"`} d="${trazo}"/>`;
    const solas = LOGO.filter(([tipo]) => LOGO_ARMA.has(tipo)).map(pieza).join("");
    const reveladas = LOGO.filter(([tipo]) => !LOGO_ARMA.has(tipo)).map(pieza).join("");
    return `<svg class="tp-logo ${clase}" viewBox="112 154 827 439" role="img" aria-label="Sensorial Boutique" focusable="false"><defs>`
      + `<linearGradient id="tpl-luz-${n}"><stop offset="0" stop-color="#e3c48c" stop-opacity="0"/><stop offset=".5" stop-color="#e3c48c" stop-opacity=".9"/><stop offset="1" stop-color="#e3c48c" stop-opacity="0"/></linearGradient>`
      + `<linearGradient id="tpl-barrido-${n}"><stop offset=".45" stop-color="#fff"/><stop offset=".5" stop-color="#000"/></linearGradient>`
      + `<mask id="tpl-revela-${n}" maskUnits="userSpaceOnUse" x="100" y="140" width="860" height="470"><rect class="tp-logo__barrido" x="100" y="140" width="3000" height="470" fill="url(#tpl-barrido-${n})"/></mask>`
      + `<mask id="tpl-forma-${n}" maskUnits="userSpaceOnUse" x="100" y="140" width="860" height="470"><use href="#tpl-trazos-${n}" fill="#fff"/></mask>`
      + `</defs><g fill="currentColor"><g id="tpl-trazos-${n}">${solas}<g mask="url(#tpl-revela-${n})">${reveladas}</g></g></g>`
      + `<rect class="tp-logo__luz" x="-200" y="140" width="300" height="470" fill="url(#tpl-luz-${n})" mask="url(#tpl-forma-${n})"/></svg>`;
  }

  /* Destello del logo, usado como chispa cuando la tabla queda liquidada */
  const DESTELLO = LOGO.find(([tipo]) => tipo === "brillo")[2];
  const CHISPAS = 12;

  /* El orden de cada pieza va en data-d; la hoja de estilos lo lee como --d */
  function ordenar(raiz) {
    raiz?.querySelectorAll("[data-d]").forEach((el) => el.style.setProperty("--d", el.dataset.d));
  }

  /* ---------- Plantilla ----------
     opciones.foto / opciones.silueta reemplazan las URL guardadas (vista previa del panel);
     opciones.vacio es el texto del hueco cuando aún no hay foto; opciones.contacto, el enlace
     de WhatsApp del botón final; opciones.descargar agrega el botón para guardar la imagen;
     opciones.siguiente, el enlace de WhatsApp para pedir otro perfume cuando la tabla queda
     liquidada */
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
    const letras = (palabra) => `<span class="tp-oculto">${palabra}</span><span class="tp-letras" aria-hidden="true">${[...palabra].map((l) => `<span class="tp-letra">${l}</span>`).join("")}</span>`;

    const fondoFrasco = silueta
      ? `<img class="tp-silueta" src="${escapar(silueta)}" alt="" decoding="async">`
      : agua ? `<span class="tp-agua">${escapar(agua)}</span>` : "";
    const frasco = foto
      ? `<img src="${escapar(foto)}" alt="${escapar(nombre)}" decoding="async">`
      : opciones.vacio ? `<span class="tp-frasco__vacio">${escapar(opciones.vacio)}</span>` : "";
    /* Liquidada: el sello dorado se estampa sobre el frasco y saltan chispas del logo */
    const celebracion = e.liquidado ? `<div class="tp-sello" aria-hidden="true">
          <svg viewBox="0 0 120 120" focusable="false"><defs><path id="tps-${logos}" d="M60 60m-44 0a44 44 0 1 1 88 0a44 44 0 1 1-88 0"/></defs><circle class="tp-sello__disco" cx="60" cy="60" r="57"/><circle class="tp-sello__aro" cx="60" cy="60" r="57"/><circle class="tp-sello__aro" cx="60" cy="60" r="31"/><text class="tp-sello__texto"><textPath href="#tps-${logos}" textLength="272" lengthAdjust="spacing">LIQUIDADO · SENSORIAL BOUTIQUE ·</textPath></text></svg>
          <i class="ph ph-check tp-sello__icono"></i>
        </div>
        <div class="tp-chispas" aria-hidden="true">${`<svg class="tp-chispa" viewBox="650 276 37 36" focusable="false"><path d="${DESTELLO}"/></svg>`.repeat(CHISPAS)}</div>` : "";
    const visual = `<div class="tp-visual${foto ? "" : " tp-visual--sin-foto"}">
        <div class="tp-capa tp-capa--atras" aria-hidden="true">${fondoFrasco}</div>
        <div class="tp-capa tp-capa--medio" aria-hidden="true"><span class="tp-halo"></span></div>
        <div class="tp-capa tp-capa--frente"><div class="tp-frasco">${frasco}</div>${celebracion}</div>
      </div>
      <p class="tp-nombre">${casa ? `<span class="tp-casa">${escapar(casa)}</span>` : ""}<span class="tp-perfume">${escapar(perfume)}</span></p>`;
    const saldo = (etiqueta, valor) => `<div class="tp-saldo">
        <p class="tp-saldo__etiqueta">${etiqueta}</p>
        <p class="tp-saldo__monto"><span class="tp-raya" aria-hidden="true"></span><strong data-tp-monto="${valor}" aria-hidden="true">${dinero(valor)}</strong><span class="tp-oculto">${dinero(valor)}</span><span class="tp-raya" aria-hidden="true"></span></p>
      </div>`;
    /* En curso: WhatsApp y Descargar. Liquidada: solo la invitación a pedir otro perfume */
    const botones = (e.liquidado ? [
      opciones.siguiente ? `<a class="tp-contacto" href="${escapar(opciones.siguiente)}" target="_blank" rel="noopener"><i class="ph ph-whatsapp-logo" aria-hidden="true"></i>Quiero otro perfume</a>` : "",
    ] : [
      opciones.contacto ? `<a class="tp-contacto" href="${escapar(opciones.contacto)}" target="_blank" rel="noopener"><i class="ph ph-whatsapp-logo" aria-hidden="true"></i>Escríbenos por WhatsApp</a>` : "",
      opciones.descargar ? '<button class="tp-descargar" type="button" data-tp-descargar><i class="ph ph-download-simple" aria-hidden="true"></i>Descargar</button>' : "",
    ]).join("");
    const contacto = botones ? `<div class="tp-acciones">${botones}</div>` : "";

    if (e.liquidado) {
      const abonos = (datos.payments || []).length;
      const cuando = e.ultimoAbono ? `el ${fecha(e.ultimoAbono)}` : "";
      const detalle = [cuando, abonos ? `en ${abonos} ${abonos === 1 ? "abono" : "abonos"}` : ""].filter(Boolean).join(", ");
      return `<article class="tp tp--liquidado" data-tono="${tono}" data-estado="liquidado">
      <header class="tp-cabeza">
        ${logo()}
        <h1 class="tp-titulo"><span class="tp-titulo__a">Pago</span> <span class="tp-titulo__b">${letras("completo")}</span></h1>
      </header>
      ${visual}
      ${saldo("Total pagado:", e.total)}
      <p class="tp-cierre"><strong>Gracias${cliente ? `, ${escapar(cliente)}` : ""}.</strong> Terminaste de pagar tu ${escapar(nombre === "Perfume" ? "perfume" : nombre)}${detalle ? ` ${escapar(detalle)}` : ""}.</p>
      <div class="tp-siguiente">
        <p class="tp-siguiente__titulo">¿Vamos por tu siguiente perfume?</p>
        <p class="tp-siguiente__texto">Escríbenos y te ayudamos a elegirlo. También puedes pagarlo en abonos.</p>
      </div>
      ${contacto}
    </article>`;
    }

    const filas = e.pagos.map((p) => {
      const detalle = [fecha(p.fecha), p.parcial ? `faltan ${dinero(p.falta)}` : ""].filter(Boolean).join(" · ");
      return `<li class="tp-pago${p.pagado ? " is-pagado" : ""}${p.parcial ? " is-parcial" : ""}">`
        + `<span class="tp-pago__concepto"><span class="tp-tachable">${p.nombre}</span>${detalle ? `<small>${escapar(detalle)}</small>` : ""}</span>`
        + `<span class="tp-pago__monto"><span class="tp-tachable">$ ${numero.format(p.monto)}</span></span>`
        + `${p.pagado ? '<span class="tp-oculto">, pagado</span>' : ""}</li>`;
    }).join("");
    const resumen = e.abonado > 0
      ? `Has abonado ${dinero(e.abonado)} de ${dinero(e.total)}.${e.ultimoAbono ? `<small>Último abono: ${fecha(e.ultimoAbono)}</small>` : ""}`
      : `Total: ${dinero(e.total)}`;

    /* Las tres capas del frasco se mueven a distinta velocidad (parallax) */
    return `<article class="tp" data-tono="${tono}" data-estado="en-curso">
      <header class="tp-cabeza">
        ${logo()}
        <h1 class="tp-titulo"><span class="tp-titulo__a">Tabla de</span> <span class="tp-titulo__b">${letras("Pagos")}</span></h1>
      </header>
      ${visual}
      ${saldo("Pendiente:", e.pendiente)}
      <section class="tp-tarjeta" aria-label="Pagos">
        <svg class="tp-marco" aria-hidden="true" focusable="false"><path class="tp-marco__trazo" pathLength="1"/><path class="tp-marco__trazo" pathLength="1"/></svg>
        <p class="tp-cliente">Cliente: <strong>${escapar(cliente)}</strong></p>
        <ol class="tp-lista">${filas}</ol>
      </section>
      <p class="tp-resumen">${resumen}</p>
      ${contacto}
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

  /* Corre `accion` cuando el cliente llega al elemento: una parte (`umbral`) ya pasó la franja
     de abajo de la pantalla (`margen`). También si ya pasó de largo. Nunca antes de `retraso` ms,
     para respetar el orden de la entrada. */
  function alVer(el, retraso, umbral, accion, margen = "-20%") {
    if (!el) return () => {};
    let observador = null;
    const reloj = setTimeout(() => {
      observador = new IntersectionObserver((entradas) => {
        const e = entradas[entradas.length - 1];
        if (e.intersectionRatio >= umbral || e.boundingClientRect.top < 0) {
          observador.disconnect();
          accion();
        }
      }, { threshold: [0, umbral], rootMargin: `0px 0px ${margen} 0px` });
      observador.observe(el);
    }, retraso);
    return () => { clearTimeout(reloj); observador?.disconnect(); };
  }

  /* Prepara una tabla recién pintada. Con entrada, la cabecera, el frasco y el nombre entran
     a partir de `inicio` (ms); el saldo, la tarjeta de pagos y lo de abajo esperan a que el
     cliente llegue a verlos. Con `recibe`, el logo de la cabecera lo trae la apertura.
     Devuelve una función que libera observadores y animaciones. */
  function montar(tabla, { entrada = false, inicio = 0, recibe = false } = {}) {
    const limpiar = [];
    tabla.querySelectorAll(".tp-letra").forEach((el, i) => el.style.setProperty("--i", i));
    const filas = tabla.querySelectorAll(".tp-pago");
    filas.forEach((el, i) => el.style.setProperty("--i", i));
    const pagados = tabla.querySelectorAll(".tp-pago.is-pagado");
    pagados.forEach((el, k) => el.style.setProperty("--k", k));
    tabla.style.setProperty("--filas", filas.length);
    const agua = tabla.querySelector(".tp-agua");
    if (agua) agua.style.setProperty("--letras", Math.max([...agua.textContent].length, 2));
    const marca = tabla.querySelector(".tp-cabeza .tp-logo");
    ordenar(marca);
    limpiar.push(marco(tabla));
    tabla.classList.remove("tp--entrada", "tp--recibe");
    tabla.querySelectorAll(".is-vista").forEach((el) => el.classList.remove("is-vista"));
    marca?.classList.remove("tp-logo--arma", "is-recibido");
    const liberar = () => limpiar.forEach((fn) => fn());
    if (!entrada || reducido()) return liberar;

    void tabla.offsetWidth; // reinicia las animaciones si la tabla ya estaba en pantalla
    tabla.style.setProperty("--inicio", `${inicio}ms`);
    tabla.classList.add("tp--entrada");
    if (recibe) {
      tabla.classList.add("tp--recibe");
    } else if (marca) {
      marca.style.setProperty("--tpl-t", `${inicio}ms`);
      marca.classList.add("tp-logo--arma");
    }
    const saldo = tabla.querySelector(".tp-saldo");
    const monto = saldo?.querySelector("[data-tp-monto]");
    limpiar.push(alVer(saldo, inicio + 1300, 0.6, () => {
      saldo.classList.add("is-vista");
      if (monto) limpiar.push(contar(monto, Number(monto.dataset.tpMonto), 120));
    }, "0%"));
    const tarjeta = tabla.querySelector(".tp-tarjeta");
    const abajo = [".tp-resumen", ".tp-cierre", ".tp-siguiente", ".tp-acciones"].map((sel) => tabla.querySelector(sel)).filter(Boolean);
    /* Lo último de la página se anima en cuanto se ve la mitad: ahí ya no se puede bajar más */
    const revelarAbajo = (desde) => abajo.forEach((el, i) => limpiar.push(alVer(el, desde + i * 150, 0.5, () => el.classList.add("is-vista"), "0%")));
    if (tarjeta) {
      /* Igual que --tp-tachar en tabla-pagos.css: lo de abajo llega cuando terminan los tachados */
      const tachado = 600 + filas.length * 90 + pagados.length * 200 + 300;
      let revelada = false;
      const revelar = () => {
        if (revelada) return;
        revelada = true;
        tarjeta.classList.add("is-vista");
        revelarAbajo(tachado);
      };
      limpiar.push(alVer(tarjeta, inicio + 1600, 0.25, revelar));
      /* Si la página no alcanza a subir la tarjeta hasta esa franja, se anima al llegar al final */
      if (abajo.length) limpiar.push(alVer(abajo.at(-1), inicio + 1600, 0.6, revelar, "0%"));
    } else {
      revelarAbajo(inicio + 1700);
    }
    /* Cada chispa sale en su propia dirección, como un abanico alrededor del frasco; el alcance
       depende del tamaño del frasco para que ninguna se salga de la tabla */
    const visual = tabla.querySelector(".tp-visual");
    const alcance = visual ? Math.min(visual.offsetWidth, visual.offsetHeight, 560) * 0.42 : 120;
    tabla.querySelectorAll(".tp-chispa").forEach((chispa, i, todas) => {
      const angulo = (i / todas.length) * Math.PI * 2 + 0.4;
      const radio = alcance * (0.62 + (i % 3) * 0.19);
      chispa.style.setProperty("--x", `${Math.round(Math.cos(angulo) * radio)}px`);
      chispa.style.setProperty("--y", `${Math.round(Math.sin(angulo) * radio)}px`);
      chispa.style.setProperty("--g", `${(i % 2 ? 1 : -1) * (90 + i * 17)}deg`);
      chispa.style.setProperty("--e", (0.55 + (i % 4) * 0.15).toFixed(2));
      chispa.style.setProperty("--i", i);
    });
    return liberar;
  }

  /* ---------- Apertura con el logo ----------
     El logo se arma en dorado al centro del telón, espera a que la tabla esté lista y viaja
     hasta su lugar en la cabecera mientras el telón se abre por la mitad. */
  function telon(contenedor) {
    contenedor.insertAdjacentHTML("beforeend", '<div class="tp-telon tp-telon--marco" aria-hidden="true"><div class="tp-telon__mitad tp-telon__mitad--arriba"></div><div class="tp-telon__mitad tp-telon__mitad--abajo"></div></div>');
    return contenedor.lastElementChild;
  }

  function intro(cortina) {
    if (reducido()) {
      cortina.hidden = true;
      return { async entregar(destino, alAbrir) { alAbrir?.(); }, cancelar() {} };
    }
    cortina.hidden = false;
    cortina.classList.remove("abre");
    cortina.querySelector(".tp-intro")?.remove();
    cortina.insertAdjacentHTML("beforeend", `<div class="tp-intro" aria-hidden="true">${logo("tp-intro__logo tp-logo--arma")}<p class="tp-intro__texto">Preparando tu tabla</p></div>`);
    const caja = cortina.querySelector(".tp-intro");
    const marca = caja.querySelector("svg");
    ordenar(marca);
    cortina.classList.add("arma");
    const desde = performance.now();
    let cancelado = false;
    const cerrar = () => {
      caja.remove();
      cortina.hidden = true;
      cortina.classList.remove("arma", "abre");
    };
    return {
      /* destino: el logo de la cabecera (o una función que lo devuelve al momento de viajar);
         alAbrir: arranca la entrada de la tabla justo cuando el telón empieza a abrirse */
      async entregar(destino, alAbrir) {
        await pausa(Math.max(0, ARMADO - (performance.now() - desde)));
        if (cancelado) return;
        const objetivo = typeof destino === "function" ? destino() : destino;
        cortina.classList.add("abre");
        alAbrir?.();
        if (objetivo?.isConnected) {
          const a = marca.getBoundingClientRect();
          const b = objetivo.getBoundingClientRect();
          const viaje = marca.animate([
            { transform: "none" },
            { transform: `translate(${b.left + b.width / 2 - (a.left + a.width / 2)}px, ${b.top + b.height / 2 - (a.top + a.height / 2)}px) scale(${b.width / a.width})` },
          ], { duration: VIAJE, easing: "cubic-bezier(0.65, 0, 0.25, 1)", fill: "forwards" });
          await viaje.finished.catch(() => {});
          if (cancelado) return;
          objetivo.classList.add("is-recibido");
        } else {
          await pausa(VIAJE);
        }
        cerrar();
      },
      cancelar() {
        cancelado = true;
        cerrar();
      },
    };
  }

  /* ---------- Parallax con el puntero ----------
     En pantallas con mouse, las capas del frasco y los hilos del fondo siguen al puntero a
     distinta profundidad. El parallax al bajar lo hace la hoja de estilos con el scroll. */
  function parallax(raiz, { hilos } = {}) {
    if (reducido() || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return () => {};
    const pagina = raiz === document.documentElement;
    const escucha = pagina ? window : raiz;
    let id = 0;
    let x = 0;
    let y = 0;
    const aplicar = () => {
      id = 0;
      raiz.style.setProperty("--mx", x.toFixed(3));
      raiz.style.setProperty("--my", y.toFixed(3));
      hilos?.apuntar(x, y);
    };
    const mover = (evento) => {
      const caja = pagina ? { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight } : raiz.getBoundingClientRect();
      x = Math.max(-1, Math.min(1, ((evento.clientX - caja.left) / caja.width) * 2 - 1));
      y = Math.max(-1, Math.min(1, ((evento.clientY - caja.top) / caja.height) * 2 - 1));
      if (!id) id = requestAnimationFrame(aplicar);
    };
    const soltar = () => { x = 0; y = 0; if (!id) id = requestAnimationFrame(aplicar); };
    escucha.addEventListener("pointermove", mover, { passive: true });
    (pagina ? document.documentElement : raiz).addEventListener("pointerleave", soltar);
    return () => {
      cancelAnimationFrame(id);
      escucha.removeEventListener("pointermove", mover);
      (pagina ? document.documentElement : raiz).removeEventListener("pointerleave", soltar);
    };
  }

  /* ---------- Fondo: hilos dorados que ondulan despacio ----------
     Cada hilo es una curva suave que pasa por estos puntos (fracciones del ancho y del alto);
     los extremos quedan fuera de la pantalla. Al empezar, los hilos se trazan y después un
     destello recorre cada uno de vez en cuando. El lienzo mide el alto máximo de la pantalla:
     cuando el navegador esconde su barra al bajar, nada se redibuja ni salta. */
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
    if (!ctx) return { empezar() {}, apuntar() {}, detener() {} };
    const quieto = reducido();
    let ancho = 0;
    let alto = 0;
    let dpr = 1;
    let id = 0;
    let espera = 0;
    let inicio = 0;
    let ultimo = 0;
    const puntero = { x: 0, y: 0, ax: 0, ay: 0 };

    const cuadro = (ahora) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, ancho, alto);
      if (!inicio || !ancho) return;
      const t = quieto ? 0 : ahora - inicio;
      const trazo = quieto ? 1 : Math.min(t / 1800, 1);
      const avance = 1 - (1 - trazo) ** 3;
      const amplitud = Math.min(ancho, alto) * 0.022;
      puntero.ax += (puntero.x - puntero.ax) * 0.06;
      puntero.ay += (puntero.y - puntero.ay) * 0.06;
      ctx.lineCap = "round";
      HILOS.forEach((hilo, j) => {
        const profundidad = 10 + j * 4;
        const puntos = hilo.map(([x, y], i) => [
          x * ancho + amplitud * Math.sin(t * 0.00023 + j * 1.7 + i * 0.9) + puntero.ax * profundidad,
          y * alto + amplitud * Math.cos(t * 0.00019 + j * 1.1 + i * 1.3) + puntero.ay * profundidad,
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
      if (Math.round(caja.width) === Math.round(ancho) && Math.round(caja.height) === Math.round(alto)) return;
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
      /* trazar: false los muestra completos de inmediato (visitas siguientes) */
      empezar(retraso = 0, { trazar = true } = {}) {
        clearTimeout(espera);
        espera = setTimeout(() => {
          inicio = performance.now() - (trazar ? 0 : 1800);
          cancelAnimationFrame(id);
          if (quieto) cuadro(inicio);
          else id = requestAnimationFrame(bucle);
        }, retraso);
      },
      apuntar(x, y) { puntero.x = x; puntero.y = y; },
      detener() {
        clearTimeout(espera);
        cancelAnimationFrame(id);
        observador.disconnect();
      },
    };
  }

  /* ---------- Imagen para descargar ----------
     La misma tabla en una imagen vertical de 1414 × 2000 px, como las que se hacían a mano:
     fondo con hilos, logo blanco, título, frasco con su texto o silueta detrás, nombre,
     pendiente y tarjeta de pagos; o "Pago completo" con el sello, si ya está liquidada. Si hay
     muchos pagos, la imagen crece hacia abajo. */
  const TINTAS = { rosa: "#ebc4c6", dorado: "#e6c891", celeste: "#a9d1e8", verde: "#b2d7c2", lila: "#d7bbea" };
  const ORO = "#e3c48c";
  const PAPEL = "#201a1e";
  const TINTA = "#f7f2f4";
  const TINTA_2 = "#c9bcc3";
  const ANCHO = 1414;

  /* Con CORS para poder exportar el lienzo; si la foto no lo permite, la imagen sale sin ella */
  const cargarFoto = (src) => new Promise((resolve) => {
    if (!src) { resolve(null); return; }
    const img = new Image();
    if (!/^blob:/.test(src)) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
  const fuente = (peso, tam, manuscrita = false) => `${peso} ${tam}px ${manuscrita ? '"Ms Madi", cursive' : "Urbanist, sans-serif"}`;
  const conAlfa = (hex, alfa) => {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${alfa})`;
  };

  /* Escribe una línea; si no cabe en `ancho`, reduce la letra hasta que quepa */
  function escribir(ctx, txt, x, y, { peso = 400, tam = 40, manuscrita = false, color = TINTA, alinear = "center", ancho = 0 } = {}) {
    let t = tam;
    ctx.font = fuente(peso, t, manuscrita);
    while (ancho && ctx.measureText(txt).width > ancho && t > 14) {
      t -= 2;
      ctx.font = fuente(peso, t, manuscrita);
    }
    ctx.fillStyle = color;
    ctx.textAlign = alinear;
    ctx.textBaseline = "alphabetic";
    ctx.fillText(txt, x, y);
    return ctx.measureText(txt).width;
  }

  /* Divide un texto en renglones que caben en `ancho` */
  function renglones(ctx, txt, ancho) {
    const lineas = [];
    let actual = "";
    txt.split(/\s+/).forEach((palabra) => {
      const prueba = actual ? `${actual} ${palabra}` : palabra;
      if (actual && ctx.measureText(prueba).width > ancho) { lineas.push(actual); actual = palabra; } else actual = prueba;
    });
    if (actual) lineas.push(actual);
    return lineas;
  }

  /* Encaja la foto en la caja sin deformarla, centrada */
  function contener(img, x, y, w, h) {
    const k = Math.min(w / img.naturalWidth, h / img.naturalHeight);
    const dw = img.naturalWidth * k;
    const dh = img.naturalHeight * k;
    return [x + (w - dw) / 2, y + (h - dh) / 2, dw, dh];
  }

  function rectanguloRedondo(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function dibujarLogo(ctx, centro, arriba, ancho) {
    const k = ancho / 827;
    ctx.save();
    ctx.translate(centro - ancho / 2, arriba);
    ctx.scale(k, k);
    ctx.translate(-112, -154);
    ctx.fillStyle = TINTA;
    LOGO.forEach(([, , trazo]) => ctx.fill(new Path2D(trazo)));
    ctx.restore();
  }

  function dibujarMonto(ctx, valor, y) {
    const ancho = escribir(ctx, dinero(valor), ANCHO / 2, y, { peso: 800, tam: 96, ancho: ANCHO * 0.62 });
    ctx.fillStyle = TINTA;
    ctx.fillRect(ANCHO / 2 - ancho / 2 - 152, y - 34, 110, 6);
    ctx.fillRect(ANCHO / 2 + ancho / 2 + 42, y - 34, 110, 6);
  }

  /* El sello de liquidado: disco, dos aros, el texto alrededor y una palomita al centro */
  function dibujarSello(ctx, x, y, r) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((-9 * Math.PI) / 180);
    ctx.shadowColor = "rgba(10, 6, 9, 0.55)";
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 20;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = PAPEL;
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.strokeStyle = ORO;
    ctx.lineWidth = 3;
    [r, r * 0.54].forEach((radio) => { ctx.beginPath(); ctx.arc(0, 0, radio, 0, Math.PI * 2); ctx.stroke(); });
    const letras = [..."LIQUIDADO · SENSORIAL BOUTIQUE · "];
    const paso = (Math.PI * 2) / letras.length;
    ctx.font = fuente(800, r * 0.16);
    ctx.fillStyle = ORO;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    letras.forEach((letra, i) => {
      ctx.save();
      ctx.rotate(-Math.PI / 2 + i * paso);
      ctx.translate(r * 0.77, 0);
      ctx.rotate(Math.PI / 2);
      ctx.fillText(letra, 0, 0);
      ctx.restore();
    });
    ctx.lineWidth = r * 0.07;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(-r * 0.2, 0);
    ctx.lineTo(-r * 0.05, r * 0.15);
    ctx.lineTo(r * 0.22, -r * 0.14);
    ctx.stroke();
    ctx.restore();
  }

  async function dibujar(datos, opciones = {}) {
    const e = calcular(datos);
    const tono = TINTAS[datos?.tone] || TINTAS.rosa;
    const casa = texto(datos?.brand);
    const perfume = texto(datos?.product_name);
    const cliente = texto(datos?.client_name);
    const agua = texto(datos?.watermark).toLocaleUpperCase("es");
    const [foto, silueta] = await Promise.all([
      cargarFoto(imagen(opciones.foto ?? datos?.image_url)),
      cargarFoto(imagen(opciones.silueta ?? datos?.watermark_image_url)),
    ]);
    await Promise.all(["400 40px Urbanist", "500 40px Urbanist", "800 40px Urbanist", "400 40px 'Ms Madi'"]
      .map((f) => document.fonts?.load(f).catch(() => {})));

    const W = ANCHO;
    const filas = e.liquidado ? [] : e.pagos.map((p) => ({
      ...p, detalle: [fecha(p.fecha), p.parcial ? `faltan ${dinero(p.falta)}` : ""].filter(Boolean).join(" · "),
    }));
    const altoFila = (f) => (f.detalle ? 86 : 66);
    const tarjeta = { x: 290, y: 1565, w: 834 };
    tarjeta.h = 108 + filas.reduce((suma, f) => suma + altoFila(f), 0) + 24;
    const H = e.liquidado ? 2000 : Math.max(2000, tarjeta.y + tarjeta.h + 115);
    const lienzo = document.createElement("canvas");
    lienzo.width = W;
    lienzo.height = H;
    const ctx = lienzo.getContext("2d");

    /* Fondo, luz del color del nombre e hilos dorados */
    ctx.fillStyle = PAPEL;
    ctx.fillRect(0, 0, W, H);
    const luz = ctx.createRadialGradient(W / 2, 760, 0, W / 2, 760, 780);
    luz.addColorStop(0, conAlfa(tono, 0.12));
    luz.addColorStop(1, conAlfa(tono, 0));
    ctx.fillStyle = luz;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(196, 160, 100, 0.6)";
    ctx.lineWidth = 3.4;
    ctx.lineCap = "round";
    HILOS.forEach((hilo) => { curva(ctx, hilo.map(([x, y]) => [x * W, y * H])); ctx.stroke(); });

    /* Logo y título */
    dibujarLogo(ctx, W / 2, 78, 320);
    const [arriba, abajo] = e.liquidado ? ["Pago", "completo"] : ["Tabla de", "Pagos"];
    escribir(ctx, arriba, W / 2 + 40, 345, { tam: 100 });
    escribir(ctx, abajo, W / 2 - 18, 452, { tam: 158 });

    /* Frasco: halo, texto o silueta detrás, y la foto con su sombra */
    const visual = { y: 462, h: 760 };
    const cy = visual.y + visual.h / 2;
    const halo = ctx.createRadialGradient(W / 2, cy, 0, W / 2, cy, 360);
    halo.addColorStop(0, conAlfa(tono, 0.2));
    halo.addColorStop(1, conAlfa(tono, 0));
    ctx.fillStyle = halo;
    ctx.fillRect(W / 2 - 360, cy - 360, 720, 720);
    if (silueta) {
      const capa = document.createElement("canvas");
      capa.width = W;
      capa.height = H;
      const c2 = capa.getContext("2d");
      c2.drawImage(silueta, ...contener(silueta, W * 0.34 - 270, cy - visual.h * 0.4, 540, visual.h * 0.8));
      c2.globalCompositeOperation = "source-in";
      c2.fillStyle = "#fff";
      c2.fillRect(0, 0, W, H);
      ctx.save();
      ctx.globalAlpha = 0.07;
      ctx.drawImage(capa, 0, 0);
      ctx.restore();
    } else if (agua) {
      const tam = Math.min((visual.h * 1.08) / (Math.max([...agua].length, 2) * 0.7), visual.h * 0.5);
      ctx.save();
      ctx.translate(W * 0.34, cy);
      ctx.rotate(-Math.PI / 2);
      ctx.font = fuente(800, tam);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "rgba(255, 255, 255, 0.055)";
      ctx.fillText(agua, 0, 0);
      ctx.restore();
    }
    if (foto) {
      ctx.save();
      ctx.shadowColor = "rgba(10, 6, 9, 0.55)";
      ctx.shadowBlur = 70;
      ctx.shadowOffsetY = 50;
      ctx.drawImage(foto, ...contener(foto, W / 2 - 330, visual.y + 20, 660, visual.h - 50));
      ctx.restore();
    }
    if (e.liquidado) dibujarSello(ctx, W / 2 + 175, visual.y + visual.h - 140, 118);

    /* Nombre: casa y perfume en manuscrita */
    if (casa) escribir(ctx, casa, W / 2, 1262, { tam: 66, ancho: W * 0.8 });
    escribir(ctx, perfume, W / 2, casa ? 1340 : 1310, { tam: 116, manuscrita: true, color: tono, ancho: W * 0.84 });

    if (e.liquidado) {
      escribir(ctx, "Total pagado:", W / 2, 1452, { tam: 46, peso: 500 });
      dibujarMonto(ctx, e.total, 1540);
      escribir(ctx, `Gracias${cliente ? `, ${cliente}` : ""}.`, W / 2, 1665, { tam: 56, peso: 800, color: tono, ancho: W * 0.8 });
      const abonos = (datos.payments || []).length;
      const detalle = [e.ultimoAbono ? `el ${fecha(e.ultimoAbono)}` : "", abonos ? `en ${abonos} ${abonos === 1 ? "abono" : "abonos"}` : ""].filter(Boolean).join(", ");
      ctx.font = fuente(500, 38);
      const nombre = [casa, perfume].filter(Boolean).join(" ") || "perfume";
      renglones(ctx, `Terminaste de pagar tu ${nombre}${detalle ? ` ${detalle}` : ""}.`, W * 0.66)
        .forEach((linea, i) => escribir(ctx, linea, W / 2, 1735 + i * 52, { tam: 38, peso: 500, color: TINTA_2 }));
    } else {
      escribir(ctx, "Pendiente:", W / 2, 1446, { tam: 46, peso: 500 });
      dibujarMonto(ctx, e.pendiente, 1532);

      /* Tarjeta de pagos con su marco dorado */
      rectanguloRedondo(ctx, tarjeta.x, tarjeta.y, tarjeta.w, tarjeta.h, 56);
      ctx.fillStyle = "rgba(255, 255, 255, 0.02)";
      ctx.fill();
      ctx.strokeStyle = ORO;
      ctx.lineWidth = 5;
      ctx.stroke();
      let tam = 52;
      const medir = () => {
        ctx.font = fuente(400, tam);
        const a = ctx.measureText("Cliente: ").width;
        ctx.font = fuente(800, tam);
        return [a, ctx.measureText(cliente).width];
      };
      let [w1, w2] = medir();
      while (w1 + w2 > tarjeta.w - 110 && tam > 24) { tam -= 2; [w1, w2] = medir(); }
      const x0 = W / 2 - (w1 + w2) / 2;
      escribir(ctx, "Cliente: ", x0, tarjeta.y + 76, { tam, alinear: "left" });
      escribir(ctx, cliente, x0 + w1, tarjeta.y + 76, { tam, peso: 800, alinear: "left" });
      const izq = tarjeta.x + 64;
      const der = tarjeta.x + tarjeta.w - 64;
      let fy = tarjeta.y + 106;
      filas.forEach((f) => {
        ctx.fillStyle = ORO;
        ctx.fillRect(izq, fy, der - izq, 4);
        const color = f.pagado ? "rgba(247, 242, 244, 0.62)" : TINTA;
        const base = fy + 47;
        const a = escribir(ctx, f.nombre, izq + 20, base, { tam: 42, peso: 800, color, alinear: "left" });
        const b = escribir(ctx, `$ ${numero.format(f.monto)}`, der - 20, base, { tam: 42, peso: 800, color, alinear: "right" });
        if (f.pagado) {
          ctx.fillStyle = color;
          ctx.fillRect(izq + 16, base - 14, a + 8, 4);
          ctx.fillRect(der - 24 - b, base - 14, b + 8, 4);
        }
        if (f.detalle) escribir(ctx, f.detalle, izq + 20, base + 31, { tam: 27, peso: 600, color: f.parcial ? tono : TINTA_2, alinear: "left" });
        fy += altoFila(f);
      });
      const resumen = e.abonado > 0 ? `Has abonado ${dinero(e.abonado)} de ${dinero(e.total)}.` : `Total: ${dinero(e.total)}`;
      escribir(ctx, resumen, W / 2, tarjeta.y + tarjeta.h + 64, { tam: 34, peso: 500, color: TINTA_2 });
    }

    return new Promise((resolve, reject) => {
      lienzo.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("No se pudo crear la imagen."))), "image/png");
    });
  }

  const nombreArchivo = (datos) => {
    const cliente = texto(datos?.client_name).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return `tabla-de-pagos-${cliente || "cliente"}.png`;
  };

  /* La imagen lista como archivo PNG */
  async function archivo(datos, opciones = {}) {
    const blob = await dibujar(datos, opciones);
    return new File([blob], nombreArchivo(datos), { type: "image/png" });
  }

  /* En el teléfono abre el menú de compartir (ahí está "Guardar imagen"); en la computadora,
     o si el teléfono no lo permite, la descarga directo */
  async function guardar(listo) {
    const png = await listo;
    const telefono = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
      || (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));
    if (telefono && navigator.canShare?.({ files: [png] })) {
      try {
        await navigator.share({ files: [png] });
        return;
      } catch (error) {
        if (error?.name === "AbortError") return;
      }
    }
    const url = URL.createObjectURL(png);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = png.name;
    document.body.append(enlace);
    enlace.click();
    enlace.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  window.TablaPagos = {
    TONOS, calcular, pintar, montar, intro, telon, logo, parallax, fondo, archivo, guardar,
    dinero, fecha, imagen, marcaDeAgua, nombrePago, escapar,
  };
})();
