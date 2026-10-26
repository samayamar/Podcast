import requests, json
UA = {"User-Agent": "PodcastUebersicht/1.0", "Content-Type": "text/plain"}
def q(channel, topic, size=5):
    body = {"queries": [{"fields": ["channel"], "query": channel}, {"fields": ["topic"], "query": topic}],
            "sortBy": "timestamp", "sortOrder": "desc", "future": False, "offset": 0, "size": size, "duration_min": 120}
    r = requests.post("https://mediathekviewweb.de/api/query", data=json.dumps(body), headers=UA, timeout=20)
    print(f"\n== {channel} / {topic}: {r.status_code}")
    res = r.json().get("result") or {}
    print("   gefunden:", (res.get("queryInfo") or {}).get("totalResults"))
    for x in res.get("results", []):
        print("  -", x.get("topic"), "|", x.get("title"), "|", x.get("duration"), "s |", x.get("url_video")[:90] if x.get("url_video") else None, "| HD:", bool(x.get("url_video_hd")))
    return res.get("results", [])
for ch, t in [("KiKA", "Checker Tobi"), ("KiKA", "Die Sendung mit der Maus"), ("KiKA", "logo!"), ("KiKA", "Wissen macht Ah!"), ("KiKA", "Löwenzahn")]:
    items = q(ch, t)
if items:
    u = items[0]["url_video"]
    r = requests.head(u, headers={"User-Agent": "Mozilla/5.0"}, timeout=20, allow_redirects=True)
    print("\nHEAD", u[:80], r.status_code, r.headers.get("Content-Type"), r.headers.get("Content-Length"), r.headers.get("Access-Control-Allow-Origin"))
