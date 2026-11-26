/*
  Bestellseite für Trainer (Prototyp) – reine Funktionen ohne DOM.

  Aus den Eingaben einer Trainerin oder eines Trainers entsteht hier alles, was die Seite braucht:
  Prüfung der Eingaben (Liste der Lücken), Zusammenfassung je Artikel, Variante, Aufdruck und Größe, Preise,
  Betreff, Mailtext, mailto-Adresse und Bestell-Nr. Die Uhrzeit wird immer als Parameter
  übergeben (Date), damit alles ohne Browser testbar ist (tools/bestellung-test/).

  Die Seite (seite.js) benutzt dieselben Funktionen für Vorschau, Prüfung und Senden:
  Was in „Mail ansehen“ steht, ist genau der Text, der im Mailprogramm ankommt.

  Datengrundlage: data/bestellung.json (Katalog mit möglichen und vorausgewählten Aufdrucken, Größen, Schnellwahl,
  Teambedarf, Bezahlung, Einstellungen) plus die Mannschaften aus data/teams.json. Beides kommt als „konfig“ in die
  Seite (src/seiten/bestellung.mjs › baueKonfig). Darin stehen KEINE Preise: Die Preise laut Angebot liegen verschlüsselt
  im Paket data/bestellung-preise.enc.json (zugang.js). Erst nach dem Entschlüsseln kommen sie mit mitPreisen() als
  konfig.preise dazu; alle Preisfunktionen rechnen in ganzen Cent damit.

  Rechnung (Cent, ganze Zahlen):
    Grundpreis = Math.round(Listenpreis × (100 − Rabatt in Prozent) / 100)
    Stückpreis = Grundpreis + Summe der Zuschläge der gewählten Aufdrucke
  Ist der Listenpreis eines Artikels null (Regenjacke), heißt es „Preis auf Anfrage“: Das Stück zählt bei den Teilen
  mit, aber nicht in Summen.

  Aufbau der Eingaben („bestellung“, so liegt auch der Entwurf auf dem Gerät):
    {
      team: "d3",                    // slug der Mannschaft
      name: "Lena Beispiel", tel: "", bis: "2027-01-15",
      email: "",                     // E-Mail-Adresse des Bestellers (optional): Ist sie gültig, bekommt er eine Kopie (Cc im mailto-Link, ccAdresse)
      lieferName: null,              // Name für die Lieferung; null = folgt „Dein Name“ (noch nicht geändert)
      lieferStrasse: "Beispielweg 12", lieferOrt: "60439 Frankfurt",
      personen: [ { id: "p1", name: "Mia", nummer: "7", groesse: "140",
                    artikel: { trikot: { groesse: "", aufdrucke: ["W", "V", "ZG"] }, "praesi-hose": { groesse: "152", aufdrucke: [] } },
                    initialen: null } ],          // artikel: ausgewählte Artikel, groesse "" = Vorauswahl, aufdrucke = gewählte Kürzel
      zaehler: 1,                    // für neue Personen-Nummern (p1, p2, …)
      teambedarf: { baelle: { n: 10, details: "Größe 4" } },
      sonstiges: "",
      bezahlung: { kleidung: ["eltern", "sponsor"], teambedarf: ["vereinskasse"] },      // je Block eine Liste von ids in Katalogreihenfolge
      sponsor: { firma: "Autohaus Beispiel", ansprechpartner: "", email: "", telefon: "", anschrift: "" },
      hinweisBezahlung: "", hinweis: "",
      bestellNr: "", status: ""      // status: "" | "mail" | "kopiert" (nach dem ersten erfolgreichen Senden)
    }
  Entwürfe aus den ersten Fassungen (ein Text statt einer Liste bei der Bezahlung, „kleidungSponsor“ und „teambedarfSponsor“,
  keine Aufdrucke je Artikel, keine Lieferanschrift) lädt bereinigeEntwurf mit den Standard-Aufdrucken und übernimmt den Sponsor.
  Entwürfe ohne „email“ (alles vor der Kopie an den Besteller) laden mit leerer Adresse, also ohne Cc.
*/

// ---------- Konstanten ----------

// Ab dieser Länge der mailto-Adresse weist die Seite auf „Text kopieren“ hin. Gekürzt wird nie.
export const MAILTO_LAENGE_MAX = 7500;

export const SCHLUSSZEILE = "Erstellt mit der Bestellseite für Trainer (Prototyp).";

// Platzhalter in der Vorschau, solange etwas fehlt. In einer Mail, die gesendet werden darf (keine Lücken), kommt er nie vor.
export const FEHLT = "(fehlt noch)";

export const PREIS_AUF_ANFRAGE = "Preis auf Anfrage";

// Kürzel des Aufdrucks mit dem Sponsorlogo: Er löst den Block „Sponsor“ aus und wird für die Geschäftsstelle gezählt.
export const SPONSOR_AUFDRUCK = "SP";

// Längen der Eingabefelder (maxlength in der Seite, Kürzung beim Laden eines Entwurfs).
export const GRENZEN = {
  besteller: 60,
  tel: 30,
  email: 254,
  lieferName: 60,
  strasse: 60,
  ort: 60,
  person: 40,
  nummer: 2,
  initialen: 4,
  details: 100,
  firma: 80,
  ansprechpartner: 60,
  sponsorEmail: 80,
  sponsorTel: 30,
  anschrift: 300,
  sonstiges: 600,
  hinweis: 400,
  personen: 60,
  anzahl: 999,
};

const GRUPPEN = ["kinder", "erwachsene"];
// Was ein Aufdruck von der Person braucht (Spalte „druckdaten“ in data/bestellung.json)
const DRUCKDATEN = ["nummer", "name", "initialen"];

// ---------- Texthilfen ----------

// Alles in eine Zeile: Zeilenumbrüche und Mehrfach-Leerzeichen werden zu einem Leerzeichen, Ränder weg.
export function einzeilig(text) {
  return String(text === null || text === undefined ? "" : text).replace(/\s+/g, " ").trim();
}

// Mehrzeiliger Text (Sonstiges, Hinweise): Zeilenumbrüche bleiben, Ränder jeder Zeile und leere Zeilen am Anfang und Ende
// fallen weg, mehrere Leerzeilen hintereinander werden eine.
export function mehrzeilig(text) {
  const zeilen = String(text === null || text === undefined ? "" : text)
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((z) => z.replace(/[^\S\n]+/g, " ").trim());
  const ergebnis = [];
  for (const z of zeilen) {
    if (z === "" && (ergebnis.length === 0 || ergebnis[ergebnis.length - 1] === "")) continue;
    ergebnis.push(z);
  }
  while (ergebnis.length && ergebnis[ergebnis.length - 1] === "") ergebnis.pop();
  return ergebnis.join("\n");
}

// „Vorspann + erste Zeile“, weitere Zeilen eingerückt (damit der Mailtext lesbar bleibt). Leerer Text: keine Zeilen.
function beschrifteteZeilen(vorspann, text) {
  const z = mehrzeilig(text);
  if (z === "") return [];
  const teile = z.split("\n");
  return [vorspann + teile[0], ...teile.slice(1).map((x) => (x === "" ? "" : "  " + x))];
}

function zweistellig(n) {
  return (n < 10 ? "0" : "") + n;
}

export function zahlwort(n, einzahl, mehrzahl) {
  return n + " " + (n === 1 ? einzahl : mehrzahl);
}

// Ganze Zahl von 0 bis GRENZEN.anzahl (alles andere wird 0).
export function ganzzahl(wert) {
  const n = Math.floor(Number(wert));
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n, GRENZEN.anzahl);
}

// Betrag in Cent als Text, immer mit zwei Nachkommastellen und Komma, ab 1.000 € mit Tausenderpunkt: „3,05 €“, „7,00 €“, „1.234,56 €“.
// Beträge sind hier nie negativ (die Preisdaten werden vorher geprüft).
export function formatEuro(cent) {
  const c = Math.max(0, Math.round(Number(cent) || 0));
  const euro = Math.floor(c / 100);
  const rest = c % 100;
  return String(euro).replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "," + zweistellig(rest) + " €";
}

// Zahl mit Komma als Dezimalzeichen („40“, „12,5“), für den Rabatt in Prozent.
export function zahlDe(n) {
  return String(n).replace(".", ",");
}

// „2027-01-15“ › „15.01.2027“; alles, was kein echtes Datum ist, ergibt "".
export function datumDe(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ""));
  if (!m) return "";
  const [jahr, monat, tag] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(Date.UTC(jahr, monat - 1, tag));
  if (d.getUTCFullYear() !== jahr || d.getUTCMonth() !== monat - 1 || d.getUTCDate() !== tag) return "";
  return m[3] + "." + m[2] + "." + m[1];
}

