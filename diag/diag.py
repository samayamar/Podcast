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
for lim in (20, 10, 5):
    d = call(f"Alben limit={lim}", f"https://api.spotify.com/v1/artists/{ART}/albums", include_groups="album", market="DE", limit=lim)
    if d: break
if d:
    print("total:", d.get("total"), "next:", d.get("next"))
    items = list(d["items"]); url = d.get("next"); pages = 1
    while url and pages < 30:
        r = requests.get(url, headers=H, timeout=15); pages += 1
        if r.status_code != 200: print("Seite", pages, r.status_code, r.text[:200]); break
        j = r.json(); items += j["items"]; url = j.get("next")
    print("geladen:", len(items), "Seiten:", pages)
    for a in sorted(items, key=lambda a: a["release_date"], reverse=True)[:6]:
        print(" -", a["release_date"], a["name"], a["id"], (a.get("images") or [{}])[0].get("url"))
    a = call("Ein Album", f"https://api.spotify.com/v1/albums/{items[0]['id']}", market="DE")
    if a: print(a["name"], "Tracks:", a["tracks"]["total"], "Dauer ms erste:", a["tracks"]["items"][0].get("duration_ms"))
d = call("Suche", "https://api.spotify.com/v1/search", q="Die drei ??? Kids", type="album", market="DE", limit=10)
if d: print("Suche total:", d["albums"]["total"], [x["name"] for x in d["albums"]["items"][:5]])
