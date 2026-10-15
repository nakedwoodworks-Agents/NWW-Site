#!/usr/bin/env python3
"""Convert the built Astro site (dist/) into paste-ready GoHighLevel pages.

Run after `SITE_URL=https://nakedwood.work npm run build`:
    python3 scripts/ghl_export.py

Inputs:  dist/, data/products.json, ghl/image-map.json (local image path -> GHL media URL)
Outputs: ghl/header-code.html   one block for the GHL website's Settings -> Head tracking code
         ghl/pages/NNN-*.html   one Custom HTML block per page
         ghl/manifest.json      order, GHL path, SEO title, description, social image, file

GHL rules handled here:
  - /c/ is a reserved GHL path, so product-type hubs move from /c/<type>/ to /<type>
  - GHL paths have no trailing slash, so every internal URL drops it (Snipcart item URLs too)
  - GHL can't serve arbitrary files at the root, so CSS, quiz script and quiz data are inlined
    into the header code, and every image points at the GHL media library
"""
import json, os, re, glob, html, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST = os.path.join(ROOT, 'dist')
OUT = os.path.join(ROOT, 'ghl')
SITE = 'https://nakedwood.work'
RESERVED = ('b', 'c', 'product', 'collections', 'post', 'category', 'author', 'tag', 'store')

imgmap = json.load(open(os.path.join(OUT, 'image-map.json')))
products = json.load(open(os.path.join(ROOT, 'data', 'products.json')))
sales = {p['slug']: p.get('source', {}).get('etsy_sales_all_time', 0) for p in products}


def read(p):
    return open(p, encoding='utf-8').read()


# ---------- 1. every built page and its new GHL path ----------
pages = {}  # old path -> file
for f in glob.glob(os.path.join(DIST, '**', 'index.html'), recursive=True):
    rel = os.path.relpath(f, DIST).replace(os.sep, '/')
    old = '/' + rel[:-len('index.html')]
    pages[old] = f


def new_path(old):
    if old == '/':
        return '/'
    m = re.match(r'^/c/([^/]+)/$', old)
    p = '/' + m.group(1) if m else old.rstrip('/')
    return p


pathmap = {old: new_path(old) for old in pages}
news = list(pathmap.values())
assert len(set(news)) == len(news), 'path collision after remap'
for n in news:
    seg = n.strip('/').split('/')
    assert seg[0] not in RESERVED, f'reserved GHL path: {n}'
    assert len([s for s in seg if s]) <= 5, f'too deep: {n}'

# ---------- 2. URL rewriting ----------
URL_RE = re.compile(r'(?<=["\'`(\s,=])(https://nakedwood\.work)?(/[A-Za-z0-9_\-./]*)(?=["\'`#?)\s,]|$)')
leftovers = set()


def rewrite(text):
    def sub(m):
        dom, p = m.group(1), m.group(2)
        if p in imgmap:
            return imgmap[p]
        if p in pathmap:
            return (SITE if dom else '') + pathmap[p]
        if p.startswith('/') and p != '/' and (p + '/') in pathmap:  # already slashless
            return (SITE if dom else '') + pathmap[p + '/']
        if dom or p.startswith(('/img/', '/brand/', '/_astro/', '/p/', '/occasion/', '/for/', '/guides/', '/c/', '/shop')):
            leftovers.add(p)
        return m.group(0)
    return URL_RE.sub(sub, text)


# ---------- 3. shared header code ----------
index = read(pages['/'])
head = index[index.index('<head>'):index.index('</head>')]
fonts = ''.join(re.findall(r'<link rel="preconnect"[^>]*>', head)) + \
    re.search(r'<link rel="stylesheet" href="https://fonts\.googleapis\.com[^>]*>', head).group(0)
css_path = re.search(r'<link rel="stylesheet" href="(/_astro/[^"]+\.css)"', head).group(1)
css = read(os.path.join(DIST, css_path.lstrip('/')))
pixel = re.search(r'<script>\(function\(\)\{const PIXEL .*?</script>', index, re.S).group(0)
snip = re.search(r'<script>\(function\(\)\{const V .*?</script>', index, re.S).group(0)
js_path = re.search(r'<script type="module" src="(/_astro/[^"]+\.js)"></script>', index).group(1)
js = read(os.path.join(DIST, js_path.lstrip('/')))

# quiz script: inline data instead of fetching /quiz-data.json, GHL image URLs, slashless paths
quiz = json.load(open(os.path.join(DIST, 'quiz-data.json')))
for q in quiz:
    i = q['i']
    q['w4'], q['w8'], q['j4'] = imgmap[f'/img/p/{i}-400.webp'], imgmap[f'/img/p/{i}-800.webp'], imgmap[f'/img/p/{i}-400.jpg']
