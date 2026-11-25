/*
  Lädt pdf-lib, fontkit und die Schrift für die PDF-Erzeugung der Seite „Neu im Trainerteam“ (trainer-pdf.js).

  Das ist der Lader des Anmelde-Assistenten (pdf-lader.js) in knapper Form: Dort sind ladeSkript, holeBytes, holeModulBytes
  und ladeSchrift nicht exportiert, und die Datei bleibt unverändert. Verhalten und Fehlerarten sind dieselben (Klasse LadeFehler
  aus pdf-lader.js, Art „bibliothek“ für pdf-lib, fontkit und Schrift), damit die Oberfläche beide gleich behandeln kann.

  Quellen (konfig.quellen, wie beim Assistenten):
    pdfLib, fontkit   Skripte (Adresse relativ zu dieser Datei); Standard: die Bündel des Online-Aufnahmeantrags
                      (../antrag/aufnahmeantrag-pdf-lib.js und ../antrag/aufnahmeantrag-fontkit.js)
    schriftModul      Live-Fassung: Modul mit der Schrift als Base64-Text („export default <Text>“); sonst die Datei
                      ../../fonts/liberation-sans-regular.ttf
  Geladen wird nur per GET von der eigenen Seite (relative Pfade); es geht nichts hinaus.

  Wiederholung nach einem Ladefehler („Noch einmal versuchen“): Jeder Versuch ist eine neue Anfrage (<script> und fetch). Die Schrift
  im Modul wird deshalb nicht per import() geladen, sondern als Text geholt und gelesen: Safari (WebKit) merkt sich ein gescheitertes
  Laden eines Moduls für die ganze Sitzung (gemessen in Safari 26.5 am 24.11.2026; nur ein vorheriges fetch() umgeht das), ein import()
  hülfe dort nach einem Fehler nie mehr, und die Person verlöre ihre Angaben. Nur wenn das Format des Moduls nicht erkannt wird, bleibt
  der bisherige Weg (import(), erst nach einem erfolgreichen fetch).

  Ohne Browser (Node-Test, Skripte) übergibt der Aufrufer die drei Werkzeuge selbst: werkzeuge = { PDFLib, fontkit, schrift }.
*/

import { LadeFehler } from "./pdf-lader.js";

const PDF_LIB = "../antrag/aufnahmeantrag-pdf-lib.js";
const FONTKIT = "../antrag/aufnahmeantrag-fontkit.js";
const SCHRIFT = "../../fonts/liberation-sans-regular.ttf";

const skripte = new Map();

// wie pdf-lader.js › ladeSkript, dazu: Kommt die Datei an, definiert aber den Namen nicht, bleibt der Fehler nicht im Speicher stehen
function ladeSkript(relativ, globalName) {
  if (window[globalName]) return Promise.resolve(window[globalName]);
  const url = new URL(relativ, import.meta.url).href;
  if (!skripte.has(url)) {
    skripte.set(
      url,
      new Promise((ok, fehler) => {
        const s = document.createElement("script");
        s.src = url;
        s.async = true;
        s.onload = () => {
          if (window[globalName]) return ok(window[globalName]);
          // Die Datei kam an, ist aber nicht das Skript (zum Beispiel eine Anmeldeseite im WLAN): die nächste Wiederholung fragt neu an
          skripte.delete(url);
          fehler(new LadeFehler("bibliothek", relativ));
        };
        s.onerror = () => {
          skripte.delete(url);
          fehler(new LadeFehler("bibliothek", relativ));
        };
        document.head.appendChild(s);
      })
    );
  }
  return skripte.get(url);
}

// wie pdf-lader.js › holeBytes
async function holeBytes(relativ, art) {
  let antwort;
  try {
    antwort = await fetch(new URL(relativ, import.meta.url), { credentials: "omit" });
  } catch (e) {
    throw new LadeFehler(art, e.message);
  }
  if (!antwort.ok) throw new LadeFehler(art, relativ + " HTTP " + antwort.status);
  return new Uint8Array(await antwort.arrayBuffer());
}

