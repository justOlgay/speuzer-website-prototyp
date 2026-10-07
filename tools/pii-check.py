#!/usr/bin/env python3
"""
Speuzer Website Prototyp – Datenschutz-Gate (P0)

Durchsucht data/, src/ und docs/ (Text- und HTML-Dateien) nach personenbezogenen
Daten und Demodaten-Resten. Zusätzlich (07.10.2026): private Namen aus der lokalen,
gitignorierten Liste tools/cache/pii-namen.txt (eine Zeile je Name, # = Kommentar) in
allen Textdateien des Repos außer tools/cache/, .git/ und node_modules/ – die Namen selbst
stehen nie in der Ausgabe. Gibt bei jedem Treffer "Datei:Zeile: Treffer" aus.
Exit 1 bei mindestens einem Treffer, Exit 0 wenn sauber.
"""

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DURCHSUCHTE_ORDNER = ["data", "src", "docs", "server"]

TEXT_ENDUNGEN = {
    ".html", ".htm", ".mjs", ".js", ".json", ".css", ".txt",
    ".xml", ".csv", ".md", ".svg", ".ics", ".php", ".py",
}

# Whitelist: die beiden Vereins-Festnetznummern (Geschäftsstelle, Platzwart) in allen Schreibweisen,
# inklusive der kompakten Schreibweise ohne Leerzeichen, wie sie in tel:-Links (href) steht (P1: Fußbereich)
WHITELIST_TELEFON = {
    # Nachbesserung 28.09.2026: die Ziffernfolge 0–9 ist keine Telefonnummer – sie steht in
    # der Zeichenbreiten-Tabelle des Aufnahmeantrags (data/aufnahmeantrag-schriftbreiten.json,
    # alle Ziffern sind gleich breit) und damit auch in der Seite aufnahmeantrag.html.
    "0123456789",
    "+49 69 736868",
    "+49 69 732193",
    "069 736868",
    "069 732193",
    "+4969736868",
    "+4969732193",
    # P8: dieselbe Platzwart-Nummer, wörtlich so in der App-Datenschutzerklärung
    # (data/datenschutz.json) geschrieben – "(0)" nach der Landesvorwahl.
    "+49 (0) 69 732193",
    # W8: dieselbe Geschäftsstellen-Nummer, in derselben "(0)"-Schreibweise – die
    # App-Datenschutzerklärung (data/datenschutz.json, Abschnitt "1.
    # Begrifflichkeiten") nannte hier fälschlich die Platzwart-Nummer statt der
    # Geschäftsstelle; W8-Korrektur (Prüfer-Befund) ersetzt sie.
    "+49 (0) 69 736868",
    # W3: dieselbe Geschäftsstellen-Nummer, so wie sie die appack-Worksheet-API
    # liefert (data/geschaeftsstelle.json, tools/appack-daten.mjs) – mit
    # Bindestrich statt Leerzeichen.
    "069-736868",
    # W3b: dieselbe Nummer in der kompakten Schreibweise ohne Trennzeichen, wie
    # sie im tel:-Link (href) steht, seitdem kontakt.mjs die Geschäftsstellen-
    # Telefonnummer aus data/geschaeftsstelle.json (Worksheet-Schreibweise
    # "069-736868") statt aus data/verein.json rendert – telHref() entfernt
    # dafür alle Nicht-Ziffern.
    "069736868",
    # W9: Platzwart-Nummer in derselben kompakten tel:-Schreibweise, seit
    # data/verein.json die Nummern einheitlich als "069 …" führt.
    "069732193",
}

# Anmelde-Assistent (29.09.2026): Die Bundesnetzagentur hält diese Rufnummern für Medien dauerhaft frei
# („Drama Numbers“, Mitteilung 148/2021, Amtsblatt 07/2021). Beispiele und Testdaten dürfen sie
# verwenden, weil sie nie einer Person zugeteilt werden.
DRAMA_BEREICHE = (
    ("03023125", 3), ("06990009", 3), ("04066969", 3), ("02214710", 3), ("08999998", 3),  # Ortsnetze, je 000–999
    ("0176040690", 2), ("017139200", 2),                                               # Mobilfunk, je 00–99
)
DRAMA_EINZELN = {"015228817386", "015228895456", "015254599371", "01729925904", "01729968532",
                 "01729973185", "01729973186", "01729980752", "01749091317", "01749464308"}


def ist_drama_nummer(text):
    ziffern = re.sub(r"\D", "", text)
    if text.strip().startswith("+49") or ziffern.startswith("0049"):
        # internationale Schreibweise, auch „+49 (0) 176 …“
        ziffern = "0" + ziffern[4 if ziffern.startswith("0049") else 2:].lstrip("0")
    if ziffern in DRAMA_EINZELN:
        return True
    return any(ziffern.startswith(p) and len(ziffern) == len(p) + n for p, n in DRAMA_BEREICHE)


MUSTER_TELEFON_1 = re.compile(r"\+49[\d /()\-]{6,}")
MUSTER_TELEFON_2 = re.compile(r"\b0\d{2,5}[ /\-]?\d{3,}\b")
MUSTER_IBAN = re.compile(r"\bDE\d{2}\s?\d{4}")
MUSTER_GEBURTSDATUM = re.compile(r"\b\d{2}\.\d{2}\.(19\d{2}|20[01]\d|202[0-4])\b")
MUSTER_EMAIL = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")

