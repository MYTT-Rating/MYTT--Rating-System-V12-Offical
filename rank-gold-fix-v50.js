(function () {
  "use strict";

  function applyGoldBadgeFixV50() {
    const road = document.querySelector(".homepage-rank-road");
    if (!road) return;

    const immortal = road.querySelector('.home-rank-native-node[data-rank-index="7"] .home-rank-native-badge');
    const hof = road.querySelector('.home-rank-native-node[data-rank-index="8"] .home-rank-native-badge');

    if (immortal) {
      immortal.src = "rank-badges/2200-immortal-v50-clean.webp?v=20260822-v50";
      immortal.alt = "Immortal badge";
    }
    if (hof) {
      hof.src = "rank-badges/2300-hall-of-fame-v50-clean.webp?v=20260822-v50";
      hof.alt = "Hall of Fame badge";
    }
  }

  function scheduleGoldBadgeFixV50() {
    applyGoldBadgeFixV50();
    requestAnimationFrame(applyGoldBadgeFixV50);
    setTimeout(applyGoldBadgeFixV50, 120);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleGoldBadgeFixV50, { once: true });
  } else {
    scheduleGoldBadgeFixV50();
  }

  window.addEventListener("pageshow", scheduleGoldBadgeFixV50);

  const observer = new MutationObserver(() => {
    const road = document.querySelector(".homepage-rank-road");
    if (road && road.dataset.goldFixV50 !== "1") {
      road.dataset.goldFixV50 = "1";
      scheduleGoldBadgeFixV50();
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
