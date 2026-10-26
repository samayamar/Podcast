import requests, time, socket
UA = {"User-Agent": "PodcastUebersicht/1.0"}
for host in ["schlaulicht.info", "www.schlaulicht.info"]:
    try: print(host, "->", socket.gethostbyname(host))
    except Exception as e: print(host, "DNS-Fehler", e)
for u in ["https://schlaulicht.info/feed/m4a/", "http://schlaulicht.info/feed/m4a/", "https://www.schlaulicht.info/feed/m4a/", "https://schlaulicht.info/feed/mp3/", "https://schlaulicht.info/"]:
    try:
        r = requests.get(u, headers=UA, timeout=20); print(u, r.status_code, r.headers.get("Content-Type"), len(r.content))
    except Exception as e: print(u, "FEHLER", type(e).__name__, str(e)[:150])
r = requests.get("https://itunes.apple.com/search", params={"media": "podcast", "term": "Schlaulicht", "country": "DE", "limit": 5}, headers=UA, timeout=15)
for x in r.json().get("results", []): print(" iTunes:", x.get("collectionName"), "|", x.get("artistName"), "|", x.get("trackCount"), "|", x.get("feedUrl"))
q = '{ programSet(id: "urn:ard:show:b4a27641ebfcb11b") { title numberOfElements items(first: 40) { nodes { title } } } }'
for i in range(2):
    t = time.time()
    try:
        r = requests.post("https://api.ardaudiothek.de/graphql", json={"query": q}, headers=UA, timeout=40)
        print("ARD Maus:", r.status_code, round(time.time() - t, 1), "s", r.text[:150])
    except Exception as e: print("ARD Maus FEHLER", round(time.time() - t, 1), "s", e)
