#!/usr/bin/env python3
"""
Refresh presets.json from MTGGoldfish tournament pages.

Fetches /tournaments/<format> for each format, extracts the deck names
from every tournament table on the page (the <td class="column-deck">
cells), and writes the most-frequent names to presets.json.

These are the vernacular names players use ("Mono Red Madness", "Dimir
Faeries"), not the generic color taxonomy.

Never overwrites presets.json with empty data: if a format fails, its
previous list is kept; if all fail, the file is untouched.

Requirements: cloudscraper, beautifulsoup4.
MTGGoldfish is Cloudflare-protected, so cloudscraper is required.

Usage:
    python3 fetch_presets.py [--out presets.json]
"""

import argparse
import collections
import json
import pathlib
import re
import sys

try:
    import cloudscraper
    from bs4 import BeautifulSoup
except ImportError:
    print("Missing deps. pip install cloudscraper beautifulsoup4", file=sys.stderr)
    raise SystemExit(2)

# Format slugs as MTGGoldfish uses them, mapped to display names.
# PreModern IS available on MTGGoldfish's tournament pages.
FORMATS = [
    ("pauper", "Pauper"),
    ("standard", "Standard"),
    ("modern", "Modern"),
    ("legacy", "Legacy"),
    ("vintage", "Vintage"),
    ("premodern", "PreModern"),
]

BASE = "https://www.mtggoldfish.com/tournaments/"

# How many recent tournaments to consider per format. The page shows a
# bounded list; we read whatever's there. This caps how far we go.
MAX_TOURNAMENTS = 8

# Deck names to skip -- aggregate/placeholder rows, not real archetypes.
SKIP = {"", "other", "unknown", "deck"}

# Max names to keep per format.
MAX_PER_FORMAT = 20

scraper = cloudscraper.create_scraper()


def extract_deck_names(html):
    """Return the ordered list of deck names on a tournaments page.

    Reads every <td class="column-deck"> cell and takes the text of its
    first <a>. Preserves page order (most recent tournaments first).
    """
    soup = BeautifulSoup(html, "html.parser")
    names = []
    for td in soup.find_all("td", class_="column-deck"):
        a = td.find("a")
        name = (a.get_text(strip=True) if a else td.get_text(strip=True))
        name = name.strip()
        if not name or name.lower() in SKIP:
            continue
        # Skip bare color-letter placeholders like "W", "WUB", "UBRG".
        if re.fullmatch(r"[WUBRG]{1,5}", name):
            continue
        names.append(name)
    return names


def fetch_format_names(slug):
    """Fetch a format's tournament page and return ranked deck names.

    Ranks by how often each name appears across the page's tournaments
    (more appearances = more meta-relevant). Returns [] on failure.
    """
    url = BASE + slug
    resp = scraper.get(url, timeout=30)
    resp.raise_for_status()
    names = extract_deck_names(resp.text)
    if not names:
        return []

    counts = collections.Counter(names)
    # Rank by count desc, then name asc for stable ordering.
    ordered = sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))
    return [name for name, _ in ordered][:MAX_PER_FORMAT]


def load_existing(path):
    try:
        data = json.loads(pathlib.Path(path).read_text())
    except (OSError, json.JSONDecodeError):
        return {}
    formats = data.get("formats")
    return formats if isinstance(formats, dict) else {}


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="presets.json")
    args = ap.parse_args(argv)

    out_path = pathlib.Path(args.out)
    previous = load_existing(out_path)

    formats_out = {}
    any_success = False

    for slug, display in FORMATS:
        try:
            names = fetch_format_names(slug)
        except Exception as e:  # noqa: BLE001
            names = []
            print("fetch failed for " + display + ": " + str(e), file=sys.stderr)

        if names:
            any_success = True
            formats_out[display] = names
        elif display in previous:
            formats_out[display] = previous[display]
            print("kept previous for " + display, file=sys.stderr)

    if not any_success:
        print("all formats failed; leaving file untouched", file=sys.stderr)
        return 1

    out_path.write_text(json.dumps({"version": 1, "formats": formats_out}, indent=2) + "\n")
    print("wrote " + args.out + " with " + str(len(formats_out)) + " format(s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())