(function () {
  "use strict";

  const VERSION = "20260824-mobile-perf-v2";
  const CSS_ID = "mytt-market-base-v2-style";
  const CORE_ID = "mytt-market-core-v23";
  let marketPromise = null;
  let marketReady = false;

  function ensureCss() {
    if (document.getElementById(CSS_ID)) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const link = document.createElement("link");
      link.id = CSS_ID;
      link.rel = "stylesheet";
      link.href = `marketplace-base-v20-3.css?v=${VERSION}`;
      link.onload = resolve;
      link.onerror = () => reject(new Error("Unable to load marketplace styles"));
      document.head.appendChild(link);
    });
  }

  function ensureCore() {
    if (document.getElementById(CORE_ID)) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.id = CORE_ID;
      script.src = `marketplace-core-v23.js?v=${VERSION}`;
      script.async = false;
      script.onload = resolve;
      script.onerror = () => reject(new Error("Unable to load marketplace module"));
      document.head.appendChild(script);
    });
  }

  function loadMarketAssets() {
    if (marketReady) return Promise.resolve();
    if (marketPromise) return marketPromise;

    marketPromise = Promise.all([ensureCss(), ensureCore()])
      .then(() => { marketReady = true; })
      .catch((err) => {
        marketPromise = null;
        console.error("MYTT Market lazy load failed", err);
        throw err;
      });

    return marketPromise;
  }

  window.MYTT_LOAD_MARKET = loadMarketAssets;

  function targetFromHash() {
    return String(location.hash || "").replace(/^#/, "");
  }

  document.addEventListener("click", (event) => {
    const marketLink = event.target.closest('a[href="#market"],[data-target="market"],[data-v14-target="market"]');
    if (marketLink) loadMarketAssets();

    // Protect a very fast Sell Equipment tap while the Market module is still
    // downloading: finish loading, then replay the same user action once.
    const sell = event.target.closest("#myttMarketSellButton");
    if (sell && !marketReady) {
      event.preventDefault();
      event.stopImmediatePropagation();
      loadMarketAssets().then(() => sell.click());
    }
  }, true);

  const maybeLoadFromHash = () => {
    if (targetFromHash() === "market") loadMarketAssets();
  };

  window.addEventListener("hashchange", maybeLoadFromHash);
  window.addEventListener("popstate", maybeLoadFromHash);
  maybeLoadFromHash();

  // Desktop is still a long one-page layout. Preload Market only when the
  // section approaches the viewport so scrolling remains seamless.
  if (window.innerWidth > 860 && "IntersectionObserver" in window) {
    const market = document.getElementById("market");
    if (market) {
      const observer = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          loadMarketAssets();
        }
      }, { rootMargin: "900px 0px" });
      observer.observe(market);
    }
  } else if (window.innerWidth > 860) {
    setTimeout(loadMarketAssets, 2500);
  }
})();
