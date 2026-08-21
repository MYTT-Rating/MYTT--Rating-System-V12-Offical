(function () {
  "use strict";

  const coreSrc = "marketplace-core-v23.js?v=20260821-1";
  const polishSrc = "mobile-polish-v23.js?v=20260821-1";

  /* marketplace.js is parser-loaded by index.html. During normal page load,
     write the two real modules synchronously so the existing rank-sync timing
     stays identical to the previous single-file implementation. */
  if (document.readyState === "loading") {
    document.write(`<script src="${coreSrc}"><\/script>`);
    document.write(`<script src="${polishSrc}"><\/script>`);
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

  loadScript("mytt-marketplace-core-v23", coreSrc)
    .then(() => loadScript("mytt-mobile-polish-v23", polishSrc))
    .catch((err) => console.error("MYTT UI module load failed", err));
})();
