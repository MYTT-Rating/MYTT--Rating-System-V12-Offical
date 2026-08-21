(function () {
  "use strict";

  const coreSrc = "marketplace-core-v23.js?v=20260821-2";
  const polishSrc = "mobile-polish-v23.js?v=20260821-1";
  const polishCss = "mobile-polish-v23.css?v=20260821-2";
  const polishCssId = "mytt-mobile-polish-v23-style";

  function ensurePolishCss() {
    if (document.getElementById(polishCssId)) return;
    const link = document.createElement("link");
    link.id = polishCssId;
    link.rel = "stylesheet";
    link.href = polishCss;
    document.head.appendChild(link);
  }

  /* marketplace.js is parser-loaded by index.html. Keep the existing core
     synchronous so rank mapping is ready before async Sheet data returns. */
  if (document.readyState === "loading") {
    ensurePolishCss();
    document.write(`<script id="mytt-marketplace-core-v23" src="${coreSrc}"><\/script>`);
    document.write(`<script id="mytt-mobile-polish-v23" src="${polishSrc}"><\/script>`);
    return;
  }

  /* Safe fallback if this loader is ever injected after parsing. */
  function loadScript(id, src) {
    if (document.getElementById(id)) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.id = id;
      script.src = src;
      script.async = false;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Unable to load ${src}`));
      document.head.appendChild(script);
    });
  }

  ensurePolishCss();
  loadScript("mytt-marketplace-core-v23", coreSrc)
    .then(() => loadScript("mytt-mobile-polish-v23", polishSrc))
    .catch((err) => console.error("MYTT UI module load failed", err));
})();
