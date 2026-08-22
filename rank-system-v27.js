(function () {
  "use strict";

  /* Keep the site-wide tier names/order correct, but do not rebuild the
     homepage artwork from individual badge files. The homepage uses one
     approved strip so badge shapes and connector alignment stay unchanged. */
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
  }

  const STRIP_PARTS = [
    "rank-badges/mytt-rank-road-v29.b64.00",
    "rank-badges/mytt-rank-road-v29.b64.01",
    "rank-badges/mytt-rank-road-v29.b64.02",
    "rank-badges/mytt-rank-road-v29.b64.03"
  ];

  let approvedStripPromise = null;

  function loadApprovedStrip() {
    if (!approvedStripPromise) {
      approvedStripPromise = Promise.all(
        STRIP_PARTS.map(path => fetch(path, { cache: "force-cache" }).then(res => {
          if (!res.ok) throw new Error(`Unable to load ${path}`);
          return res.text();
        }))
      ).then(parts => `data:image/webp;base64,${parts.map(part => part.trim()).join("")}`);
    }
    return approvedStripPromise;
  }

  function fixProgressCopy() {
    const current = document.querySelector(".current-rating-v5");
    if (current) {
      const label = current.querySelector("span");
      if (label) label.textContent = "Rookie";
    }

    const progressHead = document.querySelector(".hero-progress-head");
    if (progressHead) {
      const labels = progressHead.querySelectorAll("strong");
      if (labels[0]) labels[0].textContent = "Rookie";
      if (labels[1]) labels[1].textContent = "Challenger";
    }

    const progressNote = document.querySelector(".hero-progress-card p");
    if (progressNote) progressNote.innerHTML = "<b>1500</b> / 1600 · 100 pts to Challenger";
  }

  function enableRankRoadDrag(road) {
    if (!road || road.dataset.rankDragReady === "1") return;
    road.dataset.rankDragReady = "1";

    let dragging = false;
    let startX = 0;
    let startScrollLeft = 0;

    road.addEventListener("pointerdown", event => {
      if (event.pointerType !== "mouse") return;
      if (road.scrollWidth <= road.clientWidth) return;
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
    };

    road.addEventListener("pointerup", stop);
    road.addEventListener("pointercancel", stop);
    road.addEventListener("lostpointercapture", stop);
  }

  function lockHomeRankJourney() {
    const road = document.querySelector(".homepage-rank-road");
    if (!road) return;

    road.classList.add("mytt-approved-rank-road-v29");
    road.setAttribute("aria-label", "MYTT Rank Journey: Rookie 1500, Challenger 1600, Elite 1700, Master 1800, Grandmaster 1900, MYTT Champion 2000, Legend 2100, Immortal 2200, Hall of Fame 2300");

    road.replaceChildren();

    const placeholder = document.createElement("div");
    placeholder.className = "mytt-approved-rank-strip-loading";
    placeholder.setAttribute("aria-hidden", "true");
    road.appendChild(placeholder);

    loadApprovedStrip().then(src => {
      if (!road.isConnected) return;
      const img = document.createElement("img");
      img.className = "mytt-approved-rank-strip-v29";
      img.src = src;
      img.alt = "MYTT Rank Journey — Rookie 1500, Challenger 1600, Elite 1700, Master 1800, Grandmaster 1900, MYTT Champion 2000, Legend 2100, Immortal 2200, Hall of Fame 2300";
      img.draggable = false;
      img.decoding = "async";
      road.replaceChildren(img);
      road.dataset.approvedRankStrip = "v29";
      road.scrollLeft = 0;
      enableRankRoadDrag(road);
    }).catch(err => {
      console.error("Unable to load approved MYTT rank strip", err);
      placeholder.textContent = "MYTT Rank Journey";
    });

    enableRankRoadDrag(road);
    fixProgressCopy();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", lockHomeRankJourney, { once: true });
  } else {
    lockHomeRankJourney();
  }

  window.addEventListener("pageshow", () => {
    const road = document.querySelector(".homepage-rank-road");
    if (road && road.dataset.approvedRankStrip !== "v29") lockHomeRankJourney();
    else if (road) enableRankRoadDrag(road);
    fixProgressCopy();
  });
})();
