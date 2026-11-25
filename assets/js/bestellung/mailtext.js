/*
  Bestellseite für Trainer (Prototyp) – reine Funktionen ohne DOM.

  Aus den Eingaben einer Trainerin oder eines Trainers entsteht hier alles, was die Seite braucht:
  Prüfung der Eingaben (Liste der Lücken), Zusammenfassung je Artikel, Variante und Größe,
  Betreff, Mailtext, mailto-Adresse und Bestell-Nr. Die Uhrzeit wird immer als Parameter
  übergeben (Date), damit alles ohne Browser testbar ist (tools/bestellung-test/).

  Die Seite (seite.js) benutzt dieselben Funktionen für Vorschau, Prüfung und Senden:
  Was in „Mail ansehen“ steht, ist genau der Text, der im Mailprogramm ankommt.

  Datengrundlage: data/bestellung.json (Katalog, Größen, Schnellwahl, Teambedarf, Bezahlung,
  Einstellungen) plus die Mannschaften aus data/teams.json. Beides kommt als „konfig“ in die Seite
  (src/seiten/bestellung.mjs › baueKonfig). Es stehen nur Preise für Eltern bzw. Spieler darin.

  Aufbau der Eingaben („bestellung“, so liegt auch der Entwurf auf dem Gerät):
    {
      team: "d3",                    // slug der Mannschaft
      name: "Lena Beispiel", tel: "", bis: "2027-01-15",
      personen: [ { id: "p1", name: "Mia", nummer: "7", groesse: "140",
                    artikel: { trikot: { groesse: "" }, "praesi-hose": { groesse: "152" } },
                    initialen: null } ],          // artikel: ausgewählte Artikel, groesse "" = Vorauswahl
      zaehler: 1,                    // für neue Personen-Nummern (p1, p2, …)
      teambedarf: { baelle: { n: 10, details: "Größe 4" } },
      sonstiges: "",
      bezahlung: { kleidung: "eltern", kleidungSponsor: "", teambedarf: "vereinskasse", teambedarfSponsor: "" },
      hinweisBezahlung: "", hinweis: "",
      bestellNr: "", status: ""      // status: "" | "mail" | "kopiert" (nach dem ersten erfolgreichen Senden)
    }
*/

// ---------- Konstanten ----------

// Ab dieser Länge der mailto-Adresse weist die Seite auf „Text kopieren“ hin. Gekürzt wird nie.
export const MAILTO_LAENGE_MAX = 7500;

export const SCHLUSSZEILE = "Erstellt mit der Bestellseite für Trainer (Prototyp).";

// Platzhalter in der Vorschau, solange etwas fehlt. In einer Mail, die gesendet werden darf (keine Lücken), kommt er nie vor.
export const FEHLT = "(fehlt noch)";

// Längen der Eingabefelder (maxlength in der Seite, Kürzung beim Laden eines Entwurfs).
export const GRENZEN = {
  besteller: 60,
  tel: 30,
  person: 40,
  nummer: 2,
  initialen: 4,
  details: 100,
  sponsor: 80,
  sonstiges: 600,
  hinweis: 400,
  personen: 60,
  anzahl: 999,
};

const GRUPPEN = ["kinder", "erwachsene"];
const EINZELDRUCK = ["nummer", "name-nummer", "initialen"];

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