// Rückennummer prüfen: { art: "leer" } | { art: "ok", wert: "7" } | { art: "ungueltig" }. Erlaubt sind 1 bis 99.
export function pruefeNummer(text) {
  const t = einzeilig(text);
  if (t === "") return { art: "leer", wert: "" };
  if (!/^\d{1,2}$/.test(t)) return { art: "ungueltig", wert: "" };
  const n = Number(t);
  if (n < 1 || n > 99) return { art: "ungueltig", wert: "" };
  return { art: "ok", wert: String(n) };
}

// Vorschlag für die Initialen: erster Buchstabe jedes Wortes im Namen, groß, höchstens drei. „Ben Kuhn“ › „BK“.
export function initialenVorschlag(name) {
  const buchstaben = [];
  for (const wort of einzeilig(name).split(" ")) {
    const m = /\p{L}/u.exec(wort);
    if (m) buchstaben.push(m[0].toLocaleUpperCase("de"));
  }
  return buchstaben.slice(0, 3).join("");
}

// Die Initialen, die gedruckt werden: was die Person eingetragen hat, sonst der Vorschlag aus dem Namen.
export function effektiveInitialen(person) {
  const eigene = person ? person.initialen : null;
  return eigene === null || eigene === undefined ? initialenVorschlag(person && person.name) : einzeilig(eigene);
}

// „Mia“ oder, wenn kein Name da ist, „Person 2“ (Stelle in der Liste, so heißt auch die Karte auf der Seite).
export function personLabel(person, index) {
  return einzeilig(person && person.name) || "Person " + (index + 1);
}

// Deutsch aufzählen: eine Angabe „A“, zwei „A und B“, drei und mehr „A, B und C“.
export function verbindeDeutsch(teile) {
  if (teile.length <= 1) return teile.join("");
  return teile.slice(0, -1).join(", ") + " und " + teile[teile.length - 1];
}

// ---------- Lieferanschrift ----------

// „60439 Frankfurt“ › { plz: "60439", ort: "Frankfurt" }; alles ohne fünf Ziffern am Anfang und einen Ort danach ergibt null.
export function parseOrt(text) {
  const m = /^(\d{5})\s*(\p{L}.*)$/u.exec(einzeilig(text));
  return m ? { plz: m[1], ort: m[2].trim() } : null;
}

// Der Name für die Lieferung: der eigene Eintrag, solange er nicht geändert wurde (null) der Name des Bestellers.
export function lieferNameWert(bestellung) {
  const eigener = bestellung ? bestellung.lieferName : null;
  return einzeilig(eigener === null || eigener === undefined ? bestellung && bestellung.name : eigener);
}

// Die Lieferanschrift, wie sie in die Mail kommt (eine Zeile je Teil, leer bleibt leer). ort steht als „PLZ Ort“, wenn er gültig ist.
export function lieferAnschrift(bestellung) {
  const ortRoh = einzeilig(bestellung && bestellung.lieferOrt);
  const o = parseOrt(ortRoh);
  return {
    name: lieferNameWert(bestellung),
    strasse: einzeilig(bestellung && bestellung.lieferStrasse),
    ort: o ? o.plz + " " + o.ort : ortRoh,
    ortGueltig: o !== null,
  };
}

// ---------- Sponsor ----------

// Die Angaben zum Sponsor, bereinigt (einzeilig, die Anschrift mehrzeilig ohne Leerzeilen: Im Block „Sponsor“ der Mail sähe eine Leerzeile
// wie sein Ende aus). Entwürfe aus den ersten Fassungen kennen nur einen Namen je Block (bezahlung.kleidungSponsor,
// bezahlung.teambedarfSponsor): Er wird die Firma, bei zwei Namen gewinnt die Kleidung.
export function sponsorDaten(bestellung) {
  const s = bestellung && bestellung.sponsor && typeof bestellung.sponsor === "object" ? bestellung.sponsor : {};
  const b = (bestellung && bestellung.bezahlung) || {};
  const alteFirma = [b.kleidungSponsor, b.teambedarfSponsor].map(einzeilig).find((x) => x !== "") || "";
  return {
    firma: einzeilig(s.firma) || alteFirma,
    ansprechpartner: einzeilig(s.ansprechpartner),
    email: einzeilig(s.email),
    telefon: einzeilig(s.telefon),
    anschrift: mehrzeilig(s.anschrift).split("\n").filter((zeile) => zeile !== "").join("\n"),
  };
}

// ---------- Katalog ----------

const KATALOG_CACHE = new WeakMap();

// Der Katalog aus der Konfiguration, einmal aufbereitet (und dabei geprüft: ein Fehler in data/bestellung.json bricht den Bau ab).
export function katalogVon(konfig) {
  let k = KATALOG_CACHE.get(konfig);
  if (!k) {
    k = baueKatalog(konfig);
    KATALOG_CACHE.set(konfig, k);
  }
  return k;
}

function baueKatalog(konfig) {
  const fehler = (text) => {
    throw new Error("Bestellkatalog: " + text);
  };
  const leiter = (konfig && konfig.groessen) || {};
  for (const g of GRUPPEN) {
    if (!Array.isArray(leiter[g]) || leiter[g].length === 0) fehler(`groessen.${g} fehlt`);
  }
  const gruppeNachGroesse = new Map();
  for (const g of GRUPPEN) for (const w of leiter[g]) gruppeNachGroesse.set(String(w), g);
  const veredelungen = konfig.veredelungen || {};
  const namen = konfig.aufdruckNamen || {};
  if (!Array.isArray(konfig.artikel) || konfig.artikel.length === 0) fehler("artikel fehlt");

  const artikel = [];
  const nachId = new Map();
  konfig.artikel.forEach((roh, index) => {
    const id = roh && roh.id;
    if (typeof id !== "string" || !/^[a-z0-9-]+$/.test(id)) fehler(`Artikel ${index + 1}: id fehlt oder ist ungültig`);
    if (nachId.has(id)) fehler(`${id}: id kommt doppelt vor`);
    if (!roh.anzeige) fehler(`${id}: anzeige fehlt`);

    // Größen: je Gruppe die ganze Leiter (minus „ohne“) oder eine eigene Liste „werte“
    const groessen = [];
    let gruppiert = false;
    for (const g of roh.groessen || []) {
      if (![...GRUPPEN, "alle"].includes(g.gruppe)) fehler(`${id}: Größengruppe „${g.gruppe}“ unbekannt`);
      let werte;
      if (Array.isArray(g.werte)) {
        werte = g.werte;
      } else {
        if (g.gruppe === "alle") fehler(`${id}: Gruppe „alle“ braucht eine Liste werte`);
        werte = leiter[g.gruppe].filter((w) => !(g.ohne || []).includes(w));
        gruppiert = true;
      }
      for (const wert of werte) groessen.push({ wert: String(wert), gruppe: g.gruppe, index: groessen.length });
    }
    if (groessen.length === 0) fehler(`${id}: keine Größen`);
    const nachWert = new Map();
    for (const e of groessen) {
      if (nachWert.has(e.wert)) fehler(`${id}: Größe „${e.wert}“ kommt doppelt vor`);
      nachWert.set(e.wert, e);
    }
    const gruppenImArtikel = new Set(groessen.map((e) => e.gruppe));

    // Lieferant: eine Bezeichnung für alle Größen oder je Gruppe eine
    const lieferant = [];
    const l = roh.lieferant || {};
    if (typeof l.bezeichnung === "string") {
      lieferant.push({ fuer: "alle", bezeichnung: l.bezeichnung, nr: String(l.nr || "") });
    } else {
      for (const g of GRUPPEN) {
        if (l[g]) lieferant.push({ fuer: g, bezeichnung: String(l[g].bezeichnung || ""), nr: String(l[g].nr || "") });
      }
    }
    for (const v of lieferant) {
      if (!v.bezeichnung || !v.nr) fehler(`${id}: Bezeichnung und Herstellernummer für „${v.fuer}“ fehlen`);
    }
    for (const g of gruppenImArtikel) {
      if (!lieferant.some((v) => v.fuer === g || v.fuer === "alle")) fehler(`${id}: Lieferantenbezeichnung für „${g}“ fehlt`);
    }

    // Aufdrucke: welche möglich sind (Reihenfolge der Anzeige), welche vorausgewählt sind, was ein Aufdruck von der Person braucht
    const auf = roh.aufdrucke && typeof roh.aufdrucke === "object" ? roh.aufdrucke : {};
    const moeglich = Array.isArray(auf.moeglich) ? auf.moeglich.map(String) : [];
    const standardRoh = Array.isArray(auf.standard) ? auf.standard.map(String) : [];
    if (new Set(moeglich).size !== moeglich.length) fehler(`${id}: aufdrucke.moeglich enthält ein Kürzel doppelt`);
    if (new Set(standardRoh).size !== standardRoh.length) fehler(`${id}: aufdrucke.standard enthält ein Kürzel doppelt`);
    for (const code of moeglich) {
      if (!veredelungen[code]) fehler(`${id}: Aufdruck „${code}“ ist nicht in veredelungen erklärt`);
      if (typeof namen[code] !== "string" || !namen[code]) fehler(`${id}: Aufdruck „${code}“ hat keinen Namen in aufdruckNamen`);
    }
    for (const code of standardRoh) {
      if (!moeglich.includes(code)) fehler(`${id}: Standard-Aufdruck „${code}“ ist nicht in aufdrucke.moeglich`);
    }
    const druckdaten = roh.druckdaten && typeof roh.druckdaten === "object" ? roh.druckdaten : {};
    for (const [code, art] of Object.entries(druckdaten)) {
      if (!moeglich.includes(code)) fehler(`${id}: druckdaten „${code}“ ist nicht in aufdrucke.moeglich`);
      if (!DRUCKDATEN.includes(art)) fehler(`${id}: druckdaten „${code}“: „${art}“ unbekannt (nummer, name oder initialen)`);
    }
    const druckTexte = {};
    const aufdruckNamen = {};
    for (const code of moeglich) {
      druckTexte[code] = String(veredelungen[code]);
      aufdruckNamen[code] = String(namen[code + ":" + druckdaten[code]] || namen[code]);
    }

    // Bild der Artikelzeile (optional): der Dateiname unter assets/bilder/bestellung/ (Kachel 144 x 144, erzeugt mit tools/bestellung-bilder.py).
    // Ohne Angabe bleibt die Kachel leer. Dass die Datei da ist, prüft der Bau (src/seiten/bestellung.mjs).
    let bild = "";
    if (roh.bild !== undefined) {
      if (typeof roh.bild !== "string" || !/^[a-z0-9-]+\.webp$/.test(roh.bild)) {
        fehler(`${id}: bild ${JSON.stringify(roh.bild)} ist ungültig (erwartet: ein Dateiname aus a–z, 0–9 und „-“ mit der Endung .webp, zum Beispiel „${id}.webp“)`);
      }
      bild = roh.bild;
    }

    const eintrag = {
      id,
      index,
      anzeige: String(roh.anzeige),
      beschreibung: String(roh.beschreibung || ""),
      bild,
      groessen,
      groessenNachWert: nachWert,
      gruppen: [...gruppenImArtikel],
      gruppiert,
      einheitsgroesse: roh.einheitsgroesse === true,
      vorauswahl: roh.vorauswahl && typeof roh.vorauswahl === "object" ? roh.vorauswahl : {},
      hinweis: String(roh.hinweis || ""),
      lieferant,
      aufdrucke: { moeglich, standard: moeglich.filter((c) => standardRoh.includes(c)) },
      druckdaten: { ...druckdaten },
      druckTexte,
      aufdruckNamen,
    };
    for (const wert of Object.values(eintrag.vorauswahl)) {
      if (!nachWert.has(wert)) fehler(`${id}: Vorauswahl „${wert}“ ist keine Größe des Artikels`);
    }
    artikel.push(eintrag);
    nachId.set(id, eintrag);
  });

  return { artikel, nachId, gruppeNachGroesse };
}

