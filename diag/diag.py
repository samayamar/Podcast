import requests, json, re
UA = {"User-Agent": "Mozilla/5.0 (PodcastUebersicht/1.0)"}
def j(path):
    r = requests.get(path if path.startswith("http") else "https://www.kika.de/ackley/v1/" + path, headers=UA, timeout=20)
    return r.json()
t = j("subchannels/spiele-code-knacken-und-programmieren-lernen-100/teasers?page=0&platform=kikade")
print("Teaser-Keys:", [k for k in t.keys()])
print("Seiten-Info:", {k: v for k, v in t.items() if k != "content"})
for c in t["content"]:
    print(" -", c.get("docType"), "|", c["id"], "|", c.get("title"), "|", c.get("contentCategory"), "|", (c.get("teaserImage") or {}).get("urlScheme"))
d = j("interactives/compubot-denkspiel-100")
print("\nInteractive-Keys:", list(d.keys()))
for k, v in d.items():
    if k in ("navigation", "settings", "teaserImage", "metaKeywords"): continue
    print(" ", k, "=", json.dumps(v, ensure_ascii=False)[:400])
