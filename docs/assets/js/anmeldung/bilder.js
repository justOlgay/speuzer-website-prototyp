/*
  Bilder und Dateien für den Anmelde-Assistenten (29.09.2026): Fotos von
  Nachweisen, PDF-Dateien und das Spielerfoto. Alles bleibt im Browser.

  Fotos werden über eine Zeichenfläche (Canvas) neu kodiert: lange Seite höchstens
  2000 Pixel, JPEG mit Qualität 0,8. Dabei fallen die Zusatzdaten der Kamera
  weg (EXIF, Standort). Das Spielerfoto wird mittig auf 3:4 zugeschnitten
  (Ziel 750 x 1000 Pixel, mindestens 375 Pixel breit). PDF-Dateien bleiben
  unverändert; geprüft werden nur Größe (höchstens 10 MB) und Dateikopf.

  Fehler tragen eine Art (`art`), die die Oberfläche in Text umsetzt:
  "typ" (weder Bild noch PDF), "heic" (Format lässt sich nicht lesen),
  "nicht-lesbar", "zu-gross", "zu-klein" (Spielerfoto), "leer".
*/

export const MAX_LANGE_SEITE = 2000;
export const JPEG_QUALITAET = 0.8;
export const MAX_PDF_BYTES = 10 * 1024 * 1024;
// Handyfotos sind meist 3 bis 12 MB groß; darüber ist es fast sicher keine Aufnahme.
export const MAX_BILD_BYTES = 60 * 1024 * 1024;
export const FOTO_BREITE = 750;
export const FOTO_HOEHE = 1000;
export const FOTO_MIN_BREITE = 375;

export class BildFehler extends Error {
  constructor(art, detail) {
    super(art + (detail ? ": " + detail : ""));
    this.art = art;
  }
}

const BILD_ENDUNGEN = /\.(jpe?g|png|webp|gif|bmp|avif|heic|heif|tiff?)$/i;
const HEIC = /\.(heic|heif)$/i;

export function istPdf(datei) {
  return datei.type === "application/pdf" || /\.pdf$/i.test(datei.name || "");
}

export function istBild(datei) {
  return (datei.type || "").startsWith("image/") || BILD_ENDUNGEN.test(datei.name || "");
}

function istHeic(datei) {
  return /^image\/hei[cf]$/i.test(datei.type || "") || HEIC.test(datei.name || "");
}

// Bild lesen; Drehung nach den Kameradaten (EXIF) wird angewendet.
async function ladeBild(datei) {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(datei, { imageOrientation: "from-image" });
    } catch (e) {
      /* ältere Browser kennen die Option nicht – weiter mit dem Standard */
    }
    try {
      return await createImageBitmap(datei);
    } catch (e) {
      /* weiter mit <img> */
    }
  }
  return new Promise((ok, fehler) => {
    const url = URL.createObjectURL(datei);
    const bild = new Image();
    bild.onload = () => {
      URL.revokeObjectURL(url);
      ok(bild);
    };
    bild.onerror = () => {
      URL.revokeObjectURL(url);
      fehler(new BildFehler(istHeic(datei) ? "heic" : "nicht-lesbar"));
    };
    bild.src = url;
  });
}

function breiteVon(bild) {
  return bild.naturalWidth || bild.width;
}

function hoeheVon(bild) {
  return bild.naturalHeight || bild.height;
}

function alsJpeg(flaeche) {
  return new Promise((ok, fehler) => {
    flaeche.toBlob(
      (blob) => {
        if (!blob) {
          fehler(new BildFehler("nicht-lesbar", "Bild ließ sich nicht kodieren"));
          return;
        }
        blob.arrayBuffer().then((b) => ok(new Uint8Array(b)), fehler);
      },
      "image/jpeg",
      JPEG_QUALITAET
    );
  });
}

// Zeichnet den Ausschnitt (sx, sy, sb, sh) des Bildes auf eine weiße Fläche.
function zeichne(bild, sx, sy, sb, sh, zb, zh) {
  const flaeche = document.createElement("canvas");
  flaeche.width = zb;
  flaeche.height = zh;
  const ctx = flaeche.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, zb, zh);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bild, sx, sy, sb, sh, 0, 0, zb, zh);
  return flaeche;
}

