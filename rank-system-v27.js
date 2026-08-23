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
      {min:2200,name:"Immortal",icon:"🏆",cls:"tier-immortal",badge:"2200-immortal-v63.webp",next:2300},
      {min:2300,name:"Hall of Fame",icon:"🌟",cls:"tier-hof",badge:"2300-hall-of-fame-v63.webp",next:null}
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
    {name:"Immortal",score:2200,badge:"2200-immortal-v63.webp",color:"#ffd51c",line:"line-pink"},
    {name:"Hall of Fame",score:2300,badge:"2300-hall-of-fame-v63.webp",color:"#ffd51c",line:null}
  ];

  function badgeUrl(file) {
    return `rank-badges/${file}?v=20260823-v63`;
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
  }

  function buildRoad() {
    const road = document.querySelector(".homepage-rank-road");
    if (!road) return;

    road.className = "homepage-rank-road mytt-native-rank-road-v47";
    road.innerHTML = "";

    RANKS.forEach((rank, index) => {
      const node = document.createElement("article");
      node.className = "home-rank-native-node";
      node.dataset.rankIndex = String(index);
      node.style.setProperty("--rank-color", rank.color);

      const shell = document.createElement("div");
      shell.className = "home-rank-native-shell";

      const img = document.createElement("img");
      img.className = "home-rank-native-badge";
      img.src = badgeUrl(rank.badge);
      img.alt = `${rank.name} badge`;
      img.decoding = "async";
      img.loading = "eager";
      shell.appendChild(img);

      const name = document.createElement("span");
      name.className = "home-rank-native-name";
      name.textContent = rank.name;

      const score = document.createElement("small");
      score.className = "home-rank-native-score";
      score.textContent = String(rank.score);

      const marker = document.createElement("span");
      marker.className = "home-rank-native-marker";
      marker.innerHTML = '<b>▲</b><em>YOU ARE HERE</em>';

      node.append(shell, name, score, marker);
      road.appendChild(node);

      if (rank.line) {
        const line = document.createElement("i");
        line.className = `home-rank-native-line ${rank.line}`;
        road.appendChild(line);
      }
    });

    const active = getActiveRankIndex();
    setActive(active);
    fixProgressCopy();
    bindRoad(road);
  }

  function setActive(index) {
    document.querySelectorAll(".home-rank-native-node").forEach((node, i) => {
      node.classList.toggle("active", i === index);
    });
  }

  function nearestVisibleRank(road) {
    const nodes = [...road.querySelectorAll(".home-rank-native-node")];
    if (!nodes.length) return 0;

    const r = road.getBoundingClientRect();
    const target = r.left + Math.min(58, r.width * 0.16);
    let best = 0;
    let dist = Infinity;

    nodes.forEach((node, i) => {
      const nr = node.getBoundingClientRect();
      const center = nr.left + nr.width / 2;
      const d = Math.abs(center - target);
      if (d < dist) {
        dist = d;
        best = i;
      }
    });
    return best;
  }

  function bindRoad(road) {
    let raf = 0;

    const syncMobileActive = () => {
      if (window.innerWidth > 768) {
        setActive(getActiveRankIndex());
        return;
      }
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setActive(nearestVisibleRank(road)));
    };

    road.addEventListener("scroll", syncMobileActive, { passive: true });
    window.addEventListener("resize", syncMobileActive, { passive: true });

    let down = false;
    let startX = 0;
    let startScroll = 0;

    road.addEventListener("pointerdown", (e) => {
      if (window.innerWidth > 768) return;
      down = true;
      startX = e.clientX;
      startScroll = road.scrollLeft;
      road.classList.add("is-dragging");
      try { road.setPointerCapture(e.pointerId); } catch (_) {}
    });

    road.addEventListener("pointermove", (e) => {
      if (!down) return;
      road.scrollLeft = startScroll - (e.clientX - startX);
    });

    const stop = () => {
      if (!down) return;
      down = false;
      road.classList.remove("is-dragging");
      syncMobileActive();
    };

    road.addEventListener("pointerup", stop);
    road.addEventListener("pointercancel", stop);
    road.addEventListener("pointerleave", stop);

    syncMobileActive();
  }

  function boot() {
    buildRoad();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
