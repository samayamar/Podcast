import requests, json, re
UA = {"User-Agent": "Mozilla/5.0 (PodcastUebersicht/1.0)"}
def mv(queries, size=8):
    body = {"queries": queries, "sortBy": "timestamp", "sortOrder": "desc", "future": False, "offset": 0, "size": size, "duration_min": 120}
    r = requests.post("https://mediathekviewweb.de/api/query", data=json.dumps(body), headers={**UA, "Content-Type": "text/plain"}, timeout=20)
    res = r.json().get("result") or {}
    return (res.get("queryInfo") or {}).get("totalResults"), res.get("results", [])
for qs in ([{"fields": ["title", "topic", "description"], "query": "Checker Welt"}],
           [{"fields": ["channel"], "query": "KiKA"}, {"fields": ["topic"], "query": "Checker"}],
           [{"fields": ["topic"], "query": "Checker Tobi"}]):
    n, items = mv(qs)
    print("\n==", qs, n)
    topics = {}
    for x in items: print("  -", x.get("channel"), "|", x.get("topic"), "|", x.get("title"), "|", x.get("duration"))
# Themen-Übersicht 'Checker'
n, items = mv([{"fields": ["topic"], "query": "Checker"}], 200)
from collections import Counter
print("\nThemen mit 'Checker':", Counter((x["channel"], x["topic"]) for x in items).most_common(15))

def j(path):
    r = requests.get("https://www.kika.de/ackley/v1/" + path, headers=UA, timeout=20)
    print("\n### ackley", path, r.status_code, r.headers.get("content-type"))
    try: return r.json()
    except Exception: print(r.text[:300]); return None
d = j("subchannels/spiele-code-knacken-und-programmieren-lernen-100/teasers?page=0&platform=kikade")
print(json.dumps(d, ensure_ascii=False)[:2500] if d else None)
d = j("interactives/compubot-denkspiel-100")
s = json.dumps(d, ensure_ascii=False) if d else ""
print(s[:3000])
for u in sorted(set(re.findall(r'https?://[^"\\]+', s))):
    if not re.search(r"\.(jpg|png|svg|webp)", u): print("  url:", u[:180])
