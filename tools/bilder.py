#!/usr/bin/env python3
"""
Speuzer Website Prototyp – Bildpipeline (P1)

Liest assets/bilder/quelle/*.{jpg,jpeg,png}, erzeugt responsive Varianten
(AVIF/WebP/JPEG) in den Breiten 480/960/1440 – nur Breiten <= Originalbreite,
plus die Originalbreite selbst, falls sie unter 1440 liegt. Schreibt nach
assets/bilder/erzeugt/<name>-<breite>.{avif,webp,jpg} und protokolliert
Maße + Dateinamen in data/bilder.json. EXIF wird verworfen (die Ausrichtung
wird vorher übernommen). Jede Datei muss <= 200 KB sein; sonst wird die
Qualität in 5er-Schritten gesenkt, bis sie passt (Minimum je Format).
Nur neue/geänderte Quellen werden verarbeitet (mtime-Vergleich).
"""

import json
import subprocess
import sys
from pathlib import Path

try:
    from PIL import Image, ImageOps
except ImportError:
    print("Pillow fehlt. Installieren mit: pip3 install Pillow", file=sys.stderr)
    sys.exit(1)

ROOT = Path(__file__).resolve().parent.parent
QUELLE = ROOT / "assets" / "bilder" / "quelle"
ZIEL = ROOT / "assets" / "bilder" / "erzeugt"
DATEN = ROOT / "data" / "bilder.json"

CWEBP = "/opt/homebrew/bin/cwebp"
AVIFENC = "/opt/homebrew/bin/avifenc"

STANDARD_BREITEN = [480, 960, 1440]
MAX_BYTES = 200 * 1024
QUELL_ENDUNGEN = {".jpg", ".jpeg", ".png"}

# Startqualität und Minimum je Format (Schritt 6 des Plans)
QUALITAET = {
    "avif": {"start": 55, "min": 55, "schritt": 5},
    "webp": {"start": 80, "min": 60, "schritt": 5},
    "jpg": {"start": 82, "min": 65, "schritt": 5},
}


def ermittle_breiten(original_breite):
    breiten = [b for b in STANDARD_BREITEN if b <= original_breite]
    if original_breite < 1440 and original_breite not in breiten:
        breiten.append(original_breite)
    return sorted(set(breiten))


def muss_neu_erzeugt_werden(quelle_pfad, ziel_dateien):
    if not all(p.exists() for p in ziel_dateien):
        return True
    quelle_mtime = quelle_pfad.stat().st_mtime
    return any(p.stat().st_mtime < quelle_mtime for p in ziel_dateien)


def speichere_jpeg(bild_rgb, ziel, qualitaet):
    bild_rgb.save(ziel, "JPEG", quality=qualitaet, progressive=True, optimize=True)


def speichere_webp(quelldatei_tmp, ziel, qualitaet):
    subprocess.run(
        [CWEBP, "-q", str(qualitaet), str(quelldatei_tmp), "-o", str(ziel)],
        check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )


def speichere_avif(quelldatei_tmp, ziel, qualitaet):
    subprocess.run(
        [AVIFENC, "-s", "6", "-q", str(qualitaet), str(quelldatei_tmp), str(ziel)],
        check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )


def erzeuge_mit_qualitaetsleiter(erzeuge_fn, ziel, format_):
    einstellung = QUALITAET[format_]
    q = einstellung["start"]
    erzeuge_fn(q)
    groesse = ziel.stat().st_size
    while groesse > MAX_BYTES and q > einstellung["min"]:
        q = max(q - einstellung["schritt"], einstellung["min"])
        erzeuge_fn(q)
        groesse = ziel.stat().st_size
        if q == einstellung["min"]:
            break
    if groesse > MAX_BYTES:
        print(f"  Warnung: {ziel.name} ist {groesse // 1024} KB (> 200 KB, Minimum-Qualität {q} erreicht)")
    return ziel.name


def erzeuge_variante(bild_rgb, name, breite, hoehe):
    skaliert = bild_rgb.resize((breite, hoehe), Image.LANCZOS)
    ziel_basis = ZIEL / f"{name}-{breite}"
    tmp_png = ziel_basis.with_suffix(".tmp.png")
    skaliert.save(tmp_png, "PNG")

    try:
        ziel_jpg = ziel_basis.with_suffix(".jpg")
        erzeuge_mit_qualitaetsleiter(lambda q: speichere_jpeg(skaliert, ziel_jpg, q), ziel_jpg, "jpg")

        ziel_webp = ziel_basis.with_suffix(".webp")
        erzeuge_mit_qualitaetsleiter(lambda q: speichere_webp(tmp_png, ziel_webp, q), ziel_webp, "webp")

        ziel_avif = ziel_basis.with_suffix(".avif")
        erzeuge_mit_qualitaetsleiter(lambda q: speichere_avif(tmp_png, ziel_avif, q), ziel_avif, "avif")
    finally:
        tmp_png.unlink(missing_ok=True)

    return {"avif": ziel_avif.name, "webp": ziel_webp.name, "jpg": ziel_jpg.name}


def main():
    if not QUELLE.exists():
        print("Kein Quellordner assets/bilder/quelle – nichts zu tun.")
        return

    ZIEL.mkdir(parents=True, exist_ok=True)
    DATEN.parent.mkdir(parents=True, exist_ok=True)

    quellen = sorted(p for p in QUELLE.iterdir() if p.suffix.lower() in QUELL_ENDUNGEN)
    ergebnis = {}

    if not quellen:
        print("Keine Quellbilder in assets/bilder/quelle gefunden.")
        DATEN.write_text(json.dumps(ergebnis, indent=2, ensure_ascii=False) + "\n", encoding="utf8")
        return

    for quelle_pfad in quellen:
        name = quelle_pfad.stem
        rohbild = Image.open(quelle_pfad)
        rohbild = ImageOps.exif_transpose(rohbild)  # Ausrichtung übernehmen …
        bild_rgb = rohbild.convert("RGB")  # … EXIF wird beim Neuspeichern nicht übernommen
        original_breite, original_hoehe = bild_rgb.size

        breiten = ermittle_breiten(original_breite)
        erwartete_dateien = [
            ZIEL / f"{name}-{b}.{fmt}" for b in breiten for fmt in ("avif", "webp", "jpg")
        ]

        varianten_eintrag = {}
        if muss_neu_erzeugt_werden(quelle_pfad, erwartete_dateien):
            print(f"Erzeuge Varianten für {quelle_pfad.name} ({original_breite}×{original_hoehe})…")
            for b in breiten:
                hoehe = round(original_hoehe * (b / original_breite))
                varianten_eintrag[str(b)] = erzeuge_variante(bild_rgb, name, b, hoehe)
        else:
            print(f"Unverändert, übersprungen: {quelle_pfad.name}")
            for b in breiten:
                varianten_eintrag[str(b)] = {
                    "avif": f"{name}-{b}.avif",
                    "webp": f"{name}-{b}.webp",
                    "jpg": f"{name}-{b}.jpg",
                }

        ergebnis[name] = {
            "breite": original_breite,
            "hoehe": original_hoehe,
            "varianten": varianten_eintrag,
        }

    DATEN.write_text(json.dumps(ergebnis, indent=2, ensure_ascii=False) + "\n", encoding="utf8")
    print(f"\ndata/bilder.json geschrieben ({len(ergebnis)} Bild(er)).")


if __name__ == "__main__":
    main()
