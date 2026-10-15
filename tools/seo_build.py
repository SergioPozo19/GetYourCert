"""SEO build for EarnYourCert. Run from anywhere:  python tools/seo_build.py

Regenerates, from index.html examsdata + questions/*.json + the Spanish landing pages:
  - <id>.html          Spanish landing: fresh <head> (hreflang, OG image, JSON-LD), synced counts,
                       sample questions, full other-exams list, absolute asset paths
  - en/<id>.html       English landing (Spanish elements stripped, English head and JSON-LD)
  - en/index.html      English hub listing every exam
  - index.html         home <head> meta + hreflang + JSON-LD ItemList, static exam links block
  - sitemap.xml        every ES/EN URL with xhtml:link alternates
Idempotent: safe to run on every ship.
"""
import json, re, os, html, hashlib, datetime, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from seo_content import CATS, HOME_ES, HOME_EN

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = 'https://earnyourcert.com'
TODAY = datetime.date.today().isoformat()
CSS_V = '7'


def rd(p): return open(os.path.join(ROOT, p), encoding='utf-8', newline='').read()


def wr(p, t):
    full = os.path.join(ROOT, p)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    open(full, 'w', encoding='utf-8', newline='').write(t)


def esc(s): return html.escape(s, quote=True)


INDEX = rd('index.html')
m = re.search(r'<script id="examsdata" type="application/json">(.*?)</script>', INDEX, re.S)
EXAMS = [e for e in json.loads(m.group(1)) if not e.get('soon')]
for e in EXAMS:
    e['n'] = len(json.load(open(os.path.join(ROOT, 'questions', e['id'] + '.json'), encoding='utf-8')))
TOTAL = sum(e['n'] for e in EXAMS)
TOTAL_ROUND = TOTAL // 100 * 100
LEVEL_ORDER = {'fundamentals': 0, 'associate': 1, 'expert': 2, 'specialty': 3}
LEVEL_NAME = {'fundamentals': ('Fundamentos', 'Fundamentals'), 'associate': ('Asociado', 'Associate'),
              'expert': ('Experto', 'Expert'), 'specialty': ('Especialidad', 'Specialty')}
EDU = {'fundamentals': 'beginner', 'associate': 'intermediate', 'expert': 'advanced', 'specialty': 'advanced'}
ORDERED = sorted(EXAMS, key=lambda e: (LEVEL_ORDER.get(e.get('level'), 9), e['code']))


def short_name(e):
    """Readable certification name without the 'Microsoft Certified:' prefix."""
    t = e['title_en']
    t = re.sub(r'^Microsoft (365 )?Certified:\s*', '', t)
    return t


def num(n, lang):
    return f'{n:,}'.replace(',', '.' if lang == 'es' else ',')


# ---------------------------------------------------------------- landing parsing
def grab(pattern, text, flags=re.S):
    mm = re.search(pattern, text, flags)
    return mm.group(1).strip() if mm else ''


def parse_landing(src):
    info = {}
    info['title_es'] = html.unescape(grab(r'data-title-es="([^"]*)"', src))
    info['title_en'] = html.unescape(grab(r'data-title-en="([^"]*)"', src))
    info['desc_es'] = html.unescape(grab(r'data-desc-es="([^"]*)"', src))
    info['desc_en'] = html.unescape(grab(r'data-desc-en="([^"]*)"', src))
    info['og_es'] = html.unescape(grab(r'data-og-title-es="([^"]*)"', src))
    info['og_en'] = html.unescape(grab(r'data-og-title-en="([^"]*)"', src))
    info['h1_es'] = html.unescape(re.sub('<[^>]+>', '', grab(r'<h1 lang="es">(.*?)</h1>', src)))
    info['h1_en'] = html.unescape(re.sub('<[^>]+>', '', grab(r'<h1 lang="en">(.*?)</h1>', src)))
    faq = []
    for blk in re.findall(r'<div class="faq-item">(.*?)</div>', src, re.S):
        q = {}
        for lg in ('es', 'en'):
            q['q_' + lg] = html.unescape(re.sub('<[^>]+>', '', grab(r'<h3 lang="%s">(.*?)</h3>' % lg, blk)))
            q['a_' + lg] = html.unescape(re.sub('<[^>]+>', '', grab(r'<p lang="%s">(.*?)</p>' % lg, blk)))
        faq.append(q)
    info['faq'] = faq
    info['body'] = grab(r'<body>(.*)</body>', src)
    return info


def fix_counts(text, n):
    text = re.sub(r'\b\d{3,4}(?=\s+(?:preguntas|questions|Questions|original questions|preguntas originales)\b)', str(n), text)
    text = re.sub(r'(Free, )\d{3,4}( Questions)', r'\g<1>%d\2' % n, text)
    text = re.sub(r'(<div class="stat"><div class="n">)\d+(</div><div class="l"><span lang="es">Preguntas)', r'\g<1>%d\2' % n, text)
    return text


# ---------------------------------------------------------------- sample questions
def pick_samples(e, k=5):
    qs = json.load(open(os.path.join(ROOT, 'questions', e['id'] + '.json'), encoding='utf-8'))
    ok = [q for q in qs if q['type'] == 'mc' and not q.get('case_es') and len(q['correct']) == 1 and len(q['opts_en']) == 4
          and len(q['q_en']) < 230 and max(len(o) for o in q['opts_en']) < 120 and q.get('exp_en')]
    ok.sort(key=lambda q: hashlib.md5(f"{e['id']}-{q['id']}".encode()).hexdigest())
    out, used_dom = [], set()
    for q in ok:  # one per domain first
        if q['dom'] not in used_dom:
            out.append(q); used_dom.add(q['dom'])
        if len(out) == k: break
    for q in ok:
        if len(out) == k: break
        if q not in out: out.append(q)
    return sorted(out, key=lambda q: (q['dom'], q['id']))


