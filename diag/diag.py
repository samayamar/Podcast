import requests, json, re, html
UA = {"User-Agent": "Mozilla/5.0 (PodcastUebersicht/1.0)"}
def mv(queries, size=4):
    body = {"queries": queries, "sortBy": "timestamp", "sortOrder": "desc", "future": False, "offset": 0, "size": size, "duration_min": 120}
    r = requests.post("https://mediathekviewweb.de/api/query", data=json.dumps(body), headers={**UA, "Content-Type": "text/plain"}, timeout=20)
    res = r.json().get("result") or {}
    return (res.get("queryInfo") or {}).get("totalResults"), res.get("results", [])
for t in ["Checker Welt", "Checker", "Die Sendung mit der Maus", "Wissen macht Ah!"]:
    n, items = mv([{"fields": ["topic"], "query": t}], 6)
    print(f"\n== Thema '{t}': {n}")
    for x in items:
        print("  -", x.get("channel"), "|", x.get("topic"), "|", x.get("title"), "|", x.get("duration"), "|", (x.get("url_website") or "")[:100])
# og:image von url_website
n, items = mv([{"fields": ["topic"], "query": "Wissen macht Ah!"}], 2)
for x in items[:2]:
    try:
        r = requests.get(x["url_website"], headers=UA, timeout=20)
        m = re.search(r'<meta[^>]+property="og:image"[^>]+content="([^"]+)"', r.text)
        print("\nog:image", x["url_website"][:80], r.status_code, m.group(1)[:120] if m else None)
    except Exception as e: print("og FEHLER", e)

print("\n##### KiKA Spiele")
r = requests.get("https://www.kika.de/check-die-ki/spiele/spiele-code-knacken-und-programmieren-lernen-100", headers=UA, timeout=20)
print(r.status_code, len(r.text), "XFO:", r.headers.get("x-frame-options"), "CSP:", (r.headers.get("content-security-policy") or "")[:150])
links = sorted(set(re.findall(r'href="(/[^"]*spiel[^"]*)"', r.text)))
print("Spiel-Links:", links[:30])
for m in re.finditer(r'<iframe[^>]+src="([^"]+)"', r.text): print("iframe:", m.group(1)[:150])
for s in sorted(set(re.findall(r'https?://[a-z0-9.-]*(?:kika|game|spiel)[a-z0-9.-]*\.[a-z]+[^"\s<]*', r.text)))[:30]: print("url:", s[:150])
# erste Spiel-Seite genauer
for l in [l for l in links if "spiele-code" not in l][:3]:
    u = "https://www.kika.de" + html.unescape(l)
    g = requests.get(u, headers=UA, timeout=20)
    print("\n-- Spielseite", u[:110], g.status_code)
    for m in re.finditer(r'<iframe[^>]+src="([^"]+)"', g.text): print("   iframe:", m.group(1)[:160])
    for s in sorted(set(re.findall(r'"(https?://[^"]*(?:game|spiel|html5|index\.html)[^"]*)"', g.text)))[:10]: print("   url:", s[:160])
    og = re.search(r'property="og:image"[^>]+content="([^"]+)"', g.text); print("   og:image", og.group(1)[:120] if og else None)
    t = re.search(r"<title>([^<]+)", g.text); print("   title", t.group(1).strip() if t else None)
