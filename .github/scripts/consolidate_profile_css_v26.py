from pathlib import Path
import re

site_path = Path('site-overrides-v24.css')
polish_path = Path('mobile-polish-v23.css')
loader_path = Path('marketplace.js')
index_path = Path('index.html')

site = site_path.read_text(encoding='utf-8')
polish = polish_path.read_text(encoding='utf-8')
loader = loader_path.read_text(encoding='utf-8')
index = index_path.read_text(encoding='utf-8')

marker = 'SOURCE: index.html <style id="mytt-mobile-v20-1-profile-clearance">'
pos = site.find(marker)
if pos < 0:
    raise SystemExit('V20.1 profile block not found')
start = site.rfind('/* =========================================================', 0, pos)
if start < 0:
    raise SystemExit('V20.1 block start not found')
old_block = site[start:]
for token in ['#profileModal{','#profileModal .modal-card{','#profileModal .modal-close{','#profileContent{','#profileContent .profile-hero-pro{','#profileContent .profile-avatar-pro{']:
    if token not in old_block:
        raise SystemExit(f'Expected token missing from old block: {token}')

site = site[:start].rstrip() + '\n'

anchor = '''  /* ---------------------------------------------------------\n     1. Player Profile modal: one scroll surface, no nav overlap\n     --------------------------------------------------------- */\n'''
if anchor not in polish:
    raise SystemExit('mobile-polish profile anchor not found')
if 'Profile sheet geometry migrated from V20.1' in polish:
    raise SystemExit('Profile geometry migration already present')

migrated = '''  /* ---------------------------------------------------------
     1a. Profile sheet geometry migrated from V20.1
     These are the layout primitives still used by the current phone profile.
     --------------------------------------------------------- */
  #profileModal{
    right:0 !important;
    bottom:0 !important;
    left:0 !important;
    padding:8px 0 0 !important;
    place-items:start center !important;
    overflow:hidden !important;
  }

  #profileModal .modal-backdrop{
    inset:0 !important;
  }

  #profileModal .modal-card{
    width:100% !important;
    max-height:calc(100dvh - var(--mytt-mobile-header,60px) - 8px) !important;
    margin:0 !important;
    padding:0 12px 26px !important;
    border-radius:18px 18px 0 0 !important;
  }

  #profileModal .modal-close{
    right:auto !important;
  }

  #profileContent{
    clear:both !important;
    padding:18px 8px 30px !important;
  }

  #profileContent .profile-hero-pro{
    margin-top:0 !important;
  }

  #profileContent .profile-avatar-pro{
    margin-top:2px !important;
  }

'''
polish = polish.replace(anchor, migrated + anchor, 1)

loader, n1 = re.subn(r'mobile-polish-v23\.css\?v=[^"\']+', 'mobile-polish-v23.css?v=20260821-2', loader, count=1)
index, n2 = re.subn(r'site-overrides-v24\.css\?v=[^"\']+', 'site-overrides-v24.css?v=20260821-5', index, count=1)
index, n3 = re.subn(r'marketplace\.js\?v=[^"\']+', 'marketplace.js?v=20260821-profile-v26-1', index, count=1)
if (n1, n2, n3) != (1, 1, 1):
    raise SystemExit(f'Cache-key update failed: polish={n1}, site={n2}, loader={n3}')

if marker in site:
    raise SystemExit('Old V20.1 profile block still remains')
for token in ['Profile sheet geometry migrated from V20.1','#profileModal:not(.hidden)','z-index:5200 !important','top:var(--mytt-mobile-header) !important','height:calc(100dvh - var(--mytt-mobile-header)) !important','padding:0 12px 26px !important','padding:18px 8px 30px !important','.profile-panel-collapsible']:
    if token not in polish:
        raise SystemExit(f'Final profile token missing: {token}')

site_path.write_text(site, encoding='utf-8')
polish_path.write_text(polish, encoding='utf-8')
loader_path.write_text(loader, encoding='utf-8')
index_path.write_text(index, encoding='utf-8')
