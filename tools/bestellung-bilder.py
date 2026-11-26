#!/usr/bin/env python3
"""
Bestellseite für Trainer – Produktbilder aufbereiten.

Aufruf:  python3 tools/bestellung-bilder.py <Quellordner> [--ziel <Ordner>]

Liest aus dem Quellordner je Artikel eine Datei <id>.jpg (auch .jpeg, .png, .webp), wobei <id> die id eines Artikels
aus data/bestellung.json ist (trikot, shorts, regenjacke …), und schreibt daraus die kleinen, einheitlichen Kacheln
für die Artikelzeilen nach assets/bilder/bestellung/<id>.webp:

  1. den fast weißen Rand wegschneiden (Freisteller auf weißem Grund; Transparenz zählt als Weiß),
  2. das Produkt mittig auf eine weiße, quadratische Fläche setzen, so groß, dass es die längere Seite zu 84 % füllt
     (alle Kacheln haben so denselben Rand, ein Stutzen ist genauso hoch wie ein Rucksack),
  3. die Fläche mit LANCZOS auf 144 x 144 Pixel verkleinern (die Seite zeigt sie 48 x 48 groß, also dreifach scharf),
  4. als verlustbehaftetes WebP speichern (Qualität 90, das sind rund 1 bis 3 KB; wäre eine Kachel größer als 12.000 Byte,
     ginge es in Vierer-Schritten abwärts, bis 50). Keine Metadaten.

Die Quellen (Herstellerbilder) liegen nur außerhalb des Repos; ins Repo kommen nur die Kacheln. Quellen dürfen jede
Größe haben (zum Beispiel 120 x 144 aus einem Angebot oder 1200 x 1200 vom Hersteller). Dieselbe Eingabe ergibt mit
derselben Pillow- und libwebp-Version byte-gleiche Dateien; ein zweiter Lauf ändert nichts (Status „unverändert“).

Dateien mit unbekanntem Namen (<id> ist kein Artikel) werden mit einer Warnung übersprungen. Andere Dateien im
Quellordner, Unterordner und versteckte Dateien (Anfang „.“) werden ignoriert. Zwei Quellen für denselben Artikel
(trikot.jpg und trikot.png) sind ein Fehler. Das Skript trägt nichts in data/bestellung.json ein: Hat ein Artikel
ein Bild bekommen, dort bei dem Artikel "bild": "<id>.webp" ergänzen (npm run build prüft, dass die Datei da ist).

Exit 0: alles in Ordnung. Exit 1: Fehler (Quellordner fehlt, keine passende Quelle, Bild nicht lesbar oder leer,
Quelle doppelt, Datei trotz Qualitätsleiter zu groß; dann wird nichts geschrieben). Exit 2: falscher Aufruf.
"""

import argparse
import io
import json
import sys
from pathlib import Path

try:
    from PIL import Image, ImageChops, ImageOps
except ImportError:
    print("Pillow fehlt. Installieren mit: pip3 install Pillow", file=sys.stderr)
    sys.exit(1)

ROOT = Path(__file__).resolve().parent.parent
DATEN = ROOT / "data" / "bestellung.json"
ZIEL_STANDARD = ROOT / "assets" / "bilder" / "bestellung"

QUELL_ENDUNGEN = {".jpg", ".jpeg", ".png", ".webp"}
KANTE = 144                 # Kantenlänge der Kachel in Pixel (die Seite zeigt 48 x 48, dreifach)
ANTEIL = 84                 # Prozent: so viel der Kachel füllt die längere Seite des Produkts
WEISS_TOLERANZ = 12         # ein Pixel zählt als Produkt, wenn ein Kanal mehr als so weit von Weiß abweicht (JPEG-Rauschen am Rand nicht)
QUALITAETEN = [90, 86, 82, 78, 74, 70, 66, 62, 58, 54, 50]
MAX_BYTES = 12000           # je Kachel (Dezimal-KB, wie die 200.000 Byte in tools/bilder.py)


class Fehler(Exception):
    pass


def artikel_ids():
    try:
        daten = json.loads(DATEN.read_text(encoding="utf-8"))
        return [a["id"] for a in daten["artikel"]]
    except (OSError, ValueError, KeyError, TypeError) as e:
        raise Fehler(f"{DATEN.relative_to(ROOT)} lässt sich nicht lesen ({e})")


def auf_weiss_rgb(bild):
    """Das Bild als RGB; Transparenz wird auf Weiß gelegt."""
    bild = ImageOps.exif_transpose(bild)
    if bild.mode in ("RGBA", "LA", "PA") or (bild.mode == "P" and "transparency" in bild.info):
        bild = bild.convert("RGBA")
        grund = Image.new("RGBA", bild.size, (255, 255, 255, 255))
        return Image.alpha_composite(grund, bild).convert("RGB")
    return bild.convert("RGB")


def produkt_rahmen(rgb):
    """Rechteck um alles, was nicht (fast) weiß ist; None, wenn das Bild ganz weiß ist."""
    r, g, b = rgb.split()
    dunkelster_kanal = ImageChops.darker(ImageChops.darker(r, g), b)
    maske = dunkelster_kanal.point(lambda p: 255 if p < 255 - WEISS_TOLERANZ else 0)
    return maske.getbbox()


