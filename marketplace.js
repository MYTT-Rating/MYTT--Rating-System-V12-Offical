(function () {
  "use strict";

  const rankSrc = "rank-system-v27.js?v=20260822-14";
  const rankCss = "rank-system-v27.css?v=20260822-5";
  const rankCssId = "mytt-rank-system-v27-style";
  const rankEffectsCss = "rank-effects-v31.css?v=20260822-7";
  const rankEffectsCssId = "mytt-rank-effects-v31-style";
  const rankPolishCss = "rank-mobile-polish-v41.css?v=20260822-1";
  const rankPolishCssId = "mytt-rank-mobile-polish-v41-style";

  const coreSrc = "marketplace-core-v23.js?v=20260821-2";
  const polishSrc = "mobile-polish-v23.js?v=20260821-avatar-lazy-1";
  const polishCss = "mobile-polish-v23.css?v=20260821-recent-matches-1";
  const polishCssId = "mytt-mobile-polish-v23-style";

  function ensureCss(id, href) {
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  }

  if (document.readyState === "loading") {
    ensureCss(polishCssId, polishCss);
    ensureCss(rankCssId, rankCss);
    ensureCss(rankEffectsCssId, rankEffectsCss);
    ensureCss(rankPolishCssId, rankPolishCss);
    document.write(`<script id="mytt-rank-system-v27" src="${rankSrc}"><\/script>`);
    document.write(`<script id="mytt-marketplace-core-v23" src="${coreSrc}"><\/script>`);
    document.write(`<script id="mytt-mobile-polish-v23" src="${polishSrc}"><\/script>`);
    return;
  }

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

  ensureCss(polishCssId, polishCss);
  ensureCss(rankCssId, rankCss);
  ensureCss(rankEffectsCssId, rankEffectsCss);
  ensureCss(rankPolishCssId, rankPolishCss);
  loadScript("mytt-rank-system-v27", rankSrc)
    .then(() => loadScript("mytt-marketplace-core-v23", coreSrc))
    .then(() => loadScript("mytt-mobile-polish-v23", polishSrc))
    .catch((err) => console.error("MYTT UI module load failed", err));
})();