function freigeben(bild) {
  if (bild && typeof bild.close === "function") bild.close();
}

function jpgName(name) {
  const basis = String(name || "foto").replace(/\.[^.]+$/, "").replace(/[^\p{L}\p{N}_-]+/gu, "-").replace(/^-|-$/g, "") || "foto";
  return basis + ".jpg";
}

// Nachweis: Foto (wird verkleinert) oder PDF (unverändert).
// Ergebnis: { bytes: Uint8Array, typ: "image/jpeg"|"application/pdf", name }
export async function verarbeiteNachweis(datei) {
  if (!datei || !datei.size) throw new BildFehler("leer");
  if (istPdf(datei)) {
    if (datei.size > MAX_PDF_BYTES) throw new BildFehler("zu-gross");
    const bytes = new Uint8Array(await datei.arrayBuffer());
    const kopf = String.fromCharCode(...bytes.slice(0, 5));
    if (kopf !== "%PDF-") throw new BildFehler("nicht-lesbar", "kein PDF");
    return { bytes, typ: "application/pdf", name: datei.name || "Unterlage.pdf" };
  }
  if (!istBild(datei)) throw new BildFehler("typ");
  if (datei.size > MAX_BILD_BYTES) throw new BildFehler("zu-gross");
  let bild;
  try {
    bild = await ladeBild(datei);
  } catch (e) {
    throw e instanceof BildFehler ? e : new BildFehler(istHeic(datei) ? "heic" : "nicht-lesbar");
  }
  const b = breiteVon(bild);
  const hoehe = hoeheVon(bild);
  if (!b || !hoehe) {
    freigeben(bild);
    throw new BildFehler("nicht-lesbar");
  }
  const faktor = Math.min(1, MAX_LANGE_SEITE / Math.max(b, hoehe));
  const zb = Math.max(1, Math.round(b * faktor));
  const zh = Math.max(1, Math.round(hoehe * faktor));
  const flaeche = zeichne(bild, 0, 0, b, hoehe, zb, zh);
  freigeben(bild);
  return { bytes: await alsJpeg(flaeche), typ: "image/jpeg", name: jpgName(datei.name), breite: zb, hoehe: zh };
}

// Spielerfoto: mittig auf 3:4 zugeschnitten. Ergebnis: { bytes, typ, breite, hoehe }
export async function verarbeiteSpielerfoto(datei) {
  if (!datei || !datei.size) throw new BildFehler("leer");
  if (!istBild(datei)) throw new BildFehler("typ");
  if (datei.size > MAX_BILD_BYTES) throw new BildFehler("zu-gross");
  let bild;
  try {
    bild = await ladeBild(datei);
  } catch (e) {
    throw e instanceof BildFehler ? e : new BildFehler(istHeic(datei) ? "heic" : "nicht-lesbar");
  }
  const b = breiteVon(bild);
  const hoehe = hoeheVon(bild);
  if (!b || !hoehe) {
    freigeben(bild);
    throw new BildFehler("nicht-lesbar");
  }
  // Größter Ausschnitt im Verhältnis 3:4, mittig.
  let sb;
  let sh;
  if (b * 4 >= hoehe * 3) {
    sh = hoehe;
    sb = Math.floor((hoehe * 3) / 4);
  } else {
    sb = b;
    sh = Math.floor((b * 4) / 3);
  }
  if (sb < FOTO_MIN_BREITE) {
    freigeben(bild);
    throw new BildFehler("zu-klein");
  }
  const sx = Math.floor((b - sb) / 2);
  const sy = Math.floor((hoehe - sh) / 2);
  const zb = Math.min(FOTO_BREITE, sb);
  const zh = Math.round((zb * 4) / 3);
  const flaeche = zeichne(bild, sx, sy, sb, sh, zb, zh);
  freigeben(bild);
  return { bytes: await alsJpeg(flaeche), typ: "image/jpeg", breite: zb, hoehe: zh };
}

// Adresse für die Vorschau (Bild) – nach Gebrauch mit URL.revokeObjectURL freigeben.
export function vorschauUrl(bytes, typ) {
  return URL.createObjectURL(new Blob([bytes], { type: typ }));
}
