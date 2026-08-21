from pathlib import Path
import re

ROOT = Path('.')

# ---------------------------------------------------------------------------
# Small CSS parser used only for conservative exact-selector/property cleanup.
# It deliberately ignores shorthand/longhand relationships and only removes an
# earlier declaration when a later declaration with the same property exists
# under the exact same selector list and at-rule context.
# ---------------------------------------------------------------------------

def skip_comment(text, i, end):
    if text.startswith('/*', i):
        j = text.find('*/', i + 2, end)
        return end if j < 0 else j + 2
    return i


def find_matching_brace(text, open_pos, end):
    depth = 1
    i = open_pos + 1
    quote = None
    esc = False
    while i < end:
        if text.startswith('/*', i):
            i = skip_comment(text, i, end)
            continue
        ch = text[i]
        if quote:
            if esc:
                esc = False
            elif ch == '\\':
                esc = True
            elif ch == quote:
                quote = None
            i += 1
            continue
        if ch in ('"', "'"):
            quote = ch
            i += 1
            continue
        if ch == '{':
            depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0:
                return i
        i += 1
    raise ValueError('Unbalanced CSS braces')


def normalise_prelude(s):
    s = re.sub(r'/\*.*?\*/', ' ', s, flags=re.S)
    s = re.sub(r'\s+', ' ', s).strip()
    s = re.sub(r'\s*,\s*', ',', s)
    return s


def split_declarations(text, start, end):
    out = []
    seg_start = start
    i = start
    quote = None
    esc = False
    paren = 0
    bracket = 0
    while i <= end:
        boundary = i == end
        if not boundary and text.startswith('/*', i):
            i = skip_comment(text, i, end)
            continue
        if not boundary:
            ch = text[i]
            if quote:
                if esc:
                    esc = False
                elif ch == '\\':
                    esc = True
                elif ch == quote:
                    quote = None
                i += 1
                continue
            if ch in ('"', "'"):
                quote = ch
                i += 1
                continue
            if ch == '(':
                paren += 1
            elif ch == ')':
                paren = max(0, paren - 1)
            elif ch == '[':
                bracket += 1
            elif ch == ']':
                bracket = max(0, bracket - 1)
        if boundary or (text[i] == ';' and paren == 0 and bracket == 0):
            seg_end = i + (0 if boundary else 1)
            raw = text[seg_start:i]
            clean = re.sub(r'/\*.*?\*/', ' ', raw, flags=re.S).strip()
            if clean and ':' in clean and not clean.startswith('@'):
                prop, value = clean.split(':', 1)
                prop = prop.strip().lower()
                value = value.strip()
                if re.fullmatch(r'--[\w-]+|[-_a-zA-Z][\w-]*', prop):
                    important = bool(re.search(r'!\s*important\s*$', value, flags=re.I))
                    value_norm = re.sub(r'!\s*important\s*$', '', value, flags=re.I).strip()
                    out.append({
                        'prop': prop,
                        'value': value_norm,
                        'important': important,
                        'start': seg_start,
                        'end': seg_end,
                    })
            seg_start = seg_end
        i += 1
    return out


def parse_css(text):
    rules = []
    decls = []

    def walk(start, end, context):
        i = start
        chunk_start = start
        quote = None
        esc = False
        paren = 0
        bracket = 0
        while i < end:
            if text.startswith('/*', i):
                i = skip_comment(text, i, end)
                continue
            ch = text[i]
            if quote:
                if esc:
                    esc = False
                elif ch == '\\':
                    esc = True
                elif ch == quote:
                    quote = None
                i += 1
                continue
            if ch in ('"', "'"):
                quote = ch
                i += 1
                continue
            if ch == '(':
                paren += 1
            elif ch == ')':
                paren = max(0, paren - 1)
            elif ch == '[':
                bracket += 1
            elif ch == ']':
                bracket = max(0, bracket - 1)
            elif ch == ';' and paren == 0 and bracket == 0:
                chunk_start = i + 1
            elif ch == '{' and paren == 0 and bracket == 0:
                close = find_matching_brace(text, i, end)
                prelude_start = chunk_start
                prelude = normalise_prelude(text[prelude_start:i])
                # Trim leading whitespace/comments from the recorded rule range.
                rs = prelude_start
                while rs < i and text[rs].isspace():
                    rs += 1
                if prelude.startswith('@'):
                    walk(i + 1, close, context + (prelude,))
                elif prelude:
                    rule = {
                        'selector': prelude,
                        'context': context,
                        'start': rs,
                        'open': i,
                        'close': close,
                        'end': close + 1,
                    }
                    rules.append(rule)
                    for d in split_declarations(text, i + 1, close):
                        d['selector'] = prelude
                        d['context'] = context
                        decls.append(d)
                i = close
                chunk_start = close + 1
            i += 1

    walk(0, len(text), tuple())
    return rules, decls


