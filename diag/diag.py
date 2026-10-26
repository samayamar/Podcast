import os, requests
cid, secret = os.environ.get("SPOTIFY_CLIENT_ID", ""), os.environ.get("SPOTIFY_CLIENT_SECRET", "")
print("Client ID vorhanden:", bool(cid), "| Secret vorhanden:", bool(secret))
if not (cid and secret):
    raise SystemExit("Secrets fehlen")
r = requests.post("https://accounts.spotify.com/api/token", data={"grant_type": "client_credentials"}, auth=(cid, secret), timeout=15)
print("Token:", r.status_code, r.text[:200] if r.status_code != 200 else "ok")
if r.status_code != 200:
    raise SystemExit(1)
H = {"Authorization": "Bearer " + r.json()["access_token"]}
ART = "0vLsqW05dyLvjuKKftAEGA"
def call(label, url, **params):
    r = requests.get(url, headers=H, params=params, timeout=15)
    print(f"\n=== {label}: {r.status_code}")
    if r.status_code != 200:
        print(r.text[:300]); return None
    return r.json()
d = call("Künstler", f"https://api.spotify.com/v1/artists/{ART}")
if d: print(d.get("name"), d.get("images", [{}])[0].get("url") if d.get("images") else None)
def page_all(url, params, key=None, maxpages=40):
    items, offset = [], 0
    for _ in range(maxpages):
        r = requests.get(url, headers=H, params={**params, "limit": 10, "offset": offset}, timeout=15)
        if r.status_code != 200:
            print("  Seite offset", offset, r.status_code, r.text[:150]); break
        j = r.json(); j = j[key] if key else j
        items += j["items"]
        if offset == 0: print("  total:", j.get("total"))
        if not j.get("next"): break
        offset += 10
    return items

A = f"https://api.spotify.com/v1/artists/{ART}/albums"
for params in ({}, {"market": "DE"}, {"include_groups": "album,single,compilation,appears_on"}, {"include_groups": "album,single,compilation,appears_on", "market": "DE"}):
    print("\n=== Alben", params)
    items = page_all(A, params)
    print("  geladen:", len(items), [ (i["album_type"], i["name"]) for i in items[:3]])

for q in ('artist:"Die drei ??? Kids"', 'Die drei ??? Kids'):
    print("\n=== Suche", q)
    items = page_all("https://api.spotify.com/v1/search", {"q": q, "type": "album", "market": "DE"}, key="albums")
    kids = [i for i in items if any(a["id"] == ART for a in i["artists"])]
    print("  geladen:", len(items), "davon vom Künstler:", len(kids))
    for a in sorted(kids, key=lambda a: a["release_date"], reverse=True)[:5]:
        print("   -", a["release_date"], a["name"], a["id"])

print("\n=== Show-Suche")
items = page_all("https://api.spotify.com/v1/search", {"q": "drei ??? Kids", "type": "show,audiobook", "market": "DE"}, key="shows")
print([ (i["name"], i["publisher"], i["id"]) for i in items[:10]])
