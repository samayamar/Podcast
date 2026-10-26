import requests, re
UA = {"User-Agent": "PodcastUebersicht/1.0"}
for term in ["GEOlino Spezial", "GEOlino Wissenspodcast"]:
    r = requests.get("https://itunes.apple.com/search", params={"media": "podcast", "term": term, "country": "DE", "limit": 8}, headers=UA, timeout=15)
    print("\n==", term)
    for x in r.json().get("results", []):
        print(" -", x.get("collectionName"), "|", x.get("artistName"), "|", x.get("trackCount"), "|", x.get("feedUrl"))
r = requests.get("https://www.geo.de/geolino/mensch/22743-rtkl-jetzt-anhoeren-geolino-spezial-der-wissenspodcast", headers=UA, timeout=15)
print("\n== geo.de", r.status_code)
for l in sorted(set(re.findall(r'(?:href|src)="([^"]+)"', r.text))):
    if re.search(r"rss|feed|podcast|podigee|audionow|apple|spotify|\.mp3", l, re.I): print("  ", l)
