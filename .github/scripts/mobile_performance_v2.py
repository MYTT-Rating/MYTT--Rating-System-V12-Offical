from pathlib import Path

VERSION = "20260824-mobile-perf-v2"


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly 1 match, found {count}")
    return text.replace(old, new, 1)


# Idempotent guard for pull_request synchronize runs.
index_path = Path("index.html")
index_text = index_path.read_text(encoding="utf-8")
if f"marketplace-loader-v2.js?v={VERSION}" in index_text:
    print("MYTT Mobile Performance V2 is already applied.")
    raise SystemExit(0)

# ------------------------------------------------------------------
# index.html
# - Market-only base CSS and JS become on-demand.
# - Keep unchanged V1 assets on their existing cache keys.
# - Preload only the first visible Home rank badge.
# ------------------------------------------------------------------
old = '''  <link rel="preconnect" href="https://docs.google.com">
  <link rel="preconnect" href="https://script.google.com">
'''
new = '''  <link rel="preconnect" href="https://docs.google.com">
  <link rel="preconnect" href="https://script.google.com">
  <link rel="preload" as="image" href="rank-badges/novice-standalone.webp?v=20260823-v63-ringmerge" fetchpriority="high">
'''
index_text = replace_once(index_text, old, new, "rank badge preload")

old = '  <link rel="stylesheet" href="marketplace-base-v20-3.css?v=20260824-mobile-perf-v1">\n'
index_text = replace_once(index_text, old, "", "remove eager market-only CSS")

old = '''<script defer src="app.js?v=20260824-mobile-perf-v1"></script>
<script defer src="rank-system-v27.js?v=20260824-mobile-perf-v1"></script>
<script defer src="marketplace-core-v23.js?v=20260824-mobile-perf-v1"></script>
<script defer src="mobile-polish-v23.js?v=20260824-mobile-perf-v1"></script>'''
new = f'''<script defer src="app.js?v={VERSION}"></script>
<script defer src="rank-system-v27.js?v=20260824-mobile-perf-v1"></script>
<script defer src="marketplace-loader-v2.js?v={VERSION}"></script>
<script defer src="mobile-polish-v23.js?v={VERSION}"></script>'''
index_text = replace_once(index_text, old, new, "V2 script block")
index_path.write_text(index_text, encoding="utf-8")

# ------------------------------------------------------------------
# app.js
# - Remove the obsolete Home Rank background-image pass. The official
#   rank module rebuilds the same road with real optimized <img> tags.
# - Deduplicate concurrent Google CSV requests.
# - Make mobile Home almost static: session status warms first, while
#   Player DB + Singles warm later and Match history stays on demand.
# - Use cached/bundled Events on mobile Home, live-refresh on Events.
# - Guarantee page data when a deferred mobile page is opened.
# ------------------------------------------------------------------
path = Path("app.js")
text = path.read_text(encoding="utf-8")

old = '''function syncHomeRankBadges(){const tiers=TIERS.filter(t=>t.min>=1500);const nodes=document.querySelectorAll('.homepage-rank-road .home-rank-node');nodes.forEach((node,index)=>{const t=tiers[index];const orb=node.querySelector('.home-rank-orb');if(!t||!orb)return;orb.textContent='';orb.style.setProperty('background-image',`url("${rankBadgeUrl(t)}")`,'important');node.dataset.rankTier=t.name})}
if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',syncHomeRankBadges,{once:true})}else{syncHomeRankBadges()}
'''
text = replace_once(text, old, "", "obsolete Home rank image pass")

old = '''async function fetchRows(csvUrl){const url=csvUrl+(csvUrl.includes("?")?"&":"?")+"t="+Date.now();const res=await fetch(url);if(!res.ok)throw new Error("Unable to load CSV");return cleanRows(parseCSV(await res.text()))}'''
new = '''const csvFetchInflight=new Map();
async function fetchRows(csvUrl){
  const key=String(csvUrl||"");
  if(csvFetchInflight.has(key))return csvFetchInflight.get(key);
  const request=(async()=>{
    const url=key+(key.includes("?")?"&":"?")+"t="+Date.now();
    const res=await fetch(url);
    if(!res.ok)throw new Error("Unable to load CSV");
    return cleanRows(parseCSV(await res.text()));
  })().finally(()=>csvFetchInflight.delete(key));
  csvFetchInflight.set(key,request);
  return request;
}'''
text = replace_once(text, old, new, "concurrent CSV request dedupe")

old = '''  configureEventCategories(event);
  renderEventPlayerSuggestions();

  e.modal.classList.remove("hidden");'''
