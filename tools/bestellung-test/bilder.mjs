// Hilfen für die Prüfung der Produktbilder der Bestellseite (mailtext-test.mjs und e2e.mjs).
//
// Die Bilder sind kleine Kacheln (144 x 144, WebP) unter assets/bilder/bestellung/, erzeugt mit tools/bestellung-bilder.py aus Herstellerbildern, die nur
// außerhalb des Repos liegen. Hier steht, was beide Tests brauchen, ohne eine Bildbibliothek: die Maße aus dem Kopf einer WebP-Datei.

import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

export const BILDER_ORDNER = path.join(ROOT, "assets", "bilder", "bestellung");
export const BILD_KANTE = 144; // Kantenlänge einer Kachel in Pixel (angezeigt 48 x 48, also dreifach scharf)
export const BILD_MAX_BYTES = 12000; // je Kachel

// Maße und Art einer WebP-Datei aus ihrem Kopf: { art: "VP8 " | "VP8L" | "VP8X", breite, hoehe }; null, wenn es kein WebP ist.
// Aufbau: „RIFF“, Länge, „WEBP“, dann ein Block mit der Art (VP8 = verlustbehaftet, VP8L = verlustfrei, VP8X = erweitert).
export function webpMasse(daten) {
  if (!Buffer.isBuffer(daten) || daten.length < 30) return null;
  if (daten.toString("latin1", 0, 4) !== "RIFF" || daten.toString("latin1", 8, 12) !== "WEBP") return null;
  const art = daten.toString("latin1", 12, 16);
  if (art === "VP8 ") {
    // 3 Byte Rahmenkopf, Startcode 9D 01 2A, dann Breite und Höhe mit je 14 Bit
    if (daten[23] !== 0x9d || daten[24] !== 0x01 || daten[25] !== 0x2a) return null;
    return { art, breite: daten.readUInt16LE(26) & 0x3fff, hoehe: daten.readUInt16LE(28) & 0x3fff };
  }
  if (art === "VP8L") {
    if (daten[20] !== 0x2f) return null;
    const bits = daten.readUInt32LE(21);
    return { art, breite: (bits & 0x3fff) + 1, hoehe: ((bits >>> 14) & 0x3fff) + 1 };
  }
  if (art === "VP8X") return { art, breite: daten.readUIntLE(24, 3) + 1, hoehe: daten.readUIntLE(27, 3) + 1 };
  return null;
}
