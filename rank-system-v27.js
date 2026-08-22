(function () {
  "use strict";

  if (typeof TIERS === "undefined" || !Array.isArray(TIERS)) return;

  const novice = TIERS.find(t => t.min === -Infinity) || {
    min: -Infinity,
    name: "Novice",
    icon: "🌿",
    cls: "tier-novice",
    badge: "novice-standalone.webp",
    next: 1500
  };

  /* Final MYTT order + final approved visual badge mapping. */
  const FINAL_TIERS = [
    novice,
    {min:1500,name:"Rookie",icon:"🌱",cls:"tier-rookie",badge:"novice-standalone.webp",next:1600},
    {min:1600,name:"Challenger",icon:"⚔️",cls:"tier-challenger",badge:"rookie-standalone.webp",next:1700},
    {min:1700,name:"Elite",icon:"⭐",cls:"tier-elite",badge:"challenger-standalone.webp",next:1800},
    {min:1800,name:"Master",icon:"🔥",cls:"tier-master",badge:"elite-standalone.webp",next:1900},
    {min:1900,name:"Grandmaster",icon:"🔥",cls:"tier-grandmaster",badge:"master-standalone.webp",next:2000},
    {min:2000,name:"MYTT Champion",icon:"🏆",cls:"tier-champion",badge:"immortal-standalone.webp",next:2100},
    {min:2100,name:"Legend",icon:"👑",cls:"tier-legend",badge:"legend-standalone.webp",next:2200},
    {min:2200,name:"Immortal",icon:"🏆",cls:"tier-immortal",badge:"champion-standalone.webp",next:2300},
    {min:2300,name:"Hall of Fame",icon:"🌟",cls:"tier-hof",badge:"v22-hall-of-fame-mytt-final.webp",next:null}
  ];

  TIERS.splice(0, TIERS.length, ...FINAL_TIERS);
  window.MYTT_FINAL_TIERS = FINAL_TIERS;

  function badgeUrl(tier) {
    return `rank-badges/${tier.badge}`;
  }

  function patchHomeRankJourney() {
    const tiers = FINAL_TIERS.filter(t => Number.isFinite(t.min) && t.min >= 1500);
    const nodes = document.querySelectorAll(".homepage-rank-road .home-rank-node");

    nodes.forEach((node, index) => {
      const tier = tiers[index];
      if (!tier) return;

      [...node.classList].forEach(cls => {
        if (/^tier-.+-home$/.test(cls)) node.classList.remove(cls);
      });
      node.classList.add(`${tier.cls}-home`);
      node.dataset.rankTier = tier.name;

      const orb = node.querySelector(".home-rank-orb");
      if (orb) {
        orb.textContent = "";
        orb.style.setProperty("background-image", `url("${badgeUrl(tier)}")`, "important");
        orb.style.setProperty("background-repeat", "no-repeat", "important");
        orb.style.setProperty("background-position", "center", "important");
        orb.style.setProperty("background-size", "contain", "important");
      }

      const label = node.querySelector(":scope > span");
      const score = node.querySelector(":scope > small");
      if (label) label.textContent = tier.name;
      if (score) score.textContent = tier.min;
    });

    const current = document.querySelector(".current-rating-v5");
    if (current) {
      const score = Number(current.querySelector("strong")?.textContent || 1500);
      const tier = FINAL_TIERS.reduce((found, t) => score >= t.min ? t : found, FINAL_TIERS[0]);
      const label = current.querySelector("span");
      if (label) label.textContent = tier.name;
    }

    const progressHead = document.querySelector(".hero-progress-head");
    const progressNote = document.querySelector(".hero-progress-card p");
    if (progressHead) {
      const labels = progressHead.querySelectorAll("strong");
      if (labels[0]) labels[0].textContent = "Rookie";
      if (labels[1]) labels[1].textContent = "Challenger";
    }
    if (progressNote) progressNote.innerHTML = "<b>1500</b> / 1600 · 100 pts to Challenger";
  }

  patchHomeRankJourney();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", patchHomeRankJourney, { once: true });
  }
  window.addEventListener("pageshow", patchHomeRankJourney);
})();
