(function () {
  "use strict";

  const MOBILE_MAX = 860;
  const STYLE_ID = "mytt-mobile-polish-v23-style";

  function isMobile() {
    return window.matchMedia(`(max-width:${MOBILE_MAX}px)`).matches;
  }

  function ensureLateStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const link = document.createElement("link");
    link.id = STYLE_ID;
    link.rel = "stylesheet";
    link.href = "mobile-polish-v23.css?v=20260821-recent-matches-1";
    document.head.appendChild(link);
  }

  function panelTitle(panel) {
    return String(panel.querySelector(":scope > h3")?.textContent || "").trim();
  }

  function normalizedPanelTitle(panel) {
    return panelTitle(panel)
      .replace(/^[^A-Za-z0-9]+\s*/, "")
      .trim()
      .toLowerCase();
  }

  function makeCollapsible(panel) {
    if (!panel || panel.dataset.myttMobileCollapsible === "1") return;
    const heading = panel.querySelector(":scope > h3");
    if (!heading) return;

    const title = heading.textContent.trim();
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "profile-mobile-panel-toggle";
    toggle.setAttribute("aria-expanded", "false");
    toggle.innerHTML = `<span>${title}</span><span class="profile-mobile-panel-chevron" aria-hidden="true">⌄</span>`;

    const body = document.createElement("div");
    body.className = "profile-mobile-panel-body";
    body.hidden = true;

    heading.remove();
    while (panel.firstChild) body.appendChild(panel.firstChild);
    panel.append(toggle, body);
    panel.classList.add("profile-panel-collapsible");
    panel.dataset.myttMobileCollapsible = "1";

    toggle.addEventListener("click", () => {
      const isOpen = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!isOpen));
      body.hidden = isOpen;
      panel.classList.toggle("is-open", !isOpen);
    });
  }

  function enhanceRecentMatches(panel) {
    if (!panel || panel.dataset.myttRecentMatchesToggle === "1") return;

    const heading = panel.querySelector(":scope > h3");
    const list = panel.querySelector(":scope > .match-list");
    if (!heading || !list) return;

    const cards = [...list.querySelectorAll(":scope > .match-card")];
    panel.dataset.myttRecentMatchesToggle = "1";
    if (cards.length <= 3) return;

    panel.classList.add("profile-recent-matches");

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "profile-recent-matches-toggle";
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", `Show all ${cards.length} recent matches`);
    toggle.innerHTML = `<span class="profile-recent-matches-chevron" aria-hidden="true">⌄</span>`;
    panel.appendChild(toggle);

    const applyState = (expanded) => {
      cards.forEach((card, index) => {
        card.classList.toggle("mytt-recent-hidden", !expanded && index >= 3);
      });
      toggle.setAttribute("aria-expanded", String(expanded));
      toggle.setAttribute(
        "aria-label",
        expanded ? "Show only the latest 3 matches" : `Show all ${cards.length} recent matches`
      );
      panel.classList.toggle("recent-matches-expanded", expanded);
    };

    applyState(false);
    toggle.addEventListener("click", () => {
      applyState(toggle.getAttribute("aria-expanded") !== "true");
    });
  }

  function enhanceProfile() {
    if (!isMobile()) return;
    const root = document.getElementById("profileContent");
    if (!root) return;

    root.querySelectorAll(".profile-panel").forEach((panel) => {
      const title = normalizedPanelTitle(panel);
      if (title === "recent matches") {
        enhanceRecentMatches(panel);
      } else if (title === "player info" || title === "head to head" || title === "achievements") {
        makeCollapsible(panel);
      }
    });
  }

  function watchProfile() {
    const root = document.getElementById("profileContent");
    if (!root) return;

    const observer = new MutationObserver(() => requestAnimationFrame(enhanceProfile));
    observer.observe(root, { childList: true, subtree: true });
    enhanceProfile();

    window.addEventListener("resize", () => requestAnimationFrame(enhanceProfile), { passive: true });
  }

  function isHomeTarget() {
    const target = String(location.hash || "#home").replace(/^#/, "");
    return !target || target === "home";
  }

  function resetHomeRankJourneyScroll() {
    if (!isMobile()) return;
    const road = document.querySelector(".homepage-rank-road");
    if (!road) return;

    const reset = () => {
      if (road.isConnected) road.scrollLeft = 0;
    };

    // Mobile browsers can restore nested horizontal scroll after initial paint.
    // Reset across two frames plus one short delayed pass, then leave the road
    // fully user-scrollable until Home is entered again.
    requestAnimationFrame(() => {
      reset();
      requestAnimationFrame(reset);
    });
    setTimeout(reset, 120);
  }

  function initHomeRankJourneyScrollFix() {
    const syncIfHome = () => {
      if (isHomeTarget()) resetHomeRankJourneyScroll();
    };

    // MYTT mobile navigation uses history.pushState(), which does not fire
    // hashchange. Catch Home link taps directly and reset after page switching.
    document.addEventListener("click", (event) => {
      if (!isMobile()) return;
      const link = event.target.closest('a[href^="#"]');
      if (!link) return;
      const target = String(link.dataset.target || link.getAttribute("href") || "")
        .replace(/^#/, "");
      if (target === "home") setTimeout(resetHomeRankJourneyScroll, 0);
    });

    window.addEventListener("hashchange", syncIfHome);
    window.addEventListener("popstate", syncIfHome);
    window.addEventListener("pageshow", syncIfHome);
    syncIfHome();
  }

  function init() {
    watchProfile();
    initHomeRankJourneyScrollFix();
  }

  ensureLateStyles();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
