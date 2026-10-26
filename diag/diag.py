import requests, json
UA = {"User-Agent": "PodcastUebersicht/1.0"}
r = requests.get("https://itunes.apple.com/search", params={"term": "die drei ??? kids", "country": "DE", "entity": "musicArtist", "limit": 10}, headers=UA, timeout=15)
print("Artists:", r.status_code)
for a in r.json().get("results", []):
    print(" -", a.get("artistName"), a.get("artistId"), a.get("artistLinkUrl"))
arts = [a for a in r.json().get("results", []) if "kids" in a.get("artistName", "").lower()]
if arts:
    aid = arts[0]["artistId"]
    r = requests.get("https://itunes.apple.com/lookup", params={"id": aid, "entity": "album", "country": "DE", "limit": 200, "sort": "recent"}, headers=UA, timeout=15)
    res = r.json().get("results", [])
    albums = [x for x in res if x.get("wrapperType") == "collection"]
    print("\nLookup:", r.status_code, "Alben:", len(albums))
    for x in sorted(albums, key=lambda x: x.get("releaseDate", ""), reverse=True)[:8]:
        print(" -", x.get("releaseDate"), x.get("collectionName"), x.get("collectionId"), x.get("trackCount"), x.get("collectionViewUrl"), x.get("artworkUrl100"))
    print("Keys:", sorted(albums[0].keys()) if albums else None)
for u in ["https://embed.music.apple.com/de/album/1", "https://music.apple.com/de/artist/x/%s" % (arts[0]["artistId"] if arts else 0)]:
    try:
        r = requests.get(u, headers=UA, timeout=15); print("\n", u, r.status_code, r.headers.get("x-frame-options"), (r.headers.get("content-security-policy") or "")[:200])
    except Exception as e: print(u, e)
