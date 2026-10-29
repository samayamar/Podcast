import requests
d = requests.get("https://samayamar.github.io/Podcast/data/podcasts.json", timeout=20).json()
for p in d["podcasts"]:
    eps = p["episodes"]
    print(f"{p.get('type','podcast'):8} | {p['title'][:40]:40} | gespeichert {len(eps):4} | im Feed {p.get('episode_count')}")
cp = next(p for p in d["podcasts"] if p["title"].startswith("CheckPod"))
print("älteste CheckPod-Folge:", cp["episodes"][-1]["published"], cp["episodes"][-1]["title"])
r = requests.get("https://samayamar.github.io/Podcast/spiele/spiel.html?spiel=kloetzchen", timeout=20); print("Spiel-Seite:", r.status_code)
