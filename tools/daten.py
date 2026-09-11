#!/usr/bin/env python3
"""
Speuzer Website Prototyp – Datenimport (P0)

Liest ausschließlich öffentliche, lesende Endpunkte:
  a) spiele.csv (GitHub, Rohdaten des Repos speuzer-spielplan)      -> data/spiele.json
  b) fussball.de-Tabellen je Team-ID (öffentliches ajax-Fragment)   -> data/tabellen.json

Nur Standardbibliothek + urllib. Schreibt ausschließlich nach data/.
Wiederholbar: jeder Lauf überschreibt die beiden Ausgabedateien vollständig neu.
"""

import csv
import io
import json
import re
import sys
import urllib.request
import urllib.error
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"

SPIELE_URL = "https://raw.githubusercontent.com/justOlgay/speuzer-spielplan/main/spiele.csv"

# Zuordnung CSV-Spalte "team" -> Team-Slug (siehe Plan, Schritt 8a)
CSV_ZU_SLUG = {
    "HERREN": "herren",
    "A": "a-jugend",
    "D1": "d1",
    "D2": "d2",
    "D3": "d3",
    "E1": "e1",
    "E2": "e2",
    "E3": "e3",
    "F1": "f1",
    "F2": "f2",
    "G1": "g-jugend",
}

# Team-IDs für fussball.de-Tabellen (nur Teams mit Tabelle, siehe Plan Schritt 8b)
FUSSBALLDE_TABELLEN_IDS = {
    "herren": "011MICFB14000000VTVG0001VTR8C1K7",
    "a-jugend": "019ORCB50G000000VV0AG80NVUQ1MD7G",
    "d1": "011MIE88PK000000VTVG0001VTR8C1K7",
    "d2": "011MIF9LDC000000VTVG0001VTR8C1K7",
    "d3": "02USD4SHUG000000VS5489BRVS0D3BPJ",
    "e1": "011MIDBD8C000000VTVG0001VTR8C1K7",
    "e2": "011MIE1KH4000000VTVG0001VTR8C1K7",
    "e3": "02PS0CFJCO000000VS5489B1VVQNIHJA",
}

ZERO_WIDTH = "​"


def _get(url, user_agent=None):
    headers = {}
    if user_agent:
        headers["User-Agent"] = user_agent
    req = urllib.request.Request(url, headers=headers, method="GET")
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read()


def _clean(text):
    return text.replace(ZERO_WIDTH, "").strip()


def _datum_iso(datum_de):
    # "02.08.2026" -> "2026-08-02"
    try:
        return datetime.strptime(datum_de, "%d.%m.%Y").strftime("%Y-%m-%d")
    except ValueError:
        return datum_de


def lade_spiele():
    print(f"Lade Spielplan von {SPIELE_URL} …")
    rohdaten = _get(SPIELE_URL).decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(rohdaten), delimiter=";")

    spiele = []
    je_team = {}
    for zeile in reader:
        team_csv = (zeile.get("team") or "").strip()
        slug = CSV_ZU_SLUG.get(team_csv)
        if not slug:
            print(f"  Warnung: unbekanntes team-Kürzel '{team_csv}' übersprungen", file=sys.stderr)
            continue

        heim = _clean(zeile.get("heim") or "")
        gast = _clean(zeile.get("gast") or "")
        heimspiel = "FFV Sportfreunde" in heim
        gegner = gast if heimspiel else heim
        entfaellt = "zg." in gegner

        fbid = _clean(zeile.get("fbid") or "")
        fussballde_link = (
            f"https://www.fussball.de/spiel/x/-/spiel/{fbid}" if fbid else None
        )

        spiel = {
            "team": slug,
            "datum": _datum_iso(_clean(zeile.get("datum") or "")),
            "zeit": _clean(zeile.get("zeit") or ""),
            "heim": heim,
            "gast": gast,
            "heimspiel": heimspiel,
            "gegner": gegner,
            "spielstaette": _clean(zeile.get("spielstaette") or ""),
            "ergebnis": _clean(zeile.get("ergebnis") or ""),
            "wettbewerb": _clean(zeile.get("wettbewerb") or ""),
            "fbid": fbid or None,
            "entfaellt": entfaellt,
            "fussballde_link": fussballde_link,
        }
        spiele.append(spiel)
        je_team[slug] = je_team.get(slug, 0) + 1

    DATA.mkdir(parents=True, exist_ok=True)
    with open(DATA / "spiele.json", "w", encoding="utf-8") as f:
        json.dump(spiele, f, ensure_ascii=False, indent=2)

    print(f"  {len(spiele)} Spiele geschrieben nach data/spiele.json")
    for slug in sorted(je_team):
        print(f"    {slug}: {je_team[slug]} Spiele")
    return je_team