def final_declaration_map(text):
    _, decls = parse_css(text)
    final = {}
    for d in decls:
        key = (d['context'], d['selector'], d['prop'])
        prev = final.get(key)
        if prev is None or d['important'] or not prev['important']:
            # If prev is important and current is not, prev remains effective.
            if prev is not None and prev['important'] and not d['important']:
                continue
            final[key] = {
                'value': d['value'],
                'important': d['important'],
            }
    return final


def conservative_dedupe(text):
    before_map = final_declaration_map(text)
    _, decls = parse_css(text)
    seen_importance = {}
    removals = []
    for d in reversed(decls):
        key = (d['context'], d['selector'], d['prop'])
        later = seen_importance.get(key, -1)
        level = 1 if d['important'] else 0
        if later >= level:
            removals.append((d['start'], d['end']))
        else:
            seen_importance[key] = max(later, level)
    for a,b in sorted(removals, reverse=True):
        text = text[:a] + text[b:]
    # Collapse whitespace-only lines created by removed declarations, but keep
    # readable separation between rule groups.
    text = re.sub(r'\n[ \t]+\n', '\n\n', text)
    text = re.sub(r'\n{4,}', '\n\n\n', text)
    after_map = final_declaration_map(text)
    if before_map != after_map:
        missing = set(before_map) ^ set(after_map)
        changed = [k for k in before_map.keys() & after_map.keys() if before_map[k] != after_map[k]]
        raise SystemExit(f'CSS equivalence guard failed: missing={len(missing)} changed={len(changed)}')
    return text, len(removals)


def remove_dead_rank_scroll_rules(text):
    rules, _ = parse_css(text)
    dead = {'.rank-scroll-hint', '.rank-scroll-hint span'}
    removals = [(r['start'], r['end']) for r in rules if r['selector'] in dead]
    for a,b in sorted(removals, reverse=True):
        text = text[:a] + text[b:]
    text = re.sub(r'\n{4,}', '\n\n\n', text)
    return text, len(removals)


# 1) Consolidate the extracted override layer without changing live cascade.
site_path = ROOT / 'site-overrides-v24.css'
site = site_path.read_text(encoding='utf-8')
site, deduped = conservative_dedupe(site)
site, dead_rank_rules = remove_dead_rank_scroll_rules(site)
site = re.sub(
    r'/\* MYTT SITE OVERRIDES V24.*?\*/',
    '/* MYTT SITE OVERRIDES — CONSOLIDATED\n'
    '   Historical inline patches were extracted from index.html, then\n'
    '   conservatively compacted by removing only exact-selector/property\n'
    '   declarations superseded later in the same at-rule context.\n'
    '*/',
    site,
    count=1,
    flags=re.S,
)
if 'rank-scroll-hint' in site:
    raise SystemExit('Dead rank-scroll-hint CSS still present')
site_path.write_text(site.rstrip() + '\n', encoding='utf-8')

# 2) Remove one exact dead declaration from the Home mobile file: the same
# selector/property is overridden later by site-overrides with !important.
home_path = ROOT / 'home-mobile-v20-4.css'
home = home_path.read_text(encoding='utf-8')
home = home.replace('/* MYTT MOBILE V20.11 — larger + slightly taller safe single-line home title */',
                    '/* MYTT MOBILE HOME TITLE — compact single-line phone treatment */', 1)
