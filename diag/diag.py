import requests
d = requests.get("https://samayamar.github.io/Podcast/data/podcasts.json", timeout=20).json()
for p in d["podcasts"]:
    if p.get("type") not in ("video", "games"): continue
    eps = p["episodes"]
    print(p["type"], "|", p["title"], "| Bild Sendung:", bool(p.get("image")), "| Folgen mit Bild:", sum(1 for e in eps if e.get("image")), "/", len(eps))
    for e in eps[:2]:
        print("   -", e["title"], "|", (e.get("video_url") or e.get("game_url"))[:70], "| einbettbar:", e.get("embeddable"), "|", e.get("duration"))
