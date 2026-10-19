const WEGLASSEN = /[\s­​-‏‪-‮⁠-⁩﻿‐-―−﹘﹣－-]/g;

export function normalisiereCode(eingabe) {
  let text = String(eingabe === null || eingabe === undefined ? "" : eingabe);

  text = text.normalize("NFKD");
  text = text
    .replace(/[٠-٩]/g, (z) => String(z.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (z) => String(z.charCodeAt(0) - 0x06f0));
  text = text.replace(/\p{M}/gu, "");
  return text.replace(WEGLASSEN, "").toUpperCase();
}

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

const rechtsDrehen = (x, n) => (x >>> n) | (x << (32 - n));

export function sha256Bytes(daten) {
  const laenge = daten.length;
  const gesamt = (((laenge + 9 + 63) >> 6) << 6) >>> 0;
  const block = new Uint8Array(gesamt);
  block.set(daten);
  block[laenge] = 0x80;
  const ansicht = new DataView(block.buffer);
  ansicht.setUint32(gesamt - 8, Math.floor(laenge / 0x20000000));
  ansicht.setUint32(gesamt - 4, (laenge << 3) >>> 0);

  const h = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
  const w = new Uint32Array(64);
  for (let start = 0; start < gesamt; start += 64) {
    for (let t = 0; t < 16; t++) w[t] = ansicht.getUint32(start + t * 4);
    for (let t = 16; t < 64; t++) {
      const s0 = rechtsDrehen(w[t - 15], 7) ^ rechtsDrehen(w[t - 15], 18) ^ (w[t - 15] >>> 3);
      const s1 = rechtsDrehen(w[t - 2], 17) ^ rechtsDrehen(w[t - 2], 19) ^ (w[t - 2] >>> 10);
      w[t] = (w[t - 16] + s0 + w[t - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, i] = h;
    for (let t = 0; t < 64; t++) {
      const S1 = rechtsDrehen(e, 6) ^ rechtsDrehen(e, 11) ^ rechtsDrehen(e, 25);
      const wahl = (e & f) ^ (~e & g);
      const t1 = (i + S1 + wahl + K[t] + w[t]) >>> 0;
      const S0 = rechtsDrehen(a, 2) ^ rechtsDrehen(a, 13) ^ rechtsDrehen(a, 22);
      const mehrheit = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + mehrheit) >>> 0;
      i = g;
      g = f;
      f = e;
      e = (d + t1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) >>> 0;
    }
    h[0] = (h[0] + a) >>> 0;
    h[1] = (h[1] + b) >>> 0;
    h[2] = (h[2] + c) >>> 0;
    h[3] = (h[3] + d) >>> 0;
    h[4] = (h[4] + e) >>> 0;
    h[5] = (h[5] + f) >>> 0;
    h[6] = (h[6] + g) >>> 0;
    h[7] = (h[7] + i) >>> 0;
  }
  const aus = new Uint8Array(32);
  const ausAnsicht = new DataView(aus.buffer);
  h.forEach((wert, n) => ausAnsicht.setUint32(n * 4, wert));
  return aus;
}

export function utf8Bytes(text) {
  const bytes = [];
  for (const zeichen of String(text)) {
    const p = zeichen.codePointAt(0);
    if (p < 0x80) bytes.push(p);
    else if (p < 0x800) bytes.push(0xc0 | (p >> 6), 0x80 | (p & 63));
    else if (p < 0x10000) bytes.push(0xe0 | (p >> 12), 0x80 | ((p >> 6) & 63), 0x80 | (p & 63));
    else bytes.push(0xf0 | (p >> 18), 0x80 | ((p >> 12) & 63), 0x80 | ((p >> 6) & 63), 0x80 | (p & 63));
  }
  return new Uint8Array(bytes);
}

export function hexVon(bytes) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function sha256HexEigen(text) {
  return hexVon(sha256Bytes(utf8Bytes(text)));
}

export async function sha256Hex(text) {
  const bytes = utf8Bytes(text);
  const subtle = typeof globalThis !== "undefined" && globalThis.crypto ? globalThis.crypto.subtle : undefined;
  if (subtle && typeof subtle.digest === "function") {
    try {
      return hexVon(new Uint8Array(await subtle.digest("SHA-256", bytes)));
    } catch (fehler) {

    }
  }
  return hexVon(sha256Bytes(bytes));
}

export const PRUEFWERT_MUSTER = /^[0-9a-f]{64}$/;

export function zugangAusKonfig(regelwerk) {
  const z = regelwerk && typeof regelwerk.zugang === "object" && regelwerk.zugang ? regelwerk.zugang : {};
  const liste = Array.isArray(z.pruefwerte) ? z.pruefwerte.map((x) => String(x).trim().toLowerCase()).filter(Boolean) : [];
  const parameter = typeof z.parameter === "string" && /^[A-Za-z][A-Za-z0-9_-]{0,31}$/.test(z.parameter) ? z.parameter : "code";
  return { aktiv: liste.length > 0, parameter, pruefwerte: liste };
}

export async function pruefeCode(eingabe, pruefwerte) {
  const code = normalisiereCode(eingabe);
  if (!code) return { leer: true, gueltig: false, code: "" };
  const pruefwert = await sha256Hex(code);
  const liste = Array.isArray(pruefwerte) ? pruefwerte : [];
  return { leer: false, gueltig: liste.some((x) => String(x).trim().toLowerCase() === pruefwert), code };
}