home, n_home = re.subn(
    r'@media \(max-width:860px\)\{\n  \.hero-home-final\{\n    padding-top:12px !important;\n  \}\n\n',
    '@media (max-width:860px){\n',
    home,
    count=1,
)
if n_home != 1:
    raise SystemExit('Expected obsolete Home padding declaration not found')
home_path.write_text(home, encoding='utf-8')

# 3) Clean loader wording left from the pre-consolidated Rank implementation.
loader_path = ROOT / 'marketplace.js'
loader = loader_path.read_text(encoding='utf-8')
old_comment = '''  /* marketplace.js is parser-loaded by index.html. Keep the existing core\n     synchronous so rank mapping is ready before async Sheet data returns. */'''
new_comment = '''  /* marketplace.js is parser-loaded by index.html. Keep the core\n     synchronous so marketplace helpers initialise in deterministic order. */'''
if old_comment not in loader:
    raise SystemExit('Expected stale marketplace loader comment not found')
loader = loader.replace(old_comment, new_comment, 1)
loader_path.write_text(loader, encoding='utf-8')

# 4) Index housekeeping + cache bust only files changed in this pass.
index_path = ROOT / 'index.html'
index = index_path.read_text(encoding='utf-8')
index = re.sub(r'site-overrides-v24\.css\?v=[^"\']+', 'site-overrides-v24.css?v=20260821-final-v28-1', index, count=1)
index = re.sub(r'marketplace\.js\?v=[^"\']+', 'marketplace.js?v=20260821-final-v28-1', index, count=1)
# marketplace.css imports home-mobile-v20-4.css, so bump that import below.
# Remove the large blank gap left when inline <style> blocks were extracted.
index = re.sub(r'(<link rel="stylesheet" href="site-overrides-v24\.css\?v=[^"]+">)\s*(</head>)', r'\1\n\n\2', index, count=1)
index_path.write_text(index, encoding='utf-8')

market_css_path = ROOT / 'marketplace.css'
market_css = market_css_path.read_text(encoding='utf-8')
market_css = re.sub(r'home-mobile-v20-4\.css\?v=[^"\')]+', 'home-mobile-v20-4.css?v=20260821-final-v28-1', market_css, count=1)
market_css = market_css.replace('/* MYTT MOBILE V20.3 — COMPACT PLAYER PROFILE */',
                                '/* Compact mobile Player Profile presentation. */', 1)
market_css_path.write_text(market_css, encoding='utf-8')
# marketplace.css itself changed, so refresh its index key.
index = index_path.read_text(encoding='utf-8')
index = re.sub(r'marketplace\.css\?v=[^"\']+', 'marketplace.css?v=20260821-final-v28-1', index, count=1)
index_path.write_text(index, encoding='utf-8')

