#!/usr/bin/env node
// Tests des Code-Schutzes der Bestellseite: assets/js/bestellung/zugang.js (Verschlüsselung der Preisdaten) und das Werkzeug
// tools/bestellung-zugang.mjs. Läuft in Node ohne Browser; der Browser-Test (e2e.mjs) prüft dasselbe Modul in Chrome.
//
// Geprüft wird:
//   - Hin und zurück, falscher und leerer Code (ZugangFehler „Der Code stimmt nicht.“), veränderter ct, iv, salt oder AAD › Fehler
//   - Normalisierung (abc-def ghjk = ABCDEFGHJK), Format und Längen (Salt 16, IV 12 Byte, Base64, 600.000 Runden), zufällig je Aufruf
//   - das Verfahren gegen eine unabhängige Umsetzung mit node:crypto (PBKDF2-HMAC-SHA256, AES-256-GCM, AAD „speuzer-bestellung-preise-v1“)
//   - Paket mit falscher Form › eigene Meldung (art „format“), nie ein Absturz; fehlendes Web Crypto › art „technik“
//   - kein Klartext und kein Code im Paket; der Schlüssel ist nicht exportierbar
//   - das Werkzeug: --neu mit --blatt (Wegwerfordner unter tools/cache/), Ordner im Repo und Verweise ins Repo werden verweigert, --neu ohne Ziel
//     ist ein Fehler, der Code steht nie auf der Konsole (außer mit --zeigen), keine Preise in der Ausgabe, Prüfsummen und Hinweis bleiben draußen
//
// Aufruf: node tools/bestellung-test/zugang-test.mjs [--ausfuehrlich]
// Ausgabe: eine Zeile je Fehler, am Ende die Zusammenfassung; Exit 0 nur, wenn alles bestanden ist.

import { createCipheriv, createDecipheriv, createHash, pbkdf2Sync } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  FORMAT,
  ITERATIONEN,
  KDF,
  ZugangFehler,
  base64ZuBytes,
  bytesZuBase64,
  entschluessele,
  leiteSchluesselAb,
  normalisiereCode,
  pruefePaket,
  verschluessele,
} from "../../assets/js/bestellung/zugang.js";
import { ALPHABET, BLATT_NAME, LINK_BASIS, STANDARD_DATEN, anzeigeFuer, linkFuer, neuerCode } from "../bestellung-zugang.mjs";
import { TESTCODE, TESTPREISE, kopieTestpreise } from "./testdaten.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const WERKZEUG = path.join(ROOT, "tools", "bestellung-zugang.mjs");
const AUSFUEHRLICH = process.argv.includes("--ausfuehrlich");

// ---------- kleines Prüfgerüst ----------

let anzahl = 0;
const fehler = [];

function pruefe(name, bedingung, detail = "") {
  anzahl += 1;
  if (bedingung) {
    if (AUSFUEHRLICH) console.log("  ok      " + name);
    return;
  }
  fehler.push(name);
  console.log("  FEHLER  " + name + (detail ? "\n          " + String(detail).slice(0, 600) : ""));
}

function gleich(name, ist, soll) {
  pruefe(name, ist === soll, `ist ${JSON.stringify(ist)}, soll ${JSON.stringify(soll)}`);
}

function gleichJson(name, ist, soll) {
  const a = JSON.stringify(ist);
  const b = JSON.stringify(soll);
  pruefe(name, a === b, `ist ${a}, soll ${b}`);
}

function abschnitt(titel) {
  if (AUSFUEHRLICH) console.log("\n" + titel);
}

// Fängt den Fehler einer asynchronen Funktion: { fehler } oder { ok: Ergebnis }
async function versuche(f) {
  try {
    return { ok: await f() };
  } catch (e) {
    return { fehler: e };
  }
}

// Öffnet ein Paket; scheitert es, kommt undefined zurück: der Vergleich schlägt dann als gezählter Fehler an, es gibt keinen Absturz
const oeffne = async (paket, code) => (await versuche(() => entschluessele(paket, code))).ok;

const istZugangFehler = (r, art, teil) => !!r.fehler && r.fehler instanceof ZugangFehler && r.fehler.art === art && (!teil || r.fehler.message.includes(teil));
const utf8 = (text) => new TextEncoder().encode(text);
const SCHNELL = { iter: 1000 }; // Tests, die die Rundenzahl nicht prüfen, rechnen mit wenigen Runden

// Ein Bit in einem Base64-Wert kippen (Byte n)
function kippe(base64, n = 0) {
  const bytes = base64ZuBytes(base64);
  bytes[n] ^= 1;
  return bytesZuBase64(bytes);
}

const DATEN = { text: "Preise für Ärzte, Öl & Äpfel „ß“", zahl: 12.34, liste: [1, 2, 3], leer: null, tief: { a: { b: true } } };
const CODE = "ABCDEFGHJK";

// ---------- Hin und zurück ----------

