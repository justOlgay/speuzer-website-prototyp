/*
  Code-Schutz der Bestellseite: Verschlüsselung der Preisdaten (reine Funktionen, nur Web Crypto).

  Das Repo und GitHub Pages sind öffentlich. Die Preise laut Angebot (Listenpreise, Rabatt, Preise für Aufdrucke) dürfen darum
  nur verschlüsselt dort liegen: als Paket in data/bestellung-preise.enc.json, das der Bau in die Seite einbettet. Ohne den Code,
  den Trainerinnen und Trainer vom Verein bekommen, lässt sich nichts davon lesen. Erst nach dem Entschlüsseln baut die Seite
  Formular und Preistexte (seite.js).

  Verfahren (festgelegt, nicht verhandelbar):
    - Code normalisieren (normalisiereCode): Leerzeichen, Bindestriche und Unterstriche entfernen, Großbuchstaben.
    - Schlüssel: PBKDF2-HMAC-SHA256 über die UTF-8-Bytes des normalisierten Codes, Salt 16 Byte zufällig, 600.000 Runden,
      Ergebnis ein AES-GCM-Schlüssel mit 256 Bit, nicht exportierbar.
    - Verschlüsselung: AES-GCM, IV 12 Byte zufällig, zusätzliche Daten (AAD) = UTF-8 von „speuzer-bestellung-preise-v1“,
      Klartext = UTF-8 des JSON.
    - Paket: { "format": "speuzer-bestellung-preise-v1", "kdf": "PBKDF2-SHA256", "iter": 600000,
               "salt": "<base64>", "iv": "<base64>", "ct": "<base64>" } (Base64 nach RFC 4648 mit Füllzeichen).

  Läuft im Browser und in Node ab Version 20 (globalThis.crypto.subtle). Es steht kein Code und kein Teil eines Codes in einer
  Datei. Das Werkzeug tools/bestellung-zugang.mjs erzeugt das Paket; Tests: tools/bestellung-test/zugang-test.mjs.
*/

export const FORMAT = "speuzer-bestellung-preise-v1";
export const KDF = "PBKDF2-SHA256";
export const ITERATIONEN = 600000;

const SALT_BYTES = 16;
const IV_BYTES = 12;
const TAG_BYTES = 16; // AES-GCM: das Paket ist mindestens so lang wie die Prüfsumme
// Obergrenze für „iter“ aus einer Datei: Eine beschädigte oder untergeschobene Zahl darf den Browser nicht lahmlegen.
const ITER_MAX = 5000000;
const PAKET_MAX_BYTES = 1024 * 1024;

export const TEXT_CODE_FALSCH = "Der Code stimmt nicht.";

// art: "code" (falscher oder leerer Code), "format" (Paket beschädigt oder falsches Format), "technik" (Web Crypto fehlt).
export class ZugangFehler extends Error {
  constructor(text, art = "code") {
    super(text);
    this.name = "ZugangFehler";
    this.art = art;
  }
}

// ---------- Code ----------

// Leerzeichen (auch geschützte), Bindestriche (auch Gedankenstriche) und Unterstriche fallen weg, der Rest wird groß: „abc-def ghjk“ ergibt „ABCDEFGHJK“.
export function normalisiereCode(text) {
  return String(text === null || text === undefined ? "" : text)
    .replace(/[\s_\-‐-―−]+/g, "")
    .toUpperCase();
}

// ---------- Bytes und Base64 ----------

const utf8 = (text) => new TextEncoder().encode(text);

export function bytesZuBase64(bytes) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

// Streng: nur das Alphabet von RFC 4648 (mit Füllzeichen, Länge ein Vielfaches von 4); alles andere ist ein beschädigtes Paket.
export function base64ZuBytes(text, name = "Wert") {
  if (typeof text !== "string" || text.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(text)) {
    throw new ZugangFehler(`Die Preisdaten sind beschädigt (${name}).`, "format");
  }
  const s = atob(text);
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
  return bytes;
}

// ---------- Web Crypto ----------

function kryptoDienst() {
  const subtle = globalThis.crypto && globalThis.crypto.subtle;
  if (!subtle) {
    throw new ZugangFehler("Dieser Browser kann den Code hier nicht prüfen. Öffne die Seite über eine sichere Verbindung (https) und versuche es noch einmal.", "technik");
  }
  return subtle;
}