class TabellenParser(HTMLParser):
    """Parst das öffentliche fussball.de-Tabellenfragment (nur <table>...<tbody>)."""

    def __init__(self):
        super().__init__()
        self.in_tbody = False
        self.in_td = False
        self.cur_row = None  # Liste von (klasse, text)
        self.cur_cell_class = None
        self.cur_cell_text = []
        self.rows = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "tbody":
            self.in_tbody = True
        elif tag == "tr" and self.in_tbody:
            self.cur_row = []
        elif tag == "td" and self.cur_row is not None:
            self.in_td = True
            self.cur_cell_class = attrs.get("class", "")
            self.cur_cell_text = []

    def handle_endtag(self, tag):
        if tag == "tbody":
            self.in_tbody = False
        elif tag == "tr" and self.cur_row is not None:
            if self.cur_row:
                self.rows.append(self.cur_row)
            self.cur_row = None
        elif tag == "td" and self.in_td:
            text = _clean("".join(self.cur_cell_text))
            self.cur_row.append((self.cur_cell_class, text))
            self.in_td = False

    def handle_data(self, data):
        if self.in_td:
            self.cur_cell_text.append(data)


def _parse_int(text):
    m = re.search(r"-?\d+", text.replace("−", "-"))
    return int(m.group()) if m else None


def lade_tabelle(team_id, user_agent="Mozilla/5.0"):
    url = f"https://www.fussball.de/ajax.team.table/-/team-id/{team_id}/mode/PAGE"
    rohdaten = _get(url, user_agent=user_agent).decode("utf-8", errors="replace")

    parser = TabellenParser()
    parser.feed(rohdaten)

    zeilen = []
    for zellen in parser.rows:
        # Icon-Spalte (Trend-Pfeil) ohne class-Marker "column-icon" verwerfen,
        # der Rest bleibt in Dokumentreihenfolge:
        # Platz, Mannschaft, Sp, G, U, V, Torverhältnis, Tordifferenz, Punkte
        gefiltert = [(k, t) for (k, t) in zellen if "column-icon" not in (k or "")]
        if len(gefiltert) < 9:
            continue
        platz_txt, mannschaft_txt, sp_txt, g_txt, u_txt, v_txt, tore_txt, diff_txt, pkt_txt = gefiltert[:9]

        mannschaft = mannschaft_txt[1]
        zeile = {
            "platz": _parse_int(platz_txt[1]),
            "mannschaft": mannschaft,
            "spiele": _parse_int(sp_txt[1]),
            "g": _parse_int(g_txt[1]),
            "u": _parse_int(u_txt[1]),
            "v": _parse_int(v_txt[1]),
            "tore": tore_txt[1],
            "diff": _parse_int(diff_txt[1]),
            "punkte": _parse_int(pkt_txt[1]),
            "eigene": "FFV Sportfreunde" in mannschaft,
            "zurueckgezogen": mannschaft.endswith("zg."),
        }
        zeilen.append(zeile)

    return zeilen


def lade_tabellen():
    teams_json = json.loads((DATA / "teams.json").read_text(encoding="utf-8"))
    staffel_je_slug = {t["slug"]: t.get("staffel") for t in teams_json}

    stand = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    ergebnis = {"stand": stand, "teams": {}}

    for slug, team_id in FUSSBALLDE_TABELLEN_IDS.items():
        print(f"Lade Tabelle für {slug} (team-id {team_id}) …")
        try:
            zeilen = lade_tabelle(team_id)
        except urllib.error.URLError as exc:
            print(f"  Fehler beim Laden von {slug}: {exc}", file=sys.stderr)
            continue
        ergebnis["teams"][slug] = {
            "staffel": staffel_je_slug.get(slug),
            "zeilen": zeilen,
        }
        print(f"  {len(zeilen)} Zeilen für {slug}")

    DATA.mkdir(parents=True, exist_ok=True)
    with open(DATA / "tabellen.json", "w", encoding="utf-8") as f:
        json.dump(ergebnis, f, ensure_ascii=False, indent=2)
    print("Tabellen geschrieben nach data/tabellen.json")
    return ergebnis


def main():
    je_team = lade_spiele()
    tabellen = lade_tabellen()
    print()
    print("Zusammenfassung:")
    print(f"  Spiele je Team: {je_team}")
    for slug, t in tabellen["teams"].items():
        print(f"  Tabelle {slug}: {len(t['zeilen'])} Zeilen")


if __name__ == "__main__":
    main()