// Betrag in Cent als Text: ganze Euro „120 €“, mit Nachkommastellen „12,50 €“, Tausenderpunkt ab 1.000 €.
export function formatEuro(cent) {
  const c = Math.round(Number(cent) || 0);
  const euro = Math.floor(c / 100);
  const rest = c % 100;
  const mitPunkt = String(euro).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return (rest === 0 ? mitPunkt : mitPunkt + "," + zweistellig(rest)) + " €";
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

    // Preise (Euro in der Datei, Cent hier): eine Zahl für alle oder je Gruppe
    const preisCent = {};
    if (typeof roh.preis === "number") {
      for (const g of [...GRUPPEN, "alle"]) preisCent[g] = Math.round(roh.preis * 100);
    } else if (roh.preis && typeof roh.preis === "object") {
      for (const g of GRUPPEN) {
        if (typeof roh.preis[g] === "number") preisCent[g] = Math.round(roh.preis[g] * 100);
      }
    }
    for (const g of gruppenImArtikel) {
      if (typeof preisCent[g] !== "number" || !(preisCent[g] >= 0)) fehler(`${id}: Preis für „${g}“ fehlt`);
    }

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

    // Veredelungen als Text, in der Reihenfolge der Datei
    const druck = (roh.veredelung || []).map((code) => {
      if (!veredelungen[code]) fehler(`${id}: Veredelung „${code}“ ist nicht in veredelungen erklärt`);
      return String(veredelungen[code]);
    });
    const einzeldruck = roh.einzeldruck || null;
    if (einzeldruck !== null && !EINZELDRUCK.includes(einzeldruck)) fehler(`${id}: einzeldruck „${einzeldruck}“ unbekannt`);

    const eintrag = {
      id,
      index,
      anzeige: String(roh.anzeige),
      beschreibung: String(roh.beschreibung || ""),
      groessen,
      groessenNachWert: nachWert,
      gruppiert,
      einheitsgroesse: roh.einheitsgroesse === true,
      vorauswahl: roh.vorauswahl && typeof roh.vorauswahl === "object" ? roh.vorauswahl : {},
      hinweis: String(roh.hinweis || ""),
      preisCent,
      lieferant,
      druck,
      einzeldruck,
    };
    for (const wert of Object.values(eintrag.vorauswahl)) {
      if (!nachWert.has(wert)) fehler(`${id}: Vorauswahl „${wert}“ ist keine Größe des Artikels`);
    }
    artikel.push(eintrag);
    nachId.set(id, eintrag);
  });

  return { artikel, nachId, gruppeNachGroesse };
}

// Prüft die ganze Konfiguration der Seite (Katalog, Schnellwahl, Teambedarf, Bezahlung, Einstellungen, Mannschaften).
// Wirft bei einem Fehler; der Bau (src/seiten/bestellung.mjs) bricht dann ab, statt eine kaputte Seite zu liefern.
export function pruefeKonfig(konfig) {
  const fehler = (text) => {
    throw new Error("Bestellseite: " + text);
  };
  const k = katalogVon(konfig);
  const einst = konfig.einstellungen || {};
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(einst.empfaenger || ""))) fehler("einstellungen.empfaenger ist keine Mailadresse");
  if (typeof einst.pruefmodus !== "boolean") fehler("einstellungen.pruefmodus muss true oder false sein");
  if (!einst.preisstand) fehler("einstellungen.preisstand fehlt");
  if (!einst.lieferant) fehler("einstellungen.lieferant fehlt");
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

// ---------- Größen, Preise, Vorauswahl ----------

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

// Preis (Cent) eines Artikels in einer Größe; null, wenn die Größe fehlt oder nicht zum Artikel gehört.
export function preisCent(konfig, artikelId, groesse) {
  const a = katalogVon(konfig).nachId.get(artikelId);
  const e = a ? a.groessenNachWert.get(String(groesse || "")) : null;
  return e ? a.preisCent[e.gruppe] : null;
}

// Preis für die Anzeige. Ohne Größe: gleicher Preis für alle › „20 €“, sonst „ab 30 €“.
export function preisText(konfig, artikelId, groesse) {
  const cent = preisCent(konfig, artikelId, groesse);
  if (cent !== null) return formatEuro(cent);
  const a = katalogVon(konfig).nachId.get(artikelId);
  if (!a) return "";
  const werte = [...new Set(a.groessen.map((e) => a.preisCent[e.gruppe]))];
  return werte.length === 1 ? formatEuro(werte[0]) : "ab " + formatEuro(Math.min(...werte));
}

// Schnellwahl auf eine Person anwenden: schaltet die Artikel der Schnellwahl ein (nichts wird abgewählt).
export function schnellwahlAnwenden(konfig, person, schnellwahlId) {
  const s = (konfig.schnellwahl || []).find((x) => x.id === schnellwahlId);
  if (!s) return person;
  if (!person.artikel || typeof person.artikel !== "object") person.artikel = {};
  for (const id of s.artikel) if (!person.artikel[id]) person.artikel[id] = { groesse: "" };
  return person;
}

// ---------- Zusammenfassung ----------

