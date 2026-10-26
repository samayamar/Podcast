# Podcast-Übersicht

Eine kleine lokale Webseite, die Podcasts aus RSS-Feeds als Kacheln anzeigt. Ein Klick auf eine Kachel öffnet die neuesten 20 Folgen mit Audio-Player. Es gibt keine Datenbank und kein Login.

## Voraussetzungen

- Python 3.10 oder neuer
- Bibliotheken: `pip install -r requirements.txt` (installiert `feedparser` und `requests`)

## Benutzung

1. **Feeds eintragen:** Feed-Adressen in `feeds.txt` eintragen, eine pro Zeile. Leere Zeilen und Zeilen mit `#` am Anfang werden ignoriert.
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

## Datenschutz

Keine Benutzerkonten, kein Tracking, keine externen Schriftarten oder Skripte. Cover-Bilder und Audiodateien lädt der Browser direkt von den Servern der Podcast-Anbieter.

## Online über GitHub Pages

Der Workflow `.github/workflows/pages.yml` liest die Feeds auf GitHub ein (täglich, bei jedem Push auf `master` und manuell über den Actions-Tab) und veröffentlicht `index.html` mit `data/podcasts.json`. Einmalig nötig: **Settings → Pages → Source = „GitHub Actions“**. Die Seite ist dann öffentlich erreichbar unter `https://<benutzer>.github.io/<repository>/`.
