(function () {
  "use strict";

  function applyGoldBadgeFixV53() {
    const road = document.querySelector(".homepage-rank-road");
    if (!road) return;

    const immortal = road.querySelector('.home-rank-native-node[data-rank-index="7"] .home-rank-native-badge');
    const hof = road.querySelector('.home-rank-native-node[data-rank-index="8"] .home-rank-native-badge');

    /* Use the existing clean WebP artwork. The completed rim is now CSS-only. */
    if (immortal) {
      immortal.src = "rank-badges/2200-immortal-v50-clean.webp?v=20260822-v53";
      immortal.alt = "Immortal badge";
    }
    if (hof) {
      hof.src = "rank-badges/2300-hall-of-fame-v50-clean.webp?v=20260822-v53";
      hof.alt = "Hall of Fame badge";
    }
  }

  function scheduleGoldBadgeFixV53() {
    applyGoldBadgeFixV53();
    requestAnimationFrame(applyGoldBadgeFixV53);
    setTimeout(applyGoldBadgeFixV53, 120);
    setTimeout(applyGoldBadgeFixV53, 500);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleGoldBadgeFixV53, { once: true });
  } else {
    scheduleGoldBadgeFixV53();
  }

  window.addEventListener("pageshow", scheduleGoldBadgeFixV53);

  const observer = new MutationObserver(() => {
    const road = document.querySelector(".homepage-rank-road");
    if (road) scheduleGoldBadgeFixV53();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
