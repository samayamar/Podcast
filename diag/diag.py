import json, re, requests
UA = {"User-Agent": "PodcastUebersicht/1.0"}
def get(url, **kw):
    try:
        r = requests.request(kw.pop("method", "GET"), url, headers=UA, timeout=15, **kw)
        print(f"\n=== {url[:100]} -> {r.status_code} {r.headers.get('Content-Type')}")
        return r
    except Exception as e:
        print(f"\n=== {url[:100]} FEHLER {e}")

print("##### Apple-Podcast-Verzeichnis")
for term in ["drei ??? kids", "drei fragezeichen kids", "die drei kids", "drei ??? kids podcast"]:
    r = get("https://itunes.apple.com/search", params={"media": "podcast", "term": term, "country": "DE", "limit": 15})
    if r is not None:
        for x in r.json().get("results", []):
            print(f"  - {x.get('collectionName')} | {x.get('artistName')} | Folgen: {x.get('trackCount')} | {x.get('feedUrl')}")

print("\n##### ARD Audiothek Suche")
q = '{ search(query: "drei Fragezeichen Kids", limit: 10) { programSets { nodes { title coreId numberOfElements } } items { nodes { title programSet { title } } } } }'
r = get("https://api.ardaudiothek.de/graphql", method="POST", json={"query": q})
if r is not None: print(r.text[:1500])
r = get("https://api.ardaudiothek.de/search/programsets", params={"query": "drei ??? Kids", "limit": 10})
if r is not None: print(r.text[:1500])

print("\n##### Gratis-Hörspiele")
r = get("https://www.gratis-hoerspiele.de/serie/die-drei-fragezeichen-kids/")
if r is not None:
    links = sorted(set(re.findall(r'href="([^"]+)"', r.text)))
    for l in links:
        if re.search(r"\.mp3|rss|feed|spotify|apple|deezer|youtube|europa|amazon|podcast", l, re.I): print("  ", l)
r = get("https://www.dreifragezeichen-kids.de/")
if r is not None:
    for l in sorted(set(re.findall(r'href="([^"]+)"', r.text))):
        if re.search(r"\.mp3|rss|feed|spotify|apple|podcast|player|hoer", l, re.I): print("  ", l)