new = '''  configureEventCategories(event);
  renderEventPlayerSuggestions();
  if(!playerDb.length){
    loadPlayerDb().then(()=>{
      renderEventPlayerSuggestions();
      syncEventMyttIdFromName();
    });
  }

  e.modal.classList.remove("hidden");'''
text = replace_once(text, old, new, "deferred Event player DB")

old = '''async function loadInitialData(){
  const isPhone=window.innerWidth<=860;
  const essential=[
    loadPlayerDb(),
    loadLeaderboard(config.singlesCsv,"singlesBody","singlesStatus","singles","singles")
  ];

  if(!isPhone){
    essential.push(loadActivePlayers(),loadActiveDoublesTeams(),ensureDoublesData(),ensureMatchData());
  }

  await Promise.allSettled(essential);
  renderPlayers();
  renderSearch();
  renderEventPlayerSuggestions();

  // Phone first paint only waits for Player DB + Singles. Warm match history
  // and the Singles session after paint; Doubles stays fully on-demand.
  if(isPhone){
    const idle=window.requestIdleCallback||((fn)=>setTimeout(fn,1600));
    idle(()=>Promise.allSettled([ensureMatchData(),loadActivePlayers()]),{timeout:3500});
  }
}'''
new = '''async function loadInitialData(){
  const isPhone=window.innerWidth<=860;

  if(isPhone){
    const idle=window.requestIdleCallback||((fn)=>setTimeout(fn,900));

    // Home needs no leaderboard/player payload for first paint. Only warm the
    // Singles session status quickly so the Home submit CTA becomes accurate.
    idle(()=>loadActivePlayers(),{timeout:1500});

    // Warm common next-page data later without competing with first paint.
    // Match history and all Doubles payloads remain genuinely on-demand.
    setTimeout(()=>{
      idle(()=>Promise.allSettled([
        loadPlayerDb(),
        loadLeaderboard(config.singlesCsv,"singlesBody","singlesStatus","singles","singles")
      ]),{timeout:4500});
    },1600);
    return;
  }

  await Promise.allSettled([
    loadPlayerDb(),
    loadLeaderboard(config.singlesCsv,"singlesBody","singlesStatus","singles","singles"),
    loadActivePlayers(),
    loadActiveDoublesTeams(),
    ensureDoublesData(),
    ensureMatchData()
  ]);
  renderPlayers();
  renderSearch();
  renderEventPlayerSuggestions();
}'''
text = replace_once(text, old, new, "page-aware mobile startup")

old = '''if(target==="home")jobs.push(loadPlayerDb(),loadLeaderboard(config.singlesCsv,"singlesBody","singlesStatus","singles","singles"),loadActivePlayers());'''
new = '''if(target==="home")jobs.push(loadActivePlayers());'''
text = replace_once(text, old, new, "light mobile Home refresh")

old = '''if(target==="singles")jobs.push(loadLeaderboard(config.singlesCsv,"singlesBody","singlesStatus","singles","singles"),loadActivePlayers());'''
new = '''if(target==="singles")jobs.push(loadPlayerDb(),loadLeaderboard(config.singlesCsv,"singlesBody","singlesStatus","singles","singles"),loadActivePlayers());'''
text = replace_once(text, old, new, "Singles avatar data guarantee")

old = '''config.ensurePageData=function(target){
  const page=String(target||"");
  if(page==="events")return loadUpcomingEvents({maxAttempts:1,timeoutMs:18000});
  if(page==="doubles")return Promise.allSettled([ensureDoublesData(),loadActiveDoublesTeams()]);
  if(page==="players")return Promise.allSettled([ensureMatchData(),loadPlayerDb()]);
  if(page==="singles")return Promise.allSettled([loadActivePlayers()]);
  if(page==="submit")return Promise.allSettled([loadActivePlayers(),loadActiveDoublesTeams()]);
  return Promise.resolve();
};'''
new = '''config.ensurePageData=function(target){
  const page=String(target||"");
  if(page==="events")return loadUpcomingEvents({maxAttempts:1,timeoutMs:18000});
  if(page==="market")return window.MYTT_LOAD_MARKET?.()||Promise.resolve();
  if(page==="doubles")return Promise.allSettled([ensureDoublesData(),loadActiveDoublesTeams()]);
  if(page==="players")return Promise.allSettled([
    ensureMatchData(),
    loadPlayerDb(),
    loadLeaderboard(config.singlesCsv,"singlesBody","singlesStatus","singles","singles")
  ]);
  if(page==="singles")return Promise.allSettled([
    loadPlayerDb(),
    loadLeaderboard(config.singlesCsv,"singlesBody","singlesStatus","singles","singles"),
    loadActivePlayers()
  ]);
  if(page==="submit")return Promise.allSettled([loadActivePlayers(),loadActiveDoublesTeams()]);
  return Promise.resolve();
};'''
text = replace_once(text, old, new, "deferred page data guarantees")

