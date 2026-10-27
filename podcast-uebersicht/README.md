# SpotiMy – Podcast-Übersicht

Eine kleine lokale Webseite, die Podcasts aus RSS-Feeds als Kacheln anzeigt. Ein Klick auf eine Kachel öffnet die neuesten 20 Folgen mit Audio-Player. Es gibt keine Datenbank und kein Login.

## Voraussetzungen

- Python 3.10 oder neuer
- Bibliotheken: `pip install -r requirements.txt` (installiert `feedparser` und `requests`)

## Benutzung

1. **Feeds eintragen:** Feed-Adressen in `feeds.txt` eintragen, eine pro Zeile. Leere Zeilen und Zeilen mit `#` am Anfang werden ignoriert.
   Statt einer Feed-Adresse geht auch eine Webseite, die einen Feed verlinkt, oder eine Sendungsseite bei ARD Sounds bzw. ARD Audiothek (`…/sendung/…/urn:ard:show:…`).
   Spotify-Links (`https://open.spotify.com/artist/…`, `…/album/…`, `…/show/…`, `…/playlist/…`) erscheinen als Kachel mit eingebettetem Spotify-Player. Ganze Folgen gibt es dort nur, wenn man im Browser bei Spotify angemeldet ist, sonst 30-Sekunden-Ausschnitte. Der Spotify-Player wird erst geladen, wenn man die Kachel antippt.
   Mit Spotify-Zugangsdaten (`SPOTIFY_CLIENT_ID` und `SPOTIFY_CLIENT_SECRET` als Umgebungsvariablen bzw. GitHub-Secrets, App auf developer.spotify.com, Besitzer braucht Premium) lädt das Skript bei Spotify-Künstlern die einzelnen Folgen (Alben). Sie erscheinen dann wie die anderen Folgen als Bildkacheln und öffnen sich im Spotify-Player.
   Apple-Music-Künstler (`https://music.apple.com/de/artist/…/ID`) werden über Apples öffentliche iTunes-Suche eingelesen, ohne Zugangsdaten. Die Alben erscheinen als Folgen-Kacheln und spielen im eingebetteten Apple-Music-Player: ganze Folgen mit Apple-Music-Abo (im Player anmelden), sonst Vorschau. Zweisprachige Ausgaben und Sammelboxen werden ausgelassen.
   **Videos** aus den Mediatheken (ARD, ZDF, KiKA – über das freie Verzeichnis MediathekViewWeb): `video: Sendung | Sender | Anzeigename`, z. B. `video: Die Sendung mit der Maus | KiKA`. Sender und Anzeigename sind optional. Fassungen mit Audiodeskription/Gebärdensprache werden ausgelassen, Vorschaubilder kommen von der Mediathek-Seite der Folge. Die Sender dürfen Videos nur befristet anbieten, manche nur in Deutschland.
   **Spiele:** Im Ordner `spiele/` liegen sechs eigene Retro-Spiele (Mampf-Monster, Weltraum-Wächter, Fass-Hüpfer, Rohr-Hüpfer, Flitzer-Rennen, Dino-Sprint) – selbst programmiert, mit eigenen Figuren, ohne fremde Inhalte. Sie stehen in `spiele/spiele.json`, laufen mit Touch-Knöpfen, Wischen oder Tastatur und merken sich den Rekord im Browser. Zusätzlich gehen Spiele von kika.de: `spiele: <Link zu einer Spiele-Seite oder einem Spiel>`.
   Die Startseite zeigt ein Hauptmenü mit **Podcasts, Videos und Spiele** (Bereiche ohne Inhalt werden ausgeblendet).
2. **Feeds einlesen:**
   ```
   python update_feeds.py
   ```
   Das Skript schreibt `data/podcasts.json` und gibt am Ende eine Zusammenfassung aus. Ein fehlerhafter Feed bricht den Lauf nicht ab. Waren für diesen Feed schon Daten vorhanden, bleiben sie erhalten.
3. **Seite öffnen:** Im Projektordner einen lokalen Webserver starten und im Browser `http://localhost:8000` öffnen:
   ```
   python -m http.server
   ```
   Ein direktes Öffnen von `index.html` per Doppelklick funktioniert nicht, weil der Browser die JSON-Datei dann nicht laden darf.
4. **Aktualisieren:** Das Skript erneut ausführen, am besten täglich und automatisch:
   - **Windows (Aufgabenplanung):** Einfache Aufgabe erstellen → täglich → Programm `python`, Argumente `update_feeds.py`, „Starten in“ = Projektordner.
   - **macOS/Linux (cron):** `crontab -e`, dann z. B.
     `0 6 * * * cd /pfad/zu/podcast-uebersicht && python3 update_feeds.py`

## Dateien

| Datei | Zweck |
|---|---|
| `feeds.txt` | Liste der Feed-Adressen |
| `update_feeds.py` | liest die Feeds und schreibt `data/podcasts.json` |
| `index.html` | Startseite mit Kacheln und Detailansicht (CSS und JavaScript eingebettet) |
| `data/podcasts.json` | wird vom Skript erzeugt (nicht im Git-Repository) |
| `manifest.webmanifest`, `icon-*.png`, `icon.svg` | App-Symbol und Angaben für „Zum Home-Bildschirm“ |
| `spiele/` | eigene Retro-Spiele: `spiel.html` + `retro.js`/`retro.css` (gemeinsame Grundlage) + je Spiel eine `.js`-Datei und ein Vorschaubild |

## Auf iPad und iPhone als App

In Safari die Seite öffnen → Teilen-Symbol → **„Zum Home-Bildschirm“**. SpotiMy startet dann mit eigenem Symbol im Vollbild, ohne Safari-Leisten. Im Querformat auf dem iPad sitzt der Player als große Leiste rechts, im Hochformat unten.

## Datenschutz

Keine Benutzerkonten, kein Tracking, keine externen Schriftarten oder Skripte. Ausnahme: Beim Öffnen einer Spotify- bzw. Apple-Music-Folge lädt der eingebettete Player Inhalte und Cookies von Spotify bzw. Apple. Cover-Bilder und Audiodateien lädt der Browser direkt von den Servern der Podcast-Anbieter.

## Online über GitHub Pages

Der Workflow `.github/workflows/pages.yml` liest die Feeds auf GitHub ein (täglich, bei jedem Push auf `master` und manuell über den Actions-Tab) und veröffentlicht `index.html` mit `data/podcasts.json`. Einmalig nötig: **Settings → Pages → Source = „GitHub Actions“**. Die Seite ist dann öffentlich erreichbar unter `https://<benutzer>.github.io/<repository>/`.
