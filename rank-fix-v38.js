(function () {
  "use strict";

  const IMMORTAL_SRC = "rank-badges/2200-immortal-clean.png?v=20260822-2";
  const HOF_SRC = "rank-badges/v22-hall-of-fame-mytt-final.webp?v=20260822-1";

  function applyRankFix(){
    if (typeof TIERS !== "undefined" && Array.isArray(TIERS)) {
      const immortal = TIERS.find(t => t && t.min === 2200);
      if (immortal) immortal.badge = "2200-immortal-clean.png";
      const hof = TIERS.find(t => t && t.min === 2300);
      if (hof) hof.badge = "v22-hall-of-fame-mytt-final.webp";
    }

    const immortalImg = document.querySelector('.home-rank-native-node[data-rank-index="7"] .home-rank-native-badge');
    if (immortalImg) {
      immortalImg.src = IMMORTAL_SRC;
      immortalImg.alt = "Immortal badge";
    }

    const hofImg = document.querySelector('.home-rank-native-node[data-rank-index="8"] .home-rank-native-badge');
    if (hofImg) {
      hofImg.src = HOF_SRC;
      hofImg.alt = "Hall of Fame badge";
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyRankFix, { once: true });
  } else {
    applyRankFix();
  }

  window.addEventListener("pageshow", applyRankFix);

  const observer = new MutationObserver(() => applyRankFix());
  const startObserver = () => observer.observe(document.documentElement, { childList: true, subtree: true });
  if (document.documentElement) startObserver();
})();