// Prüft die ganze Konfiguration der Seite (Katalog samt Bildnamen, Schnellwahl, Teambedarf, Bezahlung, Einstellungen, Mannschaften).
// Wirft bei einem Fehler; der Bau (src/seiten/bestellung.mjs) bricht dann ab, statt eine kaputte Seite zu liefern.
export function pruefeKonfig(konfig) {
  const fehler = (text) => {
    throw new Error("Bestellseite: " + text);
  };
  const k = katalogVon(konfig);
  const einst = konfig.einstellungen || {};
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(einst.empfaenger || ""))) fehler("einstellungen.empfaenger ist keine Mailadresse");
  if (typeof einst.pruefmodus !== "boolean") fehler("einstellungen.pruefmodus muss true oder false sein");
  if (!einst.lieferant) fehler("einstellungen.lieferant fehlt");
  for (const code of Object.keys(konfig.veredelungen || {})) {
    if (typeof (konfig.aufdruckNamen || {})[code] !== "string") fehler(`aufdruckNamen.${code} fehlt (Name des Aufdrucks für die Auswahl)`);
  }
  if (!(konfig.veredelungen || {})[SPONSOR_AUFDRUCK]) fehler(`veredelungen.${SPONSOR_AUFDRUCK} fehlt (Sponsorlogo)`);
  for (const s of konfig.schnellwahl || []) {
    if (!s.id || !s.titel) fehler("schnellwahl: id und titel fehlen");
    for (const id of s.artikel || []) if (!k.nachId.has(id)) fehler(`schnellwahl ${s.id}: Artikel „${id}“ gibt es nicht`);
  }
  const ids = new Set();
  for (const t of konfig.teambedarf || []) {
    if (!t.id || !t.anzeige) fehler("teambedarf: id und anzeige fehlen");
    if (ids.has(t.id)) fehler(`teambedarf: id „${t.id}“ kommt doppelt vor`);
    ids.add(t.id);
  }
  const bez = new Set();
  if (!Array.isArray(konfig.bezahlung) || konfig.bezahlung.length === 0) fehler("bezahlung fehlt");
  for (const b of konfig.bezahlung) {
    if (!b.id || !b.text) fehler("bezahlung: id und text fehlen");
    if (bez.has(b.id)) fehler(`bezahlung: id „${b.id}“ kommt doppelt vor`);
    bez.add(b.id);
  }
  // Eine leere Liste bricht den Bau nicht ab (die Auswahl bleibt leer, src/seiten/bestellung.mjs warnt): Die Mannschaften prüft die
  // Trainerseite mit eigener Meldung (Fall „leere Liste der Mannschaften“ in tools/anmeldung-test/trainer-e2e-paket.mjs).
  if (!Array.isArray(konfig.mannschaften)) fehler("mannschaften fehlen");
  const slugs = new Set();
  for (const m of konfig.mannschaften) {
    if (!/^[a-z0-9-]+$/.test(String(m.slug || "")) || !m.name) fehler("mannschaften: slug und name sind nötig");
    if (slugs.has(m.slug)) fehler(`mannschaften: slug „${m.slug}“ kommt doppelt vor`);
    slugs.add(m.slug);
  }
  return true;
}

// ---------- Preise (nach dem Entschlüsseln) ----------

// Euro als Zahl › ganze Cent; null, wenn es kein Betrag von mindestens 0 € mit höchstens zwei Nachkommastellen ist.
function alsCent(wert) {
  if (typeof wert !== "number" || !Number.isFinite(wert) || wert < 0) return null;
  const c = Math.round(wert * 100);
  return Math.abs(wert * 100 - c) < 1e-6 ? c : null;
}

// Prüft die entschlüsselten Preisdaten gegen den Katalog: Liste der Probleme (leer = alles da). Die Meldungen nennen nur Schlüssel, nie Werte.
//   { rabattProzent, veredelungPreis: { W, V, … }, uvp: { <artikel>: { kinder, erwachsene } | { alle } | null }, stand: "JJJJ-MM-TT", quelle }
// Beträge in Euro. Ein Artikel mit uvp null hat „Preis auf Anfrage“. Weitere Felder (etwa Prüfsummen) werden ignoriert.
export function pruefePreise(konfig, roh) {
  const probleme = [];
  if (!roh || typeof roh !== "object" || Array.isArray(roh)) return ["Die Preisdaten sind kein Objekt."];
  const k = katalogVon(konfig);
  const r = roh.rabattProzent;
  if (typeof r !== "number" || !Number.isFinite(r) || r < 0 || r >= 100) probleme.push("rabattProzent fehlt oder liegt nicht zwischen 0 und 100");
  if (!datumDe(roh.stand)) probleme.push("stand fehlt oder ist kein Datum (Form JJJJ-MM-TT)");
  if (typeof roh.quelle !== "string" || einzeilig(roh.quelle) === "") probleme.push("quelle fehlt");
  const v = roh.veredelungPreis && typeof roh.veredelungPreis === "object" ? roh.veredelungPreis : {};
  const codes = [...new Set(k.artikel.flatMap((a) => a.aufdrucke.moeglich))];
  for (const code of codes) {
    if (alsCent(v[code]) === null) probleme.push(`veredelungPreis.${code} fehlt oder ist kein Betrag in Euro (höchstens zwei Nachkommastellen)`);
  }
  const u = roh.uvp && typeof roh.uvp === "object" ? roh.uvp : {};
  for (const a of k.artikel) {
    if (!Object.prototype.hasOwnProperty.call(u, a.id)) {
      probleme.push(`uvp.${a.id} fehlt (null heißt: ${PREIS_AUF_ANFRAGE})`);
      continue;
    }
    if (u[a.id] === null) continue;
    for (const gruppe of a.gruppen) {
      const wert = u[a.id] && typeof u[a.id] === "object" ? u[a.id][gruppe] : undefined;
      if (alsCent(wert) === null) probleme.push(`uvp.${a.id}.${gruppe} fehlt oder ist kein Betrag in Euro (höchstens zwei Nachkommastellen)`);
    }
  }
  return probleme;
}

