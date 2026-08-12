(function () {
  "use strict";

  const cfg = window.MYTT || {};
  const webAppUrl = String(cfg.marketplaceWebAppUrl || "").trim();

  const els = {
    grid: document.getElementById("myttMarketGrid"),
    status: document.getElementById("myttMarketStatus"),
    search: document.getElementById("myttMarketSearch"),
    category: document.getElementById("myttMarketCategory"),
    sort: document.getElementById("myttMarketSort"),
    sellButton: document.getElementById("myttMarketSellButton"),
    sellModal: document.getElementById("myttMarketSellModal"),
    sellForm: document.getElementById("myttMarketSellForm"),
    submissionId: document.getElementById("myttMarketSubmissionId"),
    photoInput: document.getElementById("myttMarketPhoto"),
    photoData: document.getElementById("myttMarketPhotoData"),
    photoName: document.getElementById("myttMarketPhotoName"),
    photoType: document.getElementById("myttMarketPhotoType"),
    photoLabel: document.getElementById("myttMarketPhotoLabel"),
    photoPreviewWrap: document.getElementById("myttMarketPhotoPreviewWrap"),
    photoPreview: document.getElementById("myttMarketPhotoPreview"),
    removePhoto: document.getElementById("myttMarketRemovePhoto"),
    formStatus: document.getElementById("myttMarketFormStatus"),
    submitButton: document.getElementById("myttMarketSubmitButton"),
    success: document.getElementById("myttMarketSuccess"),
    detailModal: document.getElementById("myttMarketDetailModal"),
    detailContent: document.getElementById("myttMarketDetailContent")
  };

  if (!els.grid) return;

  let listings = [];
  let compressedPhoto = null;
  let pollTimer = null;

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function normalizePrice(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  function formatPrice(value) {
    return "RM " + normalizePrice(value).toLocaleString("en-MY", {
      maximumFractionDigits: 0
    });
  }

  function normalizeWhatsApp(value) {
    let digits = String(value || "").replace(/\D/g, "");
    if (digits.startsWith("0")) digits = "60" + digits.slice(1);
    return digits;
  }

  function formatDate(value) {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "Recently listed";
    return d.toLocaleDateString("en-MY", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  }

  function setStatus(text) {
    els.status.textContent = text || "";
  }

  function filteredListings() {
    const query = String(els.search?.value || "").trim().toLowerCase();
    const category = String(els.category?.value || "all");
    const sort = String(els.sort?.value || "newest");

    const rows = listings.filter((item) => {
      if (category !== "all" && item.category !== category) return false;
      if (!query) return true;
      const haystack = [
        item.brand,
        item.model,
        item.category,
        item.condition,
        item.location,
        item.description,
        item.sellerName,
        item.myttId
      ].join(" ").toLowerCase();
      return haystack.includes(query);
    });

    rows.sort((a, b) => {
      if (sort === "price-low") return normalizePrice(a.price) - normalizePrice(b.price);
      if (sort === "price-high") return normalizePrice(b.price) - normalizePrice(a.price);
      return new Date(b.timestamp || 0) - new Date(a.timestamp || 0);
    });

    return rows;
  }

  function render() {
    const rows = filteredListings();
    setStatus(rows.length === 1 ? "1 approved listing" : rows.length + " approved listings");

    if (!rows.length) {
      els.grid.innerHTML = `
        <div class="mytt-market-empty">
          <span>🏓</span>
          <strong>No equipment listings found.</strong>
          <small>Try another filter or be the first to list an item.</small>
        </div>`;
      return;
    }

    els.grid.innerHTML = rows.map((item) => {
      const title = [item.brand, item.model].filter(Boolean).join(" ");
      return `
        <article class="mytt-market-card" data-market-listing="${escapeHtml(item.listingId)}">
          <div class="mytt-market-card-photo" data-open-market-detail="${escapeHtml(item.listingId)}">
            <img src="${escapeHtml(item.photoUrl)}" alt="${escapeHtml(title)}" loading="lazy">
            <div class="mytt-market-card-badges">
              <span class="mytt-market-badge">${escapeHtml(item.category)}</span>
              <span class="mytt-market-badge condition">${escapeHtml(item.condition)}</span>
            </div>
          </div>
          <div class="mytt-market-card-body">
            <p class="mytt-market-card-brand">${escapeHtml(item.brand)}</p>
            <h3 class="mytt-market-card-title">${escapeHtml(item.model)}</h3>
            <strong class="mytt-market-price">${formatPrice(item.price)}</strong>

            <div class="mytt-market-card-meta">
              <span><strong>${escapeHtml(item.sellerName)}</strong> · ${escapeHtml(item.myttId)}</span>
              <span>📍 ${escapeHtml(item.location)}</span>
              <span>${escapeHtml(formatDate(item.timestamp))}</span>
            </div>

            <div class="mytt-market-card-actions">
              <button class="mytt-market-details-button" type="button"
                data-open-market-detail="${escapeHtml(item.listingId)}">Details</button>
              <button class="mytt-market-contact-button" type="button"
                data-open-market-detail="${escapeHtml(item.listingId)}">Contact Seller</button>
            </div>
          </div>
        </article>`;
    }).join("");
  }

  function jsonp(params, timeoutMs = 18000) {
    return new Promise((resolve, reject) => {
      if (!webAppUrl) {
        reject(new Error("Marketplace Web App URL is not configured."));
        return;
      }

      const cb = "__myttMarketCb_" + Date.now() + "_" + Math.random().toString(36).slice(2);
      const script = document.createElement("script");
      let done = false;

      const cleanup = () => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        try { delete window[cb]; } catch (_) { window[cb] = undefined; }
        script.remove();
      };

      window[cb] = (payload) => {
        cleanup();
        resolve(payload);
      };

      const query = new URLSearchParams({ ...params, callback: cb, _: String(Date.now()) });
      script.src = webAppUrl + (webAppUrl.includes("?") ? "&" : "?") + query.toString();
      script.async = true;
      script.onerror = () => {
        cleanup();
        reject(new Error("Marketplace request failed."));
      };

      const timer = setTimeout(() => {
        cleanup();
        reject(new Error("Marketplace request timed out."));
      }, timeoutMs);

      document.head.appendChild(script);
    });
  }

  async function loadListings(silent) {
    if (!webAppUrl) {
      setStatus("Marketplace backend setup required");
      els.grid.innerHTML = `
        <div class="mytt-market-empty">
          <span>⚙️</span>
          <strong>Gear Market is being prepared.</strong>
          <small>The marketplace will appear here after the backend Web App is connected.</small>
        </div>`;
      return;
    }

    if (!silent) setStatus("Loading marketplace...");

    try {
      const payload = await jsonp({ action: "list" });
      if (!payload || payload.status !== "success") throw new Error(payload?.message || "Unable to load listings.");
      listings = Array.isArray(payload.listings) ? payload.listings : [];
      try { localStorage.setItem("mytt_market_cache_v1", JSON.stringify(listings)); } catch (_) {}
      render();
    } catch (err) {
      let cached = [];
      try { cached = JSON.parse(localStorage.getItem("mytt_market_cache_v1") || "[]"); } catch (_) {}
      if (Array.isArray(cached) && cached.length) {
        listings = cached;
        render();
        setStatus("Showing saved listings · live refresh unavailable");
      } else {
        setStatus("Marketplace load failed");
        els.grid.innerHTML = `
          <button class="mytt-market-empty mytt-market-retry" type="button" id="myttMarketRetry">
            <span>↻</span>
            <strong>Unable to load marketplace.</strong>
            <small>Tap to retry.</small>
          </button>`;
        document.getElementById("myttMarketRetry")?.addEventListener("click", () => loadListings(false));
      }
    }
  }

  function openSellModal() {
    if (!webAppUrl) {
      alert("Marketplace backend has not been connected yet.");
      return;
    }
    els.sellForm?.classList.remove("hidden");
    els.success?.classList.add("hidden");
    els.sellModal?.classList.remove("hidden");
    els.sellModal?.setAttribute("aria-hidden", "false");
    document.body.classList.add("mytt-market-modal-open");
  }

  function closeSellModal() {
    els.sellModal?.classList.add("hidden");
    els.sellModal?.setAttribute("aria-hidden", "true");
    document.body.classList.remove("mytt-market-modal-open");
    clearTimeout(pollTimer);
  }

  function closeDetailModal() {
    els.detailModal?.classList.add("hidden");
    els.detailModal?.setAttribute("aria-hidden", "true");
    document.body.classList.remove("mytt-market-modal-open");
  }

  function openDetail(id) {
    const item = listings.find((x) => String(x.listingId) === String(id));
    if (!item) return;
    const title = [item.brand, item.model].filter(Boolean).join(" ");
    const number = normalizeWhatsApp(item.contact);
    const message = encodeURIComponent(`Hi, I saw your ${title} listing on MYTT Gear Market. Is it still available?`);
    const wa = number ? `https://wa.me/${number}?text=${message}` : "#";

    els.detailContent.innerHTML = `
      <div class="mytt-market-detail-layout">
        <div class="mytt-market-detail-photo">
          <img src="${escapeHtml(item.photoUrl)}" alt="${escapeHtml(title)}">
        </div>
        <div class="mytt-market-detail-info">
          <p class="mytt-market-detail-category">${escapeHtml(item.category)}</p>
          <h2 id="myttMarketDetailTitle">${escapeHtml(title)}</h2>
          <strong class="mytt-market-detail-price">${formatPrice(item.price)}</strong>
          <div class="mytt-market-detail-chips">
            <span>${escapeHtml(item.condition)}</span>
            <span>📍 ${escapeHtml(item.location)}</span>
            <span>${escapeHtml(formatDate(item.timestamp))}</span>
          </div>
          <p class="mytt-market-detail-description">${escapeHtml(item.description)}</p>
          <div class="mytt-market-detail-seller">
            <small>Seller</small>
            <strong>${escapeHtml(item.sellerName)}</strong>
            <span>${escapeHtml(item.myttId)}</span>
          </div>
          <a class="mytt-market-detail-contact" href="${wa}" target="_blank" rel="noopener noreferrer">Contact Seller on WhatsApp</a>
        </div>
      </div>`;

    els.detailModal.classList.remove("hidden");
    els.detailModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("mytt-market-modal-open");
  }

  function resetPhoto() {
    compressedPhoto = null;
    if (els.photoInput) els.photoInput.value = "";
    if (els.photoData) els.photoData.value = "";
    if (els.photoName) els.photoName.value = "";
    if (els.photoType) els.photoType.value = "";
    if (els.photoLabel) els.photoLabel.textContent = "Choose item photo";
    if (els.photoPreview) els.photoPreview.removeAttribute("src");
    els.photoPreviewWrap?.classList.add("hidden");
  }

  function readImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Unable to read this image."));
        img.src = reader.result;
      };
      reader.onerror = () => reject(new Error("Unable to read this file."));
      reader.readAsDataURL(file);
    });
  }

  async function compressPhoto(file) {
    if (!file || !/^image\/(jpeg|png|webp)$/i.test(file.type)) throw new Error("Please choose a JPG, PNG or WebP image.");
    if (file.size > 8 * 1024 * 1024) throw new Error("Photo is too large. Please use an image below 8 MB.");

    const img = await readImage(file);
    const maxSide = 1600;
    const ratio = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const width = Math.max(1, Math.round(img.naturalWidth * ratio));
    const height = Math.max(1, Math.round(img.naturalHeight * ratio));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.84);
    return {
      dataUrl,
      base64: dataUrl.split(",")[1],
      type: "image/jpeg",
      name: (file.name || "equipment").replace(/\.[^.]+$/, "") + ".jpg"
    };
  }

  function makeSubmissionId() {
    const stamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
    return "MKT-" + stamp + "-" + Math.random().toString(36).slice(2, 7).toUpperCase();
  }

  function showFormMessage(text, type) {
    if (!els.formStatus) return;
    els.formStatus.textContent = text || "";
    els.formStatus.dataset.type = type || "";
  }

  async function pollSubmission(id, attempt) {
    const tries = attempt || 0;
    if (tries > 14) {
      showFormMessage("Submission sent. If confirmation is delayed, please check again later.", "info");
      if (els.submitButton) els.submitButton.disabled = false;
      return;
    }

    try {
      const payload = await jsonp({ action: "status", submissionId: id }, 12000);
      if (payload?.found) {
        els.sellForm.classList.add("hidden");
        els.success.classList.remove("hidden");
        if (els.submitButton) els.submitButton.disabled = false;
        loadListings(true);
        return;
      }
    } catch (_) {}

    pollTimer = setTimeout(() => pollSubmission(id, tries + 1), 1600);
  }

  async function submitForm(event) {
    event.preventDefault();
    if (!webAppUrl) return;
    const form = els.sellForm;

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    if (!compressedPhoto?.base64) {
      showFormMessage("Please upload a clear photo of the actual item.", "error");
      return;
    }

    const id = makeSubmissionId();
    els.submissionId.value = id;
    els.photoData.value = compressedPhoto.base64;
    els.photoName.value = compressedPhoto.name;
    els.photoType.value = compressedPhoto.type;
    form.action = webAppUrl;

    showFormMessage("Uploading listing for MYTT review...", "info");
    if (els.submitButton) els.submitButton.disabled = true;

    try {
      HTMLFormElement.prototype.submit.call(form);
      setTimeout(() => pollSubmission(id, 0), 1000);
    } catch (err) {
      showFormMessage("Unable to submit listing. Please try again.", "error");
      if (els.submitButton) els.submitButton.disabled = false;
    }
  }

  els.search?.addEventListener("input", render);
  els.category?.addEventListener("change", render);
  els.sort?.addEventListener("change", render);
  els.sellButton?.addEventListener("click", openSellModal);
  els.sellForm?.addEventListener("submit", submitForm);

  document.querySelectorAll("[data-close-market-sell]").forEach((el) => el.addEventListener("click", closeSellModal));
  document.querySelectorAll("[data-close-market-detail]").forEach((el) => el.addEventListener("click", closeDetailModal));

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-open-market-detail]");
    if (trigger) openDetail(trigger.getAttribute("data-open-market-detail"));
  });

  els.photoInput?.addEventListener("change", async () => {
    const file = els.photoInput.files?.[0];
    if (!file) return resetPhoto();
    showFormMessage("Preparing photo...", "info");
    try {
      compressedPhoto = await compressPhoto(file);
      els.photoLabel.textContent = compressedPhoto.name;
      els.photoPreview.src = compressedPhoto.dataUrl;
      els.photoPreviewWrap.classList.remove("hidden");
      showFormMessage("", "");
    } catch (err) {
      resetPhoto();
      showFormMessage(err.message || "Unable to prepare photo.", "error");
    }
  });

  els.removePhoto?.addEventListener("click", resetPhoto);

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (!els.detailModal?.classList.contains("hidden")) closeDetailModal();
    else if (!els.sellModal?.classList.contains("hidden")) closeSellModal();
  });

  window.addEventListener("online", () => loadListings(true));
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") loadListings(true);
  });

  loadListings(false);
  setInterval(() => loadListings(true), 90000);
})();
