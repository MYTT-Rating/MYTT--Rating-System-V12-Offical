(function () {
  "use strict";

  /* FINAL APPROVED RANK ORDER + BADGE ARTWORK
     1500 Rookie
     1600 Challenger
     1700 Elite
     1800 Master
     1900 Grandmaster
     2000 MYTT Champion
     2100 Legend
     2200 Immortal
     2300 Hall of Fame
  */

  if (typeof TIERS !== "undefined" && Array.isArray(TIERS)) {
    const novice = TIERS.find(t => t.min === -Infinity) || {
      min: -Infinity,
      name: "Novice",
      icon: "🌿",
      cls: "tier-novice",
      badge: "novice-standalone.webp",
      next: 1500
    };

    const FINAL_TIERS = [
      novice,
      {min:1500,name:"Rookie",icon:"🌱",cls:"tier-rookie",badge:"novice-standalone.webp",next:1600},
      {min:1600,name:"Challenger",icon:"⚔️",cls:"tier-challenger",badge:"challenger-standalone.webp",next:1700},
      {min:1700,name:"Elite",icon:"⭐",cls:"tier-elite",badge:"rookie-standalone.webp",next:1800},
      {min:1800,name:"Master",icon:"🔥",cls:"tier-master",badge:"elite-standalone.webp",next:1900},
      {min:1900,name:"Grandmaster",icon:"🔥",cls:"tier-grandmaster",badge:"master-standalone.webp",next:2000},
      {min:2000,name:"MYTT Champion",icon:"🏆",cls:"tier-champion",badge:"immortal-standalone.webp",next:2100},
      {min:2100,name:"Legend",icon:"👑",cls:"tier-legend",badge:"legend-standalone.webp",next:2200},
      {min:2200,name:"Immortal",icon:"🏆",cls:"tier-immortal",badge:"2200-immortal-v50-clean.webp",next:2300},
      {min:2300,name:"Hall of Fame",icon:"🌟",cls:"tier-hof",badge:"2300-hall-of-fame-v50-clean.webp",next:null}
    ];

    TIERS.splice(0, TIERS.length, ...FINAL_TIERS);
    window.MYTT_FINAL_TIERS = FINAL_TIERS;
  }

  const RANKS = [
    {name:"Rookie",score:1500,badge:"novice-standalone.webp",color:"#d8dde4",line:"line-red"},
    {name:"Challenger",score:1600,badge:"challenger-standalone.webp",color:"#19f53a",line:"line-orange"},
    {name:"Elite",score:1700,badge:"rookie-standalone.webp",color:"#21c9ff",line:"line-gold"},
    {name:"Master",score:1800,badge:"elite-standalone.webp",color:"#b55cff",line:"line-yellow"},
    {name:"Grandmaster",score:1900,badge:"master-standalone.webp",color:"#ff3131",line:"line-green"},
    {name:"MYTT Champion",score:2000,badge:"immortal-standalone.webp",color:"#ff2e8d",line:"line-cyan"},
    {name:"Legend",score:2100,badge:"legend-standalone.webp",color:"#f0a81c",line:"line-purple"},
    {name:"Immortal",score:2200,badge:"2200-immortal-v50-clean.webp",color:"#ffd51c",line:"line-pink"},
    {name:"Hall of Fame",score:2300,badge:"2300-hall-of-fame-v50-clean.webp",color:"#ffd51c",line:null}
  ];

  function badgeUrl(file) {
    return `rank-badges/${file}?v=20260822-final-approved`;
  }

  function getHomepageRating() {
    const node = document.querySelector(".current-rating-v5 strong");
    const rating = Number(String(node?.textContent || "1500").replace(/[^0-9.-]/g, ""));
    return Number.isFinite(rating) ? rating : 1500;
  }

  function getActiveRankIndex() {
    const rating = getHomepageRating();
    if (rating >= 2300) return 8;
    return Math.max(0, Math.min(8, Math.floor((rating - 1500) / 100)));
  }

  function fixProgressCopy() {
    const current = document.querySelector(".current-rating-v5");
    if (current) {
      const label = current.querySelector("span");
      if (label) label.textContent = "Rookie";
    }

    const head = document.querySelector(".hero-progress-head");
    if (head) {
      const labels = head.querySelectorAll("strong");
      if (labels[0]) labels[0].textContent = "Rookie";
      if (labels[1]) labels[1].textContent = "Challenger";
    }

    const note = document.querySelector(".hero-progress-card p");
    if (note) note.innerHTML = "<b>1500</b> / 1600 · 100 pts to Challenger";
  }

  function buildRankNode(rank, index) {
    const node = document.createElement("article");
    node.className = "home-rank-native-node";
    node.dataset.rankIndex = String(index);
    node.style.setProperty("--rank-color", rank.color);
    node.setAttribute("aria-label", `${rank.name} ${rank.score}`);

    const shell = document.createElement("div");
    shell.className = "home-rank-native-shell";

    const img = document.createElement("img");
    img.className = "home-rank-native-badge";
    img.src = badgeUrl(rank.badge);
    img.alt = `${rank.name} badge`;
    img.draggable = false;
    img.decoding = "async";
    shell.appendChild(img);

    const name = document.createElement("span");
    name.className = "home-rank-native-name";
    name.textContent = rank.name;

    const score = document.createElement("small");
    score.className = "home-rank-native-score";
    score.textContent = String(rank.score);

    const marker = document.createElement("div");
    marker.className = "home-rank-native-marker";
    marker.setAttribute("aria-hidden", "true");
    marker.innerHTML = '<b>▲</b><em>YOU ARE HERE</em>';

    node.append(shell, name, score, marker);
    return node;
  }

  function buildNativeRoad(road) {
    road.className = "homepage-rank-road mytt-native-rank-road-v47";
    road.setAttribute(
      "aria-label",
      "MYTT Rank Journey: Rookie 1500, Challenger 1600, Elite 1700, Master 1800, Grandmaster 1900, MYTT Champion 2000, Legend 2100, Immortal 2200, Hall of Fame 2300"
    );
    road.replaceChildren();

    RANKS.forEach((rank, index) => {
      road.appendChild(buildRankNode(rank, index));
      if (index < RANKS.length - 1) {
        const line = document.createElement("i");
        line.className = `home-rank-native-line ${rank.line}`;
        line.setAttribute("aria-hidden", "true");
        road.appendChild(line);
      }
    });

    road.dataset.nativeRankRoad = "v47";
    road.dataset.rankDesignLocked = "approved-final";
    road.scrollLeft = 0;
  }

  function setActiveRank(road, index) {
    const safe = Math.max(0, Math.min(RANKS.length - 1, index));
    road.querySelectorAll(".home-rank-native-node").forEach((node, i) => {
      const active = i === safe;
      node.classList.toggle("active", active);
      if (active) node.setAttribute("aria-current", "true");
      else node.removeAttribute("aria-current");
    });
    road.dataset.activeRank = String(safe);
  }

  function nearestVisibleRank(road) {
    const rr = road.getBoundingClientRect();
    const target = rr.left + Math.min(58, rr.width * 0.16);
    let best = 0;
    let bestDist = Infinity;

    road.querySelectorAll(".home-rank-native-node").forEach((node, i) => {
      const nr = node.getBoundingClientRect();
      const d = Math.abs((nr.left + nr.width / 2) - target);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });

    return best;
  }

  function enableRankInteraction(road) {
    if (!road || road.dataset.rankInteractionReady === "1") return;
    road.dataset.rankInteractionReady = "1";

    let dragging = false;
    let startX = 0;
    let startScrollLeft = 0;
    let raf = 0;

    const sync = () => {
      raf = 0;
      if (window.matchMedia("(max-width: 768px)").matches) {
        setActiveRank(road, nearestVisibleRank(road));
      } else {
        setActiveRank(road, getActiveRankIndex());
      }
    };

    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(sync);
    };

    road.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });

    road.addEventListener("pointerdown", event => {
      if (event.pointerType !== "mouse" || road.scrollWidth <= road.clientWidth) return;
      dragging = true;
      startX = event.clientX;
      startScrollLeft = road.scrollLeft;
      road.classList.add("is-dragging");
      road.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    });

    road.addEventListener("pointermove", event => {
      if (!dragging || event.pointerType !== "mouse") return;
      road.scrollLeft = startScrollLeft - (event.clientX - startX);
      event.preventDefault();
    });

    const stop = event => {
      if (!dragging) return;
      dragging = false;
      road.classList.remove("is-dragging");
      if (event && road.hasPointerCapture?.(event.pointerId)) {
        road.releasePointerCapture(event.pointerId);
      }
      schedule();
    };

    road.addEventListener("pointerup", stop);
    road.addEventListener("pointercancel", stop);
    road.addEventListener("lostpointercapture", stop);

    setActiveRank(road, getActiveRankIndex());
    requestAnimationFrame(() => {
      road.scrollLeft = 0;
      sync();
    });
  }

  function installNativeRankJourney() {
    const road = document.querySelector(".homepage-rank-road");
    if (!road) return;
    buildNativeRoad(road);
    enableRankInteraction(road);
    fixProgressCopy();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", installNativeRankJourney, { once: true });
  } else {
    installNativeRankJourney();
  }

  window.addEventListener("pageshow", () => {
    const road = document.querySelector(".homepage-rank-road");
    if (road && road.dataset.rankDesignLocked !== "approved-final") installNativeRankJourney();
    else if (road) {
      setActiveRank(
        road,
        window.matchMedia("(max-width: 768px)").matches
          ? nearestVisibleRank(road)
          : getActiveRankIndex()
      );
    }
    fixProgressCopy();
  });
})();
