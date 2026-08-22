(function () {
  "use strict";

  function applyGoldBadgeFix() {
    const road = document.querySelector(".homepage-rank-road");
    if (!road) return;

    const immortal = road.querySelector('.home-rank-native-node[data-rank-index="7"] .home-rank-native-badge');
    const hof = road.querySelector('.home-rank-native-node[data-rank-index="8"] .home-rank-native-badge');

    if (immortal) {
      immortal.src = "rank-badges/2200-immortal-final.webp?v=20260822-v49";
      immortal.alt = "Immortal badge";
    }
    if (hof) {
      hof.src = "rank-badges/v22-hall-of-fame-mytt-final.webp?v=20260822-v49";
      hof.alt = "Hall of Fame badge";
    }
  }

  function scheduleFix() {
    applyGoldBadgeFix();
    requestAnimationFrame(applyGoldBadgeFix);
    setTimeout(applyGoldBadgeFix, 120);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleFix, { once: true });
  } else {
    scheduleFix();
  }

  window.addEventListener("pageshow", scheduleFix);

  const observer = new MutationObserver(() => {
    const road = document.querySelector(".homepage-rank-road");
    if (road && road.dataset.goldFixV49 !== "1") {
      road.dataset.goldFixV49 = "1";
      scheduleFix();
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();