n_fetch = js.count('fetch(`/quiz-data.json`).then(e=>e.json())')
assert n_fetch == 1, 'quiz fetch pattern changed'
js = js.replace('fetch(`/quiz-data.json`).then(e=>e.json())', 'Promise.resolve(window.__NWWQ)')
old_img = '<picture><source type="image/webp" srcset="/img/p/${e.i}-400.webp 400w, /img/p/${e.i}-800.webp 800w"'
assert js.count(old_img) == 1, 'quiz image pattern changed'
js = js.replace(old_img, '<picture><source type="image/webp" srcset="${e.w4} 400w, ${e.w8} 800w"')
assert js.count('<img src="/img/p/${e.i}-400.jpg"') == 1
js = js.replace('<img src="/img/p/${e.i}-400.jpg"', '<img src="${e.j4}"')
assert js.count('href="/p/${e.s}/"') == 1
js = js.replace('href="/p/${e.s}/"', 'href="/p/${e.s}"')
js = rewrite(js)
assert '/img/p/' not in js and 'quiz-data.json' not in js

header = '\n'.join([
    '<!-- NWW site: shared header code. Paste into GHL website Settings -> Tracking code -> Head. -->',
    fonts,
    '<style>' + rewrite(css) + '</style>',
    '<script>window.__NWWQ=' + json.dumps(quiz, separators=(',', ':')) + ';</script>',
    rewrite(pixel),
    rewrite(snip),
    '<script type="module">' + js + '</script>',
])

# ---------- 4. per-page bodies ----------
def meta(s, name):
    m = re.search(r'<meta (?:name|property)="%s" content="([^"]*)"' % re.escape(name), s)
    return html.unescape(m.group(1)) if m else ''


def order_key(old):
    n = pathmap[old]
    fixed = ['/', '/shop', '/realtors', '/business']
    if n in fixed:
        return (0, fixed.index(n), '')
    if n.startswith('/p/'):
        return (1, -sales.get(n[3:], 0), n)
    if re.match(r'^/[^/]+$', n) and old.startswith('/c/'):
        return (2, 0, n)
    if re.match(r'^/occasion/[^/]+$', n):
        return (3, 0, n)
    if n in ('/about', '/faq', '/shipping', '/care', '/contact', '/privacy', '/terms'):
        return (4, 0, n)
    if n.startswith('/guides'):
        return (5, 0, n)
    if n.startswith('/occasion/'):
        return (6, 0, n)
    if n.startswith('/for/'):
        return (7, 0, n)
    return (8, 0, n)


SKIP = {'/404.html'}
os.makedirs(os.path.join(OUT, 'pages'), exist_ok=True)
for f in glob.glob(os.path.join(OUT, 'pages', '*.html')):
    os.remove(f)
manifest = []
for k, old in enumerate(sorted(pages, key=order_key), 1):
    s = read(pages[old])
    h = s[s.index('<head>'):s.index('</head>')]
    body = s[s.index('<body>') + 6:s.index('</body>')]
    body = body.replace(f'<script type="module" src="{js_path}"></script>', '')
    ld = ''.join(re.findall(r'<script type="application/ld\+json">.*?</script>', h, re.S))
    title = html.unescape(re.search(r'<title>(.*?)</title>', s, re.S).group(1).strip())
    snippet = '<div class="nww-page">' + rewrite(ld + body) + '</div>'
    n = pathmap[old]
    slug = 'home' if n == '/' else n.strip('/').replace('/', '__')
    fname = f'{k:03d}-{slug}.html'
    open(os.path.join(OUT, 'pages', fname), 'w', encoding='utf-8').write(snippet)
    ogi = meta(s, 'og:image')
    manifest.append({
        'n': k, 'path': n, 'ghl_path': n.strip('/'), 'title': title,
        'description': meta(s, 'description'),
        'social_image': rewrite(' "' + ogi.replace(SITE, '') + '"').strip(' "') if ogi else '',
        'file': 'pages/' + fname, 'bytes': len(snippet.encode()),
        'group': ['core', 'product', 'type', 'occasion', 'info', 'guide', 'combo', 'recipient', 'other'][order_key(old)[0]],
    })

open(os.path.join(OUT, 'header-code.html'), 'w', encoding='utf-8').write(header)
json.dump(manifest, open(os.path.join(OUT, 'manifest.json'), 'w'), indent=1)

# ---------- 5. self-check ----------
valid = set(news)
bad_links, bad_items = [], []
for e in manifest:
    t = read(os.path.join(OUT, e['file']))
    for u in re.findall(r'href="(/[^"#?]*)', t):
        if u not in valid:
            bad_links.append((e['path'], u))
    for u in re.findall(r'data-item-url="([^"]+)"', t):
        if u != SITE + e['path']:
            bad_items.append((e['path'], u))
    for u in re.findall(r'(?:src|srcset)="([^"]+)"', t):
        for part in u.split(','):
            x = part.strip().split(' ')[0]
            if x.startswith('/'):
                bad_links.append((e['path'], 'IMG ' + x))
print(f'pages: {len(manifest)}  header-code: {len(header.encode())//1024} KB  largest page: {max(e["bytes"] for e in manifest)//1024} KB')
print('groups:', {g: sum(1 for e in manifest if e['group'] == g) for g in dict.fromkeys(e['group'] for e in manifest)})
print('leftover unmapped paths:', sorted(leftovers)[:20])
print('bad links:', bad_links[:10], len(bad_links))
print('snipcart item-url mismatches:', bad_items[:5], len(bad_items))
sys.exit(1 if (bad_links or bad_items) else 0)
