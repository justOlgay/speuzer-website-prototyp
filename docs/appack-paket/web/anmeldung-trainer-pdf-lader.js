import { LadeFehler } from "./anmeldung-pdf-lader.js";

const PDF_LIB = "../antrag/aufnahmeantrag-pdf-lib.js";
const FONTKIT = "../antrag/aufnahmeantrag-fontkit.js";
const SCHRIFT = "../../fonts/liberation-sans-regular.ttf";

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
        s.onload = () => {
          if (window[globalName]) return ok(window[globalName]);

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

const MODUL_FORMAT = /^\s*(?:\/\*[\s\S]*?\*\/\s*)*export\s+default\s*(["'`])([A-Za-z0-9+/=\s]*)\1\s*;?\s*$/;

export function leseModulText(quelltext) {
  const treffer = MODUL_FORMAT.exec(String(quelltext));
  return treffer ? treffer[2] : null;
}

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
