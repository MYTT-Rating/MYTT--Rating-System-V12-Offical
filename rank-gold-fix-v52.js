(function () {
  "use strict";

  function applyGoldBadgeFixV52() {
    const road = document.querySelector(".homepage-rank-road");
    if (!road) return;

    const immortal = road.querySelector('.home-rank-native-node[data-rank-index="7"] .home-rank-native-badge');
    const hof = road.querySelector('.home-rank-native-node[data-rank-index="8"] .home-rank-native-badge');

    if (immortal) {
      immortal.src = "rank-badges/2200-immortal-v52-complete.svg?v=20260822-v52";
      immortal.alt = "Immortal badge";
    }
    if (hof) {
      hof.src = "rank-badges/2300-hall-of-fame-v52-complete.svg?v=20260822-v52";
      hof.alt = "Hall of Fame badge";
    }
  }

  function scheduleGoldBadgeFixV52() {
    applyGoldBadgeFixV52();
    requestAnimationFrame(applyGoldBadgeFixV52);
    setTimeout(applyGoldBadgeFixV52, 120);
    setTimeout(applyGoldBadgeFixV52, 500);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleGoldBadgeFixV52, { once: true });
  } else {
    scheduleGoldBadgeFixV52();
  }

  window.addEventListener("pageshow", scheduleGoldBadgeFixV52);

  const observer = new MutationObserver(() => {
    const road = document.querySelector(".homepage-rank-road");
    if (road) scheduleGoldBadgeFixV52();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