def kachel(bild):
    """Die fertige Kachel (KANTE x KANTE, RGB) aus einem geöffneten Bild."""
    rgb = auf_weiss_rgb(bild)
    rahmen = produkt_rahmen(rgb)
    if rahmen is None:
        raise Fehler("das Bild ist ganz weiß (kein Produkt gefunden)")
    produkt = rgb.crop(rahmen)
    lang = max(produkt.size)
    # Quadrat so groß, dass die längere Seite des Produkts ANTEIL Prozent davon füllt (aufgerundet)
    seite = -(-lang * 100 // ANTEIL)
    flaeche = Image.new("RGB", (seite, seite), (255, 255, 255))
    flaeche.paste(produkt, ((seite - produkt.width) // 2, (seite - produkt.height) // 2))
    return flaeche.resize((KANTE, KANTE), Image.LANCZOS)


def kodiere(bild):
    """WebP-Bytes in der besten Qualität, die in MAX_BYTES passt; (Bytes, Qualität)."""
    for qualitaet in QUALITAETEN:
        puffer = io.BytesIO()
        bild.save(puffer, format="WEBP", quality=qualitaet, method=6)
        daten = puffer.getvalue()
        if len(daten) <= MAX_BYTES:
            return daten, qualitaet
    raise Fehler(f"auch mit Qualität {QUALITAETEN[-1]} größer als {MAX_BYTES} Byte ({len(daten)})")


def sammle_quellen(quelle, ids):
    """(Liste (id, Datei), Liste Warnungen) – sortiert, damit der Lauf immer gleich verläuft."""
    gefunden = {}
    warnungen = []
    for datei in sorted(quelle.iterdir(), key=lambda p: p.name):
        if datei.name.startswith(".") or not datei.is_file() or datei.suffix.lower() not in QUELL_ENDUNGEN:
            continue
        if datei.stem not in ids:
            warnungen.append(f"{datei.name}: „{datei.stem}“ ist kein Artikel in data/bestellung.json, übersprungen")
            continue
        gefunden.setdefault(datei.stem, []).append(datei)
    doppelt = {i: [d.name for d in dateien] for i, dateien in gefunden.items() if len(dateien) > 1}
    if doppelt:
        raise Fehler("mehrere Quellen für einen Artikel: " + "; ".join(f"{i}: {', '.join(n)}" for i, n in doppelt.items()))
    return [(i, gefunden[i][0]) for i in ids if i in gefunden], warnungen


def main(argv=None):
    parser = argparse.ArgumentParser(description="Produktbilder der Bestellseite aufbereiten (144 x 144 WebP).")
    parser.add_argument("quelle", help="Ordner mit <id>.jpg (oder .jpeg, .png, .webp), id = Artikel aus data/bestellung.json")
    parser.add_argument("--ziel", default=str(ZIEL_STANDARD), help="Zielordner (Standard: assets/bilder/bestellung; nur für Tests ein anderer)")
    args = parser.parse_args(argv)
    quelle = Path(args.quelle)
    ziel = Path(args.ziel)

    try:
        if not quelle.is_dir():
            raise Fehler(f"Quellordner {quelle} gibt es nicht")
        ids = artikel_ids()
        quellen, warnungen = sammle_quellen(quelle, ids)
        for text in warnungen:
            print("Warnung: " + text, file=sys.stderr)
        if not quellen:
            raise Fehler(f"in {quelle} liegt keine Datei <id>.jpg/.png/.webp mit der id eines Artikels ({', '.join(ids)})")

        ergebnisse = []
        for artikel_id, datei in quellen:
            try:
                with Image.open(datei) as offen:
                    groesse = offen.size
                    daten, qualitaet = kodiere(kachel(offen))
            except Fehler as e:
                raise Fehler(f"{datei.name}: {e}")
            except OSError as e:
                raise Fehler(f"{datei.name}: lässt sich nicht als Bild lesen ({e})")
            ergebnisse.append((artikel_id, groesse, daten, qualitaet))
    except Fehler as e:
        print("Fehler: " + str(e), file=sys.stderr)
        return 1

    ziel.mkdir(parents=True, exist_ok=True)
    print(f"{'id':<14}{'Quelle':<12}{'Bytes':>7}  {'Qualität':>8}  Status")
    for artikel_id, groesse, daten, qualitaet in ergebnisse:
        datei = ziel / f"{artikel_id}.webp"
        if datei.exists() and datei.read_bytes() == daten:
            status = "unverändert"
        else:
            status = "geändert" if datei.exists() else "neu"
            datei.write_bytes(daten)
        print(f"{artikel_id:<14}{f'{groesse[0]}x{groesse[1]}':<12}{len(daten):>7}  {qualitaet:>8}  {status}")
    ohne = [i for i in ids if i not in {e[0] for e in ergebnisse}]
    if ohne:
        print("ohne Quelle (die Kachel bleibt leer, solange es kein Bild gibt): " + ", ".join(ohne))
    return 0


if __name__ == "__main__":
    sys.exit(main())
