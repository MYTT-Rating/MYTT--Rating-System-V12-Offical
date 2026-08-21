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
    link.href = "mobile-polish-v23.css?v=20260821-1";
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

  function enhanceProfile() {
    if (!isMobile()) return;
    const root = document.getElementById("profileContent");
    if (!root) return;

    root.querySelectorAll(".profile-panel").forEach((panel) => {
      const title = normalizedPanelTitle(panel);
      if (title === "player info" || title === "head to head" || title === "achievements") {
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

  ensureLateStyles();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", watchProfile, { once: true });
  } else {
    watchProfile();
  }
})();