abschnitt("Hin und zurück");
{
  const p = await verschluessele(DATEN, CODE, SCHNELL);
  gleichJson("Hin und zurück: dieselben Daten (Umlaute, Zahlen, Verschachteltes)", await oeffne(p, CODE), DATEN);
  gleichJson("Hin und zurück mit den Testpreisen und dem Testcode", await oeffne(await verschluessele(TESTPREISE, TESTCODE, SCHNELL), TESTCODE), TESTPREISE);
  const standard = await verschluessele(DATEN, CODE);
  gleich("ohne Angabe: 600.000 Runden", String(standard.iter), "600000");
  gleich("ITERATIONEN, FORMAT und KDF", [ITERATIONEN, FORMAT, KDF].join("|"), "600000|speuzer-bestellung-preise-v1|PBKDF2-SHA256");
  gleichJson("Hin und zurück mit den Standard-Runden", await oeffne(standard, CODE), DATEN);

  const falsch = await versuche(() => entschluessele(p, "ABCDEFGHJM"));
  pruefe("falscher Code › ZugangFehler „Der Code stimmt nicht.“ (art code)", istZugangFehler(falsch, "code") && falsch.fehler.message === "Der Code stimmt nicht.", String(falsch.fehler && falsch.fehler.message));
  pruefe("falscher Code: ein ZugangFehler mit Namen und als Error", !!falsch.fehler && falsch.fehler.name === "ZugangFehler" && falsch.fehler instanceof Error);
  for (const [name, x] of [["leer", ""], ["nur Trennzeichen", " - _ "], ["undefined", undefined], ["null", null]]) {
    pruefe(`Code ${name} › „Der Code stimmt nicht.“`, istZugangFehler(await versuche(() => entschluessele(p, x)), "code", "Der Code stimmt nicht."));
  }
  pruefe("ein Zeichen zu viel am Ende › falsch", istZugangFehler(await versuche(() => entschluessele(p, CODE + "X")), "code"));
  pruefe("ein Zeichen zu wenig › falsch", istZugangFehler(await versuche(() => entschluessele(p, CODE.slice(0, -1))), "code"));
  pruefe("ähnlicher Code (ein Zeichen anders) › falsch", istZugangFehler(await versuche(() => entschluessele(p, "ABCDEFGHJL")), "code"));
  pruefe("verschlüsseln mit leerem Code › Fehler „Der Code ist leer.“", istZugangFehler(await versuche(() => verschluessele(DATEN, " - ", SCHNELL)), "code", "leer"));
  for (const iter of [0, -5, 1.5, 99999999, "1000"]) {
    pruefe(`verschlüsseln mit unsinniger Rundenzahl (${JSON.stringify(iter)}) › Fehler`, istZugangFehler(await versuche(() => verschluessele(DATEN, CODE, { iter })), "format"));
  }
}

// ---------- Veränderte Teile ----------

abschnitt("Veränderte Teile");
{
  const p = await verschluessele(DATEN, CODE, SCHNELL);
  pruefe("Kontrolle: das unveränderte Paket lässt sich öffnen", !!(await versuche(() => entschluessele(p, CODE))).ok);
  for (const feld of ["ct", "iv", "salt"]) {
    const r = await versuche(() => entschluessele({ ...p, [feld]: kippe(p[feld], 3) }, CODE));
    pruefe(`${feld} um ein Bit verändert › „Der Code stimmt nicht.“ (Schlüssel oder Prüfsumme passen nicht)`, istZugangFehler(r, "code", "Der Code stimmt nicht."), String(r.fehler && r.fehler.message));
  }
  const ctLaenge = base64ZuBytes(p.ct).length;
  pruefe("ct: die Prüfsumme am Ende verändert › Fehler", istZugangFehler(await versuche(() => entschluessele({ ...p, ct: kippe(p.ct, ctLaenge - 1) }, CODE)), "code"));
  pruefe("ct um ein Byte gekürzt › Fehler (kein Absturz)", istZugangFehler(await versuche(() => entschluessele({ ...p, ct: bytesZuBase64(base64ZuBytes(p.ct).slice(0, -1)) }, CODE)), "code"));
  pruefe("ct um ein Byte verlängert › Fehler", istZugangFehler(await versuche(() => entschluessele({ ...p, ct: bytesZuBase64(new Uint8Array([...base64ZuBytes(p.ct), 0])) }, CODE)), "code"));
  pruefe("Rundenzahl verändert › anderer Schlüssel › Fehler", istZugangFehler(await versuche(() => entschluessele({ ...p, iter: p.iter + 1 }, CODE)), "code"));
  // Zusätzliche Daten (AAD): nur mit „speuzer-bestellung-preise-v1“ lässt sich das Paket öffnen
  const salt = base64ZuBytes(p.salt);
  const iv = base64ZuBytes(p.iv);
  const schluessel = await leiteSchluesselAb(CODE, salt, p.iter);
  const klar = utf8(JSON.stringify(DATEN));
  const verschluesseltMit = async (aad) => bytesZuBase64(new Uint8Array(await globalThis.crypto.subtle.encrypt(aad === null ? { name: "AES-GCM", iv } : { name: "AES-GCM", iv, additionalData: utf8(aad) }, schluessel, klar)));
  gleichJson("Kontrolle: von Hand mit der AAD „speuzer-bestellung-preise-v1“ gebaut › lässt sich öffnen", await oeffne({ ...p, ct: await verschluesseltMit("speuzer-bestellung-preise-v1") }, CODE), DATEN);
  pruefe("AAD „…-v2“ statt „…-v1“ › Fehler „Der Code stimmt nicht.“", istZugangFehler(await versuche(async () => entschluessele({ ...p, ct: await verschluesseltMit("speuzer-bestellung-preise-v2") }, CODE)), "code", "Der Code stimmt nicht."));
  pruefe("ganz ohne AAD verschlüsselt › Fehler", istZugangFehler(await versuche(async () => entschluessele({ ...p, ct: await verschluesseltMit(null) }, CODE)), "code"));
  pruefe("AAD mit Leerzeichen am Ende › Fehler", istZugangFehler(await versuche(async () => entschluessele({ ...p, ct: await verschluesseltMit("speuzer-bestellung-preise-v1 ") }, CODE)), "code"));
}

// ---------- Normalisierung ----------

abschnitt("Normalisierung");
{
  gleich("abc-def ghjk = ABCDEFGHJK", normalisiereCode("abc-def ghjk"), "ABCDEFGHJK");
  gleich("Unterstriche", normalisiereCode("abc_def_ghjk"), "ABCDEFGHJK");
  gleich("Leerzeichen, Bindestriche und Unterstriche gemischt", normalisiereCode(" A_B C-DEF -_ GHJK "), "ABCDEFGHJK");
  gleich("Tabulator, Zeilenumbruch, geschütztes Leerzeichen", normalisiereCode(" a\tb\nc d "), "ABCD");
  gleich("Gedankenstrich und Minuszeichen (kommen beim Kopieren aus Chat-Programmen mit)", normalisiereCode("ab–cd—ef−gh"), "ABCDEFGH");
  gleich("Ziffern bleiben", normalisiereCode("a1-b2 c3"), "A1B2C3");
  gleich("undefined, null und leer ergeben leer", [normalisiereCode(undefined), normalisiereCode(null), normalisiereCode("")].join("|"), "||");
  gleich("eine Zahl wird Text", normalisiereCode(1234), "1234");
  const p = await verschluessele(DATEN, "abc-def ghjk", SCHNELL);
  for (const eingabe of ["ABCDEFGHJK", "abcdefghjk", " A_B C-DEF GHJK ", "abc–def ghjk", "ABCDE-FGHJK"]) {
    gleichJson(`derselbe Code in anderer Schreibweise öffnet das Paket: „${eingabe.replace(/–/, "–").replace(/ /, "␣")}“`, (await versuche(() => entschluessele(p, eingabe))).ok, DATEN);
  }
}

