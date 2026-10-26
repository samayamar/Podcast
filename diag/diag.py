import json, re, requests
UA = {"User-Agent": "PodcastUebersicht/1.0"}
def show(label, url, **kw):
    try:
        r = requests.request(kw.pop("method", "GET"), url, headers=UA, timeout=15, **kw)
        print(f"\n=== {label}: {r.status_code} {r.headers.get('Content-Type')} len={len(r.text)} final={r.url}")
        return r
    except Exception as e:
        print(f"\n=== {label}: FEHLER {e}")
def grep(text, pat, n=25):
    seen = []
    for m in re.finditer(pat, text, re.I):
        s = text[max(0, m.start()-80): m.end()+120].replace("\n", " ")
        if s not in seen: seen.append(s)
        if len(seen) >= n: break
    for s in seen: print("  ..", s)

r = show("ARD Sounds", "https://www.ardsounds.de/sendung/die-gute-nachricht-mit-der-maus/urn:ard:show:a2f051e349e1177a/")
if r is not None:
    grep(r.text, r"rss|\.xml|feed|\.mp3|programset|graphql|api\.ard[a-z]*\.de", 30)
    print("  scripts:", re.findall(r'<script[^>]+src="([^"]+)"', r.text)[:10])
r = show("ARD Audiothek", "https://www.ardaudiothek.de/sendung/die-gute-nachricht-mit-der-maus/urn:ard:show:a2f051e349e1177a/")
if r is not None:
    grep(r.text, r"rss|\.mp3|programset|graphql", 15)
for sid in ["a2f051e349e1177a", "urn:ard:show:a2f051e349e1177a"]:
    q = '{ programSet(id: "%s") { title synopsis image { url } items(first: 2) { nodes { title publishDate duration image { url } audios { url downloadUrl mimeType } } } } }' % sid
    r = show(f"GraphQL {sid}", "https://api.ardaudiothek.de/graphql", method="POST", json={"query": q})
    if r is not None: print(r.text[:1500])
    r = show(f"REST programsets {sid}", f"https://api.ardaudiothek.de/programsets/{sid}")
    if r is not None: print(r.text[:800])
r = show("WDR Maus", "https://www.wdrmaus.de/hoeren/good-news.php5")
if r is not None:
    grep(r.text, r"\.podcast|rss|feed|\.mp3|audiothek|ardsounds", 30)