// Alles, was aus den Eingaben folgt, in einer Form, die Prüfung, Mailtext und Seite gemeinsam benutzen:
//   personen   Personen mit mindestens einem Artikel: zeilen (Artikel, Größe, abweichend von der Vorauswahl, Cent), Summe, Teile
//   bloecke    Zeilen für den Lieferanten: je Artikel und Variante (Kinder, Erwachsene, „alle“) die Menge je Größe
//   druck      Stücke mit Einzeldruck (sortiert: Katalog, Größe, Nummer, Name)
//   teile, summeCent, hatKleidung
//   teambedarf (Anzahl > 0), sonstiges, hatTeambedarf
export function zusammenfassung(konfig, bestellung) {
  const k = katalogVon(konfig);
  const personen = [];
  const bloeckeNachSchluessel = new Map();
  const druck = [];
  let teile = 0;
  let summeCent = 0;

  (bestellung.personen || []).forEach((p, index) => {
    const gewaehlt = k.artikel.filter((a) => p.artikel && p.artikel[a.id]);
    if (gewaehlt.length === 0) return;
    const nummer = pruefeNummer(p.nummer);
    const name = einzeilig(p.name);
    const zeilen = [];
    let personCent = 0;
    for (const a of gewaehlt) {
      const groesse = artikelGroesse(konfig, p, a.id);
      const auto = vorauswahlGroesse(konfig, a.id, p.groesse);
      const eintrag = a.groessenNachWert.get(groesse) || null;
      const cent = eintrag ? a.preisCent[eintrag.gruppe] : 0;
      const variante = eintrag ? a.lieferant.find((v) => v.fuer === eintrag.gruppe || v.fuer === "alle") : null;
      zeilen.push({ artikel: a, groesse, abweichend: groesse !== auto, cent, variante });
      personCent += cent;
      teile += 1;
      if (!eintrag) continue;
      const schluessel = a.id + "|" + variante.fuer;
      let block = bloeckeNachSchluessel.get(schluessel);
      if (!block) {
        block = { artikel: a, variante, menge: 0, mengen: new Map() };
        bloeckeNachSchluessel.set(schluessel, block);
      }
      block.menge += 1;
      block.mengen.set(groesse, (block.mengen.get(groesse) || 0) + 1);
      if (a.einzeldruck) {
        druck.push({
          artikel: a,
          variante,
          groesse,
          groesseIndex: eintrag.index,
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
      teile: zeilen.length,
    });
  });

  // Blöcke für den Lieferanten: Katalogreihenfolge, je Variante erst Kinder, dann Erwachsene; Größen in Leiterreihenfolge
  const bloecke = [];
  for (const a of k.artikel) {
    for (const v of a.lieferant) {
      const block = bloeckeNachSchluessel.get(a.id + "|" + v.fuer);
      if (!block) continue;
      const groessen = [...block.mengen.entries()]
        .sort((x, y) => a.groessenNachWert.get(x[0]).index - a.groessenNachWert.get(y[0]).index)
        .map(([wert, menge]) => ({ wert, menge }));
      bloecke.push({ artikel: a, variante: v, menge: block.menge, groessen });
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
    hatKleidung: teile > 0,
    teambedarf,
    sonstiges,
    hatTeambedarf: teambedarf.length > 0 || sonstiges !== "",
  };
}

// ---------- Prüfung: Liste der Lücken ----------

// Was fehlt, bevor die Bestellung gesendet werden darf? Liste von { feld, text } in der Reihenfolge der Seite (leer = alles da).
// „feld“ nennt das Eingabefeld, zu dem die Seite springt: team, name, leer, p:<id>:name|groesse|nummer|initialen|a:<artikel>,
// bezahlung:kleidung|teambedarf, sponsor:kleidung|teambedarf. Personen ohne Artikel zählen nicht.
export function pruefeBestellung(konfig, bestellung) {
  const luecken = [];
  const melde = (feld, text) => luecken.push({ feld, text });
  const z = zusammenfassung(konfig, bestellung);

  if (!(konfig.mannschaften || []).some((m) => m.slug === bestellung.team)) melde("team", "Bitte wähle deine Mannschaft aus");
  if (einzeilig(bestellung.name) === "") melde("name", "Bitte trage deinen Namen ein");
  if (!z.hatKleidung && !z.hatTeambedarf) {
    melde("leer", "Du hast noch nichts ausgewählt: Füge eine Person mit Kleidung hinzu oder wähle Teambedarf");
  }

  for (const p of z.personen) {
    const id = p.person.id;
    if (p.name === "") melde(`p:${id}:name`, `Bei ${p.label} fehlt der Name`);
    if (gruppeDerGroesse(konfig, p.groesse) === "") melde(`p:${id}:groesse`, `Bei ${p.label} fehlt die Größe`);
    const nummer = pruefeNummer(p.person.nummer);
    const brauchtNummer = p.zeilen
      .filter((x) => x.artikel.einzeldruck === "nummer" || x.artikel.einzeldruck === "name-nummer")
      .map((x) => x.artikel.anzeige);
    if (nummer.art === "ungueltig") {
      melde(`p:${id}:nummer`, `Bei ${p.label} ist die Rückennummer ungültig (nur 1 bis 99)`);
    } else if (nummer.art === "leer" && brauchtNummer.length) {
      melde(`p:${id}:nummer`, `Bei ${p.label} fehlt die Rückennummer (${brauchtNummer.join(", ")})`);
    }
    if (p.zeilen.some((x) => x.artikel.einzeldruck === "initialen") && einzeilig(effektiveInitialen(p.person)) === "") {
      melde(`p:${id}:initialen`, `Bei ${p.label} fehlen die Initialen (${p.zeilen.filter((x) => x.artikel.einzeldruck === "initialen").map((x) => x.artikel.anzeige).join(", ")})`);
    }
    // Größe je Artikel: nur wenn die Größe der Person gewählt ist, aber ein Artikel trotzdem keine bekommt
    if (gruppeDerGroesse(konfig, p.groesse) !== "") {
      for (const x of p.zeilen) {
        if (!x.variante) melde(`p:${id}:a:${x.artikel.id}`, `Bei ${p.label} fehlt die Größe für ${x.artikel.anzeige}`);
      }
    }
  }

  const pruefeBezahlung = (block, anzeigeFrage, anzeigeKlammer, wahl, sponsor) => {
    const opt = (konfig.bezahlung || []).find((o) => o.id === wahl);
    if (!opt) {
      melde(`bezahlung:${block}`, `Bitte wähle, wer ${anzeigeFrage} zahlt`);
    } else if (opt.mitName && einzeilig(sponsor) === "") {
      melde(`sponsor:${block}`, `Bitte trage den Namen des Sponsors ein (${anzeigeKlammer})`);
    }
  };
  const b = bestellung.bezahlung || {};
  if (z.hatKleidung) pruefeBezahlung("kleidung", "die Kleidung", "Kleidung", b.kleidung, b.kleidungSponsor);
  if (z.hatTeambedarf) pruefeBezahlung("teambedarf", "den Teambedarf", "Teambedarf", b.teambedarf, b.teambedarfSponsor);

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

// mailto-Adresse: Betreff und Text mit encodeURIComponent, Zeilenumbrüche als %0D%0A (RFC 6068); die Adresse bleibt, wie sie ist.
export function mailtoLink(empfaenger, betreff, text) {
  const kodiere = (t) => encodeURIComponent(String(t).replace(/\r?\n/g, "\r\n"));
  return "mailto:" + empfaenger + "?subject=" + kodiere(betreff) + "&body=" + kodiere(text);
}

function bezahlText(konfig, wahl, sponsor) {
  const opt = (konfig.bezahlung || []).find((o) => o.id === wahl);
  if (!opt) return "";
  if (opt.mitName) {
    const name = einzeilig(sponsor);
    return name ? opt.text + ": " + name : opt.text;
  }
  return opt.text;
}

function druckText(d) {
  const nr = d.nummer === "" ? FEHLT : d.nummer;
  const name = d.name === "" ? FEHLT : d.name;
  const ini = d.initialen === "" ? FEHLT : d.initialen;
  const form = d.artikel.einzeldruck === "nummer" ? `Nr. ${nr}` : d.artikel.einzeldruck === "name-nummer" ? `Name „${name}“, Nr. ${nr}` : `Initialen „${ini}“`;
  return `- ${d.artikel.anzeige} ${d.variante.nr}, Gr. ${d.groesse}: ${form}`;
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
  if (bis) zeilen.push("Gebraucht bis: " + bis);
  if (z.hatKleidung) {
    const t = bezahlText(konfig, b.kleidung, b.kleidungSponsor);
    if (t) zeilen.push("Bezahlung Kleidung: " + t);
  }
  if (z.hatTeambedarf) {
    const t = bezahlText(konfig, b.teambedarf, b.teambedarfSponsor);
    if (t) zeilen.push("Bezahlung Teambedarf: " + t);
  }
  zeilen.push(...beschrifteteZeilen("Hinweis zur Bezahlung: ", bestellung.hinweisBezahlung));
  zeilen.push(...beschrifteteZeilen("Hinweis: ", bestellung.hinweis));
  zeilen.push("Bestell-Nr.: " + nr, "");

  // 1. Kleidung für den Lieferanten (die Nummern der Teile bleiben fest: Teil 1 leitet Melli weiter, Teil 3 nie)
  if (z.hatKleidung) {
    zeilen.push(`== 1. KLEIDUNG FÜR DEN LIEFERANTEN (${einst.lieferant}) ==`, "Dieser Teil kann so weitergeleitet werden.", "");
    for (const block of z.bloecke) {
      zeilen.push(`${block.variante.bezeichnung} (${block.variante.nr})`);
      if (block.artikel.druck.length) zeilen.push("Druck: " + block.artikel.druck.join(", "));
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

  // 3. Nur intern: Zuordnung je Person mit den Preisen für Eltern bzw. Spieler
  if (z.hatKleidung) {
    zeilen.push("== 3. NUR INTERN – NICHT WEITERLEITEN ==", `Zuordnung je Person (Preise für Eltern bzw. Spieler, Stand ${einst.preisstand}):`);
    for (const p of z.personen) {
      const kopf = p.label + (p.nummer ? ", Nr. " + p.nummer : "") + (p.groesse ? ", Gr. " + p.groesse : "");
      const artikel = p.zeilen.map((x) => x.artikel.anzeige + (x.abweichend && x.groesse ? ` (Gr. ${x.groesse})` : "")).join(", ");
      zeilen.push(`- ${kopf}: ${artikel} = ${formatEuro(p.summeCent)}`);
    }
    zeilen.push(`Summe Kleidung: ${formatEuro(z.summeCent)}`, "");
  }

  zeilen.push("Viele Grüße", besteller, "", SCHLUSSZEILE);
  const text = zeilen.join("\n");
  const mailto = mailtoLink(einst.empfaenger, betreff, text);
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
    bis: "",
    personen: [],
    zaehler: 0,
    teambedarf: {},
    sonstiges: "",
    bezahlung: { kleidung: "", kleidungSponsor: "", teambedarf: "", teambedarfSponsor: "" },
    hinweisBezahlung: "",
    hinweis: "",
    bestellNr: "",
    status: "",
  };
}

// Macht aus gelesenen Daten (localStorage, evtl. alt, kaputt oder von Hand verändert) einen gültigen Entwurf:
// unbekannte Felder fallen weg, Texte werden gekürzt, Größen und Auswahlen müssen zum Katalog passen.
export function bereinigeEntwurf(roh, konfig) {
  const k = katalogVon(konfig);
  const e = leererEntwurf();
  if (!roh || typeof roh !== "object" || Array.isArray(roh)) return e;
  const text = (v, max) => (typeof v === "string" ? v : "").replace(/\r\n?/g, "\n").slice(0, max);
  const objekt = (v) => (v && typeof v === "object" && !Array.isArray(v) ? v : {});

  e.team = (konfig.mannschaften || []).some((m) => m.slug === roh.team) ? roh.team : "";
  e.name = text(roh.name, GRENZEN.besteller);
  e.tel = text(roh.tel, GRENZEN.tel);
  e.bis = datumDe(roh.bis) ? roh.bis : "";
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
      artikel[a.id] = { groesse: a.groessenNachWert.has(g) ? g : "" };
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

  const b = objekt(roh.bezahlung);
  const bekannt = (v) => ((konfig.bezahlung || []).some((o) => o.id === v) ? v : "");
  e.bezahlung = {
    kleidung: bekannt(b.kleidung),
    kleidungSponsor: text(b.kleidungSponsor, GRENZEN.sponsor),
    teambedarf: bekannt(b.teambedarf),
    teambedarfSponsor: text(b.teambedarfSponsor, GRENZEN.sponsor),
  };

  e.bestellNr = typeof roh.bestellNr === "string" && /^[A-Z0-9-]{1,40}-\d{6}-\d{4}$/.test(roh.bestellNr) ? roh.bestellNr : "";
  e.status = e.bestellNr && (roh.status === "mail" || roh.status === "kopiert") ? roh.status : "";
  return e;
}
