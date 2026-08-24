from pathlib import Path

VERSION = "20260824-mobile-perf-v1"


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly 1 match, found {count}")
    return text.replace(old, new, 1)


# Idempotent guard for PR synchronize events after the first patch commit.
index_path = Path("index.html")
index_text = index_path.read_text(encoding="utf-8")
if f"app.js?v={VERSION}" in index_text:
    print("MYTT Mobile Performance V1 is already applied.")
    raise SystemExit(0)

# ------------------------------------------------------------
# index.html: remove CSS discovery waterfall, preconnect to the
# Google data origins, and download independent JS in parallel.
# ------------------------------------------------------------
old_head = '''  <link rel="stylesheet" href="style.css?v=20260818-mobile-v20-1">
  <link rel="stylesheet" href="marketplace.css?v=20260821-final-v28-1">
  <link rel="stylesheet" href="player-card-rank-badges-v1.css?v=20260821-rank-v23-1">

<link rel="stylesheet" href="site-overrides-v24.css?v=20260821-final-v28-1">
'''
new_head = f'''  <link rel="preconnect" href="https://docs.google.com">
  <link rel="preconnect" href="https://script.google.com">

  <link rel="stylesheet" href="style.css?v={VERSION}">
  <link rel="stylesheet" href="marketplace-base-v20-3.css?v={VERSION}">
  <link rel="stylesheet" href="home-mobile-v20-4.css?v={VERSION}">
  <link rel="stylesheet" href="home-rank-geometry.css?v={VERSION}">
  <link rel="stylesheet" href="rank-badges-v22.css?v={VERSION}">
  <link rel="stylesheet" href="marketplace.css?v={VERSION}">
  <link rel="stylesheet" href="player-card-rank-badges-v1.css?v={VERSION}">
  <link rel="stylesheet" href="site-overrides-v24.css?v={VERSION}">

  <link id="mytt-mobile-polish-v23-style" rel="stylesheet" href="mobile-polish-v23.css?v={VERSION}">
  <link id="mytt-rank-system-v27-style" rel="stylesheet" href="rank-system-v27.css?v={VERSION}">
  <link id="mytt-rank-effects-v31-style" rel="stylesheet" href="rank-effects-v31.css?v={VERSION}">
  <link id="mytt-rank-mobile-polish-v47-style" rel="stylesheet" href="rank-mobile-polish-v47.css?v={VERSION}">
  <link id="mytt-rank-gold-ring-v62-style" rel="stylesheet" href="rank-gold-ring-v62.css?v={VERSION}">
'''
index_text = replace_once(index_text, old_head, new_head, "index stylesheet block")

old_scripts = '''<script src="app.js?v=20260821-event-cleanup-2"></script>
<script src="marketplace.js?v=20260823-rank-v59-1"></script>'''
new_scripts = f'''<script defer src="app.js?v={VERSION}"></script>
<script defer src="rank-system-v27.js?v={VERSION}"></script>
<script defer src="marketplace-core-v23.js?v={VERSION}"></script>
<script defer src="mobile-polish-v23.js?v={VERSION}"></script>'''
index_text = replace_once(index_text, old_scripts, new_scripts, "index script block")
index_path.write_text(index_text, encoding="utf-8")

# ------------------------------------------------------------
# marketplace.css: imports are now direct links in index.html,
# so the browser discovers/fetches them immediately in parallel.
# ------------------------------------------------------------
path = Path("marketplace.css")
text = path.read_text(encoding="utf-8")
old_imports = '''@import url("./marketplace-base-v20-3.css?v=20260818-base-v20-3");
@import url("./home-mobile-v20-4.css?v=20260821-final-v28-1");
@import url("./home-rank-geometry.css?v=20260821-rank-geometry-1");
@import url("./rank-badges-v22.css?v=20260821-hof-optical-1");
'''
text = replace_once(text, old_imports, "", "marketplace CSS imports")
path.write_text(text, encoding="utf-8")

