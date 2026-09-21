#!/usr/bin/env python3
"""
Speuzer Website Prototyp – Datenschutz-Gate (P0)

Durchsucht data/, src/ und docs/ (Text- und HTML-Dateien) nach personenbezogenen
Daten und Demodaten-Resten. Gibt bei jedem Treffer "Datei:Zeile: Treffer" aus.
Exit 1 bei mindestens einem Treffer, Exit 0 wenn sauber.
"""

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DURCHSUCHTE_ORDNER = ["data", "src", "docs"]

TEXT_ENDUNGEN = {
    ".html", ".htm", ".mjs", ".js", ".json", ".css", ".txt",
    ".xml", ".csv", ".md", ".svg", ".ics",
}

# Whitelist: die beiden Vereins-Festnetznummern (Geschäftsstelle, Platzwart) in allen Schreibweisen,
# inklusive der kompakten Schreibweise ohne Leerzeichen, wie sie in tel:-Links (href) steht (P1: Fußbereich)
WHITELIST_TELEFON = {
    "+49 69 736868",
    "+49 69 732193",
    "069 736868",
    "069 732193",
    "+4969736868",
    "+4969732193",
    # P8: dieselbe Platzwart-Nummer, wörtlich so in der App-Datenschutzerklärung
    # (data/datenschutz.json) geschrieben – "(0)" nach der Landesvorwahl.
    "+49 (0) 69 732193",
    # W3: dieselbe Geschäftsstellen-Nummer, so wie sie die appack-Worksheet-API
    # liefert (data/geschaeftsstelle.json, tools/appack-daten.mjs) – mit
    # Bindestrich statt Leerzeichen.
    "069-736868",
}

MUSTER_TELEFON_1 = re.compile(r"\+49[\d /()\-]{6,}")
MUSTER_TELEFON_2 = re.compile(r"\b0\d{2,5}[ /\-]?\d{3,}\b")
MUSTER_IBAN = re.compile(r"\bDE\d{2}\s?\d{4}")
MUSTER_GEBURTSDATUM = re.compile(r"\b\d{2}\.\d{2}\.(19\d{2}|20[01]\d|202[0-4])\b")
MUSTER_EMAIL = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")

ERLAUBTE_EMAIL_DOMAINS = ("sportfreunde04.de",)
# "ffvsportfreunde04@t-online.de" (P8): die eigene, alte Kontaktadresse des
# Vereins aus der App-Datenschutzerklärung (data/datenschutz.json, Abschnitt
# "1. Begrifflichkeiten" – "Für die Verarbeitung Verantwortliche Stelle").
# Wörtlich übernommen wie im Original, siehe Plan-Abschnitt B2: keine private
# Adresse, sondern die Vereinsadresse (nur auf einer anderen Domain als
# @sportfreunde04.de).
ERLAUBTE_EMAIL_ADRESSEN = {"info@vmapit.de", "ffvsportfreunde04@t-online.de"}

VERBOTENE_DATEINAMEN_TEILE = ["WhatsApp", "IMG-2026", "IMG-2025", "IMG-2024"]
# "Mannheim" stand hier ursprünglich als generischer Demodaten-Marker; P5
# bringt mit dem App-Projektpartner vmapit GmbH (data/sponsoren.json) eine
# echte, öffentliche Firmenadresse in Mannheim ins Projekt – klarer
# Fehlalarm, daher entfernt (siehe Abschlussbericht P5).
VERBOTENE_TEXTE = ["Made with AI", "Max Mustermann", "Erika Mustermann", "Teststraße"]


def ist_text_datei(pfad):
    return pfad.suffix.lower() in TEXT_ENDUNGEN


def pruefe_dateinamen(pfad, treffer):
    for teil in VERBOTENE_DATEINAMEN_TEILE:
        if teil.lower() in pfad.name.lower():
            treffer.append((str(pfad.relative_to(ROOT)), "-", f"verdächtiger Dateiname: enthält '{teil}'"))