// ---------- Format, Längen, Zufall ----------

abschnitt("Format und Längen");
{
  const p = await verschluessele(DATEN, CODE, SCHNELL);
  gleichJson("Felder in dieser Reihenfolge", Object.keys(p), ["format", "kdf", "iter", "salt", "iv", "ct"]);
  gleich("format", p.format, "speuzer-bestellung-preise-v1");
  gleich("kdf", p.kdf, "PBKDF2-SHA256");
  gleich("iter (hier die verkürzten Runden der Tests)", String(p.iter), "1000");
  pruefe("salt, iv und ct sind Base64 mit Füllzeichen (Länge ein Vielfaches von 4)", ["salt", "iv", "ct"].every((f) => typeof p[f] === "string" && /^[A-Za-z0-9+/]+={0,2}$/.test(p[f]) && p[f].length % 4 === 0));
  gleich("Salt: 16 Byte", String(base64ZuBytes(p.salt).length), "16");
  gleich("IV: 12 Byte", String(base64ZuBytes(p.iv).length), "12");
  gleich("ct: so lang wie der Klartext (UTF-8) plus 16 Byte Prüfsumme", String(base64ZuBytes(p.ct).length), String(utf8(JSON.stringify(DATEN)).length + 16));
  gleich("Base64-Länge: Salt 24, IV 16 Zeichen", p.salt.length + "|" + p.iv.length, "24|16");
  // Zufall: Salt und IV sind je Aufruf neu
  const viele = await Promise.all(Array.from({ length: 20 }, () => verschluessele(DATEN, CODE, SCHNELL)));
  gleich("20 Pakete: 20 verschiedene Salze, IVs und ct", [new Set(viele.map((x) => x.salt)).size, new Set(viele.map((x) => x.iv)).size, new Set(viele.map((x) => x.ct)).size].join("|"), "20|20|20");
  pruefe("die Pakete mit demselben Code und denselben Daten sehen verschieden aus, öffnen sich aber alle", (await Promise.all(viele.map((x) => oeffne(x, CODE)))).every((d) => JSON.stringify(d) === JSON.stringify(DATEN)));
  // Base64: streng
  gleich("Base64: Hin und zurück für alle 256 Bytewerte", bytesZuBase64(base64ZuBytes(bytesZuBase64(Uint8Array.from({ length: 256 }, (_, i) => i)))), bytesZuBase64(Uint8Array.from({ length: 256 }, (_, i) => i)));
  gleichJson("Base64: „YQ==“ ist ein Byte (97), leer ist leer", [[...base64ZuBytes("YQ==")], [...base64ZuBytes("")], bytesZuBase64(new Uint8Array([97]))], [[97], [], "YQ=="]);
  for (const kaputt of ["YQ=", "Y===", "YQ", "Y Q==", "YQ==\n", "YQ-_", "äöü!", "====", 5, null, undefined]) {
    pruefe(`Base64: ${JSON.stringify(kaputt)} ist kein gültiger Wert (ZugangFehler art format)`, (() => { try { base64ZuBytes(kaputt); return false; } catch (e) { return e instanceof ZugangFehler && e.art === "format"; } })());
  }
}

// ---------- das Verfahren gegen node:crypto ----------

abschnitt("Verfahren (unabhängige Umsetzung mit node:crypto)");
{
  // Entschlüsseln mit node:crypto: PBKDF2-HMAC-SHA256 über die UTF-8-Bytes des normalisierten Codes, AES-256-GCM, AAD = Format, Prüfsumme am Ende
  const mitNode = (paket, code) => {
    const salt = Buffer.from(paket.salt, "base64");
    const iv = Buffer.from(paket.iv, "base64");
    const ct = Buffer.from(paket.ct, "base64");
    const schluessel = pbkdf2Sync(Buffer.from(code, "utf8"), salt, paket.iter, 32, "sha256");
    const d = createDecipheriv("aes-256-gcm", schluessel, iv);
    d.setAAD(Buffer.from("speuzer-bestellung-preise-v1", "utf8"));
    d.setAuthTag(ct.subarray(ct.length - 16));
    return JSON.parse(Buffer.concat([d.update(ct.subarray(0, ct.length - 16)), d.final()]).toString("utf8"));
  };
  const mitNodeSicher = (paket, code) => {
    try {
      return mitNode(paket, code);
    } catch {
      return undefined; // Prüfsumme (oder JSON) stimmt nicht: der Vergleich schlägt als gezählter Fehler an
    }
  };
  gleichJson("node:crypto öffnet das Paket von zugang.js (Code roh eingegeben, der Schlüssel kommt aus dem normalisierten Code)", mitNodeSicher(await verschluessele(DATEN, "abcde-fghjk", { iter: 5000 }), "ABCDEFGHJK"), DATEN);
  gleichJson("… auch mit den 600.000 Runden", mitNodeSicher(await verschluessele(DATEN, CODE), CODE), DATEN);
  // und andersherum: ein mit node:crypto gebautes Paket öffnet zugang.js
  const salt = Buffer.from(Array.from({ length: 16 }, (_, i) => i + 1));
  const iv = Buffer.from(Array.from({ length: 12 }, (_, i) => 100 + i));
  const schluessel = pbkdf2Sync(Buffer.from(CODE, "utf8"), salt, 5000, 32, "sha256");
  const c = createCipheriv("aes-256-gcm", schluessel, iv);
  c.setAAD(Buffer.from("speuzer-bestellung-preise-v1", "utf8"));
  const ct = Buffer.concat([c.update(Buffer.from(JSON.stringify(DATEN), "utf8")), c.final(), c.getAuthTag()]);
  const vonNode = { format: "speuzer-bestellung-preise-v1", kdf: "PBKDF2-SHA256", iter: 5000, salt: salt.toString("base64"), iv: iv.toString("base64"), ct: ct.toString("base64") };
  gleichJson("zugang.js öffnet ein mit node:crypto gebautes Paket (Format, Länge der Prüfsumme, AAD stimmen)", (await versuche(() => entschluessele(vonNode, "abcde-fghjk"))).ok, DATEN);
  pruefe("dasselbe Paket mit falschem Code bleibt zu", istZugangFehler(await versuche(() => entschluessele(vonNode, "ABCDEFGHJM")), "code"));
}

