(function () {
  "use strict";

  function loadScript(id, src) {
    const existing = document.getElementById(id);
    if (existing) return Promise.resolve();

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

  loadScript("mytt-marketplace-core-v23", "marketplace-core-v23.js?v=20260821-1")
    .then(() => loadScript("mytt-mobile-polish-v23", "mobile-polish-v23.js?v=20260821-1"))
    .catch((err) => console.error("MYTT UI module load failed", err));
})();