def pruefe_zeile(pfad_rel, zeilennr, zeile, treffer):
    # CSS-Zeilen mit unicode-range (z. B. "U+0152-0153" in den selbst gehosteten
    # @font-face-Regeln) erzeugen mit dem Telefonmuster \b0\d{2,5}[ /\-]?\d{3,}\b
    # einen Fehltreffer (0152-0153 sieht wie eine Ortsnetz-Rufnummer aus). Diese
    # Zeilen enthalten keine personenbezogenen Daten und werden daher übersprungen.
    if "unicode-range" in zeile:
        return

    for m in MUSTER_TELEFON_1.finditer(zeile):
        text = m.group().strip()
        if text not in WHITELIST_TELEFON:
            treffer.append((pfad_rel, zeilennr, f"Telefonmuster (+49): '{text}'"))

    for m in MUSTER_TELEFON_2.finditer(zeile):
        text = m.group().strip()
        # P16: CSS-Hex-Farbwerte wie "#000000" (u. a. mehrere 1:1 aus der
        # appack-Vorlage übernommene Vorgabewerte in huelle.js/huelle.css,
        # siehe drender.html) sehen mit \b0\d{2,5}[ /\-]?\d{3,}\b wie eine
        # Ortsnetz-Rufnummer aus (0 gefolgt von weiteren Ziffern) – kein
        # Telefonmuster, wenn dem Treffer unmittelbar ein "#" vorausgeht.
        vorheriges_zeichen = zeile[m.start() - 1] if m.start() > 0 else ""
        if vorheriges_zeichen == "#":
            continue
        if text not in WHITELIST_TELEFON:
            treffer.append((pfad_rel, zeilennr, f"Telefonmuster (0…): '{text}'"))

    for m in MUSTER_IBAN.finditer(zeile):
        treffer.append((pfad_rel, zeilennr, f"IBAN-Muster: '{m.group()}'"))

    for m in MUSTER_GEBURTSDATUM.finditer(zeile):
        treffer.append((pfad_rel, zeilennr, f"geburtsdatumsähnliche Angabe: '{m.group()}'"))

    for m in MUSTER_EMAIL.finditer(zeile):
        adresse = m.group()
        domain = adresse.split("@", 1)[1].lower() if "@" in adresse else ""
        erlaubt = adresse.lower() in ERLAUBTE_EMAIL_ADRESSEN or any(
            domain == d or domain.endswith("." + d) for d in ERLAUBTE_EMAIL_DOMAINS
        )
        if not erlaubt:
            treffer.append((pfad_rel, zeilennr, f"E-Mail außerhalb der erlaubten Domains: '{adresse}'"))

    for text in VERBOTENE_TEXTE:
        if text.lower() in zeile.lower():
            treffer.append((pfad_rel, zeilennr, f"Demodaten-Rest: '{text}'"))


def main():
    treffer = []

    for ordnername in DURCHSUCHTE_ORDNER:
        ordner = ROOT / ordnername
        if not ordner.exists():
            continue
        for pfad in sorted(ordner.rglob("*")):
            if not pfad.is_file():
                continue
            pruefe_dateinamen(pfad, treffer)
            if not ist_text_datei(pfad):
                continue
            pfad_rel = str(pfad.relative_to(ROOT))
            try:
                inhalt = pfad.read_text(encoding="utf-8", errors="strict")
            except (UnicodeDecodeError, OSError) as exc:
                treffer.append((pfad_rel, "-", f"Datei konnte nicht als Text gelesen werden: {exc}"))
                continue
            for zeilennr, zeile in enumerate(inhalt.splitlines(), start=1):
                pruefe_zeile(pfad_rel, zeilennr, zeile, treffer)

    if treffer:
        print(f"pii-check: {len(treffer)} Treffer gefunden\n")
        for datei, zeile, text in treffer:
            print(f"{datei}:{zeile}: {text}")
        sys.exit(1)
    else:
        print("pii-check: keine Treffer. Sauber.")
        sys.exit(0)


if __name__ == "__main__":
    main()