// ---------- Paket mit falscher Form, fehlendes Web Crypto ----------

abschnitt("Falsche Form");
{
  const gut = await verschluessele(DATEN, CODE, SCHNELL);
  const ohne = (feld) => {
    const { [feld]: weg, ...rest } = gut;
    return rest;
  };
  const faelle = [
    ["null", null], ["Text", "x"], ["Zahl", 5], ["Liste", []], ["leeres Objekt", {}],
    ["anderes Format", { ...gut, format: "speuzer-bestellung-preise-v2" }],
    ["andere KDF", { ...gut, kdf: "PBKDF2-SHA1" }],
    ["format fehlt", ohne("format")], ["kdf fehlt", ohne("kdf")],
    ["iter fehlt", ohne("iter")], ["iter 0", { ...gut, iter: 0 }], ["iter negativ", { ...gut, iter: -1 }], ["iter mit Nachkommastelle", { ...gut, iter: 1000.5 }],
    ["iter als Text", { ...gut, iter: "1000" }], ["iter riesig (würde den Browser lahmlegen)", { ...gut, iter: 1e12 }], ["iter knapp über der Grenze", { ...gut, iter: 5000001 }],
    ["salt fehlt", ohne("salt")], ["salt kein Base64", { ...gut, salt: "abc!" }], ["salt zu kurz (8 Byte)", { ...gut, salt: bytesZuBase64(new Uint8Array(8)) }],
    ["salt zu lang (17 Byte)", { ...gut, salt: bytesZuBase64(new Uint8Array(17)) }], ["salt ohne Füllzeichen", { ...gut, salt: gut.salt.replace(/=+$/, "") }],
    ["iv fehlt", ohne("iv")], ["iv zu lang (16 Byte)", { ...gut, iv: bytesZuBase64(new Uint8Array(16)) }], ["iv kein Text", { ...gut, iv: 5 }],
    ["ct fehlt", ohne("ct")], ["ct leer", { ...gut, ct: "" }], ["ct zu kurz (15 Byte, kürzer als die Prüfsumme)", { ...gut, ct: bytesZuBase64(new Uint8Array(15)) }], ["ct kein Base64", { ...gut, ct: "!!!!" }],
  ];
  for (const [name, paket] of faelle) {
    const p1 = (() => { try { pruefePaket(paket); return null; } catch (e) { return e; } })();
    pruefe(`falsche Form (${name}): pruefePaket meldet einen ZugangFehler (art format)`, p1 instanceof ZugangFehler && p1.art === "format", String(p1 && p1.message));
    const r = await versuche(() => entschluessele(paket, CODE));
    pruefe(`falsche Form (${name}): entschluessele meldet eine eigene Meldung, nicht „Der Code stimmt nicht.“, und stürzt nicht ab`, istZugangFehler(r, "format") && r.fehler.message !== "Der Code stimmt nicht." && r.fehler.message.startsWith("Die Preisdaten"), String(r.fehler && r.fehler.message));
  }
  gleich("andere Version des Formats: „unbekanntes Format“", (await versuche(() => entschluessele({ ...gut, format: "x" }, CODE))).fehler.message, "Die Preisdaten haben ein unbekanntes Format.");
  const pruefung = (() => { try { return pruefePaket(gut); } catch (e) { return e; } })();
  gleichJson("pruefePaket gibt bei gutem Paket die Bytes zurück (Salt 16, IV 12, Runden)", [pruefung.salt.length, pruefung.iv.length, pruefung.iter, pruefung.ct.length >= 16], [16, 12, 1000, true]);

  // Web Crypto fehlt (unsichere Seite, alter Browser): eigene Meldung, art „technik“
  const original = Object.getOwnPropertyDescriptor(globalThis, "crypto");
  const echt = globalThis.crypto;
  const setze = (wert) => Object.defineProperty(globalThis, "crypto", { value: wert, configurable: true, writable: true });
  try {
    setze({});
    const r1 = await versuche(() => entschluessele(gut, CODE));
    const r2 = await versuche(() => verschluessele(DATEN, CODE, SCHNELL));
    pruefe("ohne Web Crypto › entschluessele meldet art „technik“ mit Hinweis auf https", istZugangFehler(r1, "technik", "Browser") && r1.fehler.message.includes("https"), String(r1.fehler && r1.fehler.message));
    pruefe("ohne Web Crypto › verschluessele meldet art „technik“", istZugangFehler(r2, "technik"));
    setze({ subtle: echt.subtle });
    pruefe("ohne Zufallszahlen › verschluessele meldet art „technik“", istZugangFehler(await versuche(() => verschluessele(DATEN, CODE, SCHNELL)), "technik"));
    pruefe("ohne Zufallszahlen lässt sich ein Paket noch öffnen (das braucht nur subtle)", !!(await versuche(() => entschluessele(gut, CODE))).ok);
  } finally {
    if (original) Object.defineProperty(globalThis, "crypto", original);
    else delete globalThis.crypto;
  }
  pruefe("Web Crypto ist danach wieder da", globalThis.crypto === echt && !!(await versuche(() => entschluessele(gut, CODE))).ok);
}