// Die Konfiguration mit den Preisen (konfig.preise, alles in Cent). Wirft einen Fehler, wenn die Preisdaten nicht zum Katalog passen.
// Die übergebene Konfiguration bleibt unverändert (es entsteht ein neues Objekt).
export function mitPreisen(konfig, roh) {
  const probleme = pruefePreise(konfig, roh);
  if (probleme.length) throw new Error("Preisdaten: " + probleme.join("; "));
  const k = katalogVon(konfig);
  const uvpCent = {};
  for (const a of k.artikel) {
    const u = roh.uvp[a.id];
    uvpCent[a.id] = u === null ? null : Object.fromEntries(a.gruppen.map((g) => [g, alsCent(u[g])]));
  }
  const zuschlagCent = {};
  for (const code of new Set(k.artikel.flatMap((a) => a.aufdrucke.moeglich))) zuschlagCent[code] = alsCent(roh.veredelungPreis[code]);
  return { ...konfig, preise: { rabattProzent: roh.rabattProzent, uvpCent, zuschlagCent, stand: roh.stand, quelle: einzeilig(roh.quelle) } };
}

// Listenpreis (UVP) in Cent für eine Größengruppe; null bei „Preis auf Anfrage“ oder ohne Preisdaten.
export function listenpreisCent(konfig, artikelId, gruppe) {
  const u = konfig.preise && konfig.preise.uvpCent[artikelId];
  return u && typeof u[gruppe] === "number" ? u[gruppe] : null;
}

// Grundpreis in Cent: Listenpreis minus Rabatt, gerundet auf ganze Cent.
export function grundpreisCent(konfig, artikelId, gruppe) {
  const liste = listenpreisCent(konfig, artikelId, gruppe);
  return liste === null ? null : Math.round((liste * (100 - konfig.preise.rabattProzent)) / 100);
}

// Summe der Zuschläge der Aufdrucke (Kürzel) in Cent.
export function zuschlagSumme(konfig, codes) {
  const z = (konfig.preise && konfig.preise.zuschlagCent) || {};
  return codes.reduce((s, c) => s + (typeof z[c] === "number" ? z[c] : 0), 0);
}

// Hat der Artikel keinen Listenpreis („Preis auf Anfrage“)?
export function istAufAnfrage(konfig, artikelId) {
  return !!konfig.preise && konfig.preise.uvpCent[artikelId] === null;
}

// Preis eines Artikels in einer Größe mit den gewählten Aufdrucken (Kürzel):
//   null                                                   Größe fehlt oder gehört nicht zum Artikel, oder es gibt keine Preisdaten
//   { anfrage: true, zuschlagCent }                        Preis auf Anfrage
//   { anfrage: false, listeCent, grundCent, zuschlagCent, cent }
export function stueckpreis(konfig, artikelId, groesse, aufdrucke) {
  const a = katalogVon(konfig).nachId.get(artikelId);
  const e = a ? a.groessenNachWert.get(String(groesse || "")) : null;
  if (!e || !konfig.preise) return null;
  const zuschlag = zuschlagSumme(konfig, aufdrucke || a.aufdrucke.standard);
  if (istAufAnfrage(konfig, artikelId)) return { anfrage: true, zuschlagCent: zuschlag };
  const liste = listenpreisCent(konfig, artikelId, e.gruppe);
  const grund = grundpreisCent(konfig, artikelId, e.gruppe);
  return { anfrage: false, listeCent: liste, grundCent: grund, zuschlagCent: zuschlag, cent: grund + zuschlag };
}

// Stückpreis für die Anzeige. Ohne Größe: gleicher Preis für alle Größen › „5,05 €“, sonst „ab 5,05 €“; ohne Aufdrucke-Angabe zählen die
// Standard-Aufdrucke des Artikels. Ohne Listenpreis: „Preis auf Anfrage“. Ohne Preisdaten: "".
export function preisText(konfig, artikelId, groesse, aufdrucke) {
  const a = katalogVon(konfig).nachId.get(artikelId);
  if (!a || !konfig.preise) return "";
  if (istAufAnfrage(konfig, artikelId)) return PREIS_AUF_ANFRAGE;
  const codes = aufdrucke || a.aufdrucke.standard;
  const genau = stueckpreis(konfig, artikelId, groesse, codes);
  if (genau) return formatEuro(genau.cent);
  const zuschlag = zuschlagSumme(konfig, codes);
  const werte = [...new Set(a.groessen.map((e) => grundpreisCent(konfig, artikelId, e.gruppe) + zuschlag))];
  return werte.length === 1 ? formatEuro(werte[0]) : "ab " + formatEuro(Math.min(...werte));
}

// Die kleine Zeile unter dem Stückpreis: „Listenpreis <UVP> € − <Rabatt> % = <Grundpreis> € · Aufdrucke + <Zuschläge> €“. Ohne Größe oder Preisdaten "".
export function preisZeile(konfig, artikelId, groesse, aufdrucke) {
  const codes = aufdrucke || katalogVon(konfig).nachId.get(artikelId).aufdrucke.standard;
  const s = stueckpreis(konfig, artikelId, groesse, codes);
  if (!s) return "";
  if (s.anfrage) return PREIS_AUF_ANFRAGE;
  let text = `Listenpreis ${formatEuro(s.listeCent)} − ${zahlDe(konfig.preise.rabattProzent)} % = ${formatEuro(s.grundCent)}`;
  if (codes.length) text += ` · Aufdrucke + ${formatEuro(s.zuschlagCent)}`;
  return text;
}

// Zuschlag hinter einem Aufdruck-Kästchen: „+ <Zuschlag> €“. Ohne Preisdaten "".
export function zuschlagText(konfig, code) {
  const z = konfig.preise && konfig.preise.zuschlagCent[code];
  return typeof z === "number" ? "+ " + formatEuro(z) : "";
}

// Eine Summe mit dem Hinweis auf Stücke ohne Preis: „<Summe> €“ oder „<Summe> € (ohne Regenjacke, Preis auf Anfrage)“.
export function summeText(cent, ohnePreis) {
  return formatEuro(cent) + (ohnePreis && ohnePreis.length ? ` (ohne ${verbindeDeutsch(ohnePreis)}, ${PREIS_AUF_ANFRAGE})` : "");
}

// „Preise laut <Quelle>“ (die Quelle steht in den Preisdaten, etwa Angebot, Lieferant und Datum); ohne Preisdaten nur „Preise laut Angebot“.
export function preisQuelle(konfig) {
  return "Preise laut " + (konfig.preise && konfig.preise.quelle ? konfig.preise.quelle : "Angebot");
}

// ---------- Antworten zur Bezahlung ----------

// Die gewählten Antworten eines Blocks (Kleidung, Teambedarf) als Liste von ids in Katalogreihenfolge, jede id einmal.
// Nimmt auch den alten Wert eines früheren Entwurfs, einen einzelnen Text: "" › [], "eltern" › ["eltern"].
// Unbekannte Einträge fallen weg.
export function bezahlungIds(konfig, wert) {
  const roh = Array.isArray(wert) ? wert : typeof wert === "string" && wert !== "" ? [wert] : [];
  return (konfig.bezahlung || []).map((o) => o.id).filter((id) => roh.includes(id));
}

// Gehört zu dieser Antwort ein Sponsor (Eintrag „mitName“ in data/bestellung.json)?
function istSponsorAntwort(konfig, id) {
  const o = (konfig.bezahlung || []).find((x) => x.id === id);
  return !!o && o.mitName === true;
}

// Der Block „Sponsor“ ist nötig, sobald bei der Kleidung oder beim Teambedarf (die gewählt sind) „Sponsor“ angehakt ist
// oder ein gewähltes Stück das Sponsorlogo trägt. z ist die Zusammenfassung der Bestellung.
export function sponsorAktiv(konfig, bestellung, z) {
  const b = (bestellung && bestellung.bezahlung) || {};
  const angehakt = (wahl) => bezahlungIds(konfig, wahl).some((id) => istSponsorAntwort(konfig, id));
  return (z.hatKleidung && angehakt(b.kleidung)) || (z.hatTeambedarf && angehakt(b.teambedarf)) || z.sponsorStuecke > 0;
}

// ---------- Größen, Vorauswahl, Aufdrucke ----------

// „kinder“ oder „erwachsene“ für eine Größe der Person ("" bei allem anderen).
export function gruppeDerGroesse(konfig, groesse) {
  return katalogVon(konfig).gruppeNachGroesse.get(String(groesse || "")) || "";
}

// Größe, die für einen Artikel automatisch vorgewählt wird (leer, wenn es keine gibt):
// nur eine Größe (Rucksack) › diese; Sonderfall nach Personengröße (Winterjacke 116 › 128);
// Sonderfall nach Gruppe (Stutzen: M bei Kindern, L bei Erwachsenen); sonst die Größe der Person.
export function vorauswahlGroesse(konfig, artikelId, personGroesse) {
  const k = katalogVon(konfig);
  const a = k.nachId.get(artikelId);
  if (!a) return "";
  if (a.groessen.length === 1) return a.groessen[0].wert;
  const g = String(personGroesse || "");
  if (!g) return "";
  if (a.vorauswahl[g]) return a.vorauswahl[g];
  const gruppe = k.gruppeNachGroesse.get(g);
  if (gruppe && a.vorauswahl[gruppe]) return a.vorauswahl[gruppe];
  return a.groessenNachWert.has(g) ? g : "";
}

