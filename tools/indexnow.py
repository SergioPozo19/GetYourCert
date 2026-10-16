"""Notify Bing (and the other IndexNow engines: Yandex, Seznam, Naver...) about site URLs.

    python tools/indexnow.py            # every URL in sitemap.xml
    python tools/indexnow.py URL [URL]  # only these

Run it after a deploy that adds or changes pages (the key file must already be live).
The key file lives at the site root: /<KEY>.txt
"""
import json, os, re, sys, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HOST = 'earnyourcert.com'
KEY = '51674c13c35b5ebb31c2240015f20e4b'


def sitemap_urls():
    xml = open(os.path.join(ROOT, 'sitemap.xml'), encoding='utf-8').read()
    return re.findall(r'<loc>(.*?)</loc>', xml)


def submit(urls):
    body = json.dumps({'host': HOST, 'key': KEY, 'keyLocation': f'https://{HOST}/{KEY}.txt', 'urlList': urls}).encode()
    req = urllib.request.Request('https://api.indexnow.org/indexnow', data=body,
                                 headers={'Content-Type': 'application/json; charset=utf-8'})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status
    except urllib.error.HTTPError as e:
        return f'{e.code} {e.read()[:200]!r}'


if __name__ == '__main__':
    urls = sys.argv[1:] or sitemap_urls()
    print(f'IndexNow: {len(urls)} URLs ->', submit(urls))
