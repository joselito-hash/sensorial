(() => {
  "use strict";

  const config = window.SENSORIAL_SUPABASE || {};
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const state = {
    session: null,
    tab: "overview",
    reviewFilter: "pending",
    editorId: null,
    idEdited: false,
    data: { brands: [], families: [], perfumes: [], images: [], notes: [], accords: [], accordNames: [], usage: [], variants: [], sources: [], reviews: [], plans: [] },
    plansError: "",
    plan: null,
  };
  const fields = $("#perfume-form").elements;
  const storeKey = "sensorial-admin-session";
  const emailKey = "sensorial-admin-email";
  /* "Recordarme en este dispositivo": la sesión va a localStorage (sigue abierta al cerrar el
     navegador) y el correo queda escrito para la próxima vez. Sin marcar, la sesión vive en
     sessionStorage y termina al cerrar la pestaña. */
  let remember = false;
  let noticeTimer;
  /* Cambia cada vez que se abre una ficha: una lectura de "cuándo usarlo" que termina tarde
     no escribe en otra ficha */
  let lecturaUso = 0;
  let previewObjectURL = "";
  const uploadedGallery = new WeakMap();

  const escapeHTML = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]);
  const slug = (value) => String(value).toLowerCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const nonempty = (value) => String(value ?? "").trim();
  const numberOrNull = (value) => nonempty(value) === "" ? null : Number(value);
  const apiBase = config.url ? new URL(config.url) : null;

  function imageURL(value) {
    const raw = nonempty(value);
    if (/^https:\/\//i.test(raw) && !/[\s"'<>`]/.test(raw)) {
      try { return new URL(raw).href; } catch { return ""; }
    }
    if (/^(?:\.?\/?img\/)[a-zA-Z0-9/_.-]+$/.test(raw)) return raw;
    if (/^[0-9]{13}-[0-9a-f]+$/.test(raw)) return `https://images.unsplash.com/photo-${raw}?w=640&q=80`;
    return "";
  }

  function saveSession(value) {
    state.session = value;
    try {
      const store = remember ? localStorage : sessionStorage;
      const other = remember ? sessionStorage : localStorage;
      if (value) store.setItem(storeKey, JSON.stringify(value));
      else store.removeItem(storeKey);
      other.removeItem(storeKey);
    } catch { /* La sesión sigue en memoria si el navegador bloquea el almacenamiento. */ }
  }

  function rememberEmail(email) {
    try {
      if (remember && email) localStorage.setItem(emailKey, email);
      else localStorage.removeItem(emailKey);
    } catch { /* Sin almacenamiento: no se recuerda el correo. */ }
  }

  async function tokenRequest(grantType, body) {
    const response = await fetch(new URL(`/auth/v1/token?grant_type=${grantType}`, apiBase), {
      method: "POST",
      headers: { apikey: config.publishableKey, "Content-Type": "application/json" },
      body: JSON.stringify(body), cache: "no-store",
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.access_token || !result.refresh_token) {
      throw new Error(result.msg || result.error_description || result.message || "No se pudo iniciar sesión.");
    }
    saveSession({ access_token: result.access_token, refresh_token: result.refresh_token,
      expires_at: Date.now() + Number(result.expires_in || 3600) * 1000,
      email: result.user?.email || state.session?.email || "" });
  }

  async function refreshSession() {
    if (!state.session?.refresh_token) throw new Error("Inicia sesión de nuevo.");
    await tokenRequest("refresh_token", { refresh_token: state.session.refresh_token });
  }

  async function request(path, { method = "GET", body, prefer, retry = true } = {}) {
    if (!state.session?.access_token) throw new Error("Inicia sesión de nuevo.");
    if (state.session.expires_at < Date.now() + 60000) await refreshSession();
    const response = await fetch(new URL(`/rest/v1/${path}`, apiBase), {
      method,
      headers: {
        apikey: config.publishableKey,
        Authorization: `Bearer ${state.session.access_token}`,
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(prefer ? { Prefer: prefer } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      cache: "no-store",
    });
    if (response.status === 401 && retry) {
      await refreshSession();
      return request(path, { method, body, prefer, retry: false });
    }
    const text = await response.text();
    let result = null;
    try { result = text ? JSON.parse(text) : null; } catch { /* Un error de red puede venir en texto. */ }
    if (!response.ok) throw new Error(result?.message || result?.error || text || `Supabase respondió ${response.status}`);
    return result;
  }

  function notify(message, error = false) {
    const notice = $("#notice");
    notice.textContent = message;
    notice.classList.toggle("error", error);
    notice.hidden = false;
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => { notice.hidden = true; }, 5500);
  }

  async function authorize() {
    let allowed;
    try {
      allowed = await request("rpc/sensorial_admin_access", { method: "POST", body: {} });
    } catch (error) {
      if (/sensorial_admin_access|schema cache|not found/i.test(error.message)) {
        throw new Error("Falta activar la migración del panel en Supabase.");
      }
      throw error;
    }
    if (allowed !== true) throw new Error("Esta cuenta no tiene permiso para administrar Sensorial.");
    await loadData();
    $("#admin-email").textContent = state.session.email;
    $("#login-view").hidden = true;
    $("#dashboard").hidden = false;
    showTab(state.tab);
  }

  async function readAll(path) {
    const collected = [];
    for (let offset = 0; ; offset += 1000) {
      const page = await request(`${path}&limit=1000&offset=${offset}`);
      if (!Array.isArray(page)) throw new Error("Supabase no devolvió una lista válida.");
      collected.push(...page);
      if (page.length < 1000) return collected;
    }
  }

  /* Las tablas de pagos llegan aparte: si falta su migración, el resto del panel sigue igual */
  async function loadPlans() {
    try {
      state.data.plans = await readAll("payment_plans?select=*&order=created_at.desc,id.asc");
      state.plansError = "";
    } catch (error) {
      state.data.plans = [];
      state.plansError = /payment_plans|schema cache|42P01|PGRST205/i.test(error.message)
        ? "Falta activar las tablas de pagos: ejecuta supabase/migrations/20261007_003_payment_plans.sql en el SQL Editor de Supabase."
        : `No se pudieron cargar las tablas de pagos: ${error.message}`;
    }
  }

  async function loadData() {
    const queries = {
      brands: "brands?select=*&order=id.asc",
      families: "families?select=*&order=display_order.asc,id.asc",
      perfumes: "perfumes?select=*&order=created_at.desc,id.asc",
      images: "perfume_images?select=*&order=perfume_id.asc,position.asc",
      notes: "perfume_notes?select=*&order=perfume_id.asc,phase.asc,position.asc",
      accords: "perfume_accords?select=*&order=perfume_id.asc,position.asc",
      accordNames: "accords?select=*&order=name.asc",
      usage: "perfume_usage?select=*&order=perfume_id.asc",
      variants: "perfume_variants?select=*&order=perfume_id.asc,size_ml.asc",
      sources: "perfume_sources?select=*&order=created_at.asc,id.asc",
      reviews: "reviews?select=*&order=created_at.desc,id.asc",
    };
    const [rows] = await Promise.all([Promise.all(Object.values(queries).map(readAll)), loadPlans()]);
    Object.keys(queries).forEach((key, index) => { state.data[key] = rows[index] || []; });
    renderAll();
  }

  function showTab(name) {
    state.tab = name;
    $$(".admin-nav [data-tab]").forEach((button) => button.classList.toggle("active", button.dataset.tab === name));
    $$(".view").forEach((view) => { view.hidden = view.id !== `view-${name}`; });
    if (name === "perfumes") renderPerfumes();
    if (name === "reviews") renderReviews();
    if (name === "pagos") renderPlans();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function perfumeName(id) {
    const p = state.data.perfumes.find((item) => item.id === id);
    return p ? `${state.data.brands.find((b) => b.id === p.brand_id)?.name || ""} ${p.name}`.trim() : "Perfume no disponible";
  }

  function renderAll() {
    const perfumes = state.data.perfumes;
    const reviews = state.data.reviews;
    const pending = reviews.filter((r) => r.status === "pending");
    $("#stat-live").textContent = perfumes.filter((p) => p.is_published).length;
    $("#stat-drafts").textContent = perfumes.filter((p) => !p.is_published).length;
    $("#stat-pending").textContent = pending.length;
    $("#nav-perfume-count").textContent = perfumes.length;
    $("#nav-review-count").textContent = pending.length;
    $("#pending-count").textContent = pending.length;
    const preview = $("#pending-preview");
    preview.innerHTML = pending.length ? pending.slice(0, 3).map((r) => `
      <div class="preview-row"><div><strong>${escapeHTML(r.author_name)}</strong><small>${escapeHTML(perfumeName(r.perfume_id))}</small></div><button type="button" data-go="reviews" aria-label="Revisar reseña de ${escapeHTML(r.author_name)}">→</button></div>`).join("") : '<p class="muted">Todo al día. No hay reseñas pendientes.</p>';
    renderPerfumes();
    renderReviews();
    renderPlans();
    pintarLote();
  }

  function renderPerfumes() {
    const query = nonempty($("#perfume-search").value).toLocaleLowerCase("es");
    const filter = $("#perfume-filter").value;
    const rows = state.data.perfumes.filter((p) => {
      const brand = state.data.brands.find((b) => b.id === p.brand_id)?.name || "";
      const family = state.data.families.find((f) => f.id === p.family_id)?.name || "";
      return (!query || `${p.name} ${brand} ${family}`.toLocaleLowerCase("es").includes(query))
        && (filter === "all" || (filter === "published") === Boolean(p.is_published));
    });
    $("#perfume-list").innerHTML = rows.map((p) => {
      const photo = imageURL(p.primary_image);
      const brand = state.data.brands.find((b) => b.id === p.brand_id)?.name || "";
      const family = state.data.families.find((f) => f.id === p.family_id)?.name || "";
      return `<article class="perfume-card"><div class="perfume-card__image">${photo ? `<img src="${escapeHTML(photo)}" alt="" loading="lazy">` : "<span>Sin vista previa</span>"}</div><div class="perfume-card__content"><div class="perfume-card__meta"><span>${escapeHTML(brand)} · ${escapeHTML(family)}</span><span class="pill ${p.is_published ? "" : "pill--draft"}">${p.is_published ? "Publicado" : "Borrador"}</span></div><h2>${escapeHTML(p.name)}</h2><p>${escapeHTML(p.concentration || p.origin)}</p><button type="button" data-edit="${escapeHTML(p.id)}">Editar ficha →</button></div></article>`;
    }).join("");
    $("#perfume-empty").hidden = rows.length > 0;
  }

  function renderReviews() {
    $$("[data-review-filter]").forEach((button) => button.classList.toggle("active", button.dataset.reviewFilter === state.reviewFilter));
    const rows = state.data.reviews.filter((r) => state.reviewFilter === "all" || r.status === state.reviewFilter);
    $("#review-list").innerHTML = rows.map((r) => {
      const date = r.created_at ? new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(new Date(r.created_at)) : "";
      const stars = r.rating ? "★".repeat(r.rating) + "☆".repeat(5 - r.rating) : "Sin estrellas";
      const actions = r.status === "pending"
        ? `<button class="accept" data-review-action="publish">Publicar</button><button data-review-action="reject">Rechazar</button>`
        : r.status === "published"
          ? `<button data-review-action="feature">${r.is_featured ? "Quitar del inicio" : "Destacar en inicio"}</button><button data-review-action="verify">${r.verified_purchase ? "Quitar compra verificada" : "Marcar compra verificada"}</button><button data-review-action="reject">Ocultar</button>`
          : `<button data-review-action="pending">Volver a pendientes</button><button data-review-action="publish">Publicar</button>`;
      return `<article class="review-card" data-review-id="${escapeHTML(r.id)}"><div class="review-card__head"><div><strong>${escapeHTML(r.author_name)}</strong><small>${escapeHTML(r.city || "Sin ciudad")} · ${escapeHTML(date)}</small></div><span class="pill ${r.status === "published" ? "" : "pill--draft"}">${r.status === "pending" ? "Pendiente" : r.status === "published" ? "Publicada" : "Rechazada"}</span></div><div class="review-card__rating" aria-label="${escapeHTML(r.rating || "Sin")} estrellas">${stars}</div><blockquote>${escapeHTML(r.body)}</blockquote><div class="review-card__perfume">${escapeHTML(perfumeName(r.perfume_id))}${r.is_featured ? " · Destacada" : ""}${r.verified_purchase ? " · Compra verificada" : ""}</div><div class="review-card__actions">${actions}<button class="danger" data-review-action="delete">Eliminar</button></div><small class="review-card__date">ID: ${escapeHTML(r.id)}</small></article>`;
    }).join("");
    $("#review-empty").hidden = rows.length > 0;
  }

  async function updateReview(id, action, button) {
    const current = state.data.reviews.find((r) => r.id === id);
    if (!current) return;
    if (action === "delete" && !window.confirm(`¿Eliminar definitivamente la reseña de ${current.author_name}?`)) return;
    button.disabled = true;
    try {
      if (action === "delete") {
        await request(`reviews?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });
        state.data.reviews = state.data.reviews.filter((r) => r.id !== id);
      } else {
        const changes = action === "publish" ? { status: "published" }
          : action === "reject" ? { status: "rejected" }
            : action === "pending" ? { status: "pending" }
              : action === "feature" ? { is_featured: !current.is_featured }
                : { verified_purchase: !current.verified_purchase };
        const updated = await request(`reviews?id=eq.${encodeURIComponent(id)}&select=*`, {
          method: "PATCH", body: changes, prefer: "return=representation",
        });
        if (!Array.isArray(updated) || updated.length !== 1) throw new Error("No se actualizó la reseña.");
        Object.assign(current, updated[0]);
      }
      renderAll();
      notify(action === "delete" ? "Reseña eliminada." : "Reseña actualizada.");
    } catch (error) {
      button.disabled = false;
      notify(error.message, true);
    }
  }

  function fillSelects() {
    const brandSelect = $("#brand-choice");
    brandSelect.innerHTML = '<option value="">Elige una casa</option>'
      + state.data.brands.map((b) => `<option value="${escapeHTML(b.id)}">${escapeHTML(b.name)}</option>`).join("")
      + '<option value="__new">+ Nueva casa</option>';
    $("#family-choice").innerHTML = state.data.families.map((f) => `<option value="${escapeHTML(f.id)}">${escapeHTML(f.name)}</option>`).join("");
  }

  function openEditor(id = null) {
    fillSelects();
    const form = $("#perfume-form");
    form.reset();
    state.editorId = id;
    state.idEdited = Boolean(id);
    $("#new-brand-wrap").hidden = true;
    fields.new_brand.required = false;
    $("#archive-perfume").hidden = true;
    $("#importar-estado").className = "importar__estado";
    $("#importar-estado").textContent = "";
    $("#importar-resultados").innerHTML = "";
    $("#importar-consulta").value = "";
    $("#importar-uso").hidden = true;
    lecturaUso += 1;
    $("#editor-title").textContent = id ? "Editar perfume" : "Nuevo perfume";
    fields.id.readOnly = Boolean(id);
    if (id) {
      const p = state.data.perfumes.find((item) => item.id === id);
      if (!p) return notify("No encontramos ese perfume.", true);
      const names = ["id", "name", "family_id", "origin", "concentration", "edition", "audience", "release_year", "description", "primary_image", "collage_image", "best_seller_rank", "new_arrival_rank"];
      names.forEach((name) => { fields[name].value = p[name] ?? ""; });
      fields.brand_choice.value = p.brand_id;
      fields.is_published.checked = Boolean(p.is_published);
      $("#archive-perfume").hidden = !p.is_published;
      fields.images.value = state.data.images.filter((row) => row.perfume_id === id)
        .sort((a, b) => a.position - b.position)
        .map((row) => `${row.image_url}${row.alt_text ? ` | ${row.alt_text}` : ""}`).join("\n");
      for (const phase of ["salida", "corazon", "fondo"]) {
        fields[`notes_${phase}`].value = state.data.notes.filter((row) => row.perfume_id === id && row.phase === phase)
          .sort((a, b) => a.position - b.position).map((row) => row.note_name).join(", ");
      }
      fields.accords.value = state.data.accords.filter((row) => row.perfume_id === id)
        .sort((a, b) => a.position - b.position)
        .map((row) => {
          const color = state.data.accordNames.find((a) => a.name === row.accord_name)?.color_rgb || "150,150,150";
          return `${row.accord_name} | ${row.intensity} | ${color}`;
        }).join("\n");
      const usage = state.data.usage.find((row) => row.perfume_id === id);
      for (const key of ["winter", "spring", "summer", "autumn", "day_score", "night_score"]) fields[key].value = usage?.[key] ?? 50;
      fields.variants.value = state.data.variants.filter((row) => row.perfume_id === id).map((row) =>
        `${row.size_ml} | ${row.sku || ""} | ${row.price_mxn ?? ""} | ${row.stock_quantity ?? ""} | ${row.is_active ? "sí" : "no"}`).join("\n");
      const source = state.data.sources.find((row) => row.perfume_id === id && row.is_primary);
      fields.source_publisher.value = source?.publisher || "";
      fields.source_url.value = source?.source_url || "";
      fields.rights_basis.value = source?.rights_basis || "propio";
      fields.license_reference.value = source?.license_reference || "";
      fields.source_checked_at.value = source?.checked_at || "";
    } else {
      fields.winter.value = fields.spring.value = fields.summer.value = fields.autumn.value = fields.day_score.value = fields.night_score.value = 50;
    }
    updateImagePreview();
    $("#editor-dialog").showModal();
  }

  function updateImagePreview() {
    const preview = $("#image-preview");
    if (previewObjectURL) URL.revokeObjectURL(previewObjectURL);
    previewObjectURL = fields.upload_primary.files[0] ? URL.createObjectURL(fields.upload_primary.files[0]) : "";
    const url = previewObjectURL || imageURL(fields.primary_image.value);
    preview.innerHTML = url ? `<img src="${escapeHTML(url)}" alt="Vista previa del perfume">` : "<span>Vista previa de la foto principal</span>";
  }

  function parseLines(text) { return text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean); }
  function parsePairs(text, count, label) {
    return parseLines(text).map((line, i) => {
      const parts = line.split("|").map((part) => part.trim());
      if (parts.length > count) throw new Error(`${label}: demasiadas columnas en la línea ${i + 1}.`);
      return parts;
    });
  }
  function parseNotes(value) {
    return value.split(",").map((item) => item.trim()).filter(Boolean);
  }

  function collectPerfume() {
    const brandChoice = fields.brand_choice.value;
    const brandName = brandChoice === "__new" ? nonempty(fields.new_brand.value)
      : state.data.brands.find((b) => b.id === brandChoice)?.name || "";
    if (!brandName) throw new Error("Elige o escribe una casa.");
    const brandId = brandChoice === "__new" ? slug(brandName) : brandChoice;
    const id = slug(fields.id.value);
    if (!id || id !== fields.id.value) throw new Error("El ID solo puede contener letras minúsculas, números y guiones.");
    const images = parsePairs(fields.images.value, 2, "Fotos").map(([image_url, alt_text]) => ({ image_url, alt_text: alt_text || "" }));
    const accords = parsePairs(fields.accords.value, 3, "Acordes").map(([name, intensity, color_rgb], index) => {
      const strength = Number(intensity);
      const color = color_rgb || "150,150,150";
      if (!name || !Number.isInteger(strength) || strength < 0 || strength > 100 || !/^\d{1,3},\d{1,3},\d{1,3}$/.test(color)
        || color.split(",").some((part) => Number(part) > 255)) throw new Error(`Acorde inválido en la línea ${index + 1}.`);
      return { name, intensity: strength, color_rgb: color };
    });
    const variants = parsePairs(fields.variants.value, 5, "Tamaños").map(([size_ml, sku, price_mxn, stock_quantity, active], index) => {
      const size = Number(size_ml);
      if (!Number.isFinite(size) || size <= 0 || (price_mxn && (!Number.isFinite(Number(price_mxn)) || Number(price_mxn) < 0))
        || (stock_quantity && (!Number.isInteger(Number(stock_quantity)) || Number(stock_quantity) < 0))) {
        throw new Error(`Tamaño inválido en la línea ${index + 1}.`);
      }
      return { size_ml: size, sku: sku || null, price_mxn: price_mxn ? Number(price_mxn) : null,
        stock_quantity: stock_quantity ? Number(stock_quantity) : null, is_active: !/^(no|false|0)$/i.test(active || "") };
    });
    const usage = {};
    for (const key of ["winter", "spring", "summer", "autumn", "day_score", "night_score"]) {
      usage[key] = Number(fields[key].value);
      if (!Number.isInteger(usage[key]) || usage[key] < 0 || usage[key] > 100) throw new Error("Los valores de uso deben ir de 0 a 100.");
    }
    const sourcePublisher = nonempty(fields.source_publisher.value);
    const validPicture = (value) => !nonempty(value) || Boolean(imageURL(value));
    if (!nonempty(fields.primary_image.value) && !fields.upload_primary.files.length) {
      throw new Error("Añade una foto principal o sube un archivo.");
    }
    if (!validPicture(fields.primary_image.value) || !validPicture(fields.collage_image.value)
      || images.some((image) => !validPicture(image.image_url))) {
      throw new Error("Usa una URL HTTPS, una ruta img/ o un ID de foto de Unsplash para las imágenes.");
    }
    if (sourcePublisher && nonempty(fields.source_url.value)
      && (!/^https:\/\//i.test(nonempty(fields.source_url.value))
        || /[\s"'<>`]/.test(fields.source_url.value))) {
      throw new Error("La URL de la fuente debe comenzar con https://.");
    }
    if (sourcePublisher && fields.rights_basis.value === "licencia" && !nonempty(fields.license_reference.value)) {
      throw new Error("La fuente con licencia necesita su referencia privada.");
    }
    return {
      id, brand_id: brandId, brand_name: brandName,
      family_id: fields.family_id.value, name: nonempty(fields.name.value),
      concentration: nonempty(fields.concentration.value), edition: nonempty(fields.edition.value),
      origin: fields.origin.value, description: nonempty(fields.description.value),
      release_year: numberOrNull(fields.release_year.value), audience: fields.audience.value,
      primary_image: nonempty(fields.primary_image.value), collage_image: nonempty(fields.collage_image.value),
      best_seller_rank: numberOrNull(fields.best_seller_rank.value), new_arrival_rank: numberOrNull(fields.new_arrival_rank.value),
      is_published: fields.is_published.checked,
      images, notes: { salida: parseNotes(fields.notes_salida.value), corazon: parseNotes(fields.notes_corazon.value), fondo: parseNotes(fields.notes_fondo.value) },
      accords, usage, variants,
      primary_source: sourcePublisher ? { publisher: sourcePublisher, source_url: nonempty(fields.source_url.value),
        rights_basis: fields.rights_basis.value, license_reference: nonempty(fields.license_reference.value),
        checked_at: fields.source_checked_at.value } : null,
    };
  }

  const imageExtensions = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" };

  async function uploadImage(file, perfumeId, kind) {
    if (!imageExtensions[file.type]) throw new Error("Las fotos deben ser JPG, PNG, WebP o AVIF.");
    if (file.size > 5 * 1024 * 1024) throw new Error(`La foto ${file.name} supera los 5 MB.`);
    return uploadToBucket(file, `perfumes/${perfumeId}/${kind}-${crypto.randomUUID()}.${imageExtensions[file.type]}`);
  }

  async function uploadToBucket(file, path, retry = true) {
    if (state.session.expires_at < Date.now() + 60000) await refreshSession();
    const response = await fetch(new URL(`/storage/v1/object/sensorial-perfumes/${path}`, apiBase), {
      method: "POST",
      headers: { apikey: config.publishableKey, Authorization: `Bearer ${state.session.access_token}`,
        "Content-Type": file.type, "x-upsert": "false" },
      body: file,
    });
    if (response.status === 401 && retry) {
      await refreshSession();
      return uploadToBucket(file, path, false);
    }
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.message || result.error || "No se pudo subir una imagen. Revisa el bucket sensorial-perfumes.");
    return new URL(`/storage/v1/object/public/sensorial-perfumes/${path}`, apiBase).href;
  }

  async function uploadSelectedImages(payload) {
    const files = [fields.upload_primary.files[0], fields.upload_collage.files[0], ...fields.upload_gallery.files].filter(Boolean);
    const toAdd = [...fields.upload_gallery.files].filter((file) =>
      !uploadedGallery.get(file) || !payload.images.some((item) => item.image_url === uploadedGallery.get(file)));
    if (payload.images.length + toAdd.length > 20) throw new Error("El carrusel admite hasta 20 fotos.");
    for (const file of files) {
      if (!["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.type) || file.size > 5 * 1024 * 1024) {
        throw new Error(`Revisa el formato y tamaño de ${file.name} (máximo 5 MB).`);
      }
    }
    if (fields.upload_primary.files[0]) {
      payload.primary_image = await uploadImage(fields.upload_primary.files[0], payload.id, "principal");
      fields.primary_image.value = payload.primary_image;
      fields.upload_primary.value = "";
    }
    if (fields.upload_collage.files[0]) {
      payload.collage_image = await uploadImage(fields.upload_collage.files[0], payload.id, "lamina");
      fields.collage_image.value = payload.collage_image;
      fields.upload_collage.value = "";
    }
    const gallery = [...fields.upload_gallery.files];
    for (const file of gallery) {
      const previous = uploadedGallery.get(file);
      if (previous && payload.images.some((item) => item.image_url === previous)) continue;
      const image_url = previous || await uploadImage(file, payload.id, "galeria");
      uploadedGallery.set(file, image_url);
      payload.images.push({ image_url, alt_text: `${payload.name} — ${file.name.replace(/\.[^.]+$/, "")}` });
      fields.images.value = [fields.images.value.trim(), `${image_url} | ${payload.name} — ${file.name.replace(/\.[^.]+$/, "")}`]
        .filter(Boolean).join("\n");
    }
    fields.upload_gallery.value = "";
  }

  /* ---------- Traer de Fragrantica (vía PerfumAPI) ----------
     PerfumAPI (github.com/seccaz/PerfumAPI) guarda perfumes leídos de Fragrantica y deja
     buscarlos sin clave. No es una API oficial de Fragrantica ni incluye acordes o "cuándo
     usarlo". Como PerfumAPI no acepta peticiones de otras páginas, la búsqueda pasa por la
     función de Supabase "fragrantica-buscar", que además copia la foto al bucket. Elegir un
     resultado llena el formulario para revisarlo; nada se guarda hasta pulsar "Guardar". */
  async function funcionFragrantica(cuerpo, signal) {
    if (state.session.expires_at < Date.now() + 60000) await refreshSession();
    const respuesta = await fetch(new URL("/functions/v1/fragrantica-buscar", apiBase), {
      method: "POST",
      headers: { apikey: config.publishableKey, Authorization: `Bearer ${state.session.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo),
      signal,
      cache: "no-store",
    });
    const datos = await respuesta.json().catch(() => ({}));
    if (respuesta.status === 404) throw new Error("Falta publicar la función fragrantica-buscar en Supabase (ver SUPABASE.md).");
    if (!respuesta.ok) throw new Error(datos.error || `La función respondió ${respuesta.status}.`);
    return datos;
  }

  /* Las notas llegan en inglés; estas son las más comunes en español (como las usa la tienda).
     Las que no estén aquí se quedan en inglés y el panel avisa cuáles son. */
  const NOTAS_ES = {
    "bergamot": "bergamota", "calabrian bergamot": "bergamota de Calabria", "lemon": "limón", "lime": "lima", "orange": "naranja", "bitter orange": "naranja amarga",
    "blood orange": "naranja sanguina", "mandarin orange": "mandarina", "mandarin": "mandarina", "tangerine": "mandarina",
    "grapefruit": "toronja", "pink grapefruit": "toronja rosada", "yuzu": "yuzu", "citron": "cidra", "citruses": "cítricos",
    "petitgrain": "petit grain", "neroli": "neroli", "orange blossom": "azahar", "lemon verbena": "verbena de limón",
    "apple": "manzana", "green apple": "manzana verde", "pear": "pera", "peach": "durazno", "apricot": "chabacano",
    "plum": "ciruela", "cherry": "cereza", "black currant": "grosella negra", "blackcurrant": "grosella negra",
    "raspberry": "frambuesa", "strawberry": "fresa", "blackberry": "zarzamora", "pineapple": "piña", "coconut": "coco",
    "melon": "melón", "watermelon": "sandía", "fig": "higo", "fig leaf": "hoja de higuera", "litchi": "lichi",
    "passionfruit": "maracuyá", "mango": "mango", "red berries": "frutos rojos", "fruity notes": "notas frutales",
    "rose": "rosa", "damask rose": "rosa de damasco", "turkish rose": "rosa turca", "bulgarian rose": "rosa búlgara",
    "jasmine": "jazmín", "jasmine sambac": "jazmín sambac", "tuberose": "nardo", "iris": "iris", "orris root": "raíz de lirio",
    "violet": "violeta", "violet leaf": "hoja de violeta", "lily-of-the-valley": "lirio de los valles", "lily of the valley": "lirio de los valles",
    "lily": "lirio", "magnolia": "magnolia", "peony": "peonía", "freesia": "fresia", "gardenia": "gardenia",
    "ylang-ylang": "ylang-ylang", "geranium": "geranio", "heliotrope": "heliotropo", "lavender": "lavanda",
    "orchid": "orquídea", "carnation": "clavel", "hyacinth": "jacinto", "hiacynth": "jacinto", "cyclamen": "ciclamen",
    "mimosa": "mimosa", "osmanthus": "osmanto", "honeysuckle": "madreselva", "lotus": "loto", "water lily": "nenúfar",
    "white flowers": "flores blancas", "floral notes": "notas florales", "mignonette": "reseda", "chamomile": "manzanilla",
    "pink pepper": "pimienta rosa", "black pepper": "pimienta negra", "pepper": "pimienta", "sichuan pepper": "pimienta de Sichuan",
    "cardamom": "cardamomo", "cinnamon": "canela", "nutmeg": "nuez moscada", "clove": "clavo", "cloves": "clavo",
    "ginger": "jengibre", "saffron": "azafrán", "cumin": "comino", "coriander": "cilantro", "star anise": "anís estrellado",
    "anise": "anís", "spices": "especias", "spicy notes": "notas especiadas", "elemi": "elemí",
    "mint": "menta", "peppermint": "menta piperita", "basil": "albahaca", "rosemary": "romero", "sage": "salvia",
    "clary sage": "salvia esclarea", "thyme": "tomillo", "artemisia": "artemisa", "tarragon": "estragón",
    "green notes": "notas verdes", "grass": "césped", "bamboo": "bambú", "tea": "té", "green tea": "té verde",
    "black tea": "té negro", "mate": "mate", "tobacco": "tabaco", "tobacco leaf": "hoja de tabaco", "hay": "heno",
    "cedar": "cedro", "virginia cedar": "cedro de Virginia", "atlas cedar": "cedro del Atlas", "sandalwood": "sándalo",
    "vetiver": "vetiver", "patchouli": "pachulí", "oud": "oud", "agarwood (oud)": "oud", "agarwood": "oud",
    "guaiac wood": "madera de guayaco", "birch": "abedul", "oakmoss": "musgo de roble", "moss": "musgo", "cypress": "ciprés",
    "pine": "pino", "fir": "abeto", "woody notes": "notas amaderadas", "woodsy notes": "notas amaderadas",
    "cashmere wood": "madera de cachemira", "cashmeran": "cashmeran", "papyrus": "papiro", "driftwood": "madera flotante",
    "amber": "ámbar", "ambergris": "ámbar gris", "ambroxan": "ambroxan", "ambrette (musk mallow)": "ambreta",
    "musk": "almizcle", "white musk": "almizcle blanco", "musks": "almizcles", "labdanum": "ládano", "benzoin": "benjuí",
    "incense": "incienso", "olibanum": "olíbano", "myrrh": "mirra", "opoponax": "opopónaco", "tolu balsam": "bálsamo de tolú",
    "peru balsam": "bálsamo de Perú", "styrax": "estoraque", "resins": "resinas",
    "vanilla": "vainilla", "madagascar vanilla": "vainilla de Madagascar", "bourbon vanilla": "vainilla bourbon",
    "tonka bean": "haba tonka", "caramel": "caramelo", "honey": "miel", "praline": "praliné", "chocolate": "chocolate",
    "cacao": "cacao", "cocoa": "cacao", "coffee": "café", "almond": "almendra", "bitter almond": "almendra amarga",
    "hazelnut": "avellana", "pistachio": "pistache", "sugar": "azúcar", "brown sugar": "azúcar morena",
    "marshmallow": "malvavisco", "milk": "leche", "cream": "crema", "rum": "ron", "cognac": "coñac", "whiskey": "whisky",
    "wine": "vino", "champagne": "champaña", "dates": "dátiles", "licorice": "regaliz",
    "leather": "cuero", "suede": "gamuza", "sea notes": "notas marinas", "marine notes": "notas marinas",
    "water notes": "notas acuáticas", "aquatic notes": "notas acuáticas", "calone": "calone", "salt": "sal",
    "sea salt": "sal marina", "ozonic notes": "notas ozónicas", "aldehydes": "aldehídos", "metallic notes": "notas metálicas",
    "mineral notes": "notas minerales", "smoke": "humo", "earthy notes": "notas terrosas", "powdery notes": "notas atalcadas",
    "violet accord": "acorde de violeta", "iso e super": "Iso E Super", "ambrettolide": "ambretólida", "sweet notes": "notas dulces",
  };

  const notaES = (nota) => NOTAS_ES[nota.trim().toLowerCase()] || nota.trim();
  const sinTraducir = (nota) => !NOTAS_ES[nota.trim().toLowerCase()];

  /* Fragrantica no da el color de cada acorde. Se usa el que ya tenga ese acorde en tu base
     de datos; si es nuevo, uno parecido al de Fragrantica; si no se conoce, gris. Los nombres
     en inglés (si llegan así) se pasan a español. */
  const ACORDES_ES = {
    citrus: "cítrico", woody: "amaderado", sweet: "dulce", fruity: "afrutado", floral: "floral", "white floral": "floral blanco",
    rose: "rosas", aromatic: "aromático", "fresh spicy": "especiado fresco", "warm spicy": "especiado cálido", powdery: "atalcado",
    vanilla: "avainillado", amber: "ámbar", musky: "almizclado", leather: "cuero", earthy: "terroso", smoky: "ahumado",
    fresh: "fresco", aquatic: "acuático", marine: "marino", green: "verde", balsamic: "balsámico", tobacco: "tabaco",
    oud: "oud", patchouli: "pachulí", lavender: "lavanda", iris: "iris", animalic: "animal", ozonic: "ozónico",
    tropical: "tropical", honey: "miel", caramel: "caramelo", coffee: "café", cacao: "cacao", almond: "almendra",
    "soft spicy": "especiado suave", herbal: "herbal", lactonic: "lactónico", metallic: "metálico", salty: "salado",
    "yellow floral": "floral amarillo", violet: "violeta", tuberose: "nardo", cinnamon: "canela", mossy: "musgoso",
  };
  const COLOR_ACORDE = {
    "cítrico": "249,255,82", "amaderado": "119,68,20", "dulce": "238,54,59", "afrutado": "252,75,41", "floral": "255,95,141",
    "floral blanco": "237,242,251", "rosas": "254,1,107", "aromático": "55,169,137", "especiado fresco": "131,198,50",
    "especiado cálido": "204,51,0", "especiado suave": "222,120,60", "atalcado": "238,221,204", "avainillado": "255,254,192",
    "ámbar": "188,77,16", "almizclado": "226,207,238", "cuero": "116,76,59", "terroso": "84,72,56", "ahumado": "140,135,129",
    "fresco": "155,229,237", "acuático": "108,215,255", "marino": "0,166,213", "verde": "14,164,0", "balsámico": "160,116,50",
    "tabaco": "157,98,48", "oud": "61,37,20", "pachulí": "99,101,46", "lavanda": "154,124,200", "iris": "191,180,227",
    "animal": "140,96,74", "ozónico": "160,215,250", "tropical": "255,193,7", "miel": "247,181,61", "caramelo": "196,128,58",
    "café": "101,67,33", "cacao": "123,63,0", "almendra": "239,222,205", "herbal": "106,168,79", "lactónico": "250,244,232",
    "metálico": "170,170,180", "salado": "180,220,230", "floral amarillo": "255,216,0", "violeta": "143,94,182",
    "nardo": "245,240,230", "canela": "180,90,40", "musgoso": "88,110,60",
  };
  function acordeES(nombre) {
    const limpio = nonempty(nombre).toLocaleLowerCase("es");
    return ACORDES_ES[limpio] || limpio;
  }
  function colorAcorde(nombre, deFragrantica = "") {
    const guardado = state.data.accordNames.find((a) => nonempty(a.name).toLocaleLowerCase("es") === nombre)?.color_rgb;
    return guardado || deFragrantica || COLOR_ACORDE[nombre] || "150,150,150";
  }

  /* "for men", "for women and men", "para Hombres y Mujeres"... */
  function publicoDe(genero) {
    const g = nonempty(genero).toLowerCase();
    const mujer = /\b(women|mujer(es)?)\b/.test(g);
    const hombre = /\b(men|hombres?)\b/.test(g);
    if (/unisex/.test(g) || (mujer && hombre)) return "unisex";
    return mujer ? "mujer" : hombre ? "hombre" : "";
  }
  let resultadosFragrantica = [];

  async function buscarFragrantica() {
    const consulta = nonempty($("#importar-consulta").value);
    const estado = $("#importar-estado");
    const lista = $("#importar-resultados");
    if (consulta.length < 2) { estado.textContent = "Escribe al menos dos letras."; return; }
    const boton = $("#importar-buscar");
    boton.disabled = true;
    estado.className = "importar__estado";
    estado.textContent = "Buscando en Fragrantica…";
    lista.innerHTML = "";
    /* Fragrantica se lee en el momento: suele tardar entre 20 segundos y un minuto */
    const aviso = setTimeout(() => { estado.textContent = "Leyendo Fragrantica; puede tardar hasta un minuto…"; }, 5000);
    const control = new AbortController();
    const limite = setTimeout(() => control.abort(), 160000);
    try {
      const datos = await funcionFragrantica({ accion: "buscar", consulta }, control.signal);
      resultadosFragrantica = Array.isArray(datos.resultados) ? datos.resultados.slice(0, 8) : [];
      const desde = datos.fuente === "perfumapi" ? " (de PerfumAPI)" : " (de Fragrantica)";
      const notaFuente = datos.aviso ? ` ${datos.aviso}` : "";
      if (!resultadosFragrantica.length) {
        estado.textContent = `No encontramos ese perfume. Prueba con otro nombre, pega el enlace de su página en Fragrantica o llena la ficha a mano.${notaFuente}`;
        return;
      }
      estado.textContent = (resultadosFragrantica.length === 1 ? "1 resultado" : `${resultadosFragrantica.length} resultados`) + desde + "." + notaFuente;
      pintarResultados();
    } catch (error) {
      estado.classList.add("error");
      estado.textContent = error.name === "AbortError" ? "Fragrantica no respondió a tiempo. Inténtalo de nuevo en un momento." : `No se pudo buscar: ${error.message}`;
    } finally {
      clearTimeout(aviso);
      clearTimeout(limite);
      boton.disabled = false;
    }
  }

  function pintarResultados() {
    $("#importar-resultados").innerHTML = resultadosFragrantica.map((r, i) => {
      const foto = imageURL(r.image_url);
      const notas = [r.notes_top, r.notes_middle, r.notes_base].reduce((n, fase) => n + (Array.isArray(fase) ? fase.length : 0), 0);
      const acordes = Array.isArray(r.accords) ? r.accords.length : 0;
      const detalle = [r.brand, r.release_year, r.gender, `${notas} notas`, acordes ? `${acordes} acordes` : ""].filter(Boolean).map(escapeHTML).join(" · ");
      return `<div class="importar__resultado">${foto ? `<img src="${escapeHTML(foto)}" alt="" loading="lazy">` : "<span></span>"}<div><strong>${escapeHTML(nombreSinCasa(r))}</strong><small>${detalle}</small></div><button class="button button--primary" type="button" data-importar="${i}">Usar</button></div>`;
    }).join("");
  }

  /* PerfumAPI guarda el nombre con la casa al final ("Sauvage Dior") */
  function nombreSinCasa(r) {
    const nombre = nonempty(r.name);
    const casa = nonempty(r.brand);
    return casa && nombre.toLowerCase().endsWith(` ${casa.toLowerCase()}`) ? nombre.slice(0, -casa.length - 1).trim() : nombre;
  }

  async function usarFragrantica(indice) {
    const r = resultadosFragrantica[indice];
    if (!r) return;
    $$("[data-importar]").forEach((boton) => { boton.disabled = true; });
    await aplicarFragrantica(r);
  }

  /* Llena la ficha con un perfume de Fragrantica: un resultado de la búsqueda o lo que
     copió el marcador (herramientas/fragrantica.js), que además trae colores y "cuándo usarlo". */
  async function aplicarFragrantica(r) {
    const nombre = nombreSinCasa(r);
    const fases = { salida: r.notes_top, corazon: r.notes_middle, fondo: r.notes_base };
    const yaTieneDatos = ["name", "notes_salida", "notes_corazon", "notes_fondo", "accords", "release_year", "primary_image"].some((campo) => nonempty(fields[campo].value));
    /* En una ficha ya guardada (por ejemplo, un borrador del catálogo) el nombre y la casa se
       conservan: Fragrantica puede nombrarlos distinto y crearía una casa duplicada */
    const conservarIdentidad = Boolean(state.editorId);
    const reemplazar = !yaTieneDatos || window.confirm(conservarIdentidad
      ? "Esta ficha ya tiene datos. ¿Reemplazarlos con los de Fragrantica?\n\nAceptar: reemplaza notas, acordes, «cuándo usarlo», año, público y foto (el nombre y la casa se conservan). Cancelar: solo llena lo que está vacío."
      : "Esta ficha ya tiene datos. ¿Reemplazarlos con los de Fragrantica?\n\nAceptar: reemplaza todo. Cancelar: solo llena lo que está vacío.");
    const poner = (campo, valor) => {
      if (valor === undefined || valor === null || valor === "") return false;
      if (!reemplazar && nonempty(fields[campo].value)) return false;
      fields[campo].value = valor;
      return true;
    };
    const llenados = [];
    const enIngles = new Set();

    if ((!conservarIdentidad || !nonempty(fields.name.value)) && poner("name", nombre)) {
      llenados.push("nombre");
      if (!state.editorId && !state.idEdited) fields.id.value = slug(nombre);
    }
    /* La casa: si ya existe se elige; si no, queda lista como casa nueva */
    if (r.brand && (conservarIdentidad ? !fields.brand_choice.value : (reemplazar || !fields.brand_choice.value))) {
      const existente = state.data.brands.find((b) => slug(b.name) === slug(r.brand));
      fields.brand_choice.value = existente ? existente.id : "__new";
      if (!existente) fields.new_brand.value = r.brand;
      $("#new-brand-wrap").hidden = Boolean(existente);
      fields.new_brand.required = !existente;
      llenados.push(existente ? "casa" : "casa nueva");
    }
    /* El año solo si es creíble (PerfumAPI a veces trae años mal leídos) */
    const anio = Number(r.release_year);
    if (Number.isInteger(anio) && anio >= 1900 && anio <= new Date().getFullYear() + 1 && poner("release_year", anio)) llenados.push("año");
    const publico = publicoDe(r.gender);
    if (publico && poner("audience", publico)) llenados.push("público");

    /* Las notas de Fragrantica llegan ya en español; las de PerfumAPI se traducen */
    const enEspanol = r.idioma && r.idioma !== "en";
    let notasPuestas = 0;
    for (const [fase, lista] of Object.entries(fases)) {
      if (!Array.isArray(lista) || !lista.length) continue;
      const unicas = [...new Set(enEspanol ? lista.map((n) => n.trim()) : lista.map(notaES))];
      if (!enEspanol) lista.filter(sinTraducir).forEach((nota) => enIngles.add(nota));
      if (poner(`notes_${fase}`, unicas.join(", "))) notasPuestas += unicas.length;
    }
    if (notasPuestas) llenados.push(`${notasPuestas} notas`);

    /* Acordes con su intensidad (0 a 100) y un color por acorde */
    const acordes = (Array.isArray(r.accords) ? r.accords : []).slice(0, 8)
      .map((a) => ({ nombre: acordeES(a.name), fuerza: Math.max(0, Math.min(100, Math.round(Number(a.strength)))), color: /^\d{1,3},\d{1,3},\d{1,3}$/.test(nonempty(a.color)) ? a.color : "" }))
      .filter((a) => a.nombre && Number.isFinite(a.fuerza));
    if (acordes.length && poner("accords", acordes.map((a) => `${a.nombre} | ${a.fuerza} | ${colorAcorde(a.nombre, a.color)}`).join("\n"))) {
      llenados.push(`${acordes.length} acordes`);
    }

    /* La foto de Fragrantica se copia al bucket (así la tienda no depende de su servidor).
       Va como principal si no hay una; si ya hay, se suma al carrusel. Si la copia falla,
       se usa el enlace original de Fragrantica. */
    let foto = imageURL(r.image_url);
    let avisoFoto = "";
    if (foto) {
      const estadoFoto = $("#importar-estado");
      estadoFoto.className = "importar__estado";
      estadoFoto.textContent = "Copiando la foto de Fragrantica…";
      try {
        const id = slug(fields.id.value || nombre) || "perfume";
        const copia = await funcionFragrantica({ accion: "foto", url: foto, perfumeId: id });
        if (imageURL(copia.url)) foto = copia.url;
      } catch (error) {
        avisoFoto = ` No se pudo copiar la foto (${error.message}); se usa el enlace de Fragrantica.`;
      }
      if (poner("primary_image", foto)) {
        fields.upload_primary.value = "";
        llenados.push("foto principal");
      } else if (!fields.images.value.includes(foto)) {
        fields.images.value = [fields.images.value.trim(), `${foto} | ${nombre} en Fragrantica`].filter(Boolean).join("\n");
        llenados.push("foto en el carrusel");
      }
      updateImagePreview();
    }

    /* "Cuándo usarlo" (solo lo trae el marcador): seis valores de 0 a 100 */
    const USO = { winter: "winter", spring: "spring", summer: "summer", autumn: "autumn", day: "day_score", night: "night_score" };
    const uso = r.usage && Object.keys(USO).every((k) => Number.isFinite(Number(r.usage[k]))) ? r.usage : null;
    if (uso && (reemplazar || Object.values(USO).every((campo) => Number(fields[campo].value) === 50))) {
      for (const [k, campo] of Object.entries(USO)) fields[campo].value = Math.max(0, Math.min(100, Math.round(Number(uso[k]))));
      llenados.push("cuándo usarlo");
    }

    const fuente = /^https:\/\/(www\.)?fragrantica\./i.test(nonempty(r.perfume_url)) ? r.perfume_url : "";
    if (fuente && (reemplazar || !nonempty(fields.source_url.value))) {
      fields.source_publisher.value = enEspanol ? "Fragrantica" : "Fragrantica (vía PerfumAPI)";
      fields.source_url.value = fuente;
      fields.source_checked_at.value = new Date().toISOString().slice(0, 10);
      llenados.push("fuente");
    }

    /* Si no vino "cuándo usarlo", se lee aparte de la página exacta del perfume (tarda un poco
       más; mientras tanto la ficha se puede seguir revisando) */
    const leerUso = !uso && Boolean(fuente);
    if (leerUso) leerUsoEnFicha(fuente, reemplazar);

    const estado = $("#importar-estado");
    estado.className = "importar__estado ok";
    const faltan = [!acordes.length && !leerUso && "los acordes", !uso && !leerUso && "«cuándo usarlo»"].filter(Boolean);
    const avisoFaltan = faltan.length ? `No vienen ${faltan.join(" ni ")}: complétalo a mano.` : "";
    estado.textContent = [`Listo: ${llenados.length ? llenados.join(", ") : "no había nada vacío que llenar"}.`, avisoFaltan,
      enIngles.size ? `Quedaron en inglés: ${[...enIngles].join(", ")}.` : "", avisoFoto.trim(), "Revisa todo antes de guardar."]
      .filter(Boolean).join(" ");
    $("#importar-resultados").innerHTML = "";
  }

  /* ---------- Detalles de Fragrantica: "cuándo usarlo" y colores de acordes ----------
     La función de Supabase inicia la lectura en Apify y aquí se pregunta cada pocos segundos
     hasta que termina. Devuelve un Map: número de Fragrantica -> detalles. */
  const esperar = (ms) => new Promise((listo) => { setTimeout(listo, ms); });
  const idFragrantica = (url) => String(url || "").match(/-(\d+)\.html(?:$|[?#])/)?.[1] || "";
  const USO_CAMPOS = { winter: "winter", spring: "spring", summer: "summer", autumn: "autumn", day: "day_score", night: "night_score" };

  async function leerDetalles(urls, alEsperar) {
    const { runId } = await funcionFragrantica({ accion: "detalles", urls });
    const inicio = Date.now();
    let fallos = 0;
    while (Date.now() - inicio < 15 * 60000) {
      await esperar(8000);
      let datos;
      try {
        datos = await funcionFragrantica({ accion: "detalles-estado", runId });
        fallos = 0;
      } catch (error) {
        /* Un corte de red momentáneo no detiene la lectura, que sigue en Apify */
        if (++fallos >= 4) throw error;
        continue;
      }
      if (datos.estado !== "leyendo") return new Map((datos.resultados || []).map((d) => [String(d.fragrantica_id), d]));
      alEsperar?.(Math.round((Date.now() - inicio) / 1000));
    }
    throw new Error("La lectura en Fragrantica tardó más de 15 minutos");
  }

  /* Acorde en la forma de la ficha: nombre en español, intensidad 0-100 y color. El color guardado
     en tu base gana; si el acorde es nuevo, el de Fragrantica; si no hay, uno parecido o gris. */
  function acordeDeFragrantica(a, colores = new Map(), deDetalles = [], posicion = -1) {
    const nombre = acordeES(a.name);
    /* Fragrantica muestra los acordes en el mismo orden en todos sus idiomas: si el nombre en
       español no coincide con la traducción del inglés, se toma el color del mismo lugar */
    const mismoLugar = deDetalles[posicion];
    const porLugar = mismoLugar && Math.abs(Number(mismoLugar.strength) - Number(a.strength)) <= 2 ? mismoLugar.color : "";
    const color = /^\d{1,3},\d{1,3},\d{1,3}$/.test(nonempty(a.color)) ? a.color : (colores.get(nombre) || porLugar || "");
    return { name: nombre, intensity: Math.max(0, Math.min(100, Math.round(Number(a.strength)))), color_rgb: colorAcorde(nombre, color) };
  }

  async function leerUsoEnFicha(url, reemplazar) {
    const lectura = ++lecturaUso;
    const aviso = $("#importar-uso");
    aviso.hidden = false;
    aviso.className = "importar__estado";
    aviso.textContent = "Leyendo «cuándo usarlo» en Fragrantica (1 o 2 minutos). Puedes seguir revisando la ficha.";
    try {
      const detalles = await leerDetalles([url]);
      if (lectura !== lecturaUso || !$("#editor-dialog").open) return;
      const d = detalles.get(idFragrantica(url)) || [...detalles.values()][0];
      if (!d) throw new Error("Fragrantica no devolvió ese perfume");
      const hecho = [];
      if (d.usage && (reemplazar || Object.values(USO_CAMPOS).every((campo) => Number(fields[campo].value) === 50))) {
        for (const [clave, campo] of Object.entries(USO_CAMPOS)) fields[campo].value = d.usage[clave];
        hecho.push("«cuándo usarlo»");
      }
      const colores = new Map(d.accords.map((a) => [acordeES(a.name), a.color]));
      if (!nonempty(fields.accords.value) && d.accords.length) {
        fields.accords.value = d.accords.slice(0, 8).map((a) => acordeDeFragrantica(a))
          .map((a) => `${a.name} | ${a.intensity} | ${a.color_rgb}`).join("\n");
        hecho.push("acordes");
      } else if (colores.size) {
        /* Solo cambia el color de los acordes que aún no existen en tu base */
        const enBase = new Set(state.data.accordNames.map((a) => nonempty(a.name).toLocaleLowerCase("es")));
        const antes = fields.accords.value;
        fields.accords.value = antes.split(/\r?\n/).map((linea, i) => {
          const [nombre, fuerza] = linea.split("|").map((parte) => parte.trim());
          const clave = nonempty(nombre).toLocaleLowerCase("es");
          const mismoLugar = d.accords[i] && Math.abs(Number(d.accords[i].strength) - Number(fuerza)) <= 2 ? d.accords[i].color : "";
          const color = colores.get(clave) || mismoLugar;
          return clave && fuerza && color && !enBase.has(clave) ? `${nombre} | ${fuerza} | ${color}` : linea;
        }).join("\n");
        if (fields.accords.value !== antes) hecho.push("colores de los acordes");
      }
      aviso.className = "importar__estado ok";
      aviso.textContent = hecho.length ? `También listo: ${hecho.join(" y ")}. Revísalo antes de guardar.`
        : d.usage ? "«Cuándo usarlo» ya tenía valores; no se cambiaron." : "Fragrantica no tiene votos de «cuándo usarlo» para este perfume: complétalo a mano.";
    } catch (error) {
      if (lectura !== lecturaUso) return;
      aviso.className = "importar__estado error";
      aviso.textContent = `No se pudo leer «cuándo usarlo» (${error.message}). Complétalo a mano.`;
    }
  }

  /* ---------- Completar borradores en lote ----------
     1. Busca cada borrador sin notas en Fragrantica (casa + nombre).
     2. Elige el resultado solo si coinciden casa, nombre y concentración; si hay duda, lo deja
        "por elegir" con sus opciones guardadas en este navegador.
     3. Lee "cuándo usarlo" de los elegidos (una lectura por tanda) y guarda cada ficha, que
        sigue como borrador. */
  const loteKey = "sensorial-admin-lote";
  const TANDA = 25;
  const BUSQUEDAS_A_LA_VEZ = 3;
  const COSTO_PERFUME_USD = 0.015;
  const lote = { corriendo: false, detener: false, hechos: 0, total: 0, bitacora: [], ...leerLoteGuardado() };

  function leerLoteGuardado() {
    try {
      const guardado = JSON.parse(localStorage.getItem(loteKey) || "{}");
      return {
        revisar: guardado.revisar && typeof guardado.revisar === "object" ? guardado.revisar : {},
        sinResultado: Array.isArray(guardado.sinResultado) ? guardado.sinResultado : [],
      };
    } catch { return { revisar: {}, sinResultado: [] }; }
  }
  function guardarLote() {
    try { localStorage.setItem(loteKey, JSON.stringify({ revisar: lote.revisar, sinResultado: lote.sinResultado })); }
    catch { /* Sin almacenamiento: las opciones por elegir solo duran mientras la pestaña esté abierta. */ }
  }

  const casaDe = (p) => state.data.brands.find((b) => b.id === p.brand_id)?.name || "";
  function idsConNotas() { return new Set(state.data.notes.map((n) => n.perfume_id)); }
  function pendientesLote() {
    const conNotas = idsConNotas();
    return state.data.perfumes
      .filter((p) => !p.is_published && !conNotas.has(p.id) && !lote.revisar[p.id] && !lote.sinResultado.includes(p.id))
      .sort((a, b) => a.id.localeCompare(b.id));
  }

  /* ---- Comparar un borrador con los resultados de Fragrantica ---- */
  const CONCENTRACIONES = [
    [/\bextrait(?: de parfum)?\b/g, "extrait"],
    [/\beau de parfum\b|\bedp\b/g, "edp"],
    [/\beau de toilette\b|\bedt\b/g, "edt"],
    [/\beau de cologne\b|\bcologne\b|\bedc\b|\bcolonia\b/g, "edc"],
    [/\bbody mist\b|\bbrume\b|\bmist\b/g, "mist"],
    [/\bbody lotion\b|\blotion\b/g, "lotion"],
    [/\bparfum\b/g, "parfum"],
  ];
  const normalizar = (texto) => String(texto ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ").replace(/['’]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  function separarNombre(texto) {
    let limpio = normalizar(texto)
      .replace(/\b(for|para) (women and men|men and women|mujeres y hombres|hombres y mujeres|women|men|mujeres|hombres)\b/g, " ");
    let codigo = "";
    for (const [patron, valor] of CONCENTRACIONES) {
      if (patron.test(limpio)) { codigo = codigo || valor; limpio = limpio.replace(patron, " "); }
      patron.lastIndex = 0;
    }
    return { palabras: limpio.split(" ").filter((p) => p && p !== "by"), codigo };
  }
  function distanciaCorta(a, b) {
    if (Math.abs(a.length - b.length) > 1) return 2;
    const fila = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      let previo = fila[0];
      fila[0] = i;
      for (let j = 1; j <= b.length; j++) {
        const actual = fila[j];
        fila[j] = Math.min(fila[j] + 1, fila[j - 1] + 1, previo + (a[i - 1] === b[j - 1] ? 0 : 1));
        previo = actual;
      }
    }
    return fila[b.length];
  }
  const mismaPalabra = (a, b) => a === b || (a.length >= 5 && b.length >= 5 && distanciaCorta(a, b) <= 1);
  function mismaCasa(a, b) {
    const x = normalizar(a);
    const y = normalizar(b);
    if (!x || !y) return false;
    return x === y || y.startsWith(`${x} `) || x.startsWith(`${y} `) || (x.split(" ")[0] === y.split(" ")[0] && x.split(" ")[0].length >= 4);
  }
  function publicoDelBorrador(p) {
    const edicion = normalizar(p.edition);
    if (/\bpara ella\b/.test(edicion)) return "mujer";
    if (/\bpara el\b/.test(edicion)) return "hombre";
    return p.audience || "";
  }

  function puntuar(p, r) {
    if (!mismaCasa(casaDe(p), r.brand)) return null;
    const borrador = separarNombre(p.name);
    const resultado = separarNombre(nombreSinCasa(r));
    const concentracion = /\//.test(p.concentration || "") ? "" : separarNombre(p.concentration).codigo;
    const faltan = borrador.palabras.filter((a) => !resultado.palabras.some((b) => mismaPalabra(a, b))).length;
    const sobran = resultado.palabras.filter((b) => !borrador.palabras.some((a) => mismaPalabra(a, b))).length;
    let puntos = faltan ? 50 - 20 * faltan - 10 * sobran : 100 - 20 * sobran;
    if (concentracion && resultado.codigo) puntos += concentracion === resultado.codigo ? 10 : -40;
    /* Un body mist o una crema solo se completa sola con la ficha de ese mismo producto */
    if (["mist", "lotion"].includes(concentracion) && resultado.codigo !== concentracion) puntos -= 40;
    const quien = publicoDelBorrador(p);
    const deResultado = publicoDe(r.gender);
    if (quien && deResultado && quien !== "unisex" && deResultado !== "unisex" && quien !== deResultado) puntos -= 40;
    return puntos;
  }

  /* { elegido } si hay un resultado claramente correcto; si no, { opciones } para elegir a mano */
  function elegirResultado(p, resultados) {
    const vistos = new Set();
    const puntuados = resultados
      .filter((r) => r.perfume_url && !vistos.has(r.perfume_url) && vistos.add(r.perfume_url))
      .map((r) => ({ r, puntos: puntuar(p, r) }))
      .filter((x) => x.puntos !== null)
      .sort((a, b) => b.puntos - a.puntos);
    const [mejor, segundo] = puntuados;
    if (mejor && mejor.puntos >= 95 && (!segundo || mejor.puntos - segundo.puntos >= 10)) return { elegido: mejor.r };
    return { opciones: (puntuados.length ? puntuados.map((x) => x.r) : resultados).slice(0, 5) };
  }

  async function buscarParaLote(p) {
    const consulta = `${p.name} ${casaDe(p)}`.trim();
    for (let intento = 0; ; intento++) {
      try {
        const datos = await funcionFragrantica({ accion: "buscar", consulta, soloFragrantica: true });
        return Array.isArray(datos.resultados) ? datos.resultados : [];
      } catch (error) {
        /* Sin token, sin saldo o sin la función publicada no tiene caso seguir con el lote */
        if (/APIFY_TOKEN|saldo|token|Falta publicar|permiso|sesión/i.test(error.message)) { error.fatal = true; throw error; }
        if (intento >= 1) throw error;
        await esperar(10000);
      }
    }
  }

  /* La ficha tal como está guardada, en la forma que espera sensorial_admin_save_perfume */
  function fichaGuardada(id) {
    const p = state.data.perfumes.find((item) => item.id === id);
    const porPosicion = (a, b) => a.position - b.position;
    const deFase = (fase) => state.data.notes.filter((n) => n.perfume_id === id && n.phase === fase).sort(porPosicion).map((n) => n.note_name);
    const uso = state.data.usage.find((u) => u.perfume_id === id);
    const fuente = state.data.sources.find((s) => s.perfume_id === id && s.is_primary);
    return {
      id, brand_id: p.brand_id, brand_name: casaDe(p), family_id: p.family_id, name: p.name,
      concentration: p.concentration || "", edition: p.edition || "", origin: p.origin, description: p.description || "",
      release_year: p.release_year ?? null, audience: p.audience || "", primary_image: p.primary_image || "", collage_image: p.collage_image || "",
      best_seller_rank: p.best_seller_rank ?? null, new_arrival_rank: p.new_arrival_rank ?? null, is_published: Boolean(p.is_published),
      images: state.data.images.filter((i) => i.perfume_id === id).sort(porPosicion).map((i) => ({ image_url: i.image_url, alt_text: i.alt_text || "" })),
      notes: { salida: deFase("salida"), corazon: deFase("corazon"), fondo: deFase("fondo") },
      accords: state.data.accords.filter((a) => a.perfume_id === id).sort(porPosicion).map((a) => ({
        name: a.accord_name, intensity: a.intensity,
        color_rgb: state.data.accordNames.find((x) => x.name === a.accord_name)?.color_rgb || "150,150,150",
      })),
      usage: uso ? { winter: uso.winter, spring: uso.spring, summer: uso.summer, autumn: uso.autumn, day_score: uso.day_score, night_score: uso.night_score } : null,
      variants: state.data.variants.filter((v) => v.perfume_id === id).map((v) => ({
        size_ml: Number(v.size_ml), sku: v.sku || null, price_mxn: v.price_mxn ?? null, stock_quantity: v.stock_quantity ?? null, is_active: v.is_active !== false,
      })),
      primary_source: fuente ? { publisher: fuente.publisher, source_url: fuente.source_url || "", rights_basis: fuente.rights_basis,
        license_reference: fuente.license_reference || "", checked_at: fuente.checked_at || "" } : null,
    };
  }

  /* Guarda un borrador con lo que trajo la búsqueda (r) y la lectura de detalles (d) */
  async function guardarDesdeFragrantica(p, r, d) {
    const ficha = fichaGuardada(p.id);
    const fases = [["salida", "notes_top"], ["corazon", "notes_middle"], ["fondo", "notes_base"]];
    /* Notas: las de la búsqueda llegan en español; las de los detalles, en inglés y se traducen */
    const enEspanol = r.idioma && r.idioma !== "en";
    const conNotas = fases.some(([, k]) => r[k]?.length) ? r : d;
    if (conNotas) {
      for (const [fase, k] of fases) {
        const traducir = conNotas === d || !enEspanol;
        ficha.notes[fase] = [...new Set((conNotas[k] || []).map((n) => (traducir ? notaES(n) : nonempty(n))))].filter((n) => n.length >= 2);
      }
    }
    const totalNotas = ficha.notes.salida.length + ficha.notes.corazon.length + ficha.notes.fondo.length;
    if (!totalNotas) throw new Error("Fragrantica no tiene notas de este perfume");
    const colores = new Map((d?.accords || []).map((a) => [acordeES(a.name), a.color]));
    const acordes = (r.accords?.length ? r.accords : d?.accords || []).slice(0, 8).map((a, i) => acordeDeFragrantica(a, colores, d?.accords, i))
      .filter((a) => a.name.length >= 2 && Number.isFinite(a.intensity));
    if (acordes.length) ficha.accords = acordes;
    if (d?.usage) {
      ficha.usage = Object.fromEntries(Object.entries(USO_CAMPOS).map(([clave, campo]) => [campo, d.usage[clave]]));
    }
    const anio = Number(r.release_year);
    if (!ficha.release_year && Number.isInteger(anio) && anio >= 1900 && anio <= new Date().getFullYear() + 1) ficha.release_year = anio;
    if (!ficha.audience) ficha.audience = publicoDe(r.gender || d?.gender);
    /* La foto de Fragrantica reemplaza la provisional del catálogo; si no se puede copiar,
       se queda la que había */
    let fotoNueva = false;
    const foto = imageURL(r.image_url || d?.image_url);
    if (foto) {
      try {
        const copia = await funcionFragrantica({ accion: "foto", url: foto, perfumeId: p.id });
        if (imageURL(copia.url)) { ficha.primary_image = copia.url; fotoNueva = true; }
      } catch { /* sigue con la foto anterior */ }
    }
    const anterior = ficha.primary_source;
    ficha.primary_source = {
      publisher: "Fragrantica", source_url: r.perfume_url,
      rights_basis: anterior?.rights_basis || "manual", license_reference: anterior?.license_reference || "",
      checked_at: new Date().toISOString().slice(0, 10),
    };
    await request("rpc/sensorial_admin_save_perfume", { method: "POST", body: { p: ficha } });
    return [`${totalNotas} notas`, acordes.length && `${acordes.length} acordes`, d?.usage ? "cuándo usarlo" : "sin «cuándo usarlo»", fotoNueva && "foto"]
      .filter(Boolean).join(", ");
  }

  function anotar(p, tipo, detalle) {
    lote.bitacora.unshift({ id: p.id, tipo, detalle });
    lote.bitacora = lote.bitacora.slice(0, 300);
    pintarLote();
  }
  function avance(mensaje) {
    $("#lote-estado").textContent = mensaje;
    $("#lote-barra").style.width = `${lote.total ? Math.round((lote.hechos / lote.total) * 100) : 0}%`;
  }

  /* Ejecuta trabajo(elemento) con varios a la vez; si uno lanza un error, ya no empieza otros */
  async function enParalelo(elementos, cuantos, trabajo) {
    let siguiente = 0;
    let fallo = null;
    const obrero = async () => {
      while (!fallo && !lote.detener && siguiente < elementos.length) {
        const elemento = elementos[siguiente++];
        try { await trabajo(elemento); } catch (error) { fallo = fallo || error; }
      }
    };
    await Promise.all(Array.from({ length: Math.min(cuantos, elementos.length) }, obrero));
    if (fallo) throw fallo;
  }

  async function completarBorradores() {
    if (lote.corriendo) return;
    const cantidad = Number($("#lote-cantidad").value);
    const todos = pendientesLote();
    const lista = cantidad > 0 ? todos.slice(0, cantidad) : todos;
    if (!lista.length) { notify("No hay borradores sin notas por completar."); return; }
    const costo = (lista.length * COSTO_PERFUME_USD).toFixed(2);
    if (!window.confirm(`Se buscarán ${lista.length} perfumes en Fragrantica.\n\nCosto aproximado en Apify: US$${costo}.\nTarda unos 2 o 3 minutos por cada 10 perfumes; deja esta pestaña abierta hasta que termine.\n\n¿Continuar?`)) return;
    Object.assign(lote, { corriendo: true, detener: false, hechos: 0, total: lista.length });
    $("#lote-iniciar").disabled = true;
    $("#lote-detener").hidden = false;
    $("#lote-detener").disabled = false;
    $("#lote-progreso").hidden = false;
    let completados = 0;
    try {
      for (let i = 0; i < lista.length && !lote.detener; i += TANDA) {
        const tanda = lista.slice(i, i + TANDA);
        const elegidos = [];
        await enParalelo(tanda, BUSQUEDAS_A_LA_VEZ, async (p) => {
          avance(`Buscando en Fragrantica: ${casaDe(p)} ${p.name}…`);
          let resultados;
          try {
            resultados = await buscarParaLote(p);
          } catch (error) {
            if (error.fatal) throw error;
            /* Queda pendiente: se vuelve a buscar la próxima vez */
            lote.hechos++;
            anotar(p, "error", `No se pudo buscar (${error.message}); se intentará la próxima vez`);
            return;
          }
          const { elegido, opciones } = elegirResultado(p, resultados);
          if (elegido) {
            elegidos.push({ p, r: elegido });
            return;
          }
          lote.hechos++;
          if (opciones.length) {
            lote.revisar[p.id] = opciones;
            anotar(p, "revisar", `Hay ${opciones.length === 1 ? "1 opción parecida" : `${opciones.length} opciones`}: elige la correcta`);
          } else {
            lote.sinResultado.push(p.id);
            anotar(p, "nada", "No apareció en Fragrantica");
          }
          guardarLote();
        });
        if (!elegidos.length) continue;
        /* Aunque se pida detener, los ya encontrados de esta tanda se terminan de guardar.
           Si la lectura de "cuándo usarlo" falla, el lote se detiene sin guardar esta tanda
           (sus perfumes quedan pendientes) para no dejar fichas a medias. */
        avance(`Leyendo «cuándo usarlo» de ${elegidos.length} perfumes…`);
        let detalles;
        try {
          detalles = await leerDetalles(elegidos.map((e) => e.r.perfume_url),
            (segundos) => avance(`Leyendo «cuándo usarlo» de ${elegidos.length} perfumes… (${segundos} s)`));
        } catch (error) {
          throw new Error(`No se pudo leer «cuándo usarlo» en Fragrantica: ${error.message}`);
        }
        for (const { p, r } of elegidos) {
          avance(`Guardando ${casaDe(p)} ${p.name}…`);
          try {
            const resumen = await guardarDesdeFragrantica(p, r, detalles.get(idFragrantica(r.perfume_url)));
            anotar(p, "ok", resumen);
            completados++;
          } catch (error) {
            lote.revisar[p.id] = [r];
            guardarLote();
            anotar(p, "error", `No se guardó: ${error.message}`);
          }
          lote.hechos++;
        }
        await loadData();
      }
      avance(lote.detener ? `Detenido. ${completados} completados.` : `Terminado. ${completados} de ${lista.length} completados.`);
      notify(`${completados} borradores completados con Fragrantica. Revísalos antes de publicar.`);
    } catch (error) {
      avance(`Se detuvo: ${error.message}`);
      notify(error.message, true);
      await loadData().catch(() => {});
    } finally {
      lote.corriendo = false;
      $("#lote-iniciar").disabled = false;
      $("#lote-detener").hidden = true;
      pintarLote();
    }
  }

  function pintarLote() {
    if (!$("#lote")) return;
    const conNotas = idsConNotas();
    const existe = (id) => state.data.perfumes.some((p) => p.id === id && !conNotas.has(id));
    /* Lo que ya se completó por otro camino deja de estar pendiente */
    let cambio = false;
    for (const id of Object.keys(lote.revisar)) if (!existe(id)) { delete lote.revisar[id]; cambio = true; }
    const sinResultado = lote.sinResultado.filter(existe);
    if (sinResultado.length !== lote.sinResultado.length) { lote.sinResultado = sinResultado; cambio = true; }
    if (cambio) guardarLote();

    const pendientes = pendientesLote().length;
    const porElegir = Object.keys(lote.revisar).length;
    const partes = [`${pendientes} ${pendientes === 1 ? "borrador sin notas" : "borradores sin notas"}`];
    if (porElegir) partes.push(`${porElegir} por elegir`);
    if (lote.sinResultado.length) partes.push(`${lote.sinResultado.length} sin resultado`);
    $("#lote-resumen").innerHTML = escapeHTML(partes.join(" · "))
      + (pendientes ? escapeHTML(` · cerca de US$${(pendientes * COSTO_PERFUME_USD).toFixed(2)} para todos`) : "")
      + (lote.sinResultado.length && !lote.corriendo ? '<button type="button" id="lote-reintentar">Volver a buscar los que no aparecieron</button>' : "");
    if (!lote.corriendo) $("#lote-iniciar").disabled = !pendientes;

    const nombre = (id) => { const p = state.data.perfumes.find((x) => x.id === id); return p ? `${casaDe(p)} ${p.name}${p.concentration ? ` · ${p.concentration}` : ""}` : id; };
    const iconos = { ok: "✓", revisar: "?", nada: "×", error: "!" };
    const enBitacora = new Set(lote.bitacora.map((e) => e.id));
    const filas = [
      ...lote.bitacora.filter((e) => e.tipo === "ok" || existe(e.id)),
      ...Object.keys(lote.revisar).filter((id) => !enBitacora.has(id)).map((id) => ({ id, tipo: "revisar", detalle: "Hay varias opciones: elige la correcta" })),
      ...lote.sinResultado.filter((id) => !enBitacora.has(id)).map((id) => ({ id, tipo: "nada", detalle: "No apareció en Fragrantica" })),
    ];
    $("#lote-lista").innerHTML = filas.map((e) => {
      const boton = e.tipo === "ok" ? `<button type="button" data-edit="${escapeHTML(e.id)}">Ver</button>`
        : lote.revisar[e.id] ? `<button type="button" data-lote-elegir="${escapeHTML(e.id)}">Elegir</button>`
          : `<button type="button" data-edit="${escapeHTML(e.id)}">Abrir</button>`;
      return `<li class="lote__item lote__item--${e.tipo}"><span class="lote__icono" aria-hidden="true">${iconos[e.tipo]}</span><div><strong>${escapeHTML(nombre(e.id))}</strong><small>${escapeHTML(e.detalle)}</small></div>${boton}</li>`;
    }).join("");
  }

  /* Abre la ficha con las opciones que encontró el lote, listas para elegir con "Usar" */
  function elegirDelLote(id) {
    const opciones = lote.revisar[id];
    openEditor(id);
    if (!opciones?.length) return;
    const p = state.data.perfumes.find((x) => x.id === id);
    if (p) $("#importar-consulta").value = `${p.name} ${casaDe(p)}`.trim();
    resultadosFragrantica = opciones;
    $("#importar-estado").className = "importar__estado";
    $("#importar-estado").textContent = `${opciones.length === 1 ? "La opción" : `Las ${opciones.length} opciones`} que encontró el llenado automático. Elige la correcta o busca otra.`;
    pintarResultados();
  }

  async function savePerfume(event) {
    event.preventDefault();
    const button = $("#save-perfume");
    const label = button.textContent;
    button.disabled = true;
    button.textContent = "Guardando…";
    try {
      const payload = collectPerfume();
      await uploadSelectedImages(payload);
      await request("rpc/sensorial_admin_save_perfume", { method: "POST", body: { p: payload } });
      $("#editor-dialog").close();
      await loadData();
      showTab("perfumes");
      notify(payload.is_published ? "Perfume guardado y publicado." : "Borrador guardado.");
    } catch (error) {
      notify(error.message, true);
    } finally { button.disabled = false; button.textContent = label; }
  }

  async function archivePerfume() {
    const current = state.data.perfumes.find((p) => p.id === state.editorId);
    if (!current || !window.confirm(`¿Ocultar ${current.name} de la tienda? La ficha seguirá guardada como borrador.`)) return;
    try {
      await request(`perfumes?id=eq.${encodeURIComponent(current.id)}`, {
        method: "PATCH", body: { is_published: false, updated_at: new Date().toISOString() },
      });
      $("#editor-dialog").close();
      await loadData();
      notify("Perfume ocultado de la tienda.");
    } catch (error) { notify(error.message, true); }
  }

  /* ---------- Tablas de pagos (apartados en abonos) ----------
     El administrador sube las fotos, escribe el plan y registra cada abono. tabla-pagos.js
     calcula lo pendiente, tacha los pagos cubiertos y pinta la misma plantilla que ve el
     cliente en pagos.html#TOKEN. Las fotos se suben al guardar, a la carpeta pagos/ del bucket. */
  const TP = window.TablaPagos;
  const planFields = $("#plan-form").elements;
  const abonoFields = $("#abono-form").elements;
  const vistaPlan = { limpiar: null, hilos: null, espera: 0, parallax: null, apertura: null };
  let abonoPlanId = null;

  const hoy = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const fechaValida = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value || "");
  const monto = (value) => Math.round(Number(value) * 100) / 100;
  const nombrePerfume = (plan) => [plan.brand, plan.product_name].filter(Boolean).join(" ");
  /* /p/TOKEN: WhatsApp muestra el nombre del cliente y su perfume en la vista previa (api/tabla.js) */
  const enlacePlan = (plan) => new URL(`p/${plan.token}`, location.href).href;
  const whatsappPlan = (plan) => `https://wa.me/?text=${encodeURIComponent(
    `Hola ${plan.client_name}, aquí está tu tabla de pagos de ${nombrePerfume(plan)}: ${enlacePlan(plan)}`)}`;
  const conArticulo = (nombres) => {
    const lista = nombres.map((nombre) => `el ${nombre.toLowerCase()}`);
    return lista.length > 1 ? `${lista.slice(0, -1).join(", ")} y ${lista.at(-1)}` : lista[0];
  };

  function renderPlans() {
    const error = $("#plans-error");
    error.hidden = !state.plansError;
    error.textContent = state.plansError;
    const planes = state.data.plans.map((plan) => ({ plan, e: TP.calcular(plan) }));
    const abiertos = planes.filter(({ e }) => !e.liquidado);
    $("#nav-plan-count").textContent = abiertos.length;
    const porCobrar = abiertos.reduce((suma, { e }) => suma + e.pendiente, 0);
    $("#plans-total").hidden = !abiertos.length;
    $("#plans-total").innerHTML = abiertos.length
      ? `Por cobrar <strong>${TP.dinero(porCobrar)}</strong> en ${abiertos.length} ${abiertos.length === 1 ? "tabla en curso" : "tablas en curso"}.`
      : "";
    const query = nonempty($("#plan-search").value).toLocaleLowerCase("es");
    const filter = $("#plan-filter").value;
    const rows = planes.filter(({ plan, e }) => (filter === "all" || (filter === "paid") === e.liquidado)
      && (!query || `${plan.client_name} ${plan.brand} ${plan.product_name}`.toLocaleLowerCase("es").includes(query)));
    const dia = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short" });
    $("#plan-list").innerHTML = rows.map(({ plan, e }) => {
      const foto = TP.imagen(plan.image_url);
      const cuotas = e.pagos.map((p) => `<i class="${p.pagado ? "is-pagado" : p.parcial ? "is-parcial" : ""}"></i>`).join("");
      const fecha = plan.updated_at ? `Actualizada ${dia.format(new Date(plan.updated_at)).replace(/\./g, "")}` : "";
      return `<article class="plan-card" data-plan-id="${escapeHTML(plan.id)}">
        <div class="plan-card__foto">${foto ? `<img src="${escapeHTML(foto)}" alt="" loading="lazy">` : `<span>${escapeHTML((plan.product_name || "?").slice(0, 1))}</span>`}</div>
        <div class="plan-card__cuerpo">
          <div class="perfume-card__meta"><span class="pill ${e.liquidado ? "" : "pill--draft"}">${e.liquidado ? "Liquidada" : "En curso"}</span><span>${escapeHTML(fecha)}</span></div>
          <h2>${escapeHTML(plan.client_name)}</h2>
          <p>${escapeHTML(nombrePerfume(plan))}</p>
        </div>
        <div class="plan-card__saldo"><strong>${TP.dinero(e.pendiente)}</strong><span>pendiente de ${TP.dinero(e.total)}</span><span>${e.pagados} de ${e.pagos.length} pagos cubiertos</span></div>
        <div class="plan-card__cuotas" aria-hidden="true">${cuotas}</div>
        <div class="plan-card__acciones">
          ${e.liquidado ? "" : '<button type="button" class="accept" data-plan-action="abono">+ Registrar abono</button>'}
          <button type="button" data-plan-action="copiar">Copiar enlace</button>
          <a href="${escapeHTML(whatsappPlan(plan))}" target="_blank" rel="noopener">Enviar por WhatsApp</a>
          <button type="button" data-plan-action="descargar">Descargar imagen</button>
          <button type="button" data-plan-action="editar">Editar</button>
        </div>
      </article>`;
    }).join("");
    const empty = $("#plan-empty");
    empty.hidden = rows.length > 0 || Boolean(state.plansError);
    empty.innerHTML = state.data.plans.length
      ? "No hay tablas con ese filtro."
      : "<strong>Aún no hay tablas de pagos.</strong> Crea la primera con «+ Nueva tabla»: sube la foto del perfume, escribe el plan y comparte el enlace con tu cliente.";
  }

  async function copiarEnlace(plan) {
    const enlace = enlacePlan(plan);
    try {
      await navigator.clipboard.writeText(enlace);
      notify(`Enlace de ${plan.client_name} copiado. Pégalo en su chat.`);
    } catch {
      window.prompt("Copia el enlace de la tabla:", enlace);
    }
  }

  /* La tabla como imagen PNG (la misma que puede descargar el cliente), para mandarla como foto */
  async function descargarPlan(plan, button) {
    const label = button.textContent;
    button.disabled = true;
    button.textContent = "Preparando…";
    try {
      await TP.guardar(TP.archivo(plan));
    } catch (error) {
      notify(`No se pudo crear la imagen: ${error.message}`, true);
    } finally {
      button.disabled = false;
      button.textContent = label;
    }
  }

  /* ---------- Editor de la tabla ---------- */

  /* Lo que lleva el formulario, sin validar: alimenta la vista previa mientras se escribe */
  function datosPlan() {
    return {
      client_name: nonempty(planFields.client_name.value),
      brand: nonempty(planFields.brand.value),
      product_name: nonempty(planFields.product_name.value),
      watermark: nonempty(planFields.watermark.value),
      tone: planFields.tone.value || "rosa",
      installments: state.plan.cuotas.map((c) => ({ amount: monto(c.amount) || 0, ...(fechaValida(c.due) ? { due: c.due } : {}) })),
      payments: state.plan.abonos.map((a) => ({ amount: monto(a.amount), date: a.date, ...(nonempty(a.note) ? { note: nonempty(a.note) } : {}) })),
    };
  }

  function planParaGuardar() {
    const datos = datosPlan();
    if (!datos.client_name) throw new Error("Escribe el nombre del cliente.");
    if (!datos.product_name) throw new Error("Escribe el nombre del perfume.");
    if (!datos.installments.length) throw new Error("Agrega al menos un pago al plan.");
    datos.installments.forEach((c, i) => {
      if (!(c.amount > 0) || c.amount > 1000000) throw new Error(`Revisa el monto del ${TP.nombrePago(i).toLowerCase()}.`);
    });
    const e = TP.calcular(datos);
    if (e.excedente > 0) throw new Error(`Los abonos suman ${TP.dinero(e.abonado)}: más que el total de ${TP.dinero(e.total)}.`);
    return datos;
  }

  function mensajePlan(texto = "") { $("#plan-mensaje").textContent = texto; }
  function marcarCambio() { if (state.plan) state.plan.cambios = true; }

  function abrirPlan(id = null) {
    const plan = id ? state.data.plans.find((item) => item.id === id) : null;
    if (id && !plan) return notify("No encontramos esa tabla.", true);
    $("#plan-form").reset();
    state.plan = {
      id: plan?.id || null,
      cambios: false,
      aguaEditada: Boolean(plan),
      cuotas: (plan?.installments || []).map((c) => ({ amount: c.amount, due: c.due || "" })),
      abonos: (plan?.payments || []).map((a) => ({ amount: a.amount, date: a.date, note: a.note || "" })),
      fotos: {
        image: { url: plan?.image_url || "", blob: null, vista: "" },
        silueta: { url: plan?.watermark_image_url || "", blob: null, vista: "" },
      },
    };
    $("#plan-dialog-title").textContent = plan ? `Tabla de ${plan.client_name}` : "Nueva tabla";
    $("#plan-delete").hidden = !plan;
    $("#plan-copy").hidden = !plan;
    mensajePlan();
    if (plan) {
      for (const name of ["client_name", "brand", "product_name", "watermark"]) planFields[name].value = plan[name] || "";
      planFields.tone.value = plan.tone;
      planFields.total.value = TP.calcular(plan).total;
      planFields.count.value = plan.installments.length;
    }
    planFields.abono_date.value = hoy();
    pintarFotos();
    pintarCuotas();
    pintarAbonos();
    $("#plan-dialog").showModal();
    $(".plan-body").scrollTop = 0;
    $(".plan-vista__scroll").scrollTop = 0;
    vistaPlan.hilos = TP.fondo($("#plan-vista-marco canvas"));
    vistaPlan.hilos.empezar(0);
    vistaPlan.parallax = TP.parallax($("#plan-vista-marco"), { hilos: vistaPlan.hilos });
    pintarVista(true);
    if (!plan) planFields.client_name.focus();
  }

  function cerrarPlan() {
    if (state.plan?.cambios && !window.confirm("¿Salir sin guardar los cambios de esta tabla?")) return;
    $("#plan-dialog").close();
  }

  function pintarVista(entrada = false) {
    if (!state.plan) return;
    vistaPlan.limpiar?.();
    const datos = datosPlan();
    const { image, silueta } = state.plan.fotos;
    $("#plan-vista").innerHTML = TP.pintar(datos, {
      foto: image.vista || image.url,
      silueta: silueta.vista || silueta.url,
      vacio: "Aquí va la foto del perfume",
    });
    $("#plan-vista-marco").dataset.tono = datos.tone;
    vistaPlan.limpiar = TP.montar($("#plan-vista .tp"), { entrada, inicio: 200 });
  }
  /* "Ver la animación": la apertura completa dentro de la vista previa, con el logo que se
     arma y viaja a la cabecera, igual que la verá el cliente */
  function verAnimacion() {
    if (!state.plan) return;
    cancelarApertura();
    $(".plan-vista__scroll").scrollTop = 0;
    pintarVista(false);
    const telon = TP.telon($("#plan-vista-marco"));
    vistaPlan.apertura = { telon, intro: TP.intro(telon) };
    vistaPlan.apertura.intro.entregar(() => $("#plan-vista .tp-logo"), () => {
      vistaPlan.limpiar?.();
      vistaPlan.limpiar = TP.montar($("#plan-vista .tp"), { entrada: true, inicio: 450, recibe: true });
    }).then(() => { if (vistaPlan.apertura?.telon === telon) cancelarApertura(); });
  }
  function cancelarApertura() {
    if (!vistaPlan.apertura) return;
    vistaPlan.apertura.intro.cancelar();
    vistaPlan.apertura.telon.remove();
    vistaPlan.apertura = null;
  }

  function refrescarVista() {
    clearTimeout(vistaPlan.espera);
    vistaPlan.espera = setTimeout(() => pintarVista(false), 140);
  }

  function actualizarCifras() {
    const e = TP.calcular(datosPlan());
    $("#plan-total").textContent = TP.dinero(e.total);
    $("#plan-abonado").textContent = TP.dinero(e.abonado);
    $("#plan-pendiente").textContent = e.excedente > 0 ? `${TP.dinero(e.excedente)} de más` : TP.dinero(e.pendiente);
    $(".plan-cifras__pendiente").classList.toggle("is-error", e.excedente > 0);
    $$("[data-estado-cuota]").forEach((el) => {
      const pago = e.pagos[Number(el.dataset.estadoCuota)];
      el.textContent = pago?.pagado ? "Pagado" : pago?.parcial ? `Faltan ${TP.dinero(pago.falta)}` : "";
      el.classList.toggle("is-pagado", Boolean(pago?.pagado));
    });
  }

  function pintarCuotas() {
    $("#plan-cuotas").innerHTML = state.plan.cuotas.map((c, i) => {
      const nombre = TP.nombrePago(i);
      return `<li class="fila fila--cuota">
        <span class="fila__nombre">${nombre}</span>
        <label>Monto <input type="number" min="0.01" step="0.01" inputmode="decimal" value="${escapeHTML(c.amount)}" data-cuota="amount" data-i="${i}"></label>
        <label>Fecha límite <input type="date" value="${escapeHTML(c.due)}" data-cuota="due" data-i="${i}"></label>
        <span class="fila__estado" data-estado-cuota="${i}"></span>
        <button type="button" class="fila__quitar" data-quitar-cuota="${i}" aria-label="Quitar ${nombre.toLowerCase()}">×</button>
      </li>`;
    }).join("") || '<li class="filas__vacio">Escribe el total y cuántos pagos, y pulsa «Repartir en partes iguales». También puedes agregarlos uno por uno.</li>';
    actualizarCifras();
  }

  function pintarAbonos() {
    $("#plan-abonos").innerHTML = state.plan.abonos.map((a, i) => `<li class="fila fila--abono">
      <span class="fila__nombre">${escapeHTML(TP.fecha(a.date) || a.date)}</span>
      <strong>${TP.dinero(monto(a.amount))}</strong>
      <small>${escapeHTML(a.note || "")}</small>
      <button type="button" class="fila__quitar" data-quitar-abono="${i}" aria-label="Quitar el abono de ${TP.dinero(monto(a.amount))}">×</button>
    </li>`).join("");
    $("#plan-abonos-vacio").hidden = state.plan.abonos.length > 0;
    actualizarCifras();
  }

  function repartir() {
    const total = Math.round(Number(planFields.total.value) * 100);
    const cuantos = Number(planFields.count.value);
    if (!(total > 0)) { mensajePlan("Escribe el total del perfume para repartirlo."); planFields.total.focus(); return; }
    if (!Number.isInteger(cuantos) || cuantos < 1 || cuantos > 24) { mensajePlan("El número de pagos va de 1 a 24."); planFields.count.focus(); return; }
    /* Partes iguales en centavos; el último pago absorbe el redondeo */
    const base = Math.floor(total / cuantos);
    const fechas = state.plan.cuotas.map((c) => c.due);
    state.plan.cuotas = Array.from({ length: cuantos }, (_, i) => ({
      amount: (i === cuantos - 1 ? total - base * (cuantos - 1) : base) / 100, due: fechas[i] || "",
    }));
    mensajePlan();
    marcarCambio();
    pintarCuotas();
    refrescarVista();
  }

  function agregarAbono() {
    const cantidad = monto(planFields.abono_amount.value);
    const fecha = planFields.abono_date.value;
    const e = TP.calcular(datosPlan());
    if (!(e.total > 0)) { mensajePlan("Primero escribe el plan de pagos."); return; }
    if (!(cantidad > 0)) { mensajePlan("Escribe el monto del abono."); planFields.abono_amount.focus(); return; }
    if (!fechaValida(fecha)) { mensajePlan("Elige la fecha del abono."); planFields.abono_date.focus(); return; }
    if (cantidad > e.pendiente) { mensajePlan(`El abono supera lo pendiente (${TP.dinero(e.pendiente)}).`); planFields.abono_amount.focus(); return; }
    state.plan.abonos.push({ amount: cantidad, date: fecha, note: nonempty(planFields.abono_note.value) });
    planFields.abono_amount.value = "";
    planFields.abono_note.value = "";
    mensajePlan();
    marcarCambio();
    pintarAbonos();
    pintarVista(false);
  }

  /* La plantilla acomoda cualquier foto: la reduce a 1600 px como máximo, recorta los bordes
     transparentes para que el frasco llene su lugar y la guarda en WebP (PNG si el navegador
     no sabe hacer WebP), siempre por debajo de los 5 MB del bucket. */
  const aBlob = (lienzo, tipo, calidad) => new Promise((resolve, reject) => {
    lienzo.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("No se pudo preparar la foto."))), tipo, calidad);
  });
  async function prepararFoto(file, lado = 1600) {
    if (!/^image\/(png|webp|avif|jpeg)$/.test(file.type)) throw new Error("Sube la foto en PNG, WebP, AVIF o JPG.");
    if (file.size > 15 * 1024 * 1024) throw new Error("La foto pesa más de 15 MB.");
    const bitmap = await createImageBitmap(file).catch(() => { throw new Error("No se pudo leer la foto."); });
    const escala = Math.min(1, lado / Math.max(bitmap.width, bitmap.height));
    const ancho = Math.max(1, Math.round(bitmap.width * escala));
    const alto = Math.max(1, Math.round(bitmap.height * escala));
    let lienzo = document.createElement("canvas");
    lienzo.width = ancho;
    lienzo.height = alto;
    const ctx = lienzo.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(bitmap, 0, 0, ancho, alto);
    bitmap.close();
    const { data } = ctx.getImageData(0, 0, ancho, alto);
    let x0 = ancho;
    let y0 = alto;
    let x1 = -1;
    let y1 = -1;
    for (let y = 0; y < alto; y += 1) {
      for (let x = 0; x < ancho; x += 1) {
        if (data[(y * ancho + x) * 4 + 3] > 10) {
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
      }
    }
    if (x1 < 0) throw new Error("La foto está vacía: todo es transparente.");
    if (x0 > 0 || y0 > 0 || x1 < ancho - 1 || y1 < alto - 1) {
      const recorte = document.createElement("canvas");
      recorte.width = x1 - x0 + 1;
      recorte.height = y1 - y0 + 1;
      recorte.getContext("2d").drawImage(lienzo, x0, y0, recorte.width, recorte.height, 0, 0, recorte.width, recorte.height);
      lienzo = recorte;
    }
    let blob = await aBlob(lienzo, "image/webp", 0.9);
    if (blob.type !== "image/webp") blob = await aBlob(lienzo, "image/png");
    if (blob.size > 5 * 1024 * 1024) {
      if (lado <= 800) throw new Error("La foto sigue pesando más de 5 MB. Prueba con una más ligera.");
      return prepararFoto(file, Math.round(lado * 0.75));
    }
    return blob;
  }

  function pintarFotos() {
    for (const tipo of ["image", "silueta"]) {
      const foto = state.plan.fotos[tipo];
      const src = foto.vista || TP.imagen(foto.url);
      $(`#foto-${tipo}`).innerHTML = src ? `<img src="${escapeHTML(src)}" alt="">` : `<span>${tipo === "image" ? "Sin foto" : "Sin silueta"}</span>`;
      $(`[data-foto-quitar="${tipo}"]`).hidden = !src;
      $(`[name=upload_${tipo}]`).previousElementSibling.textContent = src
        ? (tipo === "image" ? "Cambiar foto" : "Cambiar silueta")
        : (tipo === "image" ? "Subir foto" : "Subir silueta");
    }
  }

  async function elegirFoto(tipo, input) {
    const file = input.files[0];
    if (!file || !state.plan) return;
    const caja = $(`#foto-${tipo}`);
    caja.classList.add("is-cargando");
    try {
      const blob = await prepararFoto(file);
      const foto = state.plan.fotos[tipo];
      if (foto.vista) URL.revokeObjectURL(foto.vista);
      foto.blob = blob;
      foto.vista = URL.createObjectURL(blob);
      mensajePlan();
      marcarCambio();
      pintarFotos();
      pintarVista(false);
    } catch (error) {
      mensajePlan(error.message);
    } finally {
      input.value = "";
      caja.classList.remove("is-cargando");
    }
  }

  function quitarFoto(tipo) {
    const foto = state.plan.fotos[tipo];
    if (foto.vista) URL.revokeObjectURL(foto.vista);
    Object.assign(foto, { url: "", blob: null, vista: "" });
    marcarCambio();
    pintarFotos();
    pintarVista(false);
  }

  async function guardarPlan(event) {
    event.preventDefault();
    const button = $("#plan-save");
    const label = button.textContent;
    button.disabled = true;
    button.textContent = "Guardando…";
    mensajePlan();
    try {
      const datos = planParaGuardar();
      /* Si después falla el guardado, la foto ya subida se conserva y no se vuelve a subir */
      for (const tipo of ["image", "silueta"]) {
        const foto = state.plan.fotos[tipo];
        if (!foto.blob) continue;
        foto.url = await uploadToBucket(foto.blob, `pagos/${tipo === "image" ? "perfume" : "silueta"}-${crypto.randomUUID()}.${imageExtensions[foto.blob.type] || "png"}`);
        foto.blob = null;
      }
      const id = state.plan.id;
      const saved = await request(id ? `payment_plans?id=eq.${encodeURIComponent(id)}&select=*` : "payment_plans?select=*", {
        method: id ? "PATCH" : "POST",
        body: { ...datos, image_url: state.plan.fotos.image.url || null, watermark_image_url: state.plan.fotos.silueta.url || null },
        prefer: "return=representation",
      });
      if (!Array.isArray(saved) || saved.length !== 1) throw new Error("No se guardó la tabla.");
      const index = state.data.plans.findIndex((plan) => plan.id === saved[0].id);
      if (index >= 0) state.data.plans[index] = saved[0];
      else state.data.plans.unshift(saved[0]);
      state.plan.cambios = false;
      $("#plan-dialog").close();
      renderPlans();
      notify(id ? "Tabla guardada." : "Tabla creada. Ya puedes copiar su enlace o enviarla por WhatsApp.");
    } catch (error) {
      mensajePlan(error.message);
    } finally {
      button.disabled = false;
      button.textContent = label;
    }
  }

  async function eliminarPlan() {
    const plan = state.data.plans.find((item) => item.id === state.plan?.id);
    if (!plan || !window.confirm(`¿Eliminar la tabla de ${plan.client_name}? Su enlace dejará de funcionar.`)) return;
    try {
      const deleted = await request(`payment_plans?id=eq.${encodeURIComponent(plan.id)}&select=id`, { method: "DELETE", prefer: "return=representation" });
      if (!Array.isArray(deleted) || deleted.length !== 1) throw new Error("No se eliminó la tabla.");
      state.data.plans = state.data.plans.filter((item) => item.id !== plan.id);
      state.plan.cambios = false;
      $("#plan-dialog").close();
      renderPlans();
      notify("Tabla eliminada.");
    } catch (error) {
      mensajePlan(error.message);
    }
  }

  /* ---------- Registrar un abono desde la lista ---------- */

  function abrirAbono(id) {
    const plan = state.data.plans.find((item) => item.id === id);
    if (!plan) return;
    abonoPlanId = id;
    const e = TP.calcular(plan);
    $("#abono-form").reset();
    $("#abono-title").textContent = plan.client_name;
    $("#abono-perfume").textContent = nombrePerfume(plan);
    $("#abono-pendiente").textContent = TP.dinero(e.pendiente);
    $("#abono-mensaje").textContent = "";
    const atajos = [];
    if (e.siguiente) atajos.push([e.siguiente.parcial ? `Resto del ${e.siguiente.nombre.toLowerCase()}` : e.siguiente.nombre, e.siguiente.falta]);
    if (e.pendiente > 0 && e.pendiente !== e.siguiente?.falta) atajos.push(["Liquidar todo", e.pendiente]);
    $("#abono-atajos").innerHTML = atajos.map(([etiqueta, valor]) =>
      `<button type="button" data-abono-monto="${valor}">${escapeHTML(etiqueta)}: ${TP.dinero(valor)}</button>`).join("");
    abonoFields.amount.value = e.siguiente ? e.siguiente.falta : "";
    abonoFields.date.value = hoy();
    efectoAbono();
    $("#abono-dialog").showModal();
    abonoFields.amount.select();
  }

  /* Antes de guardar, dice qué va a pasar: cuánto queda y qué pagos se tachan */
  function efectoAbono() {
    const plan = state.data.plans.find((item) => item.id === abonoPlanId);
    const efecto = $("#abono-efecto");
    const cantidad = monto(abonoFields.amount.value);
    efecto.classList.remove("is-error");
    $("#abono-save").disabled = false;
    if (!plan || !(cantidad > 0)) { efecto.textContent = ""; return; }
    const antes = TP.calcular(plan);
    const despues = TP.calcular({ ...plan, payments: [...plan.payments, { amount: cantidad, date: hoy() }] });
    if (despues.excedente > 0) {
      efecto.textContent = `Son ${TP.dinero(despues.excedente)} más de lo pendiente.`;
      efecto.classList.add("is-error");
      $("#abono-save").disabled = true;
      return;
    }
    const tachados = despues.pagos.filter((p, i) => p.pagado && !antes.pagos[i].pagado).map((p) => p.nombre);
    const partes = [despues.liquidado ? "Con este abono queda liquidado." : `Quedarán ${TP.dinero(despues.pendiente)} pendientes.`];
    if (tachados.length) partes.push(`Se ${tachados.length === 1 ? "tacha" : "tachan"} ${conArticulo(tachados)}.`);
    if (!despues.liquidado && despues.siguiente?.parcial) partes.push(`Del ${despues.siguiente.nombre.toLowerCase()} faltarán ${TP.dinero(despues.siguiente.falta)}.`);
    efecto.textContent = partes.join(" ");
  }

  async function guardarAbono(event) {
    event.preventDefault();
    const plan = state.data.plans.find((item) => item.id === abonoPlanId);
    if (!plan) return;
    const cantidad = monto(abonoFields.amount.value);
    const fecha = abonoFields.date.value;
    const nota = nonempty(abonoFields.note.value);
    const message = $("#abono-mensaje");
    if (!(cantidad > 0)) { message.textContent = "Escribe el monto del abono."; abonoFields.amount.focus(); return; }
    if (!fechaValida(fecha)) { message.textContent = "Elige la fecha del abono."; abonoFields.date.focus(); return; }
    const button = $("#abono-save");
    button.disabled = true;
    message.textContent = "";
    try {
      const payments = [...plan.payments, { amount: cantidad, date: fecha, ...(nota ? { note: nota } : {}) }];
      if (TP.calcular({ ...plan, payments }).excedente > 0) throw new Error("El abono supera lo pendiente.");
      const saved = await request(`payment_plans?id=eq.${encodeURIComponent(plan.id)}&select=*`, {
        method: "PATCH", body: { payments }, prefer: "return=representation",
      });
      if (!Array.isArray(saved) || saved.length !== 1) throw new Error("No se guardó el abono.");
      Object.assign(plan, saved[0]);
      $("#abono-dialog").close();
      renderPlans();
      const e = TP.calcular(plan);
      notify(e.liquidado ? `Abono guardado. ${plan.client_name} liquidó su perfume.` : `Abono guardado. Pendiente: ${TP.dinero(e.pendiente)}.`);
    } catch (error) {
      message.textContent = error.message;
    } finally {
      button.disabled = false;
    }
  }

  $("#plan-search").addEventListener("input", renderPlans);
  $("#plan-filter").addEventListener("change", renderPlans);
  $("#plan-list").addEventListener("click", (event) => {
    const button = event.target.closest("[data-plan-action]");
    if (!button) return;
    const plan = state.data.plans.find((item) => item.id === button.closest("[data-plan-id]").dataset.planId);
    if (!plan) return;
    if (button.dataset.planAction === "abono") abrirAbono(plan.id);
    if (button.dataset.planAction === "editar") abrirPlan(plan.id);
    if (button.dataset.planAction === "copiar") copiarEnlace(plan);
    if (button.dataset.planAction === "descargar") descargarPlan(plan, button);
  });
  $("#plan-form").addEventListener("submit", guardarPlan);
  $("#plan-form").addEventListener("input", (event) => {
    if (!state.plan || event.target.type === "file") return;
    if (["abono_amount", "abono_date", "abono_note", "total", "count"].includes(event.target.name)) return;
    marcarCambio();
    if (event.target.name === "watermark") state.plan.aguaEditada = true;
    if (event.target.name === "brand" && !state.plan.aguaEditada) planFields.watermark.value = TP.marcaDeAgua(event.target.value);
    const campo = event.target.closest("[data-cuota]");
    if (campo) {
      state.plan.cuotas[Number(campo.dataset.i)][campo.dataset.cuota] = campo.value;
      actualizarCifras();
    }
    refrescarVista();
  });
  $("#plan-form").addEventListener("change", (event) => {
    if (event.target.name === "upload_image") elegirFoto("image", event.target);
    if (event.target.name === "upload_silueta") elegirFoto("silueta", event.target);
  });
  /* Enter en el plan o en un abono hace su acción, no guarda toda la tabla */
  $("#plan-form").addEventListener("keydown", (event) => {
    if (event.key !== "Enter" || event.target.tagName !== "INPUT") return;
    if (["total", "count"].includes(event.target.name)) { event.preventDefault(); repartir(); }
    if (["abono_amount", "abono_date", "abono_note"].includes(event.target.name)) { event.preventDefault(); agregarAbono(); }
  });
  $("#plan-cuotas").addEventListener("click", (event) => {
    const button = event.target.closest("[data-quitar-cuota]");
    if (!button) return;
    state.plan.cuotas.splice(Number(button.dataset.quitarCuota), 1);
    marcarCambio();
    pintarCuotas();
    refrescarVista();
  });
  $("#plan-abonos").addEventListener("click", (event) => {
    const button = event.target.closest("[data-quitar-abono]");
    if (!button) return;
    state.plan.abonos.splice(Number(button.dataset.quitarAbono), 1);
    marcarCambio();
    pintarAbonos();
    refrescarVista();
  });
  $("#plan-add-cuota").addEventListener("click", () => {
    if (state.plan.cuotas.length >= 24) { mensajePlan("El plan admite hasta 24 pagos."); return; }
    state.plan.cuotas.push({ amount: state.plan.cuotas.at(-1)?.amount || "", due: "" });
    marcarCambio();
    pintarCuotas();
    refrescarVista();
    $$("#plan-cuotas [data-cuota=amount]").at(-1)?.focus();
  });
  $("#plan-repartir").addEventListener("click", repartir);
  $("#plan-add-abono").addEventListener("click", agregarAbono);
  $$("[data-foto-quitar]").forEach((button) => button.addEventListener("click", () => quitarFoto(button.dataset.fotoQuitar)));
  $("#plan-replay").addEventListener("click", verAnimacion);
  $("#plan-delete").addEventListener("click", eliminarPlan);
  $("#plan-copy").addEventListener("click", () => {
    const plan = state.data.plans.find((item) => item.id === state.plan?.id);
    if (plan) copiarEnlace(plan).then(() => mensajePlan("Enlace copiado."));
  });
  $$("[data-plan-close]").forEach((button) => button.addEventListener("click", cerrarPlan));
  $("#plan-dialog").addEventListener("cancel", (event) => { event.preventDefault(); cerrarPlan(); });
  $("#plan-dialog").addEventListener("close", () => {
    cancelarApertura();
    vistaPlan.limpiar?.();
    vistaPlan.hilos?.detener();
    vistaPlan.parallax?.();
    clearTimeout(vistaPlan.espera);
    Object.assign(vistaPlan, { limpiar: null, hilos: null, parallax: null });
    Object.values(state.plan?.fotos || {}).forEach((foto) => { if (foto.vista) URL.revokeObjectURL(foto.vista); });
    $("#plan-vista").innerHTML = "";
    state.plan = null;
  });
  $("#abono-form").addEventListener("submit", guardarAbono);
  $("#abono-form").addEventListener("input", efectoAbono);
  $("#abono-atajos").addEventListener("click", (event) => {
    const button = event.target.closest("[data-abono-monto]");
    if (!button) return;
    abonoFields.amount.value = button.dataset.abonoMonto;
    efectoAbono();
  });
  $$("[data-abono-close]").forEach((button) => button.addEventListener("click", () => $("#abono-dialog").close()));

  async function signOut() {
    const token = state.session?.access_token;
    saveSession(null);
    if (token) {
      fetch(new URL("/auth/v1/logout", apiBase), { method: "POST",
        headers: { apikey: config.publishableKey, Authorization: `Bearer ${token}` } }).catch(() => {});
    }
    $("#dashboard").hidden = true;
    $("#login-view").hidden = false;
    $("#login-form").reset();
    prefillLogin();
  }

  /* Si el correo quedó recordado, el formulario aparece listo: correo escrito y la casilla
     marcada; solo falta la contraseña */
  function prefillLogin() {
    let saved = "";
    try { saved = localStorage.getItem(emailKey) || ""; } catch { /* sin almacenamiento */ }
    if (!saved) return;
    $("#login-form [name=email]").value = saved;
    $("#login-form [name=remember]").checked = true;
  }

  $("#login-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = $("#login-form button");
    const message = $("#login-message");
    button.disabled = true;
    message.textContent = "";
    try {
      remember = $("#login-form [name=remember]").checked;
      const email = nonempty($("#login-form [name=email]").value);
      await tokenRequest("password", { email, password: $("#login-form [name=password]").value });
      rememberEmail(email);
      await authorize();
      $("#login-form [name=password]").value = "";
    } catch (error) {
      saveSession(null);
      message.textContent = error.message;
    } finally { button.disabled = false; }
  });
  $("#signout").addEventListener("click", signOut);
  $("#perfume-search").addEventListener("input", renderPerfumes);
  $("#perfume-filter").addEventListener("change", renderPerfumes);
  $("#brand-choice").addEventListener("change", () => {
    const isNew = fields.brand_choice.value === "__new";
    $("#new-brand-wrap").hidden = !isNew;
    fields.new_brand.required = isNew;
  });
  fields.name.addEventListener("input", () => {
    if (!state.editorId && !state.idEdited) fields.id.value = slug(fields.name.value);
  });
  fields.id.addEventListener("input", () => { state.idEdited = true; });
  fields.primary_image.addEventListener("input", updateImagePreview);
  fields.upload_primary.addEventListener("change", updateImagePreview);
  $("#perfume-form").addEventListener("submit", savePerfume);
  $("#importar-buscar").addEventListener("click", buscarFragrantica);
  $("#lote-iniciar").addEventListener("click", completarBorradores);
  $("#lote-detener").addEventListener("click", () => {
    lote.detener = true;
    $("#lote-detener").disabled = true;
    avance("Deteniendo: se terminan de guardar los que ya se encontraron…");
  });
  /* Cerrar o recargar la página a medio lote corta el trabajo: se pide confirmación */
  window.addEventListener("beforeunload", (event) => {
    if (lote.corriendo) { event.preventDefault(); event.returnValue = ""; }
  });

  /* Pegar lo que copió el marcador "Sensorial · Fragrantica" (ver herramientas/marcador.html).
     Primero se intenta leer el portapapeles; si el navegador no deja, aparece un cuadro para pegar. */
  function datosDelMarcador(textoPegado) {
    let datos;
    try { datos = JSON.parse(nonempty(textoPegado)); } catch { return null; }
    return datos && datos.formato === "sensorial-fragrantica" ? datos : null;
  }
  async function usarDatosPegados(textoPegado) {
    const estado = $("#importar-estado");
    const datos = datosDelMarcador(textoPegado);
    if (!datos) {
      estado.className = "importar__estado error";
      estado.textContent = "Eso no es lo que copia el marcador de Sensorial. En Fragrantica, usa el marcador y pulsa «Copiar para Sensorial».";
      return false;
    }
    $("#importar-pegado").hidden = true;
    $("#importar-texto").value = "";
    $("#importar-resultados").innerHTML = "";
    await aplicarFragrantica({ ...datos, idioma: datos.idioma || "es" });
    return true;
  }
  $("#importar-pegar").addEventListener("click", async () => {
    let textoPegado = "";
    try { textoPegado = await navigator.clipboard.readText(); } catch { /* sin permiso: se pega a mano */ }
    if (textoPegado && datosDelMarcador(textoPegado)) { await usarDatosPegados(textoPegado); return; }
    $("#importar-pegado").hidden = false;
    $("#importar-texto").focus();
  });
  $("#importar-usar-texto").addEventListener("click", () => usarDatosPegados($("#importar-texto").value));
  /* Enter en el buscador busca en Fragrantica en vez de guardar la ficha */
  $("#importar-consulta").addEventListener("keydown", (event) => {
    if (event.key === "Enter") { event.preventDefault(); buscarFragrantica(); }
  });
  $("#importar-resultados").addEventListener("click", (event) => {
    const boton = event.target.closest("[data-importar]");
    if (boton) usarFragrantica(Number(boton.dataset.importar));
  });
  $("#archive-perfume").addEventListener("click", archivePerfume);
  $("#close-editor").addEventListener("click", () => $("#editor-dialog").close());
  $("#cancel-editor").addEventListener("click", () => $("#editor-dialog").close());
  $("#editor-dialog").addEventListener("click", (event) => {
    if (event.target === $("#editor-dialog")) $("#editor-dialog").close();
  });
  $("#editor-dialog").addEventListener("close", () => {
    if (previewObjectURL) URL.revokeObjectURL(previewObjectURL);
    previewObjectURL = "";
  });
  document.addEventListener("click", (event) => {
    const nav = event.target.closest("[data-tab], [data-go]");
    if (nav) showTab(nav.dataset.tab || nav.dataset.go);
    const add = event.target.closest("[data-new-perfume]");
    if (add) openEditor();
    if (event.target.closest("[data-new-plan]")) abrirPlan();
    const edit = event.target.closest("[data-edit]");
    if (edit) openEditor(edit.dataset.edit);
    const elegir = event.target.closest("[data-lote-elegir]");
    if (elegir) elegirDelLote(elegir.dataset.loteElegir);
    if (event.target.closest("#lote-reintentar")) {
      lote.sinResultado = [];
      guardarLote();
      pintarLote();
    }
    const reviewFilter = event.target.closest("[data-review-filter]");
    if (reviewFilter) { state.reviewFilter = reviewFilter.dataset.reviewFilter; renderReviews(); }
    const action = event.target.closest("[data-review-action]");
    if (action) updateReview(action.closest("[data-review-id]").dataset.reviewId, action.dataset.reviewAction, action);
  });

  (async () => {
    if (!apiBase || apiBase.protocol !== "https:" || !config.publishableKey) {
      $("#login-message").textContent = "Falta la configuración pública de Supabase.";
      $("#login-form button").disabled = true;
      return;
    }
    prefillLogin();
    try {
      let stored = null;
      try {
        stored = JSON.parse(localStorage.getItem(storeKey) || "null");
        remember = Boolean(stored);
        if (!stored) stored = JSON.parse(sessionStorage.getItem(storeKey) || "null");
      } catch { stored = null; }
      if (stored?.refresh_token) {
        saveSession(stored);
        await refreshSession();
        await authorize();
      }
    } catch {
      saveSession(null);
    }
  })();
})();