// Hinweis zur Vorauswahl („Winterjacke gibt es für Kinder erst ab 128“), nur wenn die Größe der Person davon betroffen ist.
export function vorauswahlHinweis(konfig, artikelId, personGroesse) {
  const a = katalogVon(konfig).nachId.get(artikelId);
  if (!a || !a.hinweis) return "";
  return Object.prototype.hasOwnProperty.call(a.vorauswahl, String(personGroesse || "")) ? a.hinweis : "";
}

// Die Größe, die für einen Artikel der Person gilt: ihre eigene Wahl, sonst die Vorauswahl ("" = noch keine).
export function artikelGroesse(konfig, person, artikelId) {
  const a = katalogVon(konfig).nachId.get(artikelId);
  if (!a) return "";
  const wahl = person && person.artikel ? person.artikel[artikelId] : null;
  if (wahl && wahl.groesse && a.groessenNachWert.has(wahl.groesse)) return wahl.groesse;
  return vorauswahlGroesse(konfig, artikelId, person && person.groesse);
}

// Die Aufdrucke (Kürzel, in der Reihenfolge von aufdrucke.moeglich), die für einen Artikel der Person gelten: ihre eigene Wahl,
// ohne eigene Wahl (alter Entwurf) die Standard-Aufdrucke des Artikels. Eine leere Liste heißt: nichts drauf.
export function artikelAufdrucke(konfig, person, artikelId) {
  const a = katalogVon(konfig).nachId.get(artikelId);
  if (!a) return [];
  const wahl = person && person.artikel ? person.artikel[artikelId] : null;
  if (wahl && Array.isArray(wahl.aufdrucke)) return a.aufdrucke.moeglich.filter((c) => wahl.aufdrucke.includes(c));
  return a.aufdrucke.standard.slice();
}

// Was die gewählten Aufdrucke von der Person brauchen: { name, nummer, initialen } (Wahrheitswerte).
export function druckBedarf(konfig, artikelId, aufdrucke) {
  const a = katalogVon(konfig).nachId.get(artikelId);
  const arten = new Set((aufdrucke || []).map((c) => (a ? a.druckdaten[c] : undefined)));
  return { name: arten.has("name"), nummer: arten.has("nummer"), initialen: arten.has("initialen") };
}

// Schnellwahl auf eine Person anwenden: schaltet die Artikel der Schnellwahl mit ihren Standard-Aufdrucken ein
// (nichts wird abgewählt, schon gewählte Artikel behalten ihre Größe und ihre Aufdrucke).
export function schnellwahlAnwenden(konfig, person, schnellwahlId) {
  const s = (konfig.schnellwahl || []).find((x) => x.id === schnellwahlId);
  if (!s) return person;
  const k = katalogVon(konfig);
  if (!person.artikel || typeof person.artikel !== "object") person.artikel = {};
  for (const id of s.artikel) if (!person.artikel[id]) person.artikel[id] = { groesse: "", aufdrucke: k.nachId.get(id).aufdrucke.standard.slice() };
  return person;
}

// ---------- Zusammenfassung ----------

// Alles, was aus den Eingaben folgt, in einer Form, die Prüfung, Mailtext und Seite gemeinsam benutzen:
//   personen   Personen mit mindestens einem Artikel: zeilen (Artikel, Größe, abweichend von der Vorauswahl, Aufdrucke, was die Aufdrucke
//              brauchen, Stückpreis in Cent oder „auf Anfrage“), Summe, Stücke ohne Preis, Teile
//   bloecke    Zeilen für den Lieferanten: je Artikel, Variante (Kinder, Erwachsene, „alle“) und Aufdruck-Kombination die Menge je Größe
//   druck      Stücke, deren Aufdrucke Daten brauchen (sortiert: Katalog, Größe, Nummer, Name)
//   teile, summeCent, ohnePreis (Artikel ohne Preis), sponsorStuecke (Stücke mit Sponsorlogo), hatKleidung
//   teambedarf (Anzahl > 0), sonstiges, hatTeambedarf
export function zusammenfassung(konfig, bestellung) {
  const k = katalogVon(konfig);
  const personen = [];
  const bloeckeNachSchluessel = new Map();
  const druck = [];
  const ohnePreisIds = new Set();
  let teile = 0;
  let summeCent = 0;
  let sponsorStuecke = 0;

  (bestellung.personen || []).forEach((p, index) => {
    const gewaehlt = k.artikel.filter((a) => p.artikel && p.artikel[a.id]);
    if (gewaehlt.length === 0) return;
    const nummer = pruefeNummer(p.nummer);
    const name = einzeilig(p.name);
    const zeilen = [];
    const ohnePerson = new Set();
    let personCent = 0;
    for (const a of gewaehlt) {
      const groesse = artikelGroesse(konfig, p, a.id);
      const auto = vorauswahlGroesse(konfig, a.id, p.groesse);
      const eintrag = a.groessenNachWert.get(groesse) || null;
      const aufdrucke = artikelAufdrucke(konfig, p, a.id);
      const bedarf = druckBedarf(konfig, a.id, aufdrucke);
      const variante = eintrag ? a.lieferant.find((v) => v.fuer === eintrag.gruppe || v.fuer === "alle") : null;
      const preis = eintrag ? stueckpreis(konfig, a.id, groesse, aufdrucke) : null;
      const anfrage = !!preis && preis.anfrage;
      const cent = anfrage ? null : preis ? preis.cent : 0;
      zeilen.push({ artikel: a, groesse, abweichend: groesse !== auto, aufdrucke, bedarf, variante, anfrage, cent, preis });
      if (cent === null) {
        ohnePerson.add(a.id);
        ohnePreisIds.add(a.id);
      } else {
        personCent += cent;
      }
      teile += 1;
      if (aufdrucke.includes(SPONSOR_AUFDRUCK)) sponsorStuecke += 1;
      if (!eintrag) continue;
      const schluessel = [a.id, variante.fuer, aufdrucke.join(",")].join("|");
      let block = bloeckeNachSchluessel.get(schluessel);
      if (!block) {
        block = { artikel: a, variante, aufdrucke, menge: 0, mengen: new Map() };
        bloeckeNachSchluessel.set(schluessel, block);
      }
      block.menge += 1;
      block.mengen.set(groesse, (block.mengen.get(groesse) || 0) + 1);
      if (bedarf.name || bedarf.nummer || bedarf.initialen) {
        druck.push({
          artikel: a,
          variante,
          groesse,
          groesseIndex: eintrag.index,
          bedarf,
          nummer: nummer.art === "ok" ? nummer.wert : "",
          name,
          initialen: einzeilig(effektiveInitialen(p)),
        });
      }
    }
    summeCent += personCent;
    personen.push({
      index,
      person: p,
      label: personLabel(p, index),
      name,
      nummer: nummer.art === "ok" ? nummer.wert : "",
      groesse: String(p.groesse || ""),
      zeilen,
      summeCent: personCent,
      ohnePreis: k.artikel.filter((a) => ohnePerson.has(a.id)).map((a) => a.anzeige),
      teile: zeilen.length,
    });
  });

  // Blöcke für den Lieferanten: Katalogreihenfolge, je Artikel erst Kinder, dann Erwachsene; innerhalb einer Variante die Kombination mit
  // mehr Aufdrucken zuerst, bei gleich vielen die mit den früheren Kürzeln in aufdrucke.moeglich; Größen in Leiterreihenfolge
  const bloecke = [];
  const kombination = (a, codes) => codes.map((c) => a.aufdrucke.moeglich.indexOf(c));
  for (const a of k.artikel) {
    for (const v of a.lieferant) {
      const liste = [...bloeckeNachSchluessel.values()].filter((b) => b.artikel === a && b.variante === v);
      liste.sort((x, y) => {
        if (x.aufdrucke.length !== y.aufdrucke.length) return y.aufdrucke.length - x.aufdrucke.length;
        const kx = kombination(a, x.aufdrucke);
        const ky = kombination(a, y.aufdrucke);
        for (let i = 0; i < kx.length; i++) if (kx[i] !== ky[i]) return kx[i] - ky[i];
        return 0;
      });
      for (const block of liste) {
        const groessen = [...block.mengen.entries()]
          .sort((x, y) => a.groessenNachWert.get(x[0]).index - a.groessenNachWert.get(y[0]).index)
          .map(([wert, menge]) => ({ wert, menge }));
        bloecke.push({ artikel: a, variante: v, aufdrucke: block.aufdrucke, menge: block.menge, groessen });
      }
    }
  }

  const nummerWert = (d) => (d.nummer === "" ? Infinity : Number(d.nummer));
  druck.sort(
    (x, y) =>
      x.artikel.index - y.artikel.index ||
      x.groesseIndex - y.groesseIndex ||
      (nummerWert(x) === nummerWert(y) ? 0 : nummerWert(x) < nummerWert(y) ? -1 : 1) ||
      x.name.localeCompare(y.name, "de")
  );

  const teambedarf = [];
  for (const t of konfig.teambedarf || []) {
    const e = bestellung.teambedarf ? bestellung.teambedarf[t.id] : null;
    const n = e ? ganzzahl(e.n) : 0;
    if (n > 0) teambedarf.push({ id: t.id, anzeige: t.anzeige, n, details: einzeilig(e.details) });
  }
  const sonstiges = mehrzeilig(bestellung.sonstiges);

  return {
    personen,
    bloecke,
    druck,
    teile,
    summeCent,
    ohnePreis: k.artikel.filter((a) => ohnePreisIds.has(a.id)).map((a) => a.anzeige),
    sponsorStuecke,
    hatKleidung: teile > 0,
    teambedarf,
    sonstiges,
    hatTeambedarf: teambedarf.length > 0 || sonstiges !== "",
  };
}