def samples_html(e, samples):
    code = e['code']
    L = 'ABCD'
    parts = ['<!--samples-->', '  <section class="block samples">',
             f'    <h2 lang="es">Preguntas de ejemplo de {code}</h2>',
             f'    <h2 lang="en">{code} sample questions</h2>',
             f'    <p class="sq-intro" lang="es">Cinco preguntas reales de nuestro banco de {e["n"]}. Intenta responder antes de ver la solución.</p>',
             f'    <p class="sq-intro" lang="en">Five real questions from our {e["n"]}-question bank. Try to answer before revealing the solution.</p>']
    for i, q in enumerate(samples, 1):
        c = q['correct'][0]
        parts.append('    <div class="sq">')
        parts.append(f'      <p class="sq-q" lang="es"><span class="sq-n">{i}.</span> {esc(q["q_es"])}</p>')
        parts.append(f'      <p class="sq-q" lang="en"><span class="sq-n">{i}.</span> {esc(q["q_en"])}</p>')
        parts.append('      <ol class="sq-opts" type="A">')
        for oe, os_ in zip(q['opts_en'], q['opts_es']):
            parts.append(f'        <li><span lang="es">{esc(os_)}</span><span lang="en">{esc(oe)}</span></li>')
        parts.append('      </ol>')
        parts.append('      <details class="sq-ans">')
        parts.append('        <summary><span lang="es">Ver respuesta</span><span lang="en">Show answer</span></summary>')
        parts.append(f'        <p lang="es"><strong>Respuesta correcta: {L[c]}.</strong> {esc(q["exp_es"])}</p>')
        parts.append(f'        <p lang="en"><strong>Correct answer: {L[c]}.</strong> {esc(q["exp_en"])}</p>')
        parts.append('      </details>')
        parts.append('    </div>')
    parts.append('    <div class="cta sq-cta">')
    parts.append(f'      <a class="btn btn-primary" href="/?exam={e["id"]}"><span lang="es">Practicar las {e["n"]} preguntas →</span><span lang="en">Practice all {e["n"]} questions →</span></a>')
    parts.append('    </div>')
    parts.append('  </section>')
    parts.append('<!--/samples-->')
    return '\n'.join(parts)


def practice_jsonld(samples, lang, e):
    doms = {d['id']: d['name_' + lang] for d in e['domains']}
    wrong = 'Respuesta incorrecta.' if lang == 'es' else 'Incorrect answer.'
    right = 'Respuesta correcta.' if lang == 'es' else 'Correct answer.'
    items = []
    for q in samples:
        c = q['correct'][0]
        opts = q['opts_' + lang]
        dom = doms.get(q.get('dom'), e['code'])
        exp = q['exp_' + lang]
        items.append({
            "@type": "Question", "eduQuestionType": "Multiple choice", "learningResourceType": "Practice problem",
            "encodingFormat": "text/html", "typicalAgeRange": "18-",
            "assesses": dom, "comment": {"@type": "Comment", "text": dom},
            "name": q['q_' + lang][:110], "text": q['q_' + lang],
            "suggestedAnswer": [{"@type": "Answer", "position": i, "text": o, "encodingFormat": "text/html",
                                 "comment": {"@type": "Comment", "text": wrong}}
                                for i, o in enumerate(opts) if i != c],
            "acceptedAnswer": {"@type": "Answer", "position": c, "text": opts[c], "encodingFormat": "text/html",
                               "comment": {"@type": "Comment", "text": right + ' ' + exp},
                               "answerExplanation": {"@type": "Comment", "text": exp}},
        })
    return items


# ---------------------------------------------------------------- footer / links
def other_exams_html(self_id):
    rows = ['    <div class="other-exams">']
    for e in ORDERED:
        if e['id'] == self_id: continue
        nm = esc(short_name(e))
        rows.append(f'      <a href="/{e["id"]}.html"><span lang="es">{e["code"]}: {nm}</span><span lang="en">{e["code"]}: {nm}</span></a>')
    rows.append('    </div>')
    rows.append('    <div class="other-exams cat-links">')
    for c in CATS:
        rows.append(f'      <a href="/{c["es"]}.html"><span lang="es">{esc(c["h1_es"])}</span></a><a href="/en/{c["en"]}.html"><span lang="en">{esc(c["h1_en"])}</span></a>')
    rows.append('    </div>')
    return '\n'.join(rows)


def strip_lang(body, drop):
    """Remove every element carrying lang="<drop>" (landing markup never nests same-tag elements)."""
    pat = re.compile(r'<(\w+)\b[^>]*\slang="%s"[^>]*>.*?</\1>' % drop, re.S)
    prev = None
    while prev != body:
        prev = body
        body = pat.sub('', body)
    body = re.sub(r'\n[ \t]*\n(?:[ \t]*\n)+', '\n\n', body)
    return body


# ---------------------------------------------------------------- head
def alt_links(es_url, en_url):
    return (f'<link rel="alternate" hreflang="es" href="{es_url}">\n'
            f'<link rel="alternate" hreflang="en" href="{en_url}">\n'
            f'<link rel="alternate" hreflang="x-default" href="{es_url}">')


def head_html(lang, title, desc, og_title, url, es_url, en_url, image, jsonld):
    loc, alt = ('es_ES', 'en_US') if lang == 'es' else ('en_US', 'es_ES')
    return f'''<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{esc(title)}</title>
<meta name="description" content="{esc(desc)}">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
<meta name="theme-color" content="#0F6CBD">
<link rel="canonical" href="{url}">
{alt_links(es_url, en_url)}
<!-- Open Graph -->
<meta property="og:type" content="website">
<meta property="og:site_name" content="EarnYourCert">
<meta property="og:title" content="{esc(og_title)}">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{image}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="{esc(og_title)}">
<meta property="og:locale" content="{loc}">
<meta property="og:locale:alternate" content="{alt}">
<!-- Twitter -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{esc(og_title)}">
<meta name="twitter:description" content="{esc(desc)}">
<meta name="twitter:image" content="{image}">
<link rel="icon" type="image/svg+xml" href="/icon.svg">
<link rel="apple-touch-icon" href="/icon-512.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/seo-assets/landing.css?v={CSS_V}">
<script type="application/ld+json">
{json.dumps(jsonld, ensure_ascii=False, indent=1)}
</script>
</head>'''


def org():
    return {"@type": "Organization", "@id": SITE + "/#org", "name": "EarnYourCert", "url": SITE + "/",
            "logo": {"@type": "ImageObject", "url": SITE + "/icon-512.png"}, "email": "soporte@earnyourcert.com"}