// ---------- kein Klartext, Schlüssel nicht exportierbar ----------

abschnitt("Kein Klartext, Schlüssel");
{
  const p = await verschluessele(TESTPREISE, TESTCODE, SCHNELL);
  const text = JSON.stringify(p);
  pruefe("das Paket enthält den Code nicht", !text.toUpperCase().includes(TESTCODE) && !text.includes(anzeigeFuer(TESTCODE)));
  pruefe("ohne die Base64-Werte stehen nur Format, Verfahren und Runden im Paket (kein Preis, kein Rabatt, keine Quelle)", !/uvp|rabatt|quelle|Angebot|trikot|praesi|veredelung|11Teamsport|\d[.,]\d/i.test(text.replace(/"(salt|iv|ct)":"[^"]*"/g, "")));
  const schluessel = await leiteSchluesselAb(CODE, new Uint8Array(16), 1000);
  gleichJson("Schlüssel: AES-GCM mit 256 Bit, nicht exportierbar, nur Ver- und Entschlüsseln", [schluessel.algorithm.name, schluessel.algorithm.length, schluessel.extractable, [...schluessel.usages].sort()], ["AES-GCM", 256, false, ["decrypt", "encrypt"]]);
  pruefe("Schlüssel: exportKey scheitert", !!(await versuche(() => globalThis.crypto.subtle.exportKey("raw", schluessel))).fehler);
  // Gleiche Eingabe, gleicher Schlüssel; roh oder normalisiert, derselbe; anderes Salt, anderer Schlüssel
  const iv = new Uint8Array(12);
  const klar = utf8("Preise");
  const verschluesseln = (schl) => globalThis.crypto.subtle.encrypt({ name: "AES-GCM", iv }, schl, klar);
  const entschluesseln = (schl, ct) => globalThis.crypto.subtle.decrypt({ name: "AES-GCM", iv }, schl, ct);
  const salt = Uint8Array.from({ length: 16 }, (_, i) => i);
  const a = await leiteSchluesselAb("abc-def ghjk", salt, 1000);
  const b = await leiteSchluesselAb("ABCDEFGHJK", salt, 1000);
  const ct = await verschluesseln(a);
  gleich("derselbe Code roh und normalisiert ergibt denselben Schlüssel", new TextDecoder().decode(await entschluesseln(b, ct)), "Preise");
  pruefe("anderes Salt ergibt einen anderen Schlüssel", !!(await versuche(async () => entschluesseln(await leiteSchluesselAb("ABCDEFGHJK", Uint8Array.from({ length: 16 }, (_, i) => i + 1), 1000), ct))).fehler);
  pruefe("andere Rundenzahl ergibt einen anderen Schlüssel", !!(await versuche(async () => entschluesseln(await leiteSchluesselAb("ABCDEFGHJK", salt, 1001), ct))).fehler);
}

// ---------- Werkzeug ----------

abschnitt("Werkzeug tools/bestellung-zugang.mjs");
const WERKZEUG_ORDNER = path.join(ROOT, "tools", "cache", "bestellung-test", "zugang-test");
try {
  const ordner = WERKZEUG_ORDNER;
  rmSync(ordner, { recursive: true, force: true });
  mkdirSync(ordner, { recursive: true });
  const preisDatei = path.join(ordner, "preise.json");
  // Die private Datei hat zusätzlich Prüfsummen und einen Hinweis: beides darf nicht ins Paket
  writeFileSync(preisDatei, JSON.stringify({ _hinweis: "PRIVAT", ...TESTPREISE, pruefsummen: { _hinweis: "x", "trikot.kinder": 21.74 } }, null, 2));
  const hashDatei = () => createHash("sha256").update(readFileSync(STANDARD_DATEN)).digest("hex");
  const hashVorher = hashDatei();
  const ausgaben = [];

  const lauf = (args, opt = {}) => {
    const r = spawnSync(process.execPath, [WERKZEUG, ...args], { cwd: ROOT, encoding: "utf8", input: opt.input });
    const aus = (r.stdout || "") + (r.stderr || "");
    ausgaben.push(aus);
    return { status: r.status, aus, stdout: r.stdout || "", stderr: r.stderr || "" };
  };
  const paket = (n) => path.join(ordner, `paket-${n}.json`);
  const blattOrdner = (n) => path.join(ordner, `blatt-${n}`);
  const liesBlatt = (n) => readFileSync(path.join(blattOrdner(n), BLATT_NAME), "utf8");
  const codeAusBlatt = (n) => {
    const m = /^Code: ([A-Z2-9]{5}-[A-Z2-9]{5})$/m.exec(liesBlatt(n));
    return m ? m[1].replace("-", "") : "";
  };
  const klartext = (() => {
    const { ...rest } = TESTPREISE;
    return rest;
  })();

  // --neu mit --blatt
  const r1 = lauf(["--preise", preisDatei, "--neu", "--blatt", blattOrdner(1), "--daten", paket(1)]);
  gleich("--neu --blatt: Exit 0", String(r1.status), "0");
  pruefe("--neu --blatt: die Datei mit Code und Link liegt im Ordner („Bestellseite – Zugang für Trainer.txt“)", existsSync(path.join(blattOrdner(1), BLATT_NAME)) && BLATT_NAME === "Bestellseite – Zugang für Trainer.txt");
  const code1 = codeAusBlatt(1);
  pruefe("--neu: Code mit 10 Zeichen aus ABCDEFGHJKLMNPQRSTUVWXYZ23456789", code1.length === 10 && [...code1].every((z) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".includes(z)) && ALPHABET === "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", code1);
  pruefe("--neu: die Datei nennt den Link mit dem Code (…/ws/bestellung.html?code=<CODE>)", liesBlatt(1).includes(`Link: https://justolgay.github.io/speuzer-website-prototyp/ws/bestellung.html?code=${code1}\n`));
  pruefe("--neu: der Code steht nicht auf der Konsole (weder am Stück noch in Gruppen), der Link ist maskiert", !r1.aus.includes(code1) && !r1.aus.includes(anzeigeFuer(code1)) && r1.aus.includes("?code=***"), r1.aus);
  pruefe("--neu: die Ausgabe nennt den Ort der Datei, nicht ihren Inhalt", r1.aus.includes(BLATT_NAME));
  const p1 = JSON.parse(readFileSync(paket(1), "utf8"));
  gleichJson("--neu: das Paket hat genau die Felder des Formats, 600.000 Runden", [Object.keys(p1), p1.iter], [["format", "kdf", "iter", "salt", "iv", "ct"], 600000]);
  gleichJson("--neu: das Paket öffnet sich mit dem Code aus der Datei und enthält die Preisdaten ohne Prüfsummen und Hinweis", (await versuche(() => entschluessele(p1, code1))).ok, klartext);
  gleichJson("--neu: Schlüssel der Preisdaten (ohne pruefsummen und _hinweis)", Object.keys((await versuche(() => entschluessele(p1, code1))).ok), ["stand", "quelle", "rabattProzent", "veredelungPreis", "uvp"]);
  pruefe("--neu: das Paket enthält den Code nicht im Klartext", !readFileSync(paket(1), "utf8").includes(code1));
  pruefe("--neu: ein anderer Code öffnet das Paket nicht", istZugangFehler(await versuche(() => entschluessele(p1, "ABCDEFGHJK")), "code") || code1 === "ABCDEFGHJK");

  // zweiter Lauf: neuer Code, neues Paket
  const r2 = lauf(["--preise", preisDatei, "--neu", "--blatt", blattOrdner(2), "--daten", paket(2)]);
  const code2 = codeAusBlatt(2);
  pruefe("--neu zweimal: jedes Mal ein anderer Code und ein anderes Paket", r2.status === 0 && code2.length === 10 && code2 !== code1 && readFileSync(paket(2), "utf8") !== readFileSync(paket(1), "utf8"));
  pruefe("--neu: das alte Paket bleibt mit dem alten Code lesbar, der neue Code öffnet nur das neue", !!(await versuche(() => entschluessele(JSON.parse(readFileSync(paket(2), "utf8")), code2))).ok && istZugangFehler(await versuche(() => entschluessele(JSON.parse(readFileSync(paket(2), "utf8")), code1)), "code"));

  // --neu ohne Ziel: Fehler, nichts geschrieben
  const r3 = lauf(["--preise", preisDatei, "--neu", "--daten", paket(3)]);
  pruefe("--neu ohne --blatt und ohne --zeigen: Fehler (Exit 2), sonst ginge der Code verloren; nichts wird geschrieben", r3.status === 2 && r3.stderr.includes("--neu braucht --blatt") && !existsSync(paket(3)), r3.aus);

  // --neu --zeigen ohne Blatt: der Code kommt auf die Konsole (nur so)
  const r4 = lauf(["--preise", preisDatei, "--neu", "--zeigen", "--daten", paket(4)]);
  const code4 = (/^Code: +([A-Z2-9]{5}-[A-Z2-9]{5})$/m.exec(r4.stdout) || [])[1];
  pruefe("--neu --zeigen: Exit 0, der Code steht auf der Konsole (in Gruppen und im Link) und öffnet das Paket", r4.status === 0 && !!code4 && r4.stdout.includes(`?code=${code4.replace("-", "")}`) && !!(await versuche(() => entschluessele(JSON.parse(readFileSync(paket(4), "utf8")), code4))).ok, r4.aus);
  pruefe("--neu --zeigen ohne Blatt: keine Datei mit dem Code erzeugt, sagt es", r4.stdout.includes("Keine Datei mit dem Code erzeugt"));

  // Ordner im Repo und Verweise ins Repo werden verweigert (wie beim Trainer-Werkzeug); erlaubt ist nur tools/cache/
  const imRepo = path.join(ROOT, "docs", "zugang-test-ordner");
  const r5 = lauf(["--preise", preisDatei, "--neu", "--blatt", imRepo, "--daten", paket(5)]);
  pruefe("--blatt im Repo (docs/…): verweigert (Exit 2), der Ordner wird nicht angelegt, das Paket nicht geschrieben", r5.status === 2 && r5.stderr.includes("liegt im Repo") && !existsSync(imRepo) && !existsSync(paket(5)), r5.aus);
  const r5b = lauf(["--preise", preisDatei, "--code", CODE, "--blatt", "docs/zugang-test-ordner-relativ", "--daten", paket(5)]);
  pruefe("--blatt mit relativem Pfad ins Repo: verweigert", r5b.status === 2 && r5b.stderr.includes("liegt im Repo") && !existsSync(path.join(ROOT, "docs", "zugang-test-ordner-relativ")) && !existsSync(paket(5)), r5b.aus);
  const r5c = lauf(["--preise", preisDatei, "--code", CODE, "--blatt", ROOT, "--daten", paket(5)]);
  pruefe("--blatt = Hauptordner des Repos: verweigert", r5c.status === 2 && r5c.stderr.includes("liegt im Repo") && !existsSync(paket(5)), r5c.aus);
  const verweis = path.join(ordner, "verweis-ins-repo");
  symlinkSync(path.join(ROOT, "assets"), verweis);
  const r5d = lauf(["--preise", preisDatei, "--code", CODE, "--blatt", path.join(verweis, "unter-dem-verweis"), "--daten", paket(5)]);
  pruefe("--blatt unter einem Verweis (symbolischer Link) ins Repo: verweigert, nichts unter assets/ angelegt", r5d.status === 2 && r5d.stderr.includes("liegt im Repo") && !existsSync(path.join(ROOT, "assets", "unter-dem-verweis")) && !existsSync(paket(5)), r5d.aus);
  pruefe("--blatt unter tools/cache/ ist erlaubt (das war der Lauf oben)", existsSync(blattOrdner(1)));

  // --code
  const r6 = lauf(["--preise", preisDatei, "--code", "abcde-fghjk", "--blatt", blattOrdner(6), "--daten", paket(6)]);
  pruefe("--code: Exit 0, der Code wird normalisiert (Kleinbuchstaben, Bindestrich), die Datei trägt ihn, die Konsole nicht", r6.status === 0 && codeAusBlatt(6) === "ABCDEFGHJK" && !r6.aus.includes("ABCDEFGHJK") && !r6.aus.toLowerCase().includes("abcde-fghjk") && !r6.aus.toLowerCase().includes("abcdefghjk"), r6.aus);
  pruefe("--code: das Paket öffnet sich mit dem Code in jeder Schreibweise", !!(await versuche(() => entschluessele(JSON.parse(readFileSync(paket(6), "utf8")), "abcde fghjk"))).ok);
  const r7 = lauf(["--preise", preisDatei, "--code", "ABCDEFGHJK", "--daten", paket(7)]);
  pruefe("--code ohne --blatt ist erlaubt (man kennt den Code ja): Exit 0, kein Code auf der Konsole, Link maskiert", r7.status === 0 && !r7.aus.includes("ABCDEFGHJK") && r7.aus.includes("?code=***") && existsSync(paket(7)), r7.aus);
  const r8 = lauf(["--preise", preisDatei, "--code", "-", "--daten", paket(8)], { input: "KLMNPQRS23\n" });
  pruefe("--code - liest den Code von der Standardeingabe (nicht in der Befehlszeile)", r8.status === 0 && !!(await versuche(() => entschluessele(JSON.parse(readFileSync(paket(8), "utf8")), "KLMNPQRS23"))).ok && !r8.aus.includes("KLMNPQRS23"), r8.aus);
  const r9 = lauf(["--preise", preisDatei, "--code", "ABCDEFG", "--daten", paket(9)]);
  pruefe("--code mit 7 Zeichen: zu kurz (Exit 2), nichts geschrieben", r9.status === 2 && r9.stderr.includes("nur 7 Zeichen") && !existsSync(paket(9)), r9.aus);
  const r10 = lauf(["--preise", preisDatei, "--code", "A".repeat(33), "--daten", paket(10)]);
  pruefe("--code mit 33 Zeichen: zu lang (Exit 2)", r10.status === 2 && r10.stderr.includes("33 Zeichen") && !existsSync(paket(10)), r10.aus);
  const r11 = lauf(["--preise", preisDatei, "--code", " - _ ", "--daten", paket(11)]);
  pruefe("--code nur aus Trennzeichen: leer (Exit 2)", r11.status === 2 && r11.stderr.includes("Der Code ist leer") && !existsSync(paket(11)), r11.aus);
  const r12 = lauf(["--preise", preisDatei, "--code", "ABCDEFGHI0", "--daten", paket(12)]);
  pruefe("--code mit I oder 0: Hinweis auf verwechselbare Zeichen", r12.status === 0 && r12.stdout.includes("verwechseln"), r12.aus);

  // Aufruf
  const a1 = lauf(["--preise", preisDatei, "--neu", "--code", "ABCDEFGHJK", "--blatt", blattOrdner(13), "--daten", paket(13)]);
  pruefe("--neu und --code zusammen: Fehler (Exit 2)", a1.status === 2 && a1.stderr.includes("Genau eine Angabe") && !existsSync(paket(13)), a1.aus);
  const a2 = lauf(["--preise", preisDatei, "--daten", paket(13)]);
  pruefe("weder --neu noch --code: Fehler (Exit 2)", a2.status === 2 && a2.stderr.includes("Genau eine Angabe") && !existsSync(paket(13)), a2.aus);
  const a3 = lauf(["--neu", "--blatt", blattOrdner(13), "--daten", paket(13)]);
  pruefe("ohne --preise: Fehler (Exit 2) mit Hinweis", a3.status === 2 && a3.stderr.includes("--preise <Datei> fehlt") && !existsSync(paket(13)), a3.aus);
  const a4 = lauf(["--preise", preisDatei, "--unbekannt"]);
  pruefe("unbekannte Angabe: Fehler (Exit 2)", a4.status === 2 && a4.stderr.includes("Unbekannte Angabe: --unbekannt"), a4.aus);
  const a5 = lauf(["--preise"]);
  pruefe("--preise ohne Wert: Fehler (Exit 2)", a5.status === 2 && a5.stderr.includes("braucht einen Wert"), a5.aus);
  const a6 = lauf([]);
  pruefe("ohne Angaben: Hilfe und Exit 2", a6.status === 2 && a6.stdout.includes("Zugang zur Bestellseite"), a6.aus);
  const a7 = lauf(["--hilfe"]);
  pruefe("--hilfe: Hilfe und Exit 0", a7.status === 0 && a7.stdout.includes("--preise <Datei>") && a7.stdout.includes("--neu"), a7.aus);

  // Preisdatei fehlt oder passt nicht
  const f1 = lauf(["--preise", path.join(ordner, "gibt-es-nicht.json"), "--neu", "--zeigen", "--daten", paket(14)]);
  pruefe("Preisdatei fehlt: Fehler (Exit 2), nichts geschrieben", f1.status === 2 && f1.stderr.includes("lässt sich nicht lesen") && !existsSync(paket(14)), f1.aus);
  writeFileSync(path.join(ordner, "kaputt.json"), "{kaputt");
  const f2 = lauf(["--preise", path.join(ordner, "kaputt.json"), "--neu", "--zeigen", "--daten", paket(14)]);
  pruefe("Preisdatei ist kein JSON: Fehler (Exit 2)", f2.status === 2 && f2.stderr.includes("kein gültiges JSON") && !existsSync(paket(14)), f2.aus);
  writeFileSync(path.join(ordner, "liste.json"), "[1,2,3]");
  const f3 = lauf(["--preise", path.join(ordner, "liste.json"), "--neu", "--zeigen", "--daten", paket(14)]);
  pruefe("Preisdatei ohne JSON-Objekt: Fehler (Exit 2)", f3.status === 2 && f3.stderr.includes("kein JSON-Objekt") && !existsSync(paket(14)), f3.aus);
  const unvollstaendig = kopieTestpreise();
  delete unvollstaendig.uvp.trikot;
  delete unvollstaendig.veredelungPreis.SP;
  unvollstaendig.rabattProzent = 123;
  writeFileSync(path.join(ordner, "unvollstaendig.json"), JSON.stringify(unvollstaendig));
  const f4 = lauf(["--preise", path.join(ordner, "unvollstaendig.json"), "--neu", "--zeigen", "--daten", paket(14)]);
  pruefe("Preisdaten passen nicht zum Katalog: Fehler (Exit 2), die Meldung nennt die Schlüssel (uvp.trikot, veredelungPreis.SP, rabattProzent), nie die Werte, nichts geschrieben", f4.status === 2 && f4.stderr.includes("uvp.trikot fehlt") && f4.stderr.includes("veredelungPreis.SP") && f4.stderr.includes("rabattProzent") && !f4.stderr.includes("123") && !existsSync(paket(14)), f4.aus);

  // Die Ausgabe nennt nie einen Preis
  const zahlen = new Set();
  const sammle = (v) => {
    if (typeof v === "number") zahlen.add(Math.round(v * 100));
    else if (v && typeof v === "object") Object.values(v).forEach(sammle);
  };
  sammle(TESTPREISE.uvp);
  sammle(TESTPREISE.veredelungPreis);
  const schreibweisen = [...zahlen].flatMap((c) => [`${Math.floor(c / 100)}.${String(c % 100).padStart(2, "0")}`, `${Math.floor(c / 100)},${String(c % 100).padStart(2, "0")}`]);
  const alleAusgaben = ausgaben.join("\n");
  pruefe(`die Ausgabe aller Läufe nennt keinen Preis (${schreibweisen.length} Schreibweisen geprüft)`, schreibweisen.every((s) => !alleAusgaben.includes(s)), schreibweisen.filter((s) => alleAusgaben.includes(s)).join(" "));
  pruefe("die Ausgabe aller Läufe nennt keinen der erzeugten Codes (außer mit --zeigen, Lauf 4)", ![code1, code2].some((c) => ausgaben.slice(0, 2).join("\n").includes(c)));
  pruefe("das Werkzeug hat die mitgelieferte Datei data/bestellung-preise.enc.json nicht angefasst (alle Läufe nutzten --daten)", hashDatei() === hashVorher);

  // Bausteine des Werkzeugs
  pruefe("neuerCode: 10 Zeichen aus dem Alphabet, nie I, O, 0 oder 1", Array.from({ length: 400 }, () => neuerCode()).every((c) => c.length === 10 && /^[A-HJ-NP-Z2-9]{10}$/.test(c)));
  gleich("neuerCode: alle 32 Zeichen kommen vor (4.000 Zeichen)", String(new Set(Array.from({ length: 400 }, () => neuerCode()).join("")).size), "32");
  gleich("neuerCode: Länge nach Wunsch", String(neuerCode(14).length), "14");
  pruefe("neuerCode: zwei Aufrufe ergeben verschiedene Codes", neuerCode() !== neuerCode() || neuerCode() !== neuerCode());
  gleich("anzeigeFuer: Gruppen zu fünf Zeichen", anzeigeFuer("abcdefghjk") + "|" + anzeigeFuer("ABCDEFGH"), "ABCDE-FGHJK|ABCDE-FGH");
  gleich("linkFuer: normalisierter Code im Link", linkFuer("abc-def ghjk"), "https://justolgay.github.io/speuzer-website-prototyp/ws/bestellung.html?code=ABCDEFGHJK");
  gleich("LINK_BASIS", LINK_BASIS, "https://justolgay.github.io/speuzer-website-prototyp/ws/bestellung.html");
  gleich("Standardziel des Werkzeugs: data/bestellung-preise.enc.json", STANDARD_DATEN, path.join(ROOT, "data", "bestellung-preise.enc.json"));

  rmSync(ordner, { recursive: true, force: true });
} catch (e) {
  // Scheitert ein Lauf des Werkzeugs, fehlen seine Dateien: das zählt als Fehler (die Prüfungen davor zeigen die Ursache), kein Absturz
  pruefe("Werkzeug: unerwartete Ausnahme", false, e && e.message);
  rmSync(WERKZEUG_ORDNER, { recursive: true, force: true });
}

// ---------- das mitgelieferte Paket ----------

abschnitt("Mitgeliefertes Paket");
{
  const text = readFileSync(STANDARD_DATEN, "utf8");
  const mitgeliefert = JSON.parse(text);
  const form = (() => { try { return pruefePaket(mitgeliefert); } catch (e) { return e; } })();
  pruefe("data/bestellung-preise.enc.json hat die richtige Form (Salt 16, IV 12 Byte, 600.000 Runden)", !(form instanceof Error) && form.salt.length === 16 && form.iv.length === 12 && form.iter === 600000, String(form && form.message));
  const r = await versuche(() => entschluessele(mitgeliefert, TESTCODE));
  if (r.ok) {
    gleichJson("mitgeliefertes Paket = Testpreise (der Testcode steht im Test)", r.ok, TESTPREISE);
  } else if (istZugangFehler(r, "code")) {
    // Der Verein hat die Datei durch das Paket mit den echten Preisen ersetzt: Die Tests hängen nicht daran (sie bauen mit BESTELLUNG_PREISE_ENC).
    console.log("  Hinweis: data/bestellung-preise.enc.json ist nicht das Testpaket (Testcode passt nicht); die Tests nutzen eigene Pakete.");
    pruefe("mitgeliefertes Paket ist ein anderes als das Testpaket (Testcode öffnet es nicht)", true);
  } else {
    pruefe("mitgeliefertes Paket lässt sich prüfen", false, String(r.fehler && r.fehler.message));
  }
}

// ---------- Zusammenfassung ----------

console.log("");
if (fehler.length) {
  console.log(`zugang-test: ${anzahl} Prüfungen, ${fehler.length} FEHLER`);
  process.exit(1);
}
console.log(`zugang-test: ${anzahl} Prüfungen, alle bestanden`);