# example.org/.com/.net sind für Beispiele reserviert (RFC 2606, RFC 6761) und gehören niemandem;
# die Beispiele des Anmelde-Assistenten (assets/js/anmeldung/beispiele.js) verwenden sie (29.09.2026).
ERLAUBTE_EMAIL_DOMAINS = ("sportfreunde04.de", "example.org", "example.com", "example.net")
# "ffvsportfreunde04@t-online.de" (P8): die eigene, alte Kontaktadresse des
# Vereins aus der App-Datenschutzerklärung (data/datenschutz.json, Abschnitt
# "1. Begrifflichkeiten" – "Für die Verarbeitung Verantwortliche Stelle").
# Wörtlich übernommen wie im Original, siehe Plan-Abschnitt B2: keine private
# Adresse, sondern die Vereinsadresse (nur auf einer anderen Domain als
# @sportfreunde04.de).
# "datenschutz@hfv-online.de": öffentliche Datenschutz-Adresse des Hessischen
# Fußball-Verbands, genannt in der Datenschutzinformation des
# Anmelde-Assistenten (assets/js/anmeldung/pdf.js). Keine Privatperson.
ERLAUBTE_EMAIL_ADRESSEN = {"info@vmapit.de", "ffvsportfreunde04@t-online.de", "datenschutz@hfv-online.de"}

VERBOTENE_DATEINAMEN_TEILE = ["WhatsApp", "IMG-2026", "IMG-2025", "IMG-2024"]

# Aufnahmeantrag online (28.09.2026): unveränderter Fremdcode (pdf-lib,
# @pdf-lib/fontkit, siehe assets/js/antrag/LIZENZ.txt und
# tools/antrag-bibliotheken.mjs). Die minifizierten Bündel enthalten
# Zeichenfolgen wie "0123456789", die das Telefonmuster als Fehltreffer
# meldet; Vereinsdaten stehen darin nicht. Nur diese Dateinamen, egal ob unter
# assets/, docs/assets/ oder docs/appack-paket/web/.
FREMDCODE_DATEIEN = {"aufnahmeantrag-pdf-lib.js", "aufnahmeantrag-fontkit.js",
                     # PHPMailer 7.1.1 (server/aufnahmeantrag-annahme/lib/PHPMailer): Autoren-Adressen im Quelltext
                     "PHPMailer.php", "SMTP.php", "Exception.php"}
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
        if text not in WHITELIST_TELEFON and not ist_drama_nummer(text):
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
        if text not in WHITELIST_TELEFON and not ist_drama_nummer(text):
            treffer.append((pfad_rel, zeilennr, f"Telefonmuster (0…): '{text}'"))

    for m in MUSTER_IBAN.finditer(zeile):
        treffer.append((pfad_rel, zeilennr, f"IBAN-Muster: '{m.group()}'"))

    for m in MUSTER_GEBURTSDATUM.finditer(zeile):
        treffer.append((pfad_rel, zeilennr, f"geburtsdatumsähnliche Angabe: '{m.group()}'"))

    for m in MUSTER_EMAIL.finditer(zeile):
        # Satzzeichen am Ende gehören nicht zur Adresse („… an info@x.de.“).
        adresse = m.group().rstrip(".-")
        domain = adresse.split("@", 1)[1].lower() if "@" in adresse else ""
        erlaubt = adresse.lower() in ERLAUBTE_EMAIL_ADRESSEN or any(
            domain == d or domain.endswith("." + d) for d in ERLAUBTE_EMAIL_DOMAINS
        )
        if not erlaubt:
            treffer.append((pfad_rel, zeilennr, f"E-Mail außerhalb der erlaubten Domains: '{adresse}'"))

    for text in VERBOTENE_TEXTE:
        if text.lower() in zeile.lower():
            treffer.append((pfad_rel, zeilennr, f"Demodaten-Rest: '{text}'"))


NAMENSLISTE = ROOT / "tools" / "cache" / "pii-namen.txt"
NAMENS_AUSNAHMEN = {".git", "node_modules"}


def lade_private_namen():
    if not NAMENSLISTE.exists():
        return []
    namen = [z.strip() for z in NAMENSLISTE.read_text(encoding="utf-8").splitlines()]
    return [re.compile(r"(?<![\w])" + re.escape(n) + r"(?![\w])", re.IGNORECASE) for n in namen if n and not n.startswith("#")]


def pruefe_private_namen(treffer):
    muster = lade_private_namen()
    if not muster:
        print("pii-check: Hinweis – keine private Namensliste (tools/cache/pii-namen.txt), Namensprüfung übersprungen.")
        return
    for pfad in sorted(ROOT.rglob("*")):
        teile = pfad.relative_to(ROOT).parts
        if not pfad.is_file() or not teile or teile[0] in NAMENS_AUSNAHMEN or teile[:2] == ("tools", "cache"):
            continue
        if not ist_text_datei(pfad) or pfad.name in FREMDCODE_DATEIEN:
            continue
        try:
            inhalt = pfad.read_text(encoding="utf-8", errors="strict")
        except (UnicodeDecodeError, OSError):
            continue
        for zeilennr, zeile in enumerate(inhalt.splitlines(), start=1):
            if any(m.search(zeile) for m in muster):
                treffer.append((str(pfad.relative_to(ROOT)), zeilennr, "privater Name aus pii-namen.txt"))


def main():
    treffer = []
    pruefe_private_namen(treffer)

    for ordnername in DURCHSUCHTE_ORDNER:
        ordner = ROOT / ordnername
        if not ordner.exists():
            continue
        for pfad in sorted(ordner.rglob("*")):
            if not pfad.is_file():
                continue
            pruefe_dateinamen(pfad, treffer)
            if not ist_text_datei(pfad) or pfad.name in FREMDCODE_DATEIEN:
                continue
            # Lokale Tests der Annahme (server/…/test/) arbeiten absichtlich mit
            # Beispieldaten (example.org, .test-Domains, „Max Mustermann“).
            if ordnername == "server" and "test" in pfad.relative_to(ordner).parts:
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
