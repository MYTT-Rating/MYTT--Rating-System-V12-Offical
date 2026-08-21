from pathlib import Path
import re

css_path = Path('site-overrides-v24.css')
index_path = Path('index.html')

css = css_path.read_text(encoding='utf-8')
index = index_path.read_text(encoding='utf-8')

markers = [
    'SOURCE: index.html <style id="mytt-mobile-title-left-fix">',
    'SOURCE: index.html <style id="mytt-submit-title-left-final">',
]

first_pos = css.find(markers[0])
second_pos = css.find(markers[1])
stable_marker = 'SOURCE: index.html <style id="mytt-mobile-stable-polish-v1">'
stable_pos = css.find(stable_marker)
if min(first_pos, second_pos, stable_pos) < 0 or not (first_pos < second_pos < stable_pos):
    raise SystemExit('Expected mobile heading block order not found')

start = css.rfind('/* =========================================================', 0, first_pos)
end = css.rfind('/* =========================================================', 0, stable_pos)
if start < 0 or end <= start:
    raise SystemExit('Unsafe heading block boundaries')

old = css[start:end]
for token in ['#players .section-head', '#submitPage .submit-hub-head', '#submitPageTitle']:
    if token not in old:
        raise SystemExit(f'Expected old heading token missing: {token}')

css = css[:start] + css[end:]

anchor = '''  /* =====================================================\n     3. PLAYERS — search full row, filters 2-up\n     ===================================================== */\n'''
if anchor not in css:
    raise SystemExit('Stable mobile polish anchor not found')

consolidated = '''  /* =====================================================
     MYTT MOBILE HEADING ALIGNMENT — CONSOLIDATED V27
     Retains only the live declarations from the retired
     Players / Join-Submit heading patches.
     ===================================================== */
  #players .section-head{
    justify-content:stretch !important;
  }

  #players .section-head > div:first-child{
    width:auto !important;
  }

  #players .section-head h2{
    justify-self:start !important;
  }

  #submitPage .submit-hub-head{
    justify-content:stretch !important;
    width:100% !important;
  }

  #submitPage .submit-hub-head > div:first-child{
    width:100% !important;
    padding:0 !important;
  }

  #submitPage .submit-hub-head .kicker{
    display:block !important;
    width:100% !important;
    padding:0 !important;
  }

  #submitPage .submit-hub-head h2,
  #submitPage #submitPageTitle{
    display:block !important;
    width:100% !important;
    padding:0 !important;
    justify-self:start !important;
  }

'''
css = css.replace(anchor, consolidated + anchor, 1)

index, n = re.subn(r'site-overrides-v24\.css\?v=[^"\']+', 'site-overrides-v24.css?v=20260821-6', index, count=1)
if n != 1:
    raise SystemExit('site-overrides cache key update failed')

for marker in markers:
    if marker in css:
        raise SystemExit(f'Retired marker still present: {marker}')
for token in ['MYTT MOBILE HEADING ALIGNMENT — CONSOLIDATED V27', '#players .section-head h2{', '#submitPage .submit-hub-head{']:
    if token not in css:
        raise SystemExit(f'Consolidated token missing: {token}')

css_path.write_text(css, encoding='utf-8')
index_path.write_text(index, encoding='utf-8')
