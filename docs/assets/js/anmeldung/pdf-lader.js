/*
  Lädt alles, was der PDF-Baustein (pdf.js) braucht, und ruft ihn auf
  (29.09.2026). Der Assistent selbst enthält keine PDF-Logik.

  Ablauf in erstelleAnmeldungPdf():
    1. pdf.js laden (dynamisch, damit ein fehlendes Modul nur diesen Schritt
       stört) und fragen, welche Vorlagen es braucht (benoetigteVorlagen).
    2. pdf-lib und fontkit als Skripte nachladen (dieselben Bündel wie beim
       Online-Aufnahmeantrag, assets/js/antrag/), dazu die Schrift Liberation
       Sans und nur die benötigten Vorlagen aus assets/pdf/anmeldung/.
    3. Jede Vorlage gegen Größe und SHA-256 aus konfig.formulare prüfen. Die
       Feldpositionen gelten nur für genau diese Dateien; wurde eine ersetzt,
       bricht der Assistent ab, statt Angaben an falsche Stellen zu schreiben.
    4. erzeugePdf() mit allem aufrufen (SCHNITTSTELLEN Abschnitt 7).

  Geladen wird nur per GET von der eigenen Seite (relative Pfade); es geht
  nichts hinaus. Ohne Skript-Bündel im Browser bricht alles mit einer klaren
  Fehlerart ab (LadeFehler.art), die der Assistent in Text umsetzt.
*/

export class LadeFehler extends Error {
  constructor(art, detail) {
    super(art + (detail ? ": " + detail : ""));
    this.art = art;
  }
}

// Alle Adressen sind Pfade relativ zu dieser Datei (assets/js/anmeldung/) und
// bleiben damit auf der eigenen Seite. Vorlagen stehen in
// data/anmeldung-formulare.json als "assets/pdf/anmeldung/…"; die Wurzel der
// Seite liegt drei Ebenen über dieser Datei.
const PDF_LIB = "../antrag/aufnahmeantrag-pdf-lib.js";
const FONTKIT = "../antrag/aufnahmeantrag-fontkit.js";
const SCHRIFT = "../../fonts/liberation-sans-regular.ttf";
const WURZEL = "../../../";

const skripte = new Map();

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
        s.onload = () => (window[globalName] ? ok(window[globalName]) : fehler(new LadeFehler("bibliothek", relativ)));
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

function hex(puffer) {
  return Array.prototype.map.call(new Uint8Array(puffer), (b) => (b < 16 ? "0" : "") + b.toString(16)).join("");
}

let schriftCache = null;
async function ladeSchrift() {
  if (!schriftCache) schriftCache = holeBytes(SCHRIFT, "bibliothek").catch((e) => { schriftCache = null; throw e; });
  return schriftCache;
}

const vorlagenCache = new Map();
async function ladeVorlage(schluessel, konfig) {
  if (vorlagenCache.has(schluessel)) return vorlagenCache.get(schluessel);
  const eintrag = konfig.formulare && konfig.formulare.formulare && konfig.formulare.formulare[schluessel];
  if (!eintrag || !eintrag.datei) throw new LadeFehler("vorlage-fehlt", schluessel);
  const bytes = await holeBytes(WURZEL + eintrag.datei, "vorlage-netz");
  if (eintrag.bytes && bytes.byteLength !== eintrag.bytes) throw new LadeFehler("vorlage-geaendert", schluessel + ": " + bytes.byteLength + " Byte");
  if (eintrag.sha256 && window.crypto && window.crypto.subtle) {
    const summe = hex(await window.crypto.subtle.digest("SHA-256", bytes));
    if (summe !== eintrag.sha256) throw new LadeFehler("vorlage-geaendert", schluessel + ": " + summe);
  }
  vorlagenCache.set(schluessel, bytes);
  return bytes;
}

// Bilder in der Form für pdf.js (SCHNITTSTELLEN Abschnitt 6): nur, was
// tatsächlich hineingehört. Bei "alles auf Papier" gehen keine Unterschriften
// mit; Nachweise nur, wenn die Familie sie als vorhanden markiert hat.
export function bilderFuerPdf(a, bilder) {
  const nachweise = {};
  for (const [id, liste] of Object.entries(bilder.nachweise || {})) {
    if (a.nachweise && a.nachweise[id] === "habe" && liste.length) nachweise[id] = liste.map((x) => ({ bytes: x.bytes, typ: x.typ, name: x.name }));
  }
  const unterschriften = {};
  if (a.unterschriftWeg !== "papier") {
    for (const [wer, u] of Object.entries(bilder.unterschriften || {})) {
      if (u && u.bytes) unterschriften[wer] = { bytes: u.bytes, breitePx: u.breitePx, hoehePx: u.hoehePx };
    }
  }
  const foto = bilder.spielerfoto;
  return {
    spielerfoto: foto && foto.bytes && a.spielerfoto && a.spielerfoto.weg !== "verein" ? { bytes: foto.bytes, typ: foto.typ } : null,
    nachweise,
    unterschriften,
  };
}

// Erzeugt das PDF. Ergebnis wie erzeugePdf(): { bytes, seiten, teile, dateiname }.
export async function erstelleAnmeldungPdf({ konfig, a, e, bilder, heute }) {
  let pdf;
  try {
    pdf = await import("./pdf.js");
  } catch (fehler) {
    throw new LadeFehler("modul", fehler && fehler.message);
  }
  const schluessel = pdf.benoetigteVorlagen(e, a);
  const [PDFLib, fontkit, schrift, ...geladen] = await Promise.all([
    ladeSkript(PDF_LIB, "PDFLib"),
    ladeSkript(FONTKIT, "fontkit"),
    ladeSchrift(),
    ...schluessel.map((s) => ladeVorlage(s, konfig)),
  ]);
  const vorlagen = {};
  schluessel.forEach((s, i) => {
    vorlagen[s] = geladen[i];
  });
  try {
    return await pdf.erzeugePdf({ PDFLib, fontkit, schrift, vorlagen, konfig, a, e, bilder: bilderFuerPdf(a, bilder), heute });
  } catch (fehler) {
    console.error("Anmeldung: PDF-Erzeugung fehlgeschlagen", fehler);
    throw new LadeFehler("pdf", fehler && fehler.message);
  }
}