// ---------- Prüfung: Liste der Lücken ----------

// Was fehlt, bevor die Bestellung gesendet werden darf? Liste von { feld, text } in der Reihenfolge der Seite (leer = alles da).
// „feld“ nennt das Eingabefeld, zu dem die Seite springt: team, name, lieferName, lieferStrasse, lieferOrt, leer,
// p:<id>:name|groesse|nummer|initialen|a:<artikel>, bezahlung:kleidung|teambedarf, sponsor:firma. Personen ohne Artikel zählen nicht.
// Bei einer doppelten Rückennummer nennt „felder“ zusätzlich alle beteiligten Nummernfelder (die Seite markiert sie).
// Name, Nummer und Initialen einer Person sind nur Pflicht, wenn ein gewählter Aufdruck sie braucht.
export function pruefeBestellung(konfig, bestellung) {
  const luecken = [];
  const melde = (feld, text, felder) => luecken.push(felder ? { feld, text, felder } : { feld, text });
  const z = zusammenfassung(konfig, bestellung);

  if (!(konfig.mannschaften || []).some((m) => m.slug === bestellung.team)) melde("team", "Bitte wähle deine Mannschaft aus");
  if (einzeilig(bestellung.name) === "") melde("name", "Bitte trage deinen Namen ein");

  // Lieferanschrift: Folgt der Name der Lieferung noch „Dein Name“ (null), meldet schon „Dein Name“ die Lücke.
  const anschrift = lieferAnschrift(bestellung);
  const eigenerLieferName = bestellung.lieferName !== null && bestellung.lieferName !== undefined;
  if (eigenerLieferName && anschrift.name === "") melde("lieferName", "Bitte gib den Namen für die Lieferung an");
  if (anschrift.strasse === "") melde("lieferStrasse", "Bitte gib Straße und Hausnummer für die Lieferung an");
  if (!anschrift.ortGueltig) melde("lieferOrt", "Bitte PLZ und Ort angeben (z. B. 60439 Frankfurt)");

  if (!z.hatKleidung && !z.hatTeambedarf) {
    melde("leer", "Du hast noch nichts ausgewählt: Füge eine Person mit Kleidung hinzu oder wähle Teambedarf");
  }

  const artikelMit = (p, art) => p.zeilen.filter((x) => x.bedarf[art]).map((x) => x.artikel.anzeige);
  for (const p of z.personen) {
    const id = p.person.id;
    const brauchtName = artikelMit(p, "name");
    if (brauchtName.length && p.name === "") melde(`p:${id}:name`, `Bei ${p.label} fehlt der Name (${brauchtName.join(", ")})`);
    if (gruppeDerGroesse(konfig, p.groesse) === "") melde(`p:${id}:groesse`, `Bei ${p.label} fehlt die Größe`);
    const nummer = pruefeNummer(p.person.nummer);
    const brauchtNummer = artikelMit(p, "nummer");
    if (brauchtNummer.length) {
      if (nummer.art === "ungueltig") {
        melde(`p:${id}:nummer`, `Bei ${p.label} ist die Rückennummer ungültig (nur 1 bis 99)`);
      } else if (nummer.art === "leer") {
        melde(`p:${id}:nummer`, `Bei ${p.label} fehlt die Rückennummer (${brauchtNummer.join(", ")})`);
      }
    }
    const brauchtInitialen = artikelMit(p, "initialen");
    if (brauchtInitialen.length && einzeilig(effektiveInitialen(p.person)) === "") {
      melde(`p:${id}:initialen`, `Bei ${p.label} fehlen die Initialen (${brauchtInitialen.join(", ")})`);
    }
    // Größe je Artikel: nur wenn die Größe der Person gewählt ist, aber ein Artikel trotzdem keine bekommt
    if (gruppeDerGroesse(konfig, p.groesse) !== "") {
      for (const x of p.zeilen) {
        if (!x.variante) melde(`p:${id}:a:${x.artikel.id}`, `Bei ${p.label} fehlt die Größe für ${x.artikel.anzeige}`);
      }
    }
  }

  // Doppelte Rückennummern: nur unter Personen, deren Aufdrucke die Nummer brauchen. Gleicher Name (getrimmt, ohne Groß- und
  // Kleinschreibung) heißt: dasselbe Kind, keine Lücke. Personen ohne Namen zählen als verschieden („Person 1“, „Person 2“).
  const nachNummer = new Map();
  for (const p of z.personen) {
    const n = pruefeNummer(p.person.nummer);
    if (n.art !== "ok" || artikelMit(p, "nummer").length === 0) continue;
    if (!nachNummer.has(n.wert)) nachNummer.set(n.wert, []);
    nachNummer.get(n.wert).push(p);
  }
  for (const [nr, liste] of nachNummer) {
    const verschieden = new Map();
    for (const p of liste) {
      const schluessel = p.name === "" ? "\u0000" + p.index : p.name.toLocaleLowerCase("de");
      if (!verschieden.has(schluessel)) verschieden.set(schluessel, p);
    }
    if (verschieden.size < 2) continue;
    const namen = [...verschieden.values()].map((p) => p.label);
    const felder = liste.map((p) => `p:${p.person.id}:nummer`);
    melde(felder[felder.length - 1], `Die Rückennummer ${nr} ist doppelt (${verbindeDeutsch(namen)})`, felder);
  }

  // Mindestens eine Antwort je Block.
  const pruefeBezahlung = (block, frage, wahl) => {
    if (bezahlungIds(konfig, wahl).length === 0) melde(`bezahlung:${block}`, `Bitte wähle, wer ${frage} zahlt`);
  };
  const b = bestellung.bezahlung || {};
  if (z.hatKleidung) pruefeBezahlung("kleidung", "die Kleidung", b.kleidung);
  if (z.hatTeambedarf) pruefeBezahlung("teambedarf", "den Teambedarf", b.teambedarf);

  // Sponsor: nötig bei angehaktem „Sponsor“ oder einem Stück mit Sponsorlogo; die Firma ist Pflicht.
  if (sponsorAktiv(konfig, bestellung, z) && sponsorDaten(bestellung).firma === "") melde("sponsor:firma", "Bitte trage die Firma des Sponsors ein");

  return luecken;
}

// ---------- Bestell-Nr. ----------

// „D3-261125-1432“: Kürzel der Mannschaft in Großbuchstaben, Datum (JJMMTT) und Uhrzeit (HHMM) in Ortszeit.
export function bestellNr(slug, jetzt) {
  return (
    String(slug).toUpperCase() +
    "-" +
    zweistellig(jetzt.getFullYear() % 100) +
    zweistellig(jetzt.getMonth() + 1) +
    zweistellig(jetzt.getDate()) +
    "-" +
    zweistellig(jetzt.getHours()) +
    zweistellig(jetzt.getMinutes())
  );
}

// Eine schon vergebene Bestell-Nr. bleibt, solange sie zur Mannschaft passt; sonst entsteht eine neue.
export function waehleBestellNr(alt, slug, jetzt) {
  const praefix = String(slug).toUpperCase() + "-";
  if (typeof alt === "string" && alt.startsWith(praefix) && /^\d{6}-\d{4}$/.test(alt.slice(praefix.length))) return alt;
  return bestellNr(slug, jetzt);
}

// ---------- Mail ----------

