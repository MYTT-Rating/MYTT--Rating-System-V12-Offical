from pathlib import Path
import re
from collections import Counter

ROOT = Path('.')
css_path = ROOT / 'site-overrides-v24.css'
css = css_path.read_text(encoding='utf-8')

marker_re = re.compile(r'/\* =+\n\s*SOURCE: index\.html <style id="([^"]+)">.*?\n\s*=+ \*/', re.S)
markers = list(marker_re.finditer(css))

corpus_files = [
    'index.html','app.js','marketplace.js','marketplace-core-v23.js','mobile-polish-v23.js',
    'style.css','marketplace.css','marketplace-base-v20-3.css','home-mobile-v20-4.css',
    'rank-badges-v22.css','home-rank-geometry.css','player-card-rank-badges-v1.css',
    'mobile-polish-v23.css'
]
external_corpus = ''
for name in corpus_files:
    p = ROOT / name
    if p.exists():
        external_corpus += '\n' + p.read_text(encoding='utf-8', errors='ignore')

selector_re = re.compile(r'([^{}]+)\{')
class_re = re.compile(r'\.([A-Za-z_][\w-]*)')
id_re = re.compile(r'#([A-Za-z_][\w-]*)')

lines = []
lines.append('MYTT REMAINING CLEANUP AUDIT V28')
lines.append('='*72)
lines.append(f'site-overrides-v24.css lines: {css.count(chr(10))+1}')
lines.append(f'source-labelled blocks: {len(markers)}')
lines.append('')

all_selector_counts = Counter()
block_meta = []
for i,m in enumerate(markers):
    start = m.start()
    end = markers[i+1].start() if i+1 < len(markers) else len(css)
    block = css[start:end]
    name = m.group(1)
    selectors = []
    for sm in selector_re.finditer(block):
        raw = sm.group(1).strip()
        if raw.startswith('@') or raw.startswith('/*'):
            continue
        for s in raw.split(','):
            s = re.sub(r'/\*.*?\*/', '', s, flags=re.S).strip()
            if s:
                selectors.append(re.sub(r'\s+', ' ', s))
    for s in selectors:
        all_selector_counts[s] += 1
    classes = sorted(set(class_re.findall(block)))
    ids = sorted(set(id_re.findall(block)))
    dead_classes = [c for c in classes if re.search(r'(?<![\w-])'+re.escape(c)+r'(?![\w-])', external_corpus) is None]
    dead_ids = [x for x in ids if re.search(r'(?<![\w-])'+re.escape(x)+r'(?![\w-])', external_corpus) is None]
    block_meta.append((name, block.count('\n')+1, len(selectors), dead_classes, dead_ids))

lines.append('SOURCE BLOCKS')
lines.append('-'*72)
for name,nlines,nsel,dead_classes,dead_ids in block_meta:
    lines.append(f'{name}: {nlines} lines, {nsel} selectors')
    if dead_classes:
        lines.append('  unreferenced classes outside overrides: ' + ', '.join(dead_classes[:40]))
    if dead_ids:
        lines.append('  unreferenced ids outside overrides: ' + ', '.join(dead_ids[:40]))
lines.append('')

lines.append('DUPLICATE SELECTORS WITHIN site-overrides-v24.css')
lines.append('-'*72)
for selector,count in all_selector_counts.most_common():
    if count > 1:
        lines.append(f'{count}x  {selector}')
lines.append('')

lines.append('CSS FILES / IMPORT GRAPH')
lines.append('-'*72)
for p in sorted(ROOT.glob('*.css')):
    text = p.read_text(encoding='utf-8', errors='ignore')
    imports = re.findall(r'@import\s+url\(["\']?([^"\')]+)', text)
    lines.append(f'{p.name}: {text.count(chr(10))+1} lines, {p.stat().st_size} bytes')
    for imp in imports:
        lines.append(f'  imports -> {imp}')
lines.append('')

index = (ROOT/'index.html').read_text(encoding='utf-8')
lines.append('INDEX LOAD ORDER')
lines.append('-'*72)
for tag in re.findall(r'<(?:link|script)\b[^>]*(?:href|src)="[^"]+"[^>]*>', index, flags=re.I):
    if 'stylesheet' in tag.lower() or tag.lower().startswith('<script'):
        lines.append(re.sub(r'\s+', ' ', tag.strip()))
lines.append('')

lines.append('ROOT TEXT / DOC FILES')
lines.append('-'*72)
for p in sorted(ROOT.iterdir()):
    if p.is_file() and p.suffix.lower() in {'.txt','.md'}:
        preview = p.read_text(encoding='utf-8', errors='ignore')[:300].replace('\n',' | ')
        lines.append(f'{p.name}: {p.stat().st_size} bytes :: {preview}')
lines.append('')

lines.append('STALE / LEGACY TOKEN COUNTS')
lines.append('-'*72)
for token in ['V18','V19','V20','V20.1','V21','V22','V23','V24','mytt-mobile-stable-polish-v1','rank mapping is ready','mobile-event-pro','mytt-event-v4','me4-']:
    hits=[]
    for name in corpus_files + ['site-overrides-v24.css']:
        p=ROOT/name
        if p.exists():
            n=p.read_text(encoding='utf-8',errors='ignore').count(token)
            if n: hits.append(f'{name}:{n}')
    lines.append(f'{token}: ' + (', '.join(hits) if hits else '0'))

Path('cleanup-audit-v28.txt').write_text('\n'.join(lines)+'\n', encoding='utf-8')