# ------------------------------------------------------------
# app.js: native avatar loading hints at creation time and a
# lighter phone startup path. Doubles session data becomes lazy.
# ------------------------------------------------------------
path = Path("app.js")
text = path.read_text(encoding="utf-8")

old = '''function opponentAvatarHTML(opponent){const db=findDbByName(opponent);const src=avatarUrl(db);return `<div class="match-avatar">${src?`<img src="${src}" alt="${opponent}" onerror="this.parentElement.textContent='👤'">`:"👤"}</div>`}'''
new = '''function opponentAvatarHTML(opponent){const db=findDbByName(opponent);const src=avatarUrl(db);return `<div class="match-avatar">${src?`<img src="${src}" alt="${opponent}" loading="lazy" decoding="async" fetchpriority="low" onerror="this.parentElement.textContent='👤'">`:"👤"}</div>`}'''
text = replace_once(text, old, new, "opponent avatar lazy loading")

old = '''function avatarHTML(db,cls="avatar"){const src=avatarUrl(db);return `<div class="${cls}">${src?`<img src="${src}" alt="${db?.name||"Player"}" onerror="this.parentElement.textContent='👤'">`:"👤"}</div>`}'''
new = '''function avatarHTML(db,cls="avatar"){const src=avatarUrl(db);const profile=String(cls||"").includes("profile-avatar");const loading=profile?"eager":"lazy";const priority=profile?"high":"low";return `<div class="${cls}">${src?`<img src="${src}" alt="${db?.name||"Player"}" loading="${loading}" decoding="async" fetchpriority="${priority}" onerror="this.parentElement.textContent='👤'">`:"👤"}</div>`}'''
text = replace_once(text, old, new, "player avatar native loading hints")

old = '''function openSinglesResultForm(){
  const e=formEls();
  if(!e.modal)return;
  if(!e.date.value)e.date.value=todayLocalISO();
  syncSinglesSessionModal();
  e.modal.classList.remove("hidden");
  e.modal.setAttribute("aria-hidden","false");
  document.body.classList.add("result-modal-open");
  if(activePlayersLoaded&&!activePlayersError&&activePlayers.length){
    setTimeout(()=>e.aSearch?.focus(),80);
  }
}'''
new = '''function openSinglesResultForm(){
  const e=formEls();
  if(!e.modal)return;
  if(!e.date.value)e.date.value=todayLocalISO();
  syncSinglesSessionModal();
  e.modal.classList.remove("hidden");
  e.modal.setAttribute("aria-hidden","false");
  document.body.classList.add("result-modal-open");

  const focusWhenReady=()=>{
    if(!e.modal.classList.contains("hidden")&&activePlayersLoaded&&!activePlayersError&&activePlayers.length){
      setTimeout(()=>e.aSearch?.focus(),80);
    }
  };

  if(!activePlayersLoaded){
    loadActivePlayers().then(focusWhenReady);
  }else{
    focusWhenReady();
  }
}'''
text = replace_once(text, old, new, "on-demand singles session")

old = '''function openDoublesResultForm(){
  const e=doublesFormEls();
  if(!e.modal)return;
  if(!e.date.value)e.date.value=todayLocalISO();
  syncDoublesSessionModal();
  e.modal.classList.remove("hidden");
  e.modal.setAttribute("aria-hidden","false");
  document.body.classList.add("result-modal-open");
  if(activeDoublesTeamsLoaded&&!activeDoublesTeamsError&&activeDoublesTeams.length){
    setTimeout(()=>e.aSearch?.focus(),80);
  }
}'''
new = '''function openDoublesResultForm(){
  const e=doublesFormEls();
  if(!e.modal)return;
  if(!e.date.value)e.date.value=todayLocalISO();
  syncDoublesSessionModal();
  e.modal.classList.remove("hidden");
  e.modal.setAttribute("aria-hidden","false");
  document.body.classList.add("result-modal-open");

  const focusWhenReady=()=>{
    if(!e.modal.classList.contains("hidden")&&activeDoublesTeamsLoaded&&!activeDoublesTeamsError&&activeDoublesTeams.length){
      setTimeout(()=>e.aSearch?.focus(),80);
    }
  };

  if(!activeDoublesTeamsLoaded){
    Promise.allSettled([ensureDoublesData(),loadActiveDoublesTeams()]).then(focusWhenReady);
  }else{
    focusWhenReady();
  }
}'''
text = replace_once(text, old, new, "on-demand doubles session")