function zufall(laenge) {
  if (!globalThis.crypto || typeof globalThis.crypto.getRandomValues !== "function") {
    throw new ZugangFehler("Dieser Browser kann keine Zufallszahlen erzeugen.", "technik");
  }
  return globalThis.crypto.getRandomValues(new Uint8Array(laenge));
}

// PBKDF2-HMAC-SHA256 über den normalisierten Code › AES-GCM-Schlüssel (256 Bit, nicht exportierbar). Der Code darf roh oder schon
// normalisiert übergeben werden: beides ergibt denselben Schlüssel.
export async function leiteSchluesselAb(code, salt, iter = ITERATIONEN) {
  const subtle = kryptoDienst();
  const material = await subtle.importKey("raw", utf8(normalisiereCode(code)), "PBKDF2", false, ["deriveKey"]);
  return subtle.deriveKey({ name: "PBKDF2", hash: "SHA-256", salt, iterations: iter }, material, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

// ---------- Paket ----------

// Prüft Form und Längen des Pakets, ohne den Code zu kennen (die Seite zeigt sonst gleich beim Laden einen Hinweis) und liefert die
// Bytes. Wirft ZugangFehler mit art „format“.
export function pruefePaket(paket) {
  const kaputt = (text) => new ZugangFehler(text, "format");
  if (!paket || typeof paket !== "object" || Array.isArray(paket)) throw kaputt("Die Preisdaten fehlen oder sind beschädigt.");
  if (paket.format !== FORMAT || paket.kdf !== KDF) throw kaputt("Die Preisdaten haben ein unbekanntes Format.");
  if (!Number.isInteger(paket.iter) || paket.iter < 1 || paket.iter > ITER_MAX) throw kaputt("Die Preisdaten sind beschädigt (Rundenzahl).");
  const salt = base64ZuBytes(paket.salt, "salt");
  const iv = base64ZuBytes(paket.iv, "iv");
  const ct = base64ZuBytes(paket.ct, "ct");
  if (salt.length !== SALT_BYTES) throw kaputt("Die Preisdaten sind beschädigt (salt).");
  if (iv.length !== IV_BYTES) throw kaputt("Die Preisdaten sind beschädigt (iv).");
  if (ct.length < TAG_BYTES || ct.length > PAKET_MAX_BYTES) throw kaputt("Die Preisdaten sind beschädigt (ct).");
  return { salt, iv, ct, iter: paket.iter };
}

// Verschlüsselt die Preisdaten (beliebiges JSON) mit dem Code. Salt und IV sind je Aufruf neu und zufällig.
export async function verschluessele(daten, code, { iter = ITERATIONEN } = {}) {
  if (!Number.isInteger(iter) || iter < 1 || iter > ITER_MAX) throw new ZugangFehler("Ungültige Rundenzahl.", "format");
  if (normalisiereCode(code) === "") throw new ZugangFehler("Der Code ist leer.", "code");
  const subtle = kryptoDienst();
  const salt = zufall(SALT_BYTES);
  const iv = zufall(IV_BYTES);
  const schluessel = await leiteSchluesselAb(code, salt, iter);
  const ct = new Uint8Array(await subtle.encrypt({ name: "AES-GCM", iv, additionalData: utf8(FORMAT) }, schluessel, utf8(JSON.stringify(daten))));
  return { format: FORMAT, kdf: KDF, iter, salt: bytesZuBase64(salt), iv: bytesZuBase64(iv), ct: bytesZuBase64(ct) };
}

// Entschlüsselt das Paket und gibt die Daten zurück. Ein falscher Code wirft ZugangFehler("Der Code stimmt nicht."), ein Paket mit
// falscher Form einen ZugangFehler mit anderer Meldung (art „format“).
export async function entschluessele(paket, code) {
  const p = pruefePaket(paket);
  if (normalisiereCode(code) === "") throw new ZugangFehler(TEXT_CODE_FALSCH, "code");
  const subtle = kryptoDienst();
  const schluessel = await leiteSchluesselAb(code, p.salt, p.iter);
  let klar;
  try {
    klar = await subtle.decrypt({ name: "AES-GCM", iv: p.iv, additionalData: utf8(FORMAT) }, schluessel, p.ct);
  } catch (e) {
    throw new ZugangFehler(TEXT_CODE_FALSCH, "code");
  }
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(klar));
  } catch (e) {
    throw new ZugangFehler("Die Preisdaten sind beschädigt (Inhalt).", "format");
  }
}