old = '''bindEvents();bindSinglesFormEvents();bindDoublesFormEvents();bindJoinFormEvents();bindEventRegistrationEvents();
// Events remain a first-class fast path; core data now loads in parallel.
loadUpcomingEvents();
loadInitialData();'''
new = '''function primeUpcomingEventsFromCache(){
  const cached=readCachedUpcomingEvents();
  const bundled=bundledUpcomingEvents();
  upcomingEvents=cached.length?cached:bundled;
  renderUpcomingEvents();
  return upcomingEvents;
}

bindEvents();bindSinglesFormEvents();bindDoublesFormEvents();bindJoinFormEvents();bindEventRegistrationEvents();
// Mobile Home renders a safe cached/bundled event card immediately; opening
// Events performs the live refresh. Desktop keeps the live startup refresh.
if(window.innerWidth<=860)primeUpcomingEventsFromCache();
else loadUpcomingEvents();
loadInitialData();'''
text = replace_once(text, old, new, "cached mobile Event startup")

path.write_text(text, encoding="utf-8")

# ------------------------------------------------------------------
# mobile-polish-v23.js
# V1 now writes native avatar loading hints at creation time, so the
# whole-document MutationObserver is redundant. Keep the profile-only
# observer because it powers collapsible profile panels.
# ------------------------------------------------------------------
path = Path("mobile-polish-v23.js")
text = path.read_text(encoding="utf-8")
old = '''  function tuneAvatarImage(img) {
    if (!(img instanceof HTMLImageElement)) return;
    const src = String(img.getAttribute("src") || "").trim();
    if (!/^\\.?\\/?avatars\\//i.test(src)) return;

    if (!img.hasAttribute("loading")) img.loading = "lazy";
    if (!img.hasAttribute("decoding")) img.decoding = "async";
  }

  function tuneAvatarImages(root) {
    if (!root) return;
    if (root instanceof HTMLImageElement) tuneAvatarImage(root);
    if (!root.querySelectorAll) return;

    root
      .querySelectorAll('img[src^="avatars/"],img[src^="./avatars/"],img[src^="/avatars/"]')
      .forEach(tuneAvatarImage);
  }

  function initAvatarLazyLoading() {
    tuneAvatarImages(document);

    const observer = new MutationObserver((records) => {
      records.forEach((record) => {
        record.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) tuneAvatarImages(node);
        });
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

'''
text = replace_once(text, old, "", "remove redundant avatar DOM observer")
old = '''  function init() {
    initAvatarLazyLoading();
    watchProfile();
    initHomeRankJourneyScrollFix();
  }'''
new = '''  function init() {
    watchProfile();
    initHomeRankJourneyScrollFix();
  }'''
text = replace_once(text, old, new, "mobile polish init")
path.write_text(text, encoding="utf-8")

# ------------------------------------------------------------------
# marketplace-loader-v2.js
# Load the 31.9 KB Market-only stylesheet + 21.5 KB Market JS only
# when Market is requested (or shortly before reaching it on desktop).
# ------------------------------------------------------------------
loader = r'''(function () {
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
'''
Path("marketplace-loader-v2.js").write_text(loader, encoding="utf-8")

# Sanity checks before action validation.
index = Path("index.html").read_text(encoding="utf-8")
app = Path("app.js").read_text(encoding="utf-8")
mobile = Path("mobile-polish-v23.js").read_text(encoding="utf-8")
assert 'marketplace-base-v20-3.css?v=20260824-mobile-perf-v1' not in index
assert '<script defer src="marketplace-core-v23.js?' not in index
assert f'marketplace-loader-v2.js?v={VERSION}' in index
assert f'app.js?v={VERSION}' in index
assert f'mobile-polish-v23.js?v={VERSION}' in index
assert 'novice-standalone.webp?v=20260823-v63-ringmerge' in index
assert 'syncHomeRankBadges' not in app
assert 'const csvFetchInflight=new Map();' in app
assert 'primeUpcomingEventsFromCache' in app
assert 'if(page==="market")return window.MYTT_LOAD_MARKET?.()' in app
assert 'initAvatarLazyLoading' not in mobile
print("MYTT Mobile Performance V2 patch applied successfully.")