old = '''async function loadInitialData(){
  const isPhone=window.innerWidth<=860;
  const essential=[
    loadPlayerDb(),
    loadLeaderboard(config.singlesCsv,"singlesBody","singlesStatus","singles","singles"),
    loadActivePlayers(),
    loadActiveDoublesTeams()
  ];

  if(!isPhone){
    essential.push(ensureDoublesData(),ensureMatchData());
  }

  await Promise.allSettled(essential);
  renderPlayers();
  renderSearch();
  renderEventPlayerSuggestions();

  // On phones, keep first paint light. Match history can warm in the
  // background; Doubles waits until the user actually opens that page.
  if(isPhone){
    const idle=window.requestIdleCallback||((fn)=>setTimeout(fn,1600));
    idle(()=>ensureMatchData(),{timeout:3500});
  }
}'''
new = '''async function loadInitialData(){
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
text = replace_once(text, old, new, "mobile initial data path")

old = '''if(target==="home")jobs.push(loadPlayerDb(),loadLeaderboard(config.singlesCsv,"singlesBody","singlesStatus","singles","singles"),loadActivePlayers(),loadActiveDoublesTeams());'''
new = '''if(target==="home")jobs.push(loadPlayerDb(),loadLeaderboard(config.singlesCsv,"singlesBody","singlesStatus","singles","singles"),loadActivePlayers());'''
text = replace_once(text, old, new, "mobile home refresh")

old = '''if(page==="doubles")return ensureDoublesData();'''
new = '''if(page==="doubles")return Promise.allSettled([ensureDoublesData(),loadActiveDoublesTeams()]);'''
text = replace_once(text, old, new, "deferred doubles page data")
path.write_text(text, encoding="utf-8")

# ------------------------------------------------------------
# rank-system-v27.js: only visible phone badges are eager.
# ------------------------------------------------------------
path = Path("rank-system-v27.js")
text = path.read_text(encoding="utf-8")
old = '''      img.alt = `${rank.name} badge`;
      img.decoding = "async";
      img.loading = "eager";
      shell.appendChild(img);'''
new = '''      img.alt = `${rank.name} badge`;
      img.decoding = "async";
      const phone = window.innerWidth <= 768;
      const aboveFold = !phone || index <= 3;
      img.loading = aboveFold ? "eager" : "lazy";
      img.fetchPriority = index === 0 ? "high" : (aboveFold ? "auto" : "low");
      shell.appendChild(img);'''
text = replace_once(text, old, new, "rank badge loading priority")
path.write_text(text, encoding="utf-8")

# ------------------------------------------------------------
# Validate patch shape before the workflow's syntax checks.
# ------------------------------------------------------------
index_text = Path("index.html").read_text(encoding="utf-8")
market_css = Path("marketplace.css").read_text(encoding="utf-8")
app_text = Path("app.js").read_text(encoding="utf-8")

assert "marketplace.js?v=" not in index_text
assert "@import" not in market_css
assert f"app.js?v={VERSION}" in index_text
assert f"mobile-polish-v23.css?v={VERSION}" in index_text
assert 'loading="${loading}" decoding="async" fetchpriority="${priority}"' in app_text
assert 'Promise.allSettled([ensureDoublesData(),loadActiveDoublesTeams()])' in app_text
print("MYTT Mobile Performance V1 patch applied successfully.")
