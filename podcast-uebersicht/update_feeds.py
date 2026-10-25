#!/usr/bin/env python3
"""Liest die Feed-Adressen aus feeds.txt und schreibt data/podcasts.json.

Aufruf: python update_feeds.py
"""

from __future__ import annotations

import calendar
import html
import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

import feedparser
import requests

BASE_DIR = Path(__file__).resolve().parent
FEEDS_FILE = BASE_DIR / "feeds.txt"
OUTPUT_FILE = BASE_DIR / "data" / "podcasts.json"

USER_AGENT = "PodcastUebersicht/1.0"
TIMEOUT = 15  # Sekunden
MAX_EPISODES = 20
SUMMARY_LENGTH = 300

BLOCK_TAG_RE = re.compile(r"</?(p|br|div|li|ul|ol|h[1-6]|tr|td|blockquote)\b[^>]*>", re.IGNORECASE)
TAG_RE = re.compile(r"<[^>]+>")
SCRIPT_STYLE_RE = re.compile(r"<(script|style)\b.*?</\1\s*>", re.IGNORECASE | re.DOTALL)
WHITESPACE_RE = re.compile(r"\s+")


def read_feed_urls(path: Path) -> list[str]:
    """Feed-Adressen lesen; leere Zeilen und Kommentare (#) überspringen."""
    urls = []
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#"):
            urls.append(line)
    return urls


def clean_text(value: str | None) -> str:
    """HTML-Tags entfernen, Entities auflösen, Leerraum zusammenfassen."""
    if not value:
        return ""
    text = SCRIPT_STYLE_RE.sub(" ", value)
    text = BLOCK_TAG_RE.sub(" ", text)
    text = TAG_RE.sub("", text)
    text = html.unescape(text)
    return WHITESPACE_RE.sub(" ", text).strip()


def shorten(text: str, limit: int = SUMMARY_LENGTH) -> str:
    """Text auf höchstens `limit` Zeichen kürzen, möglichst an einer Wortgrenze."""
    if len(text) <= limit:
        return text
    cut = text[: limit - 1]
    space = cut.rfind(" ")
    if space > limit * 0.6:
        cut = cut[:space]
    return cut.rstrip(" ,.;:-") + "…"


def to_iso(struct_time) -> str | None:
    """feedparser-Zeit (UTC) in ISO-8601 umwandeln."""
    if not struct_time:
        return None
    try:
        timestamp = calendar.timegm(struct_time)
        return datetime.fromtimestamp(timestamp, tz=timezone.utc).isoformat()
    except (TypeError, ValueError, OverflowError):
        return None


def normalize_duration(value: str | None) -> str | None:
    """Dauer als H:MM:SS bzw. M:SS ausgeben; Sekundenangaben werden umgerechnet."""
    if not value:
        return None
    value = str(value).strip()
    parts = value.split(":")
    if not all(p.isdigit() for p in parts) or len(parts) > 3:
        return value or None
    seconds = 0
    for part in parts:
        seconds = seconds * 60 + int(part)
    if seconds <= 0:
        return None
    hours, rest = divmod(seconds, 3600)
    minutes, secs = divmod(rest, 60)
    if hours:
        return f"{hours}:{minutes:02d}:{secs:02d}"
    return f"{minutes}:{secs:02d}"


def find_audio_url(entry) -> str | None:
    """Audio-Adresse aus dem enclosure-Feld holen."""
    for enclosure in entry.get("enclosures", []):
        href = enclosure.get("href")
        if href and (enclosure.get("type", "").startswith("audio") or not enclosure.get("type")):
            return href
    for enclosure in entry.get("enclosures", []):
        if enclosure.get("href"):
            return enclosure["href"]
    return None


def find_image(obj) -> str | None:
    """Bild-URL aus feed oder entry (itunes:image oder <image>)."""
    image = obj.get("image")
    if isinstance(image, dict):
        return image.get("href") or image.get("url")
    return None


def parse_episode(entry) -> dict:
    published = entry.get("published_parsed") or entry.get("updated_parsed")
    summary_raw = entry.get("summary") or entry.get("subtitle") or ""
    if not summary_raw and entry.get("content"):
        summary_raw = entry["content"][0].get("value", "")
    return {
        "title": clean_text(entry.get("title")) or "Ohne Titel",
        "published": to_iso(published),
        "duration": normalize_duration(entry.get("itunes_duration")),
        "summary": shorten(clean_text(summary_raw)),
        "link": entry.get("link"),
        "audio_url": find_audio_url(entry),
        "image": find_image(entry),
    }


def fetch_podcast(url: str) -> dict:
    """Einen Feed abrufen und auswerten. Wirft bei Fehlern eine Exception."""
    response = requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=TIMEOUT)
    response.raise_for_status()

    parsed = feedparser.parse(response.content)
    if parsed.bozo and not parsed.entries:
        raise ValueError(f"Kein gültiger Feed ({parsed.get('bozo_exception')})")

    feed = parsed.feed
    episodes = [parse_episode(e) for e in parsed.entries]
    # Neueste zuerst; Folgen ohne Datum ans Ende
    episodes.sort(key=lambda e: e["published"] or "", reverse=True)

    return {
        "title": clean_text(feed.get("title")) or url,
        "description": clean_text(feed.get("summary") or feed.get("subtitle")),
        "link": feed.get("link"),
        "image": find_image(feed),
        "feed_url": url,
        "last_updated": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "episode_count": len(episodes),
        "episodes": episodes[:MAX_EPISODES],
    }


def write_json(data: dict, path: Path) -> None:
    """JSON zuerst in eine temporäre Datei schreiben, dann ersetzen."""
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    os.replace(tmp, path)


def load_previous(path: Path) -> dict[str, dict]:
    """Bisherige Daten laden, damit ein fehlgeschlagener Abruf nichts löscht."""
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        return {p["feed_url"]: p for p in data.get("podcasts", []) if p.get("feed_url")}
    except (OSError, ValueError, TypeError, KeyError):
        return {}


def main() -> int:
    if not FEEDS_FILE.exists():
        print(f"Datei nicht gefunden: {FEEDS_FILE}", file=sys.stderr)
        return 1

    urls = read_feed_urls(FEEDS_FILE)
    previous = load_previous(OUTPUT_FILE)
    podcasts = []
    errors = []

    for url in urls:
        print(f"Lade {url} …")
        try:
            podcast = fetch_podcast(url)
        except Exception as exc:  # noqa: BLE001 – ein Fehler soll den Lauf nicht abbrechen
            if isinstance(exc, requests.Timeout):
                message = f"Zeitüberschreitung nach {TIMEOUT} Sekunden"
            elif isinstance(exc, requests.ConnectionError):
                message = "Verbindung fehlgeschlagen (Adresse oder Netzwerk prüfen)"
            else:
                message = str(exc)
            print(f"  Fehler: {message}")
            errors.append((url, message))
            if url in previous:
                print("  Bisherige Daten werden beibehalten.")
                podcasts.append(previous[url])
            continue
        podcasts.append(podcast)
        print(f"  OK: {podcast['title']} ({podcast['episode_count']} Folgen)")

    write_json(
        {
            "generated": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "podcasts": podcasts,
        },
        OUTPUT_FILE,
    )

    print()
    print("Zusammenfassung")
    print(f"  Podcasts gespeichert: {len(podcasts)}")
    print(f"  Fehler: {len(errors)}")
    for url, message in errors:
        print(f"    - {url}: {message}")
    print(f"  Gespeichert in: {OUTPUT_FILE.relative_to(BASE_DIR)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