# ---------------------------------------------------------------- exam pages
def build_exam(e):
    eid, code = e['id'], e['code']
    srcp = f'tools/landing_src/{eid}.html'
    if not os.path.exists(os.path.join(ROOT, srcp)):
        cur = rd(f'{eid}.html')
        assert '<h1 lang="en">' in cur and '<h1 lang="es">' in cur, f'{eid}.html is not bilingual; restore it before building'
        wr(srcp, cur)
    src = rd(srcp)
    info = parse_landing(fix_counts(src, e['n']))
    samples = pick_samples(e)
    es_url, en_url = f'{SITE}/{eid}.html', f'{SITE}/en/{eid}.html'
    image = f'{SITE}/seo-assets/og/{eid}.jpg'
    body = info['body']
    body = fix_counts(body, e['n'])
    # samples block (idempotent)
    body = re.sub(r'\n?<!--samples-->.*?<!--/samples-->\n?', '\n', body, flags=re.S)
    body = body.replace('  <section class="block">\n    <h2 lang="es">Preguntas frecuentes</h2>',
                        samples_html(e, samples) + '\n\n  <section class="block">\n    <h2 lang="es">Preguntas frecuentes</h2>', 1)
    # hero: exam icon (calm layout, see landing.css)
    body = body.replace('<div class="hero">', '<div class="hero with-ico">\n    <div class="hero-ico">' + exam_icon(eid) + '</div>', 1)
    # domain rows -> links to the domain pages
    if eid in DOMAIN_EXAMS:
        k = [0]
        def _dl(mm):
            k[0] += 1
            return f'<a class="dom-row dom-link" href="/{eid}-dominio-{k[0]}.html">' + mm.group(1) + '<span class="dchev" aria-hidden="true">›</span></a>'
        body = re.sub(r'<div class="dom-row">(.*?<div class="dw">.*?</div>)\s*</div>', _dl, body, flags=re.S)
    # footer exam list
    body = re.sub(r'    <div class="other-exams">.*?\n    </div>(?:\n    <div class="other-exams cat-links">.*?\n    </div>)?', lambda _: other_exams_html(eid), body, count=1, flags=re.S)
    # absolute asset paths
    body = body.replace('src="icon.svg"', 'src="/icon.svg"')
    body = re.sub(r'<script src="/?seo-assets/landing\.js[^"]*"></script>', f'<script src="/seo-assets/landing.js?v={CSS_V}"></script>', body)
    body = body.replace('href="privacy.html"', 'href="/privacy.html"')
    # toggle buttons become links to the other language
    body = re.sub(r'<button data-lang="es"[^>]*>ES</button>', '@@ES@@', body)
    body = re.sub(r'<button data-lang="en"[^>]*>EN</button>', '@@EN@@', body)

    def faq_ld(lg):
        return {"@type": "FAQPage", "mainEntity": [
            {"@type": "Question", "name": f['q_' + lg], "acceptedAnswer": {"@type": "Answer", "text": f['a_' + lg]}}
            for f in info['faq'] if f['q_' + lg]]}

    def quiz_ld(lg, url):
        dom_names = [d['name_' + lg] for d in e['domains']]
        return {"@type": ["Quiz", "LearningResource"], "@id": url + "#quiz",
                "name": info['h1_' + lg] or f"{code} practice exam",
                "description": info['desc_' + lg], "url": url, "inLanguage": lg,
                "educationalLevel": EDU.get(e.get('level'), 'intermediate'), "isAccessibleForFree": True,
                "numberOfItems": e['n'], "provider": {"@id": SITE + "/#org"},
                "about": {"@type": "Thing", "name": e['title_en'] + ' ' + code},
                "teaches": dom_names,
                "educationalAlignment": {"@type": "AlignmentObject", "alignmentType": "assesses",
                                         "targetName": f"Microsoft exam {code}"},
                "offers": {"@type": "Offer", "price": "0", "priceCurrency": "EUR"},
                "hasPart": practice_jsonld(samples, lg, e)}

    for lg in ('es', 'en'):
        url = es_url if lg == 'es' else en_url
        home = SITE + ('/' if lg == 'es' else '/en/')
        ld = {"@context": "https://schema.org", "@graph": [
            org(),
            {"@type": "BreadcrumbList", "itemListElement": [
                {"@type": "ListItem", "position": 1, "name": "EarnYourCert", "item": home},
                {"@type": "ListItem", "position": 2, "name": code, "item": url}]},
            faq_ld(lg), quiz_ld(lg, url)]}
        head = head_html(lg, info['title_' + lg], info['desc_' + lg], info['og_' + lg] or info['title_' + lg],
                         url, es_url, en_url, image, ld)
        b = body
        if lg == 'es':
            b = strip_lang(b, 'en')
            b = re.sub(r'<a href="/[^"]*"></a>', '', b)
            b = b.replace(f'href="/?exam={eid}"', f'href="/?exam={eid}&amp;lang=es"')
            b = re.sub(r'data-href-es="[^"]*" data-href-en="[^"]*"', '', b)
        else:
            b = strip_lang(b, 'es')
            b = re.sub(r'<a href="/[^"]*"></a>', '', b)
            b = re.sub(r'href="/([a-z]{2}-\d{3})\.html"', r'href="/en/\1.html"', b)
            b = re.sub(r'href="/([a-z]{2}-\d{3})-dominio-(\d+)\.html"', r'href="/en/\1-domain-\2.html"', b)
            b = b.replace('href="/"', 'href="/en/"')
            b = b.replace(f'href="/?exam={eid}"', f'href="/?exam={eid}&amp;lang=en"')
            b = re.sub(r'data-href-es="[^"]*" data-href-en="[^"]*"', '', b)
        b = b.replace('@@ES@@', f'<a href="/{eid}.html" hreflang="es" class="{"on" if lg == "es" else ""}" aria-current="{"page" if lg == "es" else "false"}">ES</a>')
        b = b.replace('@@EN@@', f'<a href="/en/{eid}.html" hreflang="en" class="{"on" if lg == "en" else ""}" aria-current="{"page" if lg == "en" else "false"}">EN</a>')
        attrs = (f'lang="{lg}" data-lang="{lg}" data-fixed-lang="{lg}"'
                 f'\n  data-title-es="{esc(info["title_es"])}"\n  data-title-en="{esc(info["title_en"])}"'
                 f'\n  data-desc-es="{esc(info["desc_es"])}"\n  data-desc-en="{esc(info["desc_en"])}"'
                 f'\n  data-og-title-es="{esc(info["og_es"])}"\n  data-og-title-en="{esc(info["og_en"])}"')
        page = f'<!DOCTYPE html>\n<html {attrs}>\n{head}\n<body>{b}</body>\n</html>\n'
        wr(f'{eid}.html' if lg == 'es' else f'en/{eid}.html', page)
    return info


