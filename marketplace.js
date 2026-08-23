(function () {
  "use strict";

  /* Stable non-blocking loader.
     Rank order and final badge artwork live directly in rank-system-v27.js. */

  const rankSrc = "rank-system-v27.js?v=20260823-33";
  const rankCss = "rank-system-v27.css?v=20260822-5";
  const rankCssId = "mytt-rank-system-v27-style";
  const rankEffectsCss = "rank-effects-v31.css?v=20260822-7";
  const rankEffectsCssId = "mytt-rank-effects-v31-style";
  const rankPolishCss = "rank-mobile-polish-v47.css?v=20260822-2";
  const rankPolishCssId = "mytt-rank-mobile-polish-v47-style";
  const rankGoldRingCss = "rank-gold-ring-v62.css?v=20260823-10";
  const rankGoldRingCssId = "mytt-rank-gold-ring-v62-style";

  const coreSrc = "marketplace-core-v23.js?v=20260821-2";
  const polishSrc = "mobile-polish-v23.js?v=20260821-avatar-lazy-1";
  const polishCss = "mobile-polish-v23.css?v=20260821-recent-matches-1";
  const polishCssId = "mytt-mobile-polish-v23-style";

  /* Avatar performance patch.
     The old lazy-loading helper ran after player cards were already inserted,
     which meant browsers could start downloading every avatar first. Add the
     native image hints at HTML creation time instead. */
  function installEarlyAvatarLoading() {
    if (typeof window.avatarHTML === "function") {
      window.avatarHTML = function (db, cls = "avatar") {
        const src = typeof window.avatarUrl === "function"
          ? window.avatarUrl(db)
          : (db && db.id ? `avatars/${db.id}.jpg` : "");

        if (!src) return `<div class="${cls}">👤</div>`;

        const isProfile = String(cls || "").includes("profile-avatar");
        const loading = isProfile ? "eager" : "lazy";
        const priority = isProfile ? "high" : "low";
        const alt = (db && db.name) || "Player";

        return `<div class="${cls}"><img src="${src}" alt="${alt}" loading="${loading}" decoding="async" fetchpriority="${priority}" onerror="this.parentElement.textContent='👤'"></div>`;
      };
    }

    if (typeof window.opponentAvatarHTML === "function") {
      window.opponentAvatarHTML = function (opponent) {
        const db = typeof window.findDbByName === "function"
          ? window.findDbByName(opponent)
          : null;
        const src = typeof window.avatarUrl === "function"
          ? window.avatarUrl(db)
          : "";

        return `<div class="match-avatar">${src ? `<img src="${src}" alt="${opponent}" loading="lazy" decoding="async" fetchpriority="low" onerror="this.parentElement.textContent='👤'">` : "👤"}</div>`;
      };
    }
  }

  installEarlyAvatarLoading();

  function ensureCss(id, href) {
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  }

  function loadScript(id, src) {
    if (document.getElementById(id)) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.id = id;
      script.src = src;
      script.async = false;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Unable to load ${src}`));
      document.head.appendChild(script);
    });
  }

  function boot() {
    ensureCss(polishCssId, polishCss);
    ensureCss(rankCssId, rankCss);
    ensureCss(rankEffectsCssId, rankEffectsCss);
    ensureCss(rankPolishCssId, rankPolishCss);
    ensureCss(rankGoldRingCssId, rankGoldRingCss);

    loadScript("mytt-rank-system-v27", rankSrc)
      .then(() => loadScript("mytt-marketplace-core-v23", coreSrc))
      .then(() => loadScript("mytt-mobile-polish-v23", polishSrc))
      .catch((err) => console.error("MYTT UI module load failed", err));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