// Genau eine einfache Adresse: vor dem @ Buchstaben, Ziffern und . _ + -, danach Namen aus Buchstaben, Ziffern und Bindestrichen (je höchstens 63 Zeichen,
// am Anfang und Ende kein Bindestrich), durch Punkte getrennt, mindestens ein Punkt. Leerraum, Komma, Semikolon, Zeilenumbruch, Steuerzeichen, ein zweites @,
// spitze Klammern, & = ? # % und alles außerhalb von ASCII passen nicht.
const CC_MUSTER = /^[A-Za-z0-9._+-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;

// Die Adresse für die Kopie (Cc) der Bestellmail, aus dem Feld „E-Mail-Adresse (freiwillig)“:
//   ""    nichts eingetragen (nur Leerraum zählt als nichts): keine Kopie, kein Hinweis
//   Text  die getrimmte Adresse, wenn sie gültig ist (CC_MUSTER, höchstens GRENZEN.email Zeichen)
//   null  alles andere: kein Cc im Link, die Seite weist am Feld darauf hin
// Nur was hier als Text herauskommt, darf in den Link; es steckt darin nie ein zweiter Empfänger und nie eine zusätzliche Kopfzeile (Bcc, Zeilenumbruch …).
export function ccAdresse(text) {
  if (text === null || text === undefined) return "";
  if (typeof text !== "string") return null;
  const t = text.trim();
  if (t === "") return "";
  // Die Länge zuerst: Die Prüfung läuft so nie über einen langen Text
  return t.length <= GRENZEN.email && CC_MUSTER.test(t) ? t : null;
}

// mailto-Adresse: Betreff und Text mit encodeURIComponent, Zeilenumbrüche als %0D%0A (RFC 6068); die Adresse bleibt, wie sie ist.
// cc (optional): die Adresse für eine Kopie. Sie kommt nur in den Link, wenn ccAdresse sie als gültig erkennt (sonst bleibt der Link byte-gleich zu dem ohne cc),
// ganz am Ende als „&cc=“ mit encodeURIComponent: Betreff und Text stehen davor, wo sie immer standen.
export function mailtoLink(empfaenger, betreff, text, cc) {
  const kodiere = (t) => encodeURIComponent(String(t).replace(/\r?\n/g, "\r\n"));
  const kopie = ccAdresse(cc);
  return "mailto:" + empfaenger + "?subject=" + kodiere(betreff) + "&body=" + kodiere(text) + (kopie ? "&cc=" + encodeURIComponent(kopie) : "");
}

// Die Antworten eines Blocks in Katalogreihenfolge, deutsch verbunden: „Eltern bzw. Spieler und Sponsor (Autohaus Beispiel)“.
// Eine Antwort mit Sponsor (Eintrag „mitName“) steht immer mit der Firma in Klammern, auch allein; die Firma kommt aus dem Block „Sponsor“.
function bezahlText(konfig, wahl, firma) {
  return verbindeDeutsch(
    bezahlungIds(konfig, wahl).map((id) => {
      const opt = konfig.bezahlung.find((o) => o.id === id);
      return opt.mitName && firma ? `${opt.text} (${firma})` : opt.text;
    })
  );
}

// Eine Zeile „Druckdaten je Stück“: Name, Nummer, Initialen, soweit die Aufdrucke des Stücks sie brauchen.
function druckText(d) {
  const nr = d.nummer === "" ? FEHLT : d.nummer;
  const name = d.name === "" ? FEHLT : d.name;
  const ini = d.initialen === "" ? FEHLT : d.initialen;
  const teile = [];
  if (d.bedarf.name) teile.push(`Name „${name}“`);
  if (d.bedarf.nummer) teile.push(`Nr. ${nr}`);
  if (d.bedarf.initialen) teile.push(`Initialen „${ini}“`);
  return `- ${d.artikel.anzeige} ${d.variante.nr}, Gr. ${d.groesse}: ${teile.join(", ")}`;
}

// Betreff, Text und mailto-Adresse der Bestellung. Der Text hat \n als Zeilenumbruch (im mailto werden daraus \r\n).
// Was noch fehlt, steht als FEHLT im Text; gesendet wird nur, wenn pruefeBestellung keine Lücken meldet.
// „jetzt“ (Date) liefert Datum und Uhrzeit der Bestell-Nr., die erst mit dem ersten Senden feststeht (bestellung.bestellNr).
export function baueMail(konfig, bestellung, jetzt) {
  const einst = konfig.einstellungen;
  const z = zusammenfassung(konfig, bestellung);
  const team = (konfig.mannschaften || []).find((m) => m.slug === bestellung.team) || null;
  const nr = team ? waehleBestellNr(bestellung.bestellNr, team.slug, jetzt) : FEHLT;
  const besteller = einzeilig(bestellung.name) || FEHLT;
  const tel = einzeilig(bestellung.tel);
  const bis = datumDe(bestellung.bis);
  const b = bestellung.bezahlung || {};
  const anschrift = lieferAnschrift(bestellung);
  const sponsor = sponsorDaten(bestellung);

  // Betreff: [TEST] Bestellung D3-Jugend – 13 Teile, Teambedarf (D3-261125-1432)
  const inhalt = [];
  if (z.hatKleidung) inhalt.push(zahlwort(z.teile, "Teil", "Teile"));
  if (z.hatTeambedarf) inhalt.push("Teambedarf");
  const betreff =
    (einst.pruefmodus ? "[TEST] " : "") +
    "Bestellung " +
    (team ? team.name : FEHLT) +
    (inhalt.length ? " – " + inhalt.join(", ") : "") +
    (team ? " (" + nr + ")" : "");

  const zeilen = ["Hallo,", "", "hier ist eine neue Bestellung über die Bestellseite für Trainer."];
  if (einst.pruefmodus) zeilen.push("TEST – Prototyp: Bitte nichts beim Lieferanten bestellen.");
  zeilen.push("", "Mannschaft: " + (team ? team.name : FEHLT));
  zeilen.push("Bestellt von: " + besteller + (tel ? ", Tel. " + tel : ""));
  zeilen.push("Lieferung an: " + [anschrift.name || FEHLT, anschrift.strasse || FEHLT, anschrift.ort || FEHLT].join(", "));
  if (bis) zeilen.push("Gebraucht bis: " + bis);
  if (z.hatKleidung) {
    const t = bezahlText(konfig, b.kleidung, sponsor.firma);
    if (t) zeilen.push("Bezahlung Kleidung: " + t);
  }
  if (z.hatTeambedarf) {
    const t = bezahlText(konfig, b.teambedarf, sponsor.firma);
    if (t) zeilen.push("Bezahlung Teambedarf: " + t);
  }
  zeilen.push(...beschrifteteZeilen("Hinweis zur Bezahlung: ", bestellung.hinweisBezahlung));
  zeilen.push(...beschrifteteZeilen("Hinweis: ", bestellung.hinweis));
  zeilen.push("Bestell-Nr.: " + nr, "");

  // 1. Kleidung für den Lieferanten (die Nummern der Teile bleiben fest: Teil 1 leitet Melli weiter, Teil 3 nie)
  if (z.hatKleidung) {
    zeilen.push(`== 1. KLEIDUNG FÜR DEN LIEFERANTEN (${einst.lieferant}) ==`, "Dieser Teil kann so weitergeleitet werden.", "");
    zeilen.push("Lieferanschrift:", anschrift.name || FEHLT, anschrift.strasse || FEHLT, anschrift.ort || FEHLT, "");
    for (const block of z.bloecke) {
      zeilen.push(`${block.variante.bezeichnung} (${block.variante.nr})`);
      if (block.aufdrucke.length) zeilen.push("Druck: " + block.aufdrucke.map((c) => block.artikel.druckTexte[c]).join(", "));
      for (const g of block.groessen) {
        const bezeichnung = block.artikel.einheitsgroesse ? g.wert : "Gr. " + g.wert;
        zeilen.push(`- ${bezeichnung}: ${zahlwort(g.menge, "Stück", "Stück")}`);
      }
      zeilen.push("");
    }
    if (z.druck.length) {
      zeilen.push("Druckdaten je Stück:", ...z.druck.map(druckText), "");
    }
    zeilen.push(`Summe: ${zahlwort(z.teile, "Teil", "Teile")}`, "");
  }

  // 2. Teambedarf
  if (z.hatTeambedarf) {
    zeilen.push("== 2. TEAMBEDARF (Preis bitte beim Lieferanten erfragen) ==");
    for (const t of z.teambedarf) zeilen.push(`- ${t.n} × ${t.anzeige}` + (t.details ? ": " + t.details : ""));
    zeilen.push(...beschrifteteZeilen("- Sonstiges: ", z.sonstiges), "");
  }

  // 3. Nur intern: Angaben zum Sponsor für die Geschäftsstelle, Zuordnung je Person mit den Preisen laut Angebot
  const mitSponsor = sponsorAktiv(konfig, bestellung, z);
  if (z.hatKleidung || mitSponsor) {
    zeilen.push("== 3. NUR INTERN – NICHT WEITERLEITEN ==");
    if (mitSponsor) {
      zeilen.push("Sponsor (für die Geschäftsstelle):", "Firma: " + (sponsor.firma || FEHLT));
      if (sponsor.ansprechpartner) zeilen.push("Ansprechpartner: " + sponsor.ansprechpartner);
      if (sponsor.email) zeilen.push("E-Mail: " + sponsor.email);
      if (sponsor.telefon) zeilen.push("Telefon: " + sponsor.telefon);
      zeilen.push(...beschrifteteZeilen("Anschrift: ", sponsor.anschrift));
      const zuschlag = zuschlagSumme(konfig, [SPONSOR_AUFDRUCK]);
      if (z.sponsorStuecke > 0 && konfig.preise) {
        zeilen.push(`Sponsorlogo: ${zahlwort(z.sponsorStuecke, "Stück", "Stück")} × ${formatEuro(zuschlag)} = ${formatEuro(z.sponsorStuecke * zuschlag)}`);
      }
      zeilen.push("");
    }
    if (z.hatKleidung) {
      zeilen.push(`Zuordnung je Person (${preisQuelle(konfig)}):`);
      for (const p of z.personen) {
        const kopf = p.label + (p.nummer ? ", Nr. " + p.nummer : "") + (p.groesse ? ", Gr. " + p.groesse : "");
        const artikel = p.zeilen
          .map((x) => x.artikel.anzeige + (x.abweichend && x.groesse ? ` (Gr. ${x.groesse})` : "") + " " + (x.anfrage ? `(${PREIS_AUF_ANFRAGE})` : formatEuro(x.cent)))
          .join(", ");
        zeilen.push(`- ${kopf}: ${artikel} = ${summeText(p.summeCent, p.ohnePreis)}`);
      }
      zeilen.push(`Summe Kleidung: ${summeText(z.summeCent, z.ohnePreis)}`, "");
    }
  }

  zeilen.push("Viele Grüße", besteller, "", SCHLUSSZEILE);
  const text = zeilen.join("\n");
  // Die Adresse des Bestellers steht nie im Text: Nur der Link trägt sie (cc), das Mailprogramm zeigt sie in der Zeile „Cc“. Die Länge im Link zählt sie mit.
  const mailto = mailtoLink(einst.empfaenger, betreff, text, bestellung.email);
  return { betreff, text, mailto, mailtoLaenge: mailto.length, bestellNr: nr, zusammenfassung: z };
}

// Text für „Text kopieren“: der Betreff oben, dann der Mailtext (wer kein Mailprogramm hat, fügt beides in eine neue Mail oder Nachricht ein).
export function kopierText(mail) {
  return "Betreff: " + mail.betreff + "\n\n" + mail.text;
}

// ---------- Entwurf auf dem Gerät ----------

export function leererEntwurf() {
  return {
    team: "",
    name: "",
    tel: "",
    email: "",
    bis: "",
    lieferName: null,
    lieferStrasse: "",
    lieferOrt: "",
    personen: [],
    zaehler: 0,
    teambedarf: {},
    sonstiges: "",
    bezahlung: { kleidung: [], teambedarf: [] },
    sponsor: { firma: "", ansprechpartner: "", email: "", telefon: "", anschrift: "" },
    hinweisBezahlung: "",
    hinweis: "",
    bestellNr: "",
    status: "",
  };
}

// Macht aus gelesenen Daten (localStorage, evtl. alt, kaputt oder von Hand verändert) einen gültigen Entwurf:
// unbekannte Felder fallen weg, Texte werden gekürzt, Größen, Aufdrucke und Auswahlen müssen zum Katalog passen.
// Alte Entwürfe laden mit den Standard-Aufdrucken (keine Angabe heißt: Standard), der Sponsor aus den ersten Fassungen wird zur Firma.
export function bereinigeEntwurf(roh, konfig) {
  const k = katalogVon(konfig);
  const e = leererEntwurf();
  if (!roh || typeof roh !== "object" || Array.isArray(roh)) return e;
  const text = (v, max) => (typeof v === "string" ? v : "").replace(/\r\n?/g, "\n").slice(0, max);
  const objekt = (v) => (v && typeof v === "object" && !Array.isArray(v) ? v : {});

  e.team = (konfig.mannschaften || []).some((m) => m.slug === roh.team) ? roh.team : "";
  e.name = text(roh.name, GRENZEN.besteller);
  e.tel = text(roh.tel, GRENZEN.tel);
  // Alte Entwürfe kennen das Feld nicht (dann ""); was drinsteht, prüft erst ccAdresse, bevor es in einen Link kommt. Eine zu lange Angabe wird verworfen
  // statt gekürzt: Das Kürzen könnte eine andere, gültige Adresse daraus machen.
  e.email = typeof roh.email === "string" && roh.email.length <= GRENZEN.email ? text(roh.email, GRENZEN.email) : "";
  e.bis = datumDe(roh.bis) ? roh.bis : "";
  e.lieferName = typeof roh.lieferName === "string" ? text(roh.lieferName, GRENZEN.lieferName) : null;
  e.lieferStrasse = text(roh.lieferStrasse, GRENZEN.strasse);
  e.lieferOrt = text(roh.lieferOrt, GRENZEN.ort);
  e.sonstiges = text(roh.sonstiges, GRENZEN.sonstiges);
  e.hinweisBezahlung = text(roh.hinweisBezahlung, GRENZEN.hinweis);
  e.hinweis = text(roh.hinweis, GRENZEN.hinweis);

  const ids = new Set();
  let hoechste = 0;
  for (const p of (Array.isArray(roh.personen) ? roh.personen : []).slice(0, GRENZEN.personen)) {
    const q = objekt(p);
    let id = typeof q.id === "string" && /^p\d{1,6}$/.test(q.id) && !ids.has(q.id) ? q.id : "";
    if (id) hoechste = Math.max(hoechste, Number(id.slice(1)));
    const artikel = {};
    for (const a of k.artikel) {
      const wahl = objekt(q.artikel)[a.id];
      if (!wahl) continue;
      const g = typeof objekt(wahl).groesse === "string" ? wahl.groesse : "";
      const codes = Array.isArray(objekt(wahl).aufdrucke) ? a.aufdrucke.moeglich.filter((c) => wahl.aufdrucke.includes(c)) : a.aufdrucke.standard.slice();
      artikel[a.id] = { groesse: a.groessenNachWert.has(g) ? g : "", aufdrucke: codes };
    }
    e.personen.push({
      id,
      name: text(q.name, GRENZEN.person),
      nummer: text(q.nummer, GRENZEN.nummer + 1),
      groesse: k.gruppeNachGroesse.has(q.groesse) ? q.groesse : "",
      artikel,
      initialen: typeof q.initialen === "string" ? text(q.initialen, GRENZEN.initialen) : null,
    });
    if (id) ids.add(id);
  }
  // Personen ohne gültige Nummer bekommen eine neue
  let zaehler = Math.max(hoechste, Number.isInteger(roh.zaehler) && roh.zaehler > 0 ? Math.min(roh.zaehler, 999999) : 0);
  for (const p of e.personen) {
    if (!p.id) {
      zaehler += 1;
      p.id = "p" + zaehler;
    }
  }
  e.zaehler = zaehler;

  const tb = objekt(roh.teambedarf);
  for (const t of konfig.teambedarf || []) {
    const x = objekt(tb[t.id]);
    const n = ganzzahl(x.n);
    const details = text(x.details, GRENZEN.details);
    if (n > 0 || details) e.teambedarf[t.id] = { n, details };
  }

  // Bezahlung: je Block eine Liste von ids (Katalogreihenfolge). Entwürfe aus der ersten Fassung (ein Text je Block) laden mit:
  // "" › [], "eltern" › ["eltern"]; unbekannte ids fallen weg.
  const b = objekt(roh.bezahlung);
  e.bezahlung = { kleidung: bezahlungIds(konfig, b.kleidung), teambedarf: bezahlungIds(konfig, b.teambedarf) };

  // Sponsor: der Block „Sponsor“. Entwürfe mit „kleidungSponsor“ oder „teambedarfSponsor“ (ein Name je Block) werden zur Firma, bei zwei
  // Namen gewinnt die Kleidung; eine eigene Firma im Block geht vor.
  const s = objekt(roh.sponsor);
  const alteFirma = [b.kleidungSponsor, b.teambedarfSponsor].map((v) => text(v, GRENZEN.firma)).find((v) => einzeilig(v) !== "") || "";
  const eigeneFirma = text(s.firma, GRENZEN.firma);
  e.sponsor = {
    firma: einzeilig(eigeneFirma) !== "" ? eigeneFirma : alteFirma,
    ansprechpartner: text(s.ansprechpartner, GRENZEN.ansprechpartner),
    email: text(s.email, GRENZEN.sponsorEmail),
    telefon: text(s.telefon, GRENZEN.sponsorTel),
    anschrift: text(s.anschrift, GRENZEN.anschrift),
  };

  e.bestellNr = typeof roh.bestellNr === "string" && /^[A-Z0-9-]{1,40}-\d{6}-\d{4}$/.test(roh.bestellNr) ? roh.bestellNr : "";
  e.status = e.bestellNr && (roh.status === "mail" || roh.status === "kopiert") ? roh.status : "";
  return e;
}