# 5) Replace stale package/sprint notes with one current repository README.
readme = '''# MYTT — Malaysia Table Tennis Rating System

Official source for **mytt.my**.

## Current architecture

- `index.html` — page structure, navigation, forms and MYTT endpoint configuration.
- `app.js` — player data, Singles/Doubles leaderboards, Events, profiles, match history and the canonical MYTT rank tier mapping.
- `style.css` — core desktop/mobile presentation.
- `site-overrides-v24.css` — consolidated late visual overrides retained from the historical inline CSS layer.
- `marketplace.js` + `marketplace-core-v23.js` — Gear Market client logic and lazy loading.
- `marketplace.css` + imported CSS modules — Market, Home mobile, Rank and compact Profile presentation.
- `mobile-polish-v23.css/js` — phone safe-area, form zoom prevention and compact Player Profile behaviour.
- `rank-badges-v22.css`, `home-rank-geometry.css`, `player-card-rank-badges-v1.css` — current Rank presentation only. Badge-to-tier mapping lives in `app.js`.
- `avatars/` and `rank-badges/` — website image assets.

## Backend reference files

- `MYTT_Events_Registration_WebApp_V20_AUTO_CONFIRM.gs` — Event registration backend reference.
- `MYTT_Gear_Market_WebApp.gs` — Gear Market backend reference, including 1–5 listing photos.

The live website talks to Google Sheets / Apps Script endpoints configured in `index.html`. When updating an existing Apps Script backend, edit the **existing deployment** so the current `/exec` URL remains unchanged unless a deliberate endpoint migration is planned.

## Current product behaviour

- Mobile bottom navigation: Home / Singles / Events / Doubles / More.
- Event registration confirms immediately when the event backend accepts it.
- Join MYTT registrations require admin review before the player profile is activated.
- Gear Market listings require admin review; approved listings can later be marked Sold or Rejected.
- Gear Market supports 1–5 photos per listing; Photo 1 is the listing cover.
- Phone form controls use 16px text to avoid iOS Safari focus zoom.
- Player Profile keeps the latest 10 Recent Matches visible and collapses only secondary sections on phones.

## Deployment

The site is published with GitHub Pages from this repository and the custom domain in `CNAME`.

For website-only changes, merge to `main`, wait for Pages deployment, then verify the affected desktop and mobile views. Do not redeploy a working Apps Script backend unless its `.gs` logic was intentionally changed.
'''
(ROOT / 'README.md').write_text(readme, encoding='utf-8')
for stale_doc in ['README.txt','README_FIRST.txt','MARKET_SETUP.txt','MULTI_PHOTO_UPDATE_STEPS.txt']:
    p = ROOT / stale_doc
    if p.exists():
        p.unlink()

# 6) Remove root files proven unused by current runtime source after stale docs
# are gone. Do not touch avatars/ or rank-badges/ directories.
runtime_suffixes = {'.html','.css','.js','.gs'}
runtime_files = [p for p in ROOT.rglob('*') if p.is_file() and p.suffix.lower() in runtime_suffixes and '.github' not in p.parts]
runtime_text = '\n'.join(p.read_text(encoding='utf-8', errors='ignore') for p in runtime_files)
deleted_unused = []
for p in sorted(ROOT.iterdir()):
    if not p.is_file():
        continue
    if p.name == 'leaderboard-rookie-v217.css':
        if p.name in runtime_text:
            raise SystemExit('leaderboard-rookie-v217.css unexpectedly referenced')
        p.unlink()
        deleted_unused.append(p.name)
        continue
    if p.suffix.lower() in {'.png','.jpg','.jpeg','.webp','.svg'} and p.name not in runtime_text:
        # Root-only generated/legacy assets; directory assets are intentionally excluded.
        p.unlink()
        deleted_unused.append(p.name)

# 7) Sanity guards.
for required in [
    'style.css','marketplace.css','home-mobile-v20-4.css','home-rank-geometry.css',
    'rank-badges-v22.css','player-card-rank-badges-v1.css','mobile-polish-v23.css',
    'app.js','marketplace.js','marketplace-core-v23.js','index.html','site-overrides-v24.css',
    'event-paddle.webp','event-pro-art.webp'
]:
    if not (ROOT / required).exists():
        raise SystemExit(f'Required live file missing after cleanup: {required}')

final_index = index_path.read_text(encoding='utf-8')
for token in ['site-overrides-v24.css?v=20260821-final-v28-1',
              'marketplace.css?v=20260821-final-v28-1',
              'marketplace.js?v=20260821-final-v28-1']:
    if token not in final_index:
        raise SystemExit(f'Final cache token missing: {token}')

report = [
    'MYTT FINAL CLEANUP V28',
    '=' * 64,
    f'Exact superseded CSS declarations removed: {deduped}',
    f'Dead rank-scroll-hint rules removed: {dead_rank_rules}',
    f'Obsolete Home declaration removed: {n_home}',
    'Stale docs consolidated into README.md: README.txt, README_FIRST.txt, MARKET_SETUP.txt, MULTI_PHOTO_UPDATE_STEPS.txt',
    'Unused root files removed: ' + (', '.join(deleted_unused) if deleted_unused else 'none'),
    f'Final site-overrides-v24.css lines: {site_path.read_text(encoding="utf-8").count(chr(10))+1}',
]
Path('final-cleanup-v28-report.txt').write_text('\n'.join(report) + '\n', encoding='utf-8')
