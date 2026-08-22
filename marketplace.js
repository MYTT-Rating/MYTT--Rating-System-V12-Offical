(function () {
  "use strict";

  /* Stable non-blocking loader.
     Rank order stays in rank-system-v27.js. The final two gold badges are
     replaced once, after the rank road is built, with the corrected V59 art. */

  const rankSrc = "rank-system-v27.js?v=20260823-30";
  const rankCss = "rank-system-v27.css?v=20260822-5";
  const rankCssId = "mytt-rank-system-v27-style";
  const rankEffectsCss = "rank-effects-v31.css?v=20260822-7";
  const rankEffectsCssId = "mytt-rank-effects-v31-style";
  const rankPolishCss = "rank-mobile-polish-v47.css?v=20260822-2";
  const rankPolishCssId = "mytt-rank-mobile-polish-v47-style";

  const coreSrc = "marketplace-core-v23.js?v=20260821-2";
  const polishSrc = "mobile-polish-v23.js?v=20260821-avatar-lazy-1";
  const polishCss = "mobile-polish-v23.css?v=20260821-recent-matches-1";
  const polishCssId = "mytt-mobile-polish-v23-style";

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

  function applyBalancedGoldBadgesV59() {
    const road = document.querySelector(".homepage-rank-road");
    if (!road) return;

    const immortal = road.querySelector('.home-rank-native-node[data-rank-index="7"] .home-rank-native-badge');
    const hallOfFame = road.querySelector('.home-rank-native-node[data-rank-index="8"] .home-rank-native-badge');

    if (immortal) {
      immortal.src = "rank-badges/2200-immortal-balanced-v59.webp?v=20260823-v59";
      immortal.alt = "Immortal badge";
    }
    if (hallOfFame) {
      hallOfFame.src = "rank-badges/2300-hall-of-fame-balanced-v59.webp?v=20260823-v59";
      hallOfFame.alt = "Hall of Fame badge";
    }
  }

  function boot() {
    ensureCss(polishCssId, polishCss);
    ensureCss(rankCssId, rankCss);
    ensureCss(rankEffectsCssId, rankEffectsCss);
    ensureCss(rankPolishCssId, rankPolishCss);

    loadScript("mytt-rank-system-v27", rankSrc)
      .then(() => {
        applyBalancedGoldBadgesV59();
        requestAnimationFrame(applyBalancedGoldBadgesV59);
        return loadScript("mytt-marketplace-core-v23", coreSrc);
      })
      .then(() => loadScript("mytt-mobile-polish-v23", polishSrc))
      .catch((err) => console.error("MYTT UI module load failed", err));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }

  window.addEventListener("pageshow", applyBalancedGoldBadgesV59, { passive: true });
})();