// Der Base64-Text im Quelltext eines Schriftmoduls: ein einziges „export default <Text>;“ (Schablone mit Zeilenumbrüchen oder Zeichenkette),
// davor höchstens Blockkommentare (Urheberrechtsvermerk und Lizenz der Schrift). So schreibt tools/appack-paket.mjs › anmBaueBase64Modul
// die Datei. Ergebnis: der Text (mit Leerraum, den atob überspringt) oder null, wenn der Quelltext anders aussieht.
const MODUL_FORMAT = /^\s*(?:\/\*[\s\S]*?\*\/\s*)*export\s+default\s*(["'`])([A-Za-z0-9+/=\s]*)\1\s*;?\s*$/;

export function leseModulText(quelltext) {
  const treffer = MODUL_FORMAT.exec(String(quelltext));
  return treffer ? treffer[2] : null;
}

// wie pdf-lader.js › holeModulBytes: Datei als Modul mit Base64-Text, erst bei Bedarf geladen. Aber nicht per import() (siehe oben: Safari
// merkt sich ein gescheitertes import() für die ganze Sitzung), sondern per fetch(): Der Quelltext wird geholt, der Text daraus gelesen
// (leseModulText) und wie bisher dekodiert. Jeder Versuch ist eine neue Anfrage; schlägt sie fehl, bricht holeModulBytes ab, ohne import().
async function holeModulBytes(relativ, art) {
  const url = new URL(relativ, import.meta.url).href;
  let text = null;
  try {
    const antwort = await fetch(url, { credentials: "omit" });
    if (!antwort.ok) throw new LadeFehler(art, relativ + " HTTP " + antwort.status);
    text = leseModulText(await antwort.text());
  } catch (e) {
    throw e instanceof LadeFehler ? e : new LadeFehler(art, relativ + ": " + e.message);
  }
  if (text === null) {
    // Format nicht erkannt: wie bisher als Modul laden (der fetch davor ist gelungen, die Datei ist erreichbar)
    try {
      text = (await import(url)).default;
    } catch (e) {
      throw new LadeFehler(art, relativ + ": " + e.message);
    }
  }
  if (typeof text !== "string") throw new LadeFehler(art, relativ + ": kein Text");
  try {
    const roh = window.atob(text);
    const bytes = new Uint8Array(roh.length);
    for (let i = 0; i < roh.length; i++) bytes[i] = roh.charCodeAt(i);
    return bytes;
  } catch (e) {
    throw new LadeFehler(art, relativ + ": " + e.message);
  }
}

let schriftCache = null;
function ladeSchrift(quellen) {
  if (!schriftCache) {
    const laden = quellen && quellen.schriftModul ? holeModulBytes(quellen.schriftModul, "bibliothek") : holeBytes(SCHRIFT, "bibliothek");
    schriftCache = laden.catch((e) => {
      schriftCache = null;
      throw e;
    });
  }
  return schriftCache;
}

// Ergebnis: { PDFLib, fontkit, schrift (Uint8Array) }. Fehler: LadeFehler (Art „bibliothek“).
export async function ladeWerkzeuge(konfig, werkzeuge) {
  if (werkzeuge && werkzeuge.PDFLib && werkzeuge.fontkit && werkzeuge.schrift && werkzeuge.schrift.length) return werkzeuge;
  if (typeof window === "undefined" || typeof document === "undefined") {
    throw new LadeFehler("bibliothek", "kein Browser: pdf-lib, fontkit und Schrift müssen übergeben werden");
  }
  const quellen = (konfig && konfig.quellen) || {};
  const [PDFLib, fontkit, schrift] = await Promise.all([
    ladeSkript(quellen.pdfLib || PDF_LIB, "PDFLib"),
    ladeSkript(quellen.fontkit || FONTKIT, "fontkit"),
    ladeSchrift(quellen),
  ]);
  return { PDFLib, fontkit, schrift };
}