# ---------------------------------------------------------------- English hub
def build_en_hub():
    cards = []
    for e in ORDERED:
        lv = LEVEL_NAME.get(e.get('level'), ('', ''))[1]
        ret = ''
        if e.get('retiresOn'):
            ret = '<span class="hub-ret">Retires Nov 30, 2026</span>'
        cards.append(f'''      <a class="hub-card" href="/en/{e['id']}.html">
        <span class="hub-code">{e['code']}</span>
        <span class="hub-title">{esc(short_name(e))}</span>
        <span class="hub-desc">{esc(e['desc_en'])}</span>
        <span class="hub-meta">{lv} · {e['n']} questions{(' · ' + ret) if ret else ''}</span>
      </a>''')
    faq = [
        ("Are these practice exams free?", "Yes. You can practice for free without signing up. A free account adds progress tracking and smart review; Pro removes the daily question limit."),
        ("Are these the real Microsoft exam questions?", "No. All questions are original and written from Microsoft's official 'Skills measured' study guides. We don't publish exam dumps."),
        ("Which Microsoft certifications are covered?", "Azure (AZ-900, AZ-104, AZ-305), Microsoft 365 and Copilot (AB-900, AB-650, MS-102, MD-102), Teams (MS-700, MS-721), Security (SC-900, SC-300, SC-200, SC-500), data and AI (PL-300, DP-600, AI-901)."),
        ("How are the practice exams built?", "Each mock exam draws 50 questions weighted by the official domain percentages, with a 70% pass mark like the real exam, plus detailed explanations for every answer."),
    ]
    faq_html = '\n'.join(f'''    <div class="faq-item">
      <h3>{esc(q)}</h3>
      <p>{esc(a)}</p>
    </div>''' for q, a in faq)
    title = 'Free Microsoft Certification Practice Exams | EarnYourCert'
    desc = (f'Free practice exams for {len(EXAMS)} Microsoft certifications: AZ-900, AZ-104, AZ-305, SC-900, SC-300, SC-200, AB-900, AB-650, MD-102, MS-700, PL-300 and more. '
            f'{num(TOTAL_ROUND, "en")}+ original questions with explanations.')
    ld = {"@context": "https://schema.org", "@graph": [
        org(),
        {"@type": "WebSite", "@id": SITE + "/#website", "name": "EarnYourCert", "url": SITE + "/en/", "inLanguage": "en", "publisher": {"@id": SITE + "/#org"}},
        {"@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faq]},
        {"@type": "ItemList", "name": "Microsoft certification practice exams", "itemListElement": [
            {"@type": "ListItem", "position": i, "url": f"{SITE}/en/{e['id']}.html", "name": f"{e['code']} practice exam"}
            for i, e in enumerate(ORDERED, 1)]}]}
    head = head_html('en', title, desc, 'Free Microsoft Certification Practice Exams · EarnYourCert',
                     SITE + '/en/', SITE + '/', SITE + '/en/', SITE + '/seo-assets/og/home.jpg', ld)
    page = f'''<!DOCTYPE html>
<html lang="en" data-lang="en" data-fixed-lang="en">
{head}
<body>
<div class="wrap">
  <div class="topbar">
    <a class="brand" href="/en/">
      <span class="logo"><img src="/icon.svg" alt="" width="44" height="44"></span>
      <span class="name">EarnYourCert</span>
    </a>
    <div class="toggle" id="langToggle" role="group" aria-label="Language">
      <a href="/" hreflang="es" class="" aria-current="false">ES</a>
      <a href="/en/" hreflang="en" class="on" aria-current="page">EN</a>
    </div>
  </div>

  <div class="hero">
    <div class="eyebrow">Microsoft certification prep</div>
    <h1>Free Microsoft certification practice exams</h1>
    <p>Practice for {len(EXAMS)} Microsoft exams with {num(TOTAL_ROUND, 'en')}+ original questions, detailed explanations, timed mock exams weighted like the real test, smart spaced-repetition review and progress tracking. Independent prep resource, not affiliated with Microsoft.</p>
    <div class="cta">
      <a class="btn btn-primary" href="/?lang=en">Start practicing for free →</a>
    </div>
    <div class="stats">
      <div class="stat"><div class="n">{len(EXAMS)}</div><div class="l">Exams</div></div>
      <div class="stat"><div class="n">{num(TOTAL_ROUND, 'en')}+</div><div class="l">Questions</div></div>
      <div class="stat"><div class="n">70%</div><div class="l">Pass mark</div></div>
      <div class="stat"><div class="n">0 €</div><div class="l">To start</div></div>
    </div>
  </div>

  <section class="block">
    <h2>Browse by area</h2>
    <div class="hub-cats">
{chr(10).join(f'      <a class="hub-cat" href="/en/{c["en"]}.html">{esc(c["h1_en"])}</a>' for c in CATS)}
    </div>
  </section>

  <section class="block">
    <h2>Choose your exam</h2>
    <div class="hub-grid">
{chr(10).join(cards)}
    </div>
  </section>

  <section class="block">
    <h2>Frequently asked questions</h2>
{faq_html}
  </section>

  <footer>
    <div class="legal">
      <a href="/?lang=en">Open the practice app</a> · <a href="/pro.html">Pro</a> · <a href="/privacy.html">Privacy</a>
    </div>
  </footer>
</div>
<script src="/seo-assets/landing.js?v={CSS_V}"></script>
</body>
</html>
'''
    wr('en/index.html', page)


# ---------------------------------------------------------------- category pages
def build_categories():
    by = {e['id']: e for e in EXAMS}
    for c in CATS:
        es_url, en_url = f'{SITE}/{c["es"]}.html', f'{SITE}/en/{c["en"]}.html'
        exs = [by[i] for i in c['exams'] if i in by]
        total = sum(e['n'] for e in exs)
        for lg in ('es', 'en'):
            url = es_url if lg == 'es' else en_url
            home = '/' if lg == 'es' else '/en/'
            pre = '' if lg == 'es' else '/en'
            if lg == 'es':
                T = dict(crumb='Todos los exámenes', exams='Exámenes de esta área', start='Por dónde empezar',
                         faqh='Preguntas frecuentes', cta='Empezar a practicar gratis →', more='Otras áreas',
                         stats=('Exámenes', 'Preguntas', 'Aprobado', 'Para empezar'), app='/?lang=es',
                         legal='Volver al catálogo', privacy='Privacidad', q='preguntas')
            else:
                T = dict(crumb='All exams', exams='Exams in this area', start='Where to start',
                         faqh='Frequently asked questions', cta='Start practicing for free →', more='Other areas',
                         stats=('Exams', 'Questions', 'Pass mark', 'To start'), app='/?lang=en',
                         legal='Back to the catalog', privacy='Privacy', q='questions')
            lvl_i = 0 if lg == 'es' else 1
            card_list = []
            for e in exs:
                lv = LEVEL_NAME.get(e.get('level'), ('', ''))[lvl_i]
                card_list.append(
                    f'      <a class="hub-card" href="{pre}/{e["id"]}.html">\n'
                    f'        <span class="hub-code">{e["code"]}</span>\n'
                    f'        <span class="hub-title">{esc(short_name(e))}</span>\n'
                    f'        <span class="hub-desc">{esc(e["desc_" + lg])}</span>\n'
                    f'        <span class="hub-meta">{lv} · {e["n"]} {T["q"]}</span>\n'
                    f'      </a>')
            cards = '\n'.join(card_list)
            faq = c['faq_' + lg]
            faq_html = '\n'.join(f'    <div class="faq-item">\n      <h3>{esc(q)}</h3>\n      <p>{esc(a)}</p>\n    </div>' for q, a in faq)
            other_links = ' · '.join(f'<a href="{pre}/{o[lg]}.html">{esc(o["h1_" + lg])}</a>' for o in CATS if o is not c)
            paras = '\n'.join(f'    <p>{esc(p)}</p>' for p in c['intro_' + lg])
            ld = {"@context": "https://schema.org", "@graph": [
                org(),
                {"@type": "BreadcrumbList", "itemListElement": [
                    {"@type": "ListItem", "position": 1, "name": "EarnYourCert", "item": SITE + home},
                    {"@type": "ListItem", "position": 2, "name": c['h1_' + lg], "item": url}]},
                {"@type": "CollectionPage", "name": c['h1_' + lg], "url": url, "inLanguage": lg,
                 "description": c['desc_' + lg],
                 "mainEntity": {"@type": "ItemList", "itemListElement": [
                     {"@type": "ListItem", "position": i, "url": f"{SITE}{pre}/{e['id']}.html",
                      "name": f"{e['code']} — {short_name(e)}"} for i, e in enumerate(exs, 1)]}},
                {"@type": "FAQPage", "mainEntity": [
                    {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faq]}]}
            head = head_html(lg, c['title_' + lg], c['desc_' + lg], c['h1_' + lg] + ' · EarnYourCert',
                             url, es_url, en_url, SITE + '/seo-assets/og/home.jpg', ld)
            on_es = 'on' if lg == 'es' else ''
            on_en = 'on' if lg == 'en' else ''
            cur_es = 'page' if lg == 'es' else 'false'
            cur_en = 'page' if lg == 'en' else 'false'
            page = (
                f'<!DOCTYPE html>\n<html lang="{lg}" data-lang="{lg}" data-fixed-lang="{lg}">\n{head}\n<body>\n'
                f'<div class="wrap">\n'
                f'  <div class="topbar">\n'
                f'    <a class="brand" href="{home}">\n'
                f'      <span class="logo"><img src="/icon.svg" alt="" width="44" height="44"></span>\n'
                f'      <span class="name">EarnYourCert</span>\n'
                f'    </a>\n'
                f'    <div class="toggle" id="langToggle" role="group" aria-label="Idioma / Language">\n'
                f'      <a href="/{c["es"]}.html" hreflang="es" class="{on_es}" aria-current="{cur_es}">ES</a>\n'
                f'      <a href="/en/{c["en"]}.html" hreflang="en" class="{on_en}" aria-current="{cur_en}">EN</a>\n'
                f'    </div>\n'
                f'  </div>\n'
                f'  <div class="crumb"><a href="{home}">{T["crumb"]}</a> › {esc(c["h1_" + lg])}</div>\n\n'
                f'  <div class="hero">\n'
                f'    <div class="eyebrow">Microsoft · {len(exs)} {T["stats"][0].lower()}</div>\n'
                f'    <h1>{esc(c["h1_" + lg])}</h1>\n'
                f'    <p>{esc(c["desc_" + lg])}</p>\n'
                f'    <div class="cta"><a class="btn btn-primary" href="{T["app"]}">{T["cta"]}</a></div>\n'
                f'    <div class="stats">\n'
                f'      <div class="stat"><div class="n">{len(exs)}</div><div class="l">{T["stats"][0]}</div></div>\n'
                f'      <div class="stat"><div class="n">{num(total, lg)}</div><div class="l">{T["stats"][1]}</div></div>\n'
                f'      <div class="stat"><div class="n">70%</div><div class="l">{T["stats"][2]}</div></div>\n'
                f'      <div class="stat"><div class="n">0 €</div><div class="l">{T["stats"][3]}</div></div>\n'
                f'    </div>\n'
                f'  </div>\n\n'
                f'  <section class="block prose">\n{paras}\n  </section>\n\n'
                f'  <section class="block">\n    <h2>{T["exams"]}</h2>\n    <div class="hub-grid">\n{cards}\n    </div>\n  </section>\n\n'
                f'  <section class="block prose">\n    <h2>{T["start"]}</h2>\n    <p>{esc(c["path_" + lg])}</p>\n  </section>\n\n'
                f'  <section class="block">\n    <h2>{T["faqh"]}</h2>\n{faq_html}\n  </section>\n\n'
                f'  <footer>\n'
                f'    <div class="other-exams"><span>{T["more"]}:</span> {other_links}</div>\n'
                f'    <div class="legal"><a href="{home}">{T["legal"]}</a> · <a href="/privacy.html">{T["privacy"]}</a></div>\n'
                f'  </footer>\n'
                f'</div>\n'
                f'<script src="/seo-assets/landing.js?v={CSS_V}"></script>\n'
                f'</body>\n</html>\n')
            wr(f'{c["es"]}.html' if lg == 'es' else f'en/{c["en"]}.html', page)

# ---------------------------------------------------------------- domain pages
# One page per exam domain (ES + EN) for the exams people actually use: what the domain covers,
# its weight, and 8 worked sample questions that appear on no other page. CTA opens domain practice.
DOMAIN_EXAMS = ['az-900', 'ab-900', 'az-104', 'md-102']

# Official "skills measured" objective names where the guide cards don't exist
OBJECTIVES = {
    'az-104': {
        '1.1': ('Administrar usuarios y grupos de Microsoft Entra', 'Manage Microsoft Entra users and groups'),
        '1.2': ('Administrar el acceso a los recursos de Azure', 'Manage access to Azure resources'),
        '1.3': ('Administrar suscripciones y gobernanza de Azure', 'Manage Azure subscriptions and governance'),
        '2.1': ('Configurar el acceso al almacenamiento', 'Configure access to storage'),
        '2.2': ('Configurar y administrar cuentas de almacenamiento', 'Configure and manage storage accounts'),
        '2.3': ('Configurar Azure Files y Azure Blob Storage', 'Configure Azure Files and Azure Blob Storage'),
        '3.1': ('Automatizar implementaciones con plantillas ARM o Bicep', 'Automate deployment of resources by using ARM templates or Bicep files'),
        '3.2': ('Crear y configurar máquinas virtuales', 'Create and configure virtual machines'),
        '3.3': ('Aprovisionar y administrar contenedores', 'Provision and manage containers in the Azure portal'),
        '3.4': ('Crear y configurar Azure App Service', 'Create and configure Azure App Service'),
        '4.1': ('Configurar y administrar redes virtuales', 'Configure and manage virtual networks in Azure'),
        '4.2': ('Configurar el acceso seguro a redes virtuales', 'Configure secure access to virtual networks'),
        '4.3': ('Configurar la resolución de nombres y el equilibrio de carga', 'Configure name resolution and load balancing'),
        '5.1': ('Supervisar recursos en Azure', 'Monitor resources in Azure'),
        '5.2': ('Implementar copias de seguridad y recuperación', 'Implement backup and recovery'),
    },
}

ICON_PATHS = dict(re.findall(r"^\s*'([a-z0-9-]+)':'(<[^']*)'", INDEX, re.M))


def exam_icon(eid, size=30):
    p = ICON_PATHS.get(eid)
    if not p:
        return ''
    return (f'<svg width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" '
            f'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{p}</svg>')


def dom_url(eid, d, lg):
    return f'/{eid}-dominio-{d}.html' if lg == 'es' else f'/en/{eid}-domain-{d}.html'


def guide_topics(eid):
    """Topic lists per domain from the study-guide cards of the landing source (cards follow domain order)."""
    src = rd(f'tools/landing_src/{eid}.html')
    out = {}
    for i, card in enumerate(re.findall(r'<div class="guide-card">(.*?)</div>', src, re.S), 1):
        out[i] = {lg: [html.unescape(re.sub('<[^>]+>', '', x)).strip() for x in re.findall(r'<li lang="%s">(.*?)</li>' % lg, card, re.S)]
                  for lg in ('es', 'en')}
    return out


def weight_bounds(w):
    nums = [int(x) for x in re.findall(r'\d+', w or '')]
    return (nums[0], nums[-1]) if nums else (0, 0)


def pick_domain_samples(e, d, exclude, k=8):
    qs = json.load(open(os.path.join(ROOT, 'questions', e['id'] + '.json'), encoding='utf-8'))
    ok = [q for q in qs if q['dom'] == d and q['type'] == 'mc' and not q.get('case_es') and len(q['correct']) == 1
          and len(q['opts_en']) == 4 and len(q['q_en']) < 260 and max(len(o) for o in q['opts_en']) < 130
          and q.get('exp_en') and q['id'] not in exclude]
    ok.sort(key=lambda q: hashlib.md5(f"dom-{e['id']}-{q['id']}".encode()).hexdigest())
    out, seen_obj = [], set()
    for q in ok:  # spread across objectives first
        if str(q.get('obj')) not in seen_obj:
            out.append(q); seen_obj.add(str(q.get('obj')))
        if len(out) == k: break
    for q in ok:
        if len(out) == k: break
        if q not in out: out.append(q)
    return sorted(out, key=lambda q: (str(q.get('obj')), q['id']))


def domain_samples_html(samples, lg):
    L = 'ABCD'
    rows = []
    for i, q in enumerate(samples, 1):
        c = q['correct'][0]
        opts = ''.join(f'<li>{esc(o)}</li>' for o in q['opts_' + lg])
        lbl = ('Ver respuesta', 'Respuesta correcta') if lg == 'es' else ('Show answer', 'Correct answer')
        rows.append(f'    <div class="sq">\n      <p class="sq-q"><span class="sq-n">{i}.</span> {esc(q["q_" + lg])}</p>\n'
                    f'      <ol class="sq-opts" type="A">{opts}</ol>\n'
                    f'      <details class="sq-ans"><summary>{lbl[0]}</summary><p><strong>{lbl[1]}: {L[c]}.</strong> {esc(q["exp_" + lg])}</p></details>\n'
                    f'    </div>')
    return '\n'.join(rows)


def build_domains(e):
    eid, code = e['id'], e['code']
    qs = json.load(open(os.path.join(ROOT, 'questions', eid + '.json'), encoding='utf-8'))
    used = {q['id'] for q in pick_samples(e)}  # questions already shown on the exam page
    topics = guide_topics(eid)
    doms = e['domains']
    biggest = max(doms, key=lambda d: weight_bounds(d.get('weight'))[1])['id']
    for d in doms:
        n = d['id']
        dq = [q for q in qs if q['dom'] == n]
        cnt = len(dq)
        types = {t: sum(1 for q in dq if q['type'] == t) for t in ('mc', 'yesno', 'dropdown', 'sentence', 'order')}
        lo, hi = weight_bounds(d.get('weight'))
        samples = pick_domain_samples(e, n, used)
        used |= {q['id'] for q in samples}
        es_url, en_url = SITE + dom_url(eid, n, 'es'), SITE + dom_url(eid, n, 'en')
        objs = sorted({str(q.get('obj')) for q in dq})
        for lg in ('es', 'en'):
            name = d['name_' + lg]
            url = es_url if lg == 'es' else en_url
            home = '/' if lg == 'es' else '/en/'
            pre = '' if lg == 'es' else '/en'
            exam_page = f'{pre}/{eid}.html'
            app = f'/?exam={eid}&amp;dom={n}&amp;lang={lg}'
            if lg == 'es':
                title = f'{code} dominio {n}: {name} – preguntas de práctica'
                desc = (f'Practica el dominio {n} de {code} ({name}, {lo}-{hi}% del examen) con {cnt} preguntas originales '
                        f'con explicación. Incluye {len(samples)} preguntas de ejemplo resueltas.')
                intro = (f'El dominio {n} de {code} supone entre el {lo} y el {hi}% del examen'
                         + (', el de más peso del temario' if n == biggest and len(doms) > 1 else '') + '. '
                         f'En EarnYourCert tienes {cnt} preguntas originales de este dominio, todas con explicación: '
                         f'{types["mc"]} de opción múltiple, {types["yesno"]} de sí o no y '
                         f'{types["dropdown"] + types["sentence"] + types["order"]} de completar u ordenar, como en el examen real.')
                T = dict(crumb='Exámenes', dom=f'Dominio {n} de {len(doms)}', ofexam='del examen', cta=f'Practicar el dominio {n} gratis →',
                         ctasub='Sin registro. Elige cuántas preguntas quieres hacer.', topics='Qué entra en este dominio',
                         sq=f'Preguntas de ejemplo del dominio {n}', sqi=f'{len(samples)} preguntas de nuestro banco de {cnt} para este dominio. Intenta responder antes de ver la solución.',
                         others=f'Otros dominios de {code}', back=f'{code}: examen de práctica completo', qn='preguntas',
                         full=f'Simulacro completo de {code} →', legal='Volver al catálogo', privacy='Privacidad', app_label='Abrir la app',
                         stats=('Preguntas', 'Peso en el examen', 'Objetivos'))
            else:
                title = f'{code} domain {n}: {name} – practice questions'
                desc = (f'Practice {code} domain {n} ({name}, {lo}-{hi}% of the exam) with {cnt} original questions '
                        f'with explanations. Includes {len(samples)} worked sample questions.')
                intro = (f'Domain {n} of {code} accounts for {lo}-{hi}% of the exam'
                         + (', the heaviest part of the syllabus' if n == biggest and len(doms) > 1 else '') + '. '
                         f'EarnYourCert has {cnt} original questions for this domain, all with explanations: '
                         f'{types["mc"]} multiple choice, {types["yesno"]} yes/no and '
                         f'{types["dropdown"] + types["sentence"] + types["order"]} completion or ordering items, like the real exam.')
                T = dict(crumb='Exams', dom=f'Domain {n} of {len(doms)}', ofexam='of the exam', cta=f'Practice domain {n} for free →',
                         ctasub='No sign-up. Choose how many questions you want.', topics='What this domain covers',
                         sq=f'Domain {n} sample questions', sqi=f'{len(samples)} questions from our {cnt}-question bank for this domain. Try to answer before revealing the solution.',
                         others=f'Other {code} domains', back=f'{code}: full practice exam', qn='questions',
                         full=f'Full {code} mock exam →', legal='Back to the catalog', privacy='Privacy', app_label='Open the app',
                         stats=('Questions', 'Exam weight', 'Objectives'))
            # topics: study-guide cards, else official objective names with question counts
            tlist = topics.get(n, {}).get(lg) or []
            if tlist:
                topics_html = '<ul class="dm-topics">' + ''.join(f'<li>{esc(x)}</li>' for x in tlist) + '</ul>'
            elif eid in OBJECTIVES:
                ob = OBJECTIVES[eid]
                topics_html = '<ul class="dm-topics dm-objs">' + ''.join(
                    f'<li><span class="dm-on">{o}</span>{esc(ob[o][0 if lg == "es" else 1])}<span class="dm-oc">{sum(1 for q in dq if str(q.get("obj")) == o)} {T["qn"]}</span></li>'
                    for o in objs if o in ob) + '</ul>'
            else:
                topics_html = ''
            others = '\n'.join(
                f'      <a class="dm-other" href="{dom_url(eid, o["id"], lg)}"><span class="dm-on">{o["id"]}</span><span>{esc(o["name_" + lg])}</span><span class="dm-w">{esc(o.get("weight", ""))}</span></a>'
                for o in doms if o['id'] != n)
            ld = {"@context": "https://schema.org", "@graph": [
                org(),
                {"@type": "BreadcrumbList", "itemListElement": [
                    {"@type": "ListItem", "position": 1, "name": "EarnYourCert", "item": SITE + home},
                    {"@type": "ListItem", "position": 2, "name": code, "item": SITE + exam_page},
                    {"@type": "ListItem", "position": 3, "name": f'{T["dom"]}: {name}', "item": url}]},
                {"@type": ["Quiz", "LearningResource"], "@id": url + "#quiz", "name": title, "description": desc, "url": url,
                 "inLanguage": lg, "educationalLevel": EDU.get(e.get('level'), 'intermediate'), "isAccessibleForFree": True,
                 "numberOfItems": cnt, "provider": {"@id": SITE + "/#org"}, "teaches": [name] + tlist[:8],
                 "isPartOf": {"@type": "Quiz", "url": SITE + exam_page, "name": f'{code} practice exam'},
                 "educationalAlignment": {"@type": "AlignmentObject", "alignmentType": "assesses", "targetName": f"Microsoft exam {code}"},
                 "hasPart": practice_jsonld(samples, lg, e)}]}
            head = head_html(lg, title + ' | EarnYourCert', desc, title, url, es_url, en_url, f'{SITE}/seo-assets/og/{eid}.jpg', ld)
            on = lambda x: ('on', 'page') if x == lg else ('', 'false')
            page = (
                f'<!DOCTYPE html>\n<html lang="{lg}" data-lang="{lg}" data-fixed-lang="{lg}">\n{head}\n<body>\n<div class="wrap">\n'
                f'  <div class="topbar">\n'
                f'    <a class="brand" href="{home}"><span class="logo"><img src="/icon.svg" alt="" width="44" height="44"></span><span class="name">EarnYourCert</span></a>\n'
                f'    <div class="top-r"><a class="top-app" href="/?lang={lg}">{T["app_label"]}</a>\n'
                f'    <div class="toggle" id="langToggle" role="group" aria-label="Idioma / Language">'
                f'<a href="{dom_url(eid, n, "es")}" hreflang="es" class="{on("es")[0]}" aria-current="{on("es")[1]}">ES</a>'
                f'<a href="{dom_url(eid, n, "en")}" hreflang="en" class="{on("en")[0]}" aria-current="{on("en")[1]}">EN</a></div></div>\n'
                f'  </div>\n'
                f'  <div class="crumb"><a href="{home}">{T["crumb"]}</a> › <a href="{exam_page}">{code}</a> › {T["dom"]}</div>\n\n'
                f'  <div class="hero hero-calm">\n'
                f'    <div class="hero-ico">{exam_icon(eid)}</div>\n'
                f'    <div class="hero-txt">\n'
                f'      <div class="eyebrow">{code} · {T["dom"]} · {esc(d.get("weight", ""))} {T["ofexam"]}</div>\n'
                f'      <h1>{esc(name)}</h1>\n'
                f'      <p>{esc(intro)}</p>\n'
                f'      <div class="cta"><a class="btn btn-primary" href="{app}">{T["cta"]}</a><span class="cta-sub">{T["ctasub"]}</span></div>\n'
                f'    </div>\n'
                f'  </div>\n\n'
                + (f'  <section class="block">\n    <h2>{T["topics"]}</h2>\n    <div class="card">{topics_html}</div>\n  </section>\n\n' if topics_html else '')
                + f'  <section class="block samples">\n    <h2>{T["sq"]}</h2>\n    <p class="sq-intro">{T["sqi"]}</p>\n{domain_samples_html(samples, lg)}\n'
                f'    <div class="cta sq-cta"><a class="btn btn-primary" href="{app}">{T["cta"]}</a></div>\n  </section>\n\n'
                f'  <section class="block">\n    <h2>{T["others"]}</h2>\n    <div class="dm-others">\n{others}\n'
                f'      <a class="dm-other dm-full" href="{exam_page}"><span class="dm-on">{exam_icon(eid, 16)}</span><span>{T["back"]}</span><span class="dm-w">→</span></a>\n'
                f'    </div>\n  </section>\n\n'
                f'  <footer>\n    <div class="legal"><a href="{home}">{T["legal"]}</a> · <a href="{exam_page}">{code}</a> · <a href="/privacy.html">{T["privacy"]}</a></div>\n  </footer>\n'
                f'</div>\n'
                f'<script src="/seo-assets/landing.js?v={CSS_V}"></script>\n</body>\n</html>\n')
            wr(dom_url(eid, n, lg).lstrip('/'), page)


# ---------------------------------------------------------------- home (index.html)
def build_home():
    s = rd('index.html')
    crlf = '\r\n' in s
    s = s.replace('\r\n', '\n')
    title = 'Exámenes de práctica gratis para certificaciones de Microsoft | EarnYourCert'
    codes = ', '.join(e['code'] for e in ORDERED)
    desc = (f'Exámenes de práctica gratuitos para {len(EXAMS)} certificaciones de Microsoft ({codes}). '
            f'Más de {num(TOTAL_ROUND, "es")} preguntas originales con explicaciones y repaso inteligente.')
    og_desc = (f'Practica gratis para {len(EXAMS)} certificaciones de Microsoft: Azure, Microsoft 365, Copilot, Teams, seguridad, datos e IA. '
               f'Más de {num(TOTAL_ROUND, "es")} preguntas originales con explicaciones.')
    rep = [
        (r'<title>.*?</title>', f'<title>{esc(title)}</title>'),
        (r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{esc(desc)}">'),
        (r'<meta property="og:title" content="[^"]*">', f'<meta property="og:title" content="{esc(title)}">'),
        (r'<meta property="og:description" content="[^"]*">', f'<meta property="og:description" content="{esc(og_desc)}">'),
        (r'<meta name="twitter:title" content="[^"]*">', f'<meta name="twitter:title" content="{esc(title)}">'),
        (r'<meta name="twitter:description" content="[^"]*">', f'<meta name="twitter:description" content="{esc(og_desc)}">'),
        (r'<meta property="og:image" content="[^"]*">', f'<meta property="og:image" content="{SITE}/seo-assets/og/home.jpg">'),
        (r'<meta property="og:image:width" content="\d+">', '<meta property="og:image:width" content="1200">'),
        (r'<meta property="og:image:height" content="\d+">', '<meta property="og:image:height" content="630">'),
        (r'<meta name="twitter:card" content="[^"]*">', '<meta name="twitter:card" content="summary_large_image">'),
        (r'<meta name="twitter:image" content="[^"]*">', f'<meta name="twitter:image" content="{SITE}/seo-assets/og/home.jpg">'),
    ]
    for a, b in rep:
        s, k = re.subn(a, lambda _: b, s, count=1, flags=re.S)
        assert k == 1, a
    # hreflang (idempotent)
    s = re.sub(r'<link rel="alternate" hreflang="[^"]*" href="[^"]*">\n', '', s)
    s = s.replace('<link rel="canonical" href="https://earnyourcert.com/">',
                  '<link rel="canonical" href="https://earnyourcert.com/">\n' + alt_links(SITE + '/', SITE + '/en/'), 1)
    # JSON-LD (first ld+json block in head)
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "WebSite", "@id": SITE + "/#website", "name": "EarnYourCert", "url": SITE + "/", "inLanguage": "es",
         "description": "Exámenes de práctica gratuitos para certificaciones de Microsoft, con preguntas originales, explicaciones, repaso inteligente y seguimiento de progreso.",
         "publisher": {"@id": SITE + "/#org"}},
        org(),
        {"@type": "ItemList", "name": "Exámenes de práctica disponibles en EarnYourCert", "itemListElement": [
            {"@type": "ListItem", "position": i, "item": {
                "@type": ["Quiz", "LearningResource"], "name": f"{e['code']}: {short_name(e)} — Examen de práctica gratuito",
                "url": f"{SITE}/{e['id']}.html", "educationalLevel": EDU.get(e.get('level'), 'intermediate'),
                "isAccessibleForFree": True, "numberOfItems": e['n']}}
            for i, e in enumerate(ORDERED, 1)]},
        {"@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in HOME_ES['faq']]}]}
    s = re.sub(r'<script type="application/ld\+json">.*?</script>',
               lambda _: '<script type="application/ld+json">\n' + json.dumps(ld, ensure_ascii=False, indent=1) + '\n</script>', s, count=1, flags=re.S)
    # static, crawlable exam links block in the footer
    links = '\n'.join(f'    <a href="/{e["id"]}.html">{e["code"]} · {esc(short_name(e))}</a>' for e in ORDERED)
    block = (f'<!--seo-exams-->\n  <nav class="seo-exams" aria-label="Exámenes de práctica">\n'
             f'    <p class="seo-exams-title"><span data-i="seoExamsTitle">Exámenes de práctica</span> · <a href="/en/" hreflang="en">English version</a></p>\n'
             f'  <div class="seo-exams-list">\n{links}\n  </div>\n  </nav>\n<!--/seo-exams-->')
    s = re.sub(r'<!--seo-exams-->.*?<!--/seo-exams-->\n', '', s, flags=re.S)
    # intro + FAQ block at the end of the catalog section
    def intro(lgd, lg):
        paras = ''.join(f'<p lang="{lg}">{esc(p)}</p>' for p in lgd['paras'])
        faqs = ''.join(f'<div class="seo-faq" lang="{lg}"><h3>{esc(q)}</h3><p>{esc(a)}</p></div>' for q, a in lgd['faq'])
        return f'<h2 lang="{lg}">{esc(lgd["h2"])}</h2>{paras}{faqs}'
    cats = ' · '.join(f'<a href="/{c["es"]}.html" lang="es">{esc(c["h1_es"])}</a><a href="/en/{c["en"]}.html" lang="en">{esc(c["h1_en"])}</a>' for c in CATS)
    intro_block = (f'<!--seo-intro-->\n    <div class="seo-intro">{intro(HOME_ES, "es")}{intro(HOME_EN, "en")}'
                   f'<p class="seo-cats">{cats}</p></div>\n<!--/seo-intro-->\n')
    s = re.sub(r'<!--seo-intro-->.*?<!--/seo-intro-->\n', '', s, flags=re.S)
    i = s.index('id="examGrid"')
    j = s.index('\n  </section>', i)
    s = s[:j + 1] + intro_block + s[j + 1:]
    s = s.replace('<footer class="site-footer">\n', '<footer class="site-footer">\n' + block + '\n', 1)
    if crlf:
        s = s.replace('\n', '\r\n')
    wr('index.html', s)


# ---------------------------------------------------------------- sitemap
def build_sitemap():
    def url(loc_es, loc_en, prio, freq):
        out = []
        for loc in (loc_es, loc_en):
            out.append(f'''  <url>
    <loc>{loc}</loc>
    <lastmod>{TODAY}</lastmod>
    <changefreq>{freq}</changefreq>
    <priority>{prio}</priority>
    <xhtml:link rel="alternate" hreflang="es" href="{loc_es}"/>
    <xhtml:link rel="alternate" hreflang="en" href="{loc_en}"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="{loc_es}"/>
  </url>''')
        return out
    rows = url(SITE + '/', SITE + '/en/', '1.0', 'weekly')
    for e in ORDERED:
        rows += url(f'{SITE}/{e["id"]}.html', f'{SITE}/en/{e["id"]}.html', '0.9', 'weekly')
    for c in CATS:
        rows += url(f'{SITE}/{c["es"]}.html', f'{SITE}/en/{c["en"]}.html', '0.8', 'weekly')
    for e in ORDERED:
        if e['id'] in DOMAIN_EXAMS:
            for d in e['domains']:
                rows += url(SITE + dom_url(e['id'], d['id'], 'es'), SITE + dom_url(e['id'], d['id'], 'en'), '0.7', 'weekly')
    rows.append(f'''  <url>
    <loc>{SITE}/pro.html</loc>
    <lastmod>{TODAY}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>''')
    xml = ('<?xml version="1.0" encoding="UTF-8"?>\n'
           '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n'
           + '\n'.join(rows) + '\n</urlset>\n')
    wr('sitemap.xml', xml)


if __name__ == '__main__':
    for e in EXAMS:
        build_exam(e)
        if e['id'] in DOMAIN_EXAMS:
            build_domains(e)
    build_en_hub()
    build_categories()
    build_home()
    build_sitemap()
    print(f'SEO build: {len(EXAMS)} exams x2 langs, en hub, home, sitemap ({TOTAL} questions)')
