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
    data: { brands: [], families: [], perfumes: [], images: [], notes: [], accords: [], accordNames: [], usage: [], variants: [], sources: [], reviews: [] },
  };
  const fields = $("#perfume-form").elements;
  const storeKey = "sensorial-admin-session";
  const emailKey = "sensorial-admin-email";
  /* "Recordarme en este dispositivo": la sesión va a localStorage (sigue abierta al cerrar el
     navegador) y el correo queda escrito para la próxima vez. Sin marcar, la sesión vive en
     sessionStorage y termina al cerrar la pestaña. */
  let remember = false;
  let noticeTimer;
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
    const readAll = async (path) => {
      const collected = [];
      for (let offset = 0; ; offset += 1000) {
        const page = await request(`${path}&limit=1000&offset=${offset}`);
        if (!Array.isArray(page)) throw new Error("Supabase no devolvió una lista válida.");
        collected.push(...page);
        if (page.length < 1000) return collected;
      }
    };
    const rows = await Promise.all(Object.values(queries).map(readAll));
    Object.keys(queries).forEach((key, index) => { state.data[key] = rows[index] || []; });
    renderAll();
  }

  function showTab(name) {
    state.tab = name;
    $$(".admin-nav [data-tab]").forEach((button) => button.classList.toggle("active", button.dataset.tab === name));
    $$(".view").forEach((view) => { view.hidden = view.id !== `view-${name}`; });
    if (name === "perfumes") renderPerfumes();
    if (name === "reviews") renderReviews();
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

  async function uploadImage(file, perfumeId, kind, retry = true) {
    const extensions = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" };
    if (!extensions[file.type]) throw new Error("Las fotos deben ser JPG, PNG, WebP o AVIF.");
    if (file.size > 5 * 1024 * 1024) throw new Error(`La foto ${file.name} supera los 5 MB.`);
    if (state.session.expires_at < Date.now() + 60000) await refreshSession();
    const path = `perfumes/${perfumeId}/${kind}-${crypto.randomUUID()}.${extensions[file.type]}`;
    const response = await fetch(new URL(`/storage/v1/object/sensorial-perfumes/${path}`, apiBase), {
      method: "POST",
      headers: { apikey: config.publishableKey, Authorization: `Bearer ${state.session.access_token}`,
        "Content-Type": file.type, "x-upsert": "false" },
      body: file,
    });
    if (response.status === 401 && retry) {
      await refreshSession();
      return uploadImage(file, perfumeId, kind, false);
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
  const PUBLICO = { men: "hombre", women: "mujer", unisex: "unisex", "men and women": "unisex", "women and men": "unisex" };
  let resultadosFragrantica = [];

  async function buscarFragrantica() {
    const consulta = nonempty($("#importar-consulta").value);
    const estado = $("#importar-estado");
    const lista = $("#importar-resultados");
    if (consulta.length < 2) { estado.textContent = "Escribe al menos dos letras."; return; }
    const boton = $("#importar-buscar");
    boton.disabled = true;
    estado.className = "importar__estado";
    estado.textContent = "Buscando…";
    lista.innerHTML = "";
    /* El servicio duerme cuando nadie lo usa y tarda en despertar la primera vez */
    const aviso = setTimeout(() => { estado.textContent = "Despertando el servicio de PerfumAPI; la primera búsqueda puede tardar hasta un minuto…"; }, 4000);
    const control = new AbortController();
    const limite = setTimeout(() => control.abort(), 90000);
    try {
      const datos = await funcionFragrantica({ accion: "buscar", consulta }, control.signal);
      resultadosFragrantica = Array.isArray(datos.resultados) ? datos.resultados.slice(0, 8) : [];
      if (!resultadosFragrantica.length) {
        estado.textContent = "PerfumAPI todavía no tiene ese perfume. Prueba con otro nombre o llena la ficha a mano.";
        return;
      }
      estado.textContent = resultadosFragrantica.length === 1 ? "1 resultado." : `${resultadosFragrantica.length} resultados.`;
      lista.innerHTML = resultadosFragrantica.map((r, i) => {
        const foto = imageURL(r.image_url);
        const notas = [r.notes_top, r.notes_middle, r.notes_base].reduce((n, fase) => n + (Array.isArray(fase) ? fase.length : 0), 0);
        return `<div class="importar__resultado">${foto ? `<img src="${escapeHTML(foto)}" alt="" loading="lazy">` : "<span></span>"}<div><strong>${escapeHTML(nombreSinCasa(r))}</strong><small>${escapeHTML(r.brand || "")}${r.gender ? ` · ${escapeHTML(r.gender)}` : ""} · ${notas} notas</small></div><button class="button button--primary" type="button" data-importar="${i}">Usar</button></div>`;
      }).join("");
    } catch (error) {
      estado.classList.add("error");
      estado.textContent = error.name === "AbortError" ? "PerfumAPI no respondió a tiempo. Inténtalo de nuevo en un momento." : `No se pudo buscar: ${error.message}`;
    } finally {
      clearTimeout(aviso);
      clearTimeout(limite);
      boton.disabled = false;
    }
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
    const nombre = nombreSinCasa(r);
    const fases = { salida: r.notes_top, corazon: r.notes_middle, fondo: r.notes_base };
    const yaTieneDatos = ["name", "notes_salida", "notes_corazon", "notes_fondo", "release_year", "primary_image"].some((campo) => nonempty(fields[campo].value));
    const reemplazar = !yaTieneDatos || window.confirm("Esta ficha ya tiene datos. ¿Reemplazarlos con los de Fragrantica?\n\nAceptar: reemplaza todo. Cancelar: solo llena lo que está vacío.");
    const poner = (campo, valor) => {
      if (valor === undefined || valor === null || valor === "") return false;
      if (!reemplazar && nonempty(fields[campo].value)) return false;
      fields[campo].value = valor;
      return true;
    };
    const llenados = [];
    const enIngles = new Set();

    if (poner("name", nombre)) {
      llenados.push("nombre");
      if (!state.editorId && !state.idEdited) fields.id.value = slug(nombre);
    }
    /* La casa: si ya existe se elige; si no, queda lista como casa nueva */
    if (r.brand && (reemplazar || !fields.brand_choice.value)) {
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
    const publico = PUBLICO[nonempty(r.gender).toLowerCase()];
    if (publico && poner("audience", publico)) llenados.push("público");

    let notasPuestas = 0;
    for (const [fase, lista] of Object.entries(fases)) {
      if (!Array.isArray(lista) || !lista.length) continue;
      const unicas = [...new Set(lista.map(notaES))];
      lista.filter(sinTraducir).forEach((nota) => enIngles.add(nota));
      if (poner(`notes_${fase}`, unicas.join(", "))) notasPuestas += unicas.length;
    }
    if (notasPuestas) llenados.push(`${notasPuestas} notas`);

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

    const fuente = /^https:\/\/www\.fragrantica\./i.test(nonempty(r.perfume_url)) ? r.perfume_url : "";
    if (fuente && (reemplazar || !nonempty(fields.source_url.value))) {
      fields.source_publisher.value = "Fragrantica (vía PerfumAPI)";
      fields.source_url.value = fuente;
      fields.source_checked_at.value = new Date().toISOString().slice(0, 10);
      llenados.push("fuente");
    }

    const estado = $("#importar-estado");
    estado.className = "importar__estado ok";
    estado.textContent = `Listo: ${llenados.length ? llenados.join(", ") : "no había nada vacío que llenar"}. PerfumAPI no incluye acordes ni «cuándo usarlo»: complétalos a mano.`
      + (enIngles.size ? ` Quedaron en inglés: ${[...enIngles].join(", ")}.` : "")
      + avisoFoto
      + " Revisa todo antes de guardar.";
    $("#importar-resultados").innerHTML = "";
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
    const edit = event.target.closest("[data-edit]");
    if (edit) openEditor(edit.dataset.edit);
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
