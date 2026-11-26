/*
  Bestellung für dein Team (Prototyp) – Oberfläche.

  Die Hülle der Seite baut src/seiten/bestellung.mjs: Kopf, Prototyp-Hinweis und die Zugangsbox, dazu die Konfiguration (#bestellung-konfig)
  samt verschlüsseltem Preispaket. Ohne Code sieht man nur das. Dieses Skript

    1. nimmt den Code aus dem Feld, aus dem Link (?code=…, danach entfernt history.replaceState den Parameter aus der Adresse) oder vom
       Gerät (ein richtiger Code wird unter speuzer-bestellung-v1-code gemerkt),
    2. entschlüsselt damit die Preise (zugang.js; ein falscher Code zeigt „Der Code stimmt nicht …“),
    3. setzt erst dann das Formular in die Seite (formular.js; alle Texte mit Preisen und Rabatt entstehen erst hier) und startet die
       eigentliche Oberfläche: Karten je Person, Zustand, Speichern auf dem Gerät, Prüfung und Senden per mailto.
  „Code auf diesem Gerät vergessen“ unten im Formular schließt die Seite wieder.

  Betreff, Text, Prüfung, Preise und Bestell-Nr. kommen aus mailtext.js (reine Funktionen, ohne DOM).

  Es gibt keinen Server: Der Entwurf liegt in localStorage (Schlüssel speuzer-bestellung-v1-entwurf; Mannschaft, Name, Telefon und
  Lieferanschrift zusätzlich unter speuzer-bestellung-v1-absender). Jeder Zugriff darauf steht in try/catch, die Seite funktioniert
  auch ohne Speicher. Nur statische Importe (nie ein dynamischer Import zur Laufzeit): Safari merkt sich einen gescheiterten
  dynamischen Import für die ganze Sitzung.

  Aufbau der Oberfläche: Die Felder werden einmal gebaut und danach nur noch aus dem Zustand nachgeführt (aktualisiere); so bleibt der Fokus
  beim Tippen, wo er ist. Ein Eingabefeld mit Fokus wird nie von außen überschrieben.
*/

import {
  GRENZEN,
  MAILTO_LAENGE_MAX,
  artikelAufdrucke,
  artikelGroesse,
  baueMail,
  bereinigeEntwurf,
  bezahlungIds,
  druckBedarf,
  ganzzahl,
  initialenVorschlag,
  katalogVon,
  kopierText,
  leererEntwurf,
  mitPreisen,
  preisText,
  preisZeile,
  pruefeBestellung,
  schnellwahlAnwenden,
  sponsorAktiv,
  summeText,
  vorauswahlGroesse,
  vorauswahlHinweis,
  waehleBestellNr,
  zahlwort,
  zusammenfassung,
  zuschlagText,
} from "./mailtext.js";
import { ZugangFehler, entschluessele, normalisiereCode, pruefePaket } from "./zugang.js";
import { baueFormular, esc } from "./formular.js";

const SCHLUESSEL_ENTWURF = "speuzer-bestellung-v1-entwurf";
const SCHLUESSEL_ABSENDER = "speuzer-bestellung-v1-absender";
const SCHLUESSEL_CODE = "speuzer-bestellung-v1-code";

const TEXT_WARTEN = "Einen Moment …";
const TEXT_CODE_FALSCH = "Der Code stimmt nicht. Bitte prüf ihn oder frag im Vorstand nach.";
const TEXT_CODE_LEER = "Bitte gib den Code ein.";
const TEXT_CODE_ALT = "Der gemerkte Code passt nicht mehr. Bitte gib den Code ein, den du vom Verein bekommen hast.";
const TEXT_DATEN_DEFEKT = "Die Preisdaten dieser Seite sind beschädigt oder unvollständig. Bitte sag im Vorstand Bescheid.";

// ---------- Speicher auf dem Gerät (jeder Zugriff in try/catch) ----------

const speicher = {
  lies(schluessel) {
    try {
      return window.localStorage.getItem(schluessel);
    } catch (e) {
      return null;
    }
  },
  schreibe(schluessel, wert) {
    try {
      window.localStorage.setItem(schluessel, wert);
      return true;
    } catch (e) {
      return false;
    }
  },
  loesche(schluessel) {
    try {
      window.localStorage.removeItem(schluessel);
      return true;
    } catch (e) {
      return false;
    }
  },
};

function leseJson(schluessel) {
  const roh = speicher.lies(schluessel);
  if (!roh) return null;
  try {
    return JSON.parse(roh);
  } catch (e) {
    return null;
  }
}

// ---------- Start: Zugang ----------

// Der Code steht nach dem Lesen nicht mehr in der Adresse (und damit nicht im Verlauf oder in einer weitergegebenen Adresse).
function entferneCodeAusAdresse() {
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete("code");
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
  } catch (e) {
    /* ohne Verlauf bleibt die Adresse, wie sie ist */
  }
}

function start() {
  const wurzel = document.getElementById("bestellung");
  const konfigKnoten = document.getElementById("bestellung-konfig");
  if (!wurzel || !konfigKnoten) return;
  const zugang = wurzel.querySelector("[data-bst-zugang]");
  const app = wurzel.querySelector("[data-bst-app]");
  if (!zugang || !app) return;

  let konfig;
  try {
    konfig = JSON.parse(konfigKnoten.textContent || "");
    katalogVon(konfig);
  } catch (e) {
    const fehler = wurzel.querySelector("[data-bst-ladefehler]");
    if (fehler) fehler.hidden = false;
    zugang.hidden = true;
    wurzel.dataset.zustand = "fehler";
    return;
  }

  const feld = zugang.querySelector("[data-bst-code]");
  const knopf = zugang.querySelector("[data-bst-oeffnen]");
  const meldung = zugang.querySelector("[data-bst-zugang-meldung]");
  const formular = zugang.querySelector("[data-bst-zugang-form]");
  const titel = document.getElementById("bst-titel");
  let prueft = false;

  function zustand(z) {
    wurzel.dataset.zustand = z;
  }

  // art: "info" (Einen Moment …) oder "fehler"; ohne Text verschwindet die Meldung (CSS: :empty)
  function zeigeMeldung(text, art) {
    meldung.textContent = text;
    meldung.classList.toggle("bst-zugang__meldung--fehler", art === "fehler" && text !== "");
  }

  function sperre(an) {
    prueft = an;
    knopf.disabled = an;
    feld.readOnly = an;
  }

  // Das Formular setzen und die Oberfläche starten. Danach ist die Zugangsbox weg.
  function zeigeApp(konfigMitPreisen, mitFokus) {
    app.innerHTML = baueFormular(konfigMitPreisen);
    app.hidden = false;
    zugang.hidden = true;
    zeigeMeldung("", "info");
    feld.value = "";
    zustand("offen");
    starteApp(app, konfigMitPreisen, { vergessen });
    if (mitFokus) {
      window.scrollTo(0, 0);
      if (titel) titel.focus({ preventScroll: true });
    }
  }

  // „Code auf diesem Gerät vergessen“: der Code ist weg, das Formular auch, die Zugangsbox ist wieder da. Der Entwurf bleibt auf dem Gerät.
  function vergessen() {
    speicher.loesche(SCHLUESSEL_CODE);
    app.textContent = "";
    app.hidden = true;
    zugang.hidden = false;
    feld.value = "";
    zeigeMeldung("", "info");
    sperre(false);
    zustand("zu");
    feld.focus();
  }

  // Versucht den Code. quelle: "eingabe" (Feld), "link" (?code=) oder "gemerkt" (vom Gerät). Gibt zurück, ob die Seite jetzt offen ist.
  async function oeffnen(code, quelle) {
    if (prueft) return false;
    sperre(true);
    zustand("pruefe");
    zeigeMeldung(TEXT_WARTEN, "info");
    let preise;
    try {
      preise = await entschluessele(konfig.preiseVerschluesselt, code);
    } catch (e) {
      sperre(false);
      zustand("zu");
      if (e instanceof ZugangFehler && e.art === "code") {
        if (quelle === "gemerkt") {
          speicher.loesche(SCHLUESSEL_CODE); // der Code wurde ausgetauscht: nicht noch einmal versuchen
          zeigeMeldung(TEXT_CODE_ALT, "fehler");
        } else {
          zeigeMeldung(TEXT_CODE_FALSCH, "fehler");
        }
      } else if (e instanceof ZugangFehler && e.art === "technik") {
        zeigeMeldung(e.message, "fehler");
      } else {
        zeigeMeldung(TEXT_DATEN_DEFEKT, "fehler");
      }
      return false;
    }
    let mitPreis;
    try {
      mitPreis = mitPreisen(konfig, preise);
    } catch (e) {
      sperre(false);
      zustand("zu");
      zeigeMeldung(TEXT_DATEN_DEFEKT, "fehler");
      return false;
    }
    if (quelle !== "gemerkt") speicher.schreibe(SCHLUESSEL_CODE, normalisiereCode(code));
    sperre(false);
    try {
      zeigeApp(mitPreis, quelle === "eingabe");
    } catch (e) {
      // Ein Fehler beim Aufbau darf nicht als leere Seite enden: Hinweis zeigen, den Fehler aber weitergeben (er soll auffallen).
      const fehler = wurzel.querySelector("[data-bst-ladefehler]");
      if (fehler) fehler.hidden = false;
      app.textContent = "";
      app.hidden = true;
      zugang.hidden = true;
      zustand("fehler");
      throw e;
    }
    return true;
  }

  formular.addEventListener("submit", (e) => {
    e.preventDefault();
    if (prueft) return;
    if (normalisiereCode(feld.value) === "") {
      zeigeMeldung(TEXT_CODE_LEER, "fehler");
      feld.focus();
      return;
    }
    oeffnen(feld.value, "eingabe");
  });

  // Der Code aus dem Link hat Vorrang; die Adresse verliert den Parameter in jedem Fall (auch bei falschem Code).
  const suche = new URLSearchParams(window.location.search);
  const ausLink = suche.get("code");
  if (suche.has("code")) entferneCodeAusAdresse();

  // Ist das Paket der Preisdaten schon in der Form kaputt (oder gar nicht da), zeigt die Seite gleich den Hinweis; der Code hilft dann nicht.
  let paketFehler = null;
  try {
    pruefePaket(konfig.preiseVerschluesselt);
  } catch (e) {
    paketFehler = e;
  }
  if (paketFehler) {
    feld.disabled = true;
    knopf.disabled = true;
    zeigeMeldung(TEXT_DATEN_DEFEKT, "fehler");
    zustand("defekt");
    wurzel.setAttribute("data-bereit", "");
    return;
  }

  const gemerkt = speicher.lies(SCHLUESSEL_CODE);
  const versuch = ausLink ? oeffnen(ausLink, "link") : gemerkt ? oeffnen(gemerkt, "gemerkt") : Promise.resolve(false);
  versuch.finally(() => wurzel.setAttribute("data-bereit", ""));
}

// ---------- Die Oberfläche (nach dem Entschlüsseln) ----------

// app: der Platz in der Hülle, in dem baueFormular() das Formular gesetzt hat. konfig trägt die Preise (konfig.preise).
// haken.vergessen: wird vom Knopf „Code auf diesem Gerät vergessen“ aufgerufen.
function starteApp(app, konfig, haken) {
  const katalog = katalogVon(konfig);
  const empfaenger = konfig.einstellungen.empfaenger;
  const TEXT_MAIL = `Dein Mailprogramm öffnet sich mit der fertigen Mail. Tippe dort auf „Senden“. Öffnet sich nichts? Dann „Text kopieren“ und an ${empfaenger} schicken.`;
  const TEXT_KOPIERT = `Der Text ist kopiert. Füge ihn in eine neue Mail an ${empfaenger} ein und tippe dort auf „Senden“.`;

  const $ = (auswahl, ort) => (ort || app).querySelector(auswahl);
  const form = $("#bst-form");
  const el = {
    titel: document.getElementById("bst-titel"),
    personen: $("#bst-personen"),
    keine: $("#bst-keine"),
    neu: $("#bst-person-neu"),
    teamListe: $(".bst-posten-liste"),
    bezahlungLeer: $("[data-bst-bezahlung-leer]"),
    sponsor: $("[data-bst-sponsorblock]"),
    luecken: $("[data-bst-luecken]"),
    lueckenListe: $("[data-bst-luecken-liste]"),
    senden: $("[data-bst-senden]"),
    kopieren: $("[data-bst-kopieren]"),
    lang: $("[data-bst-lang]"),
    meldung: $("[data-bst-meldung]"),
    gesendet: $("[data-bst-gesendet]"),
    gesendetText: $("[data-bst-gesendet-text]"),
    nr: $("[data-bst-nr]"),
    vorschau: $("[data-bst-vorschau]"),
    betreff: $("[data-bst-betreff]"),
    vorschauText: $("[data-bst-vorschau-text]"),
    speicher: $("[data-bst-speicher]"),
    vergessen: $("[data-bst-vergessen]"),
  };

  const jetzt = () => new Date();

  // Zustand: der Entwurf (bleibt auf dem Gerät) und was nur die Anzeige betrifft
  let zustand = ladeEntwurf();
  const ui = { zeigeLuecken: false, meldung: "", lueckenHtml: "", speicherFehler: false };

  function ladeEntwurf() {
    const e = bereinigeEntwurf(leseJson(SCHLUESSEL_ENTWURF), konfig);
    const absender = leseJson(SCHLUESSEL_ABSENDER);
    if (absender && typeof absender === "object") {
      if (!e.team && konfig.mannschaften.some((m) => m.slug === absender.team)) e.team = absender.team;
      if (!e.name && typeof absender.name === "string") e.name = absender.name.slice(0, GRENZEN.besteller);
      if (!e.tel && typeof absender.tel === "string") e.tel = absender.tel.slice(0, GRENZEN.tel);
      if (e.lieferName === null && typeof absender.lieferName === "string") e.lieferName = absender.lieferName.slice(0, GRENZEN.lieferName);
      if (!e.lieferStrasse && typeof absender.lieferStrasse === "string") e.lieferStrasse = absender.lieferStrasse.slice(0, GRENZEN.strasse);
      if (!e.lieferOrt && typeof absender.lieferOrt === "string") e.lieferOrt = absender.lieferOrt.slice(0, GRENZEN.ort);
    }
    return e;
  }

  // Der Absender (Mannschaft, Name, Telefon, Lieferanschrift) bleibt auch nach „Neue Bestellung beginnen“.
  function absenderVon(z) {
    return { team: z.team, name: z.name, tel: z.tel, lieferName: z.lieferName, lieferStrasse: z.lieferStrasse, lieferOrt: z.lieferOrt };
  }

  function speichere() {
    const a = speicher.schreibe(SCHLUESSEL_ENTWURF, JSON.stringify(zustand));
    const b = speicher.schreibe(SCHLUESSEL_ABSENDER, JSON.stringify(absenderVon(zustand)));
    ui.speicherFehler = !(a && b);
  }

  function geaendert() {
    ui.meldung = "";
    speichere();
    aktualisiere();
  }

  // ---------- Karten je Person ----------

  const personGroessen =
    `<option value="">wählen</option>` +
    `<optgroup label="Kindergrößen">${konfig.groessen.kinder.map((w) => `<option value="${esc(w)}">${esc(w)}</option>`).join("")}</optgroup>` +
    `<optgroup label="Erwachsenengrößen">${konfig.groessen.erwachsene.map((w) => `<option value="${esc(w)}">${esc(w)}</option>`).join("")}</optgroup>`;

  function artikelGroessenOptionen(a) {
    const option = (g) => `<option value="${esc(g.wert)}">${esc(g.wert)}</option>`;
    if (!a.gruppiert) return `<option value="">wählen</option>` + a.groessen.map(option).join("");
    const kinder = a.groessen.filter((g) => g.gruppe === "kinder");
    const erwachsene = a.groessen.filter((g) => g.gruppe === "erwachsene");
    return (
      `<option value="">wählen</option>` +
      (kinder.length ? `<optgroup label="Kindergrößen">${kinder.map(option).join("")}</optgroup>` : "") +
      (erwachsene.length ? `<optgroup label="Erwachsenengrößen">${erwachsene.map(option).join("")}</optgroup>` : "")
    );
  }

  // „Was soll drauf?“: je möglichem Aufdruck ein Kästchen mit kurzem Namen und dem Zuschlag (die Preise stehen schon fest)
  function aufdruckFeld(a, p) {
    if (a.aufdrucke.moeglich.length === 0) return "";
    const idp = "bst-" + p.id;
    const kaesten = a.aufdrucke.moeglich
      .map(
        (code) => `<label class="bst-aufdruck" for="${idp}-d-${a.id}-${code}">
            <input type="checkbox" id="${idp}-d-${a.id}-${code}" data-a="druck" data-code="${esc(code)}" aria-describedby="${idp}-titel">
            <span class="bst-aufdruck__name">${esc(a.aufdruckNamen[code])}</span>
            <span class="bst-aufdruck__preis">${esc(zuschlagText(konfig, code))}</span>
          </label>`
      )
      .join("\n          ");
    return `<fieldset class="bst-aufdrucke" data-a-aufdrucke>
          <legend>Was soll drauf?<span class="sr-only"> (${esc(a.anzeige)})</span></legend>
          ${kaesten}
        </fieldset>`;
  }

  function artikelZeile(a, p) {
    const idp = "bst-" + p.id;
    const groessenFeld =
      a.groessen.length > 1
        ? `<div class="bst-feld">
          <label for="${idp}-g-${a.id}">Größe<span class="sr-only"> (${esc(a.anzeige)})</span></label>
          <select id="${idp}-g-${a.id}" data-a="groesse" data-schluessel="p:${p.id}:a:${a.id}" aria-describedby="${idp}-titel">${artikelGroessenOptionen(a)}</select>
        </div>`
        : `<p class="bst-einheit">${esc(a.groessen[0].wert)}</p>`;
    const initialenFeld = a.aufdrucke.moeglich.some((c) => a.druckdaten[c] === "initialen")
      ? `<div class="bst-feld" data-a-initialen-feld hidden>
          <label for="${idp}-ini-${a.id}">Initialen<span class="sr-only"> (${esc(a.anzeige)})</span></label>
          <input type="text" id="${idp}-ini-${a.id}" data-a="initialen" data-schluessel="p:${p.id}:initialen" maxlength="${GRENZEN.initialen}" autocomplete="off" autocapitalize="characters" placeholder="z. B. BK" aria-describedby="${idp}-titel">
        </div>`
      : "";
    return `<li class="bst-artikel" data-artikel="${esc(a.id)}">
        <label class="bst-check" for="${idp}-a-${a.id}">
          <input type="checkbox" id="${idp}-a-${a.id}" data-a="an">
          <span class="bst-check__text"><span class="bst-check__name">${esc(a.anzeige)}</span><span class="bst-check__beschr">${esc(a.beschreibung)}</span></span>
          <span class="bst-check__preis" data-a-preis></span>
        </label>
        <div class="bst-artikel__optionen" data-a-optionen hidden>
          ${groessenFeld}
          ${initialenFeld}
          ${aufdruckFeld(a, p)}
          <p class="bst-preiszeile" data-a-preiszeile hidden></p>
          <p class="bst-hinweis bst-hinweis--klein" data-a-hinweis hidden></p>
        </div>
      </li>`;
  }

  function baueKarte(p) {
    const idp = "bst-" + p.id;
    const karte = document.createElement("article");
    karte.className = "bst-person";
    karte.dataset.person = p.id;
    karte.setAttribute("aria-labelledby", idp + "-titel");
    karte.innerHTML = `<h3 class="bst-person__titel" id="${idp}-titel"></h3>
      <div class="bst-person__felder">
        <div class="bst-feld bst-feld--breit">
          <label for="${idp}-name">Name</label>
          <input type="text" id="${idp}-name" data-p="name" data-schluessel="p:${p.id}:name" maxlength="${GRENZEN.person}" autocomplete="off" autocapitalize="words" aria-describedby="${idp}-titel">
        </div>
        <div class="bst-feld">
          <label for="${idp}-nummer">Rückennummer</label>
          <input type="number" id="${idp}-nummer" data-p="nummer" data-schluessel="p:${p.id}:nummer" inputmode="numeric" min="1" max="99" step="1" placeholder="1–99" autocomplete="off" aria-describedby="${idp}-titel">
        </div>
        <div class="bst-feld">
          <label for="${idp}-groesse">Größe</label>
          <select id="${idp}-groesse" data-p="groesse" data-schluessel="p:${p.id}:groesse" aria-describedby="${idp}-titel">${personGroessen}</select>
        </div>
      </div>
      <div class="bst-schnellwahl" role="group" aria-labelledby="${idp}-sw">
        <span class="bst-schnellwahl__titel" id="${idp}-sw">Schnellwahl</span>
        ${konfig.schnellwahl.map((s) => `<button type="button" class="bst-chip" data-schnellwahl="${esc(s.id)}" aria-describedby="${idp}-titel">${esc(s.titel)}</button>`).join("")}
      </div>
      <fieldset class="bst-artikelgruppe">
        <legend>Was braucht die Person?</legend>
        <ul class="bst-artikelliste" role="list">
          ${katalog.artikel.map((a) => artikelZeile(a, p)).join("\n")}
        </ul>
      </fieldset>
      <div class="bst-person__fuss">
        <p class="bst-person__summe" data-p-summe></p>
        <button type="button" class="bst-textknopf" data-person-entfernen aria-describedby="${idp}-titel">Person entfernen</button>
      </div>`;
    return karte;
  }

  // ---------- Nachführen der Anzeige aus dem Zustand ----------

  // Ein Feld mit Fokus wird nie überschrieben (der Text dort ist die Quelle).
  function setzeWert(feld, wert) {
    if (feld && feld.value !== wert && document.activeElement !== feld) feld.value = wert;
  }

  function setzeText(knoten, text) {
    if (knoten.textContent !== text) knoten.textContent = text;
  }

  function syncKarte(karte, p, index, z) {
    const idp = "bst-" + p.id;
    const titel = $("#" + idp + "-titel", karte);
    if (titel.textContent !== "Person " + (index + 1)) titel.textContent = "Person " + (index + 1);
    setzeWert($('[data-p="name"]', karte), p.name);
    setzeWert($('[data-p="nummer"]', karte), p.nummer);
    setzeWert($('[data-p="groesse"]', karte), p.groesse);
    for (const a of katalog.artikel) {
      const zeile = $(`[data-artikel="${a.id}"]`, karte);
      const gewaehlt = !!p.artikel[a.id];
      const hakenAn = $('[data-a="an"]', zeile);
      if (hakenAn.checked !== gewaehlt) hakenAn.checked = gewaehlt;
      $("[data-a-optionen]", zeile).hidden = !gewaehlt;
      const groesse = artikelGroesse(konfig, p, a.id);
      // Ist der Artikel nicht gewählt, zeigt die Zeile den Preis mit den Standard-Aufdrucken (so beginnt die Auswahl).
      const codes = gewaehlt ? artikelAufdrucke(konfig, p, a.id) : a.aufdrucke.standard;
      setzeText($("[data-a-preis]", zeile), preisText(konfig, a.id, groesse, codes));
      if (!gewaehlt) continue;
      setzeWert($('[data-a="groesse"]', zeile), groesse);
      for (const d of zeile.querySelectorAll('[data-a="druck"]')) {
        const an = codes.includes(d.dataset.code);
        if (d.checked !== an) d.checked = an;
      }
      // Die Initialen braucht nur, wer einen Aufdruck mit Initialen gewählt hat
      const iniFeld = $("[data-a-initialen-feld]", zeile);
      if (iniFeld) {
        iniFeld.hidden = !druckBedarf(konfig, a.id, codes).initialen;
        setzeWert($('[data-a="initialen"]', zeile), p.initialen === null || p.initialen === undefined ? initialenVorschlag(p.name) : p.initialen);
      }
      const preiszeile = preisZeile(konfig, a.id, groesse, codes);
      const pz = $("[data-a-preiszeile]", zeile);
      setzeText(pz, preiszeile);
      pz.hidden = preiszeile === "";
      const hinweis = $("[data-a-hinweis]", zeile);
      const text = p.artikel[a.id].groesse ? "" : vorauswahlHinweis(konfig, a.id, p.groesse);
      setzeText(hinweis, text);
      hinweis.hidden = text === "";
    }
    const summe = z.personen.find((x) => x.person === p);
    setzeText($("[data-p-summe]", karte), summe ? `Zwischensumme: ${summeText(summe.summeCent, summe.ohnePreis)} · ${zahlwort(summe.teile, "Teil", "Teile")}` : "Noch kein Artikel gewählt.");
  }

  function syncPersonen(z) {
    const vorhanden = new Map([...el.personen.children].map((karte) => [karte.dataset.person, karte]));
    for (const [id, karte] of vorhanden) {
      if (!zustand.personen.some((p) => p.id === id)) karte.remove();
    }
    zustand.personen.forEach((p, index) => {
      let karte = vorhanden.get(p.id);
      if (!karte) karte = baueKarte(p);
      if (el.personen.children[index] !== karte) el.personen.insertBefore(karte, el.personen.children[index] || null);
      syncKarte(karte, p, index, z);
    });
    el.keine.hidden = zustand.personen.length > 0;
    el.neu.disabled = zustand.personen.length >= GRENZEN.personen;
  }

  function syncFelder() {
    for (const feld of form.querySelectorAll("[data-feld]")) {
      const teile = feld.dataset.feld.split(".");
      let wert = zustand;
      for (const t of teile) wert = wert === null || wert === undefined ? undefined : wert[t];
      // Der Name für die Lieferung folgt „Dein Name“, solange er nicht geändert wurde (null)
      if (feld.dataset.feld === "lieferName" && (wert === null || wert === undefined)) wert = zustand.name;
      setzeWert(feld, typeof wert === "string" ? wert : "");
    }
    for (const li of el.teamListe.querySelectorAll("[data-teamposten]")) {
      const e = zustand.teambedarf[li.dataset.teamposten] || { n: 0, details: "" };
      setzeWert($("[data-n]", li), String(e.n));
      setzeWert($("[data-details]", li), e.details);
      $("[data-details-feld]", li).hidden = e.n <= 0;
    }
  }

  function syncBezahlung(z) {
    for (const block of ["kleidung", "teambedarf"]) {
      const gruppe = $(`[data-bezahlung="${block}"]`);
      gruppe.hidden = !(block === "kleidung" ? z.hatKleidung : z.hatTeambedarf);
      const gewaehlt = bezahlungIds(konfig, zustand.bezahlung[block]);
      for (const kasten of gruppe.querySelectorAll('input[type="checkbox"]')) {
        const an = gewaehlt.includes(kasten.value);
        if (kasten.checked !== an) kasten.checked = an;
      }
    }
    // Der Block „Sponsor“ erscheint bei angehaktem „Sponsor“ (Kleidung oder Teambedarf) oder einem Stück mit Sponsorlogo.
    // Angaben bei abgewähltem Sponsor bleiben im Entwurf stehen, gehen aber nicht in die Mail.
    el.sponsor.hidden = !sponsorAktiv(konfig, zustand, z);
    el.bezahlungLeer.hidden = z.hatKleidung || z.hatTeambedarf;
  }

  function syncUebersicht(z) {
    const setze = (name, text) => setzeText($(`[data-u="${name}"]`), text);
    setze("personen", String(z.personen.length));
    setze("teile", String(z.teile));
    setze("summe", summeText(z.summeCent, z.ohnePreis));
    const posten = z.teambedarf.length + (z.sonstiges ? 1 : 0);
    setze("teambedarf", posten ? zahlwort(posten, "Posten", "Posten") : "–");
  }

  // Lücken: Liste unter der Übersicht (erst nach einem Klick auf Senden oder Kopieren) und Rahmen an den Feldern
  function syncLuecken(luecken) {
    if (luecken.length === 0) ui.zeigeLuecken = false;
    const sichtbar = ui.zeigeLuecken;
    el.luecken.hidden = !sichtbar;
    if (sichtbar) {
      const html = luecken
        .map((l) => `<li><button type="button" class="bst-luecken__knopf" data-luecke="${esc(l.feld)}">${esc(l.text)}</button></li>`)
        .join("");
      if (html !== ui.lueckenHtml) {
        el.lueckenListe.innerHTML = html;
        ui.lueckenHtml = html;
      }
    } else if (ui.lueckenHtml) {
      el.lueckenListe.innerHTML = "";
      ui.lueckenHtml = "";
    }
    // Eine Lücke kann mehrere Felder betreffen (doppelte Rückennummer): „felder“ nennt alle, „feld“ ist das Ziel des Sprungs.
    const felder = new Set(sichtbar ? luecken.flatMap((l) => l.felder || [l.feld]) : []);
    const markiere = (knoten, an) => {
      if (an && knoten.getAttribute("aria-invalid") !== "true") knoten.setAttribute("aria-invalid", "true");
      if (!an && knoten.hasAttribute("aria-invalid")) knoten.removeAttribute("aria-invalid");
    };
    for (const knoten of form.querySelectorAll("[data-schluessel]")) {
      if (knoten.tagName === "BUTTON") continue;
      const an = felder.has(knoten.dataset.schluessel);
      if (knoten.tagName === "FIELDSET") {
        // Antworten zur Bezahlung: Rahmen um die Gruppe, aria-invalid an den Kontrollkästchen (die Gruppe selbst trägt es nicht)
        knoten.classList.toggle("bst-gruppe--luecke", an);
        for (const kasten of knoten.querySelectorAll('input[type="checkbox"]')) markiere(kasten, an);
      } else {
        markiere(knoten, an);
      }
    }
  }

  function syncMail(luecken) {
    const mail = baueMail(konfig, zustand, jetzt());
    if (el.vorschauText.value !== mail.text) el.vorschauText.value = mail.text;
    if (el.betreff.textContent !== mail.betreff) el.betreff.textContent = mail.betreff;
    // Der Link trägt die mailto-Adresse nur, solange nichts fehlt (data-mailto zeigt die zuletzt erzeugte Adresse).
    if (luecken.length === 0) {
      el.senden.href = mail.mailto;
      el.senden.dataset.mailto = mail.mailto;
    } else {
      el.senden.setAttribute("href", "#bst-senden-abschnitt");
      delete el.senden.dataset.mailto;
    }
    el.lang.hidden = mail.mailtoLaenge <= MAILTO_LAENGE_MAX;
    return mail;
  }

  function syncGesendet() {
    const aktiv = zustand.status !== "";
    el.gesendet.hidden = !aktiv;
    if (aktiv) {
      setzeText(el.gesendetText, zustand.status === "kopiert" ? TEXT_KOPIERT : TEXT_MAIL);
      setzeText(el.nr, zustand.bestellNr);
    }
    setzeText(el.meldung, ui.meldung);
    el.speicher.hidden = !ui.speicherFehler;
  }

  function aktualisiere() {
    const z = zusammenfassung(konfig, zustand);
    const luecken = pruefeBestellung(konfig, zustand);
    syncFelder();
    syncPersonen(z);
    syncBezahlung(z);
    syncUebersicht(z);
    syncLuecken(luecken);
    syncMail(luecken);
    syncGesendet();
  }

  // ---------- Eingaben ----------

  function person(id) {
    return zustand.personen.find((p) => p.id === id) || null;
  }

  function beiEingabe(e) {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    let verarbeitet = false;

    if (t.dataset.feld) {
      const teile = t.dataset.feld.split(".");
      let ziel = zustand;
      for (let i = 0; i < teile.length - 1; i++) ziel = ziel[teile[i]];
      ziel[teile[teile.length - 1]] = t.value;
      verarbeitet = true;
    } else if (t.dataset.bezWert !== undefined) {
      // Antworten zur Bezahlung: alle angehakten Kästchen des Blocks, als Liste in Katalogreihenfolge (die Kästchen stehen in dieser Reihenfolge)
      const gruppe = t.closest("[data-bezahlung]");
      if (gruppe) {
        zustand.bezahlung[gruppe.dataset.bezahlung] = bezahlungIds(
          konfig,
          [...gruppe.querySelectorAll('input[type="checkbox"]:checked')].map((kasten) => kasten.value)
        );
      }
      verarbeitet = true;
    } else if (t.closest("[data-person]")) {
      const p = person(t.closest("[data-person]").dataset.person);
      if (!p) return;
      const zeile = t.closest("[data-artikel]");
      if (zeile && t.dataset.a) {
        const id = zeile.dataset.artikel;
        const a = katalog.nachId.get(id);
        if (t.dataset.a === "an") {
          // Ein neu gewählter Artikel beginnt mit seinen Standard-Aufdrucken
          if (t.checked) p.artikel[id] = p.artikel[id] || { groesse: "", aufdrucke: a.aufdrucke.standard.slice() };
          else delete p.artikel[id];
        } else if (t.dataset.a === "groesse" && p.artikel[id]) {
          // gleich der Vorauswahl › „Vorauswahl“ merken, damit die Größe der Person weiter mitgeht
          p.artikel[id].groesse = t.value === vorauswahlGroesse(konfig, id, p.groesse) ? "" : t.value;
        } else if (t.dataset.a === "druck" && p.artikel[id]) {
          // Aufdruck an- oder abgehakt: die Liste bleibt in der Reihenfolge von aufdrucke.moeglich
          const codes = new Set(artikelAufdrucke(konfig, p, id));
          if (t.checked) codes.add(t.dataset.code);
          else codes.delete(t.dataset.code);
          p.artikel[id].aufdrucke = a.aufdrucke.moeglich.filter((c) => codes.has(c));
        } else if (t.dataset.a === "initialen") {
          p.initialen = t.value;
        }
        verarbeitet = true;
      } else if (t.dataset.p === "name" || t.dataset.p === "nummer" || t.dataset.p === "groesse") {
        p[t.dataset.p] = t.value;
        verarbeitet = true;
      }
    } else if (t.closest("[data-teamposten]")) {
      const li = t.closest("[data-teamposten]");
      const id = li.dataset.teamposten;
      const e2 = zustand.teambedarf[id] || (zustand.teambedarf[id] = { n: 0, details: "" });
      if (t.hasAttribute("data-n")) {
        e2.n = ganzzahl(t.value);
        // Beim Verlassen des Feldes zeigt es die Zahl, die gilt (zum Beispiel 999 statt 5000)
        if (e.type === "change") t.value = String(e2.n);
        verarbeitet = true;
      } else if (t.hasAttribute("data-details")) {
        e2.details = t.value;
        verarbeitet = true;
      }
    }
    if (verarbeitet) geaendert();
  }

  form.addEventListener("input", beiEingabe);
  form.addEventListener("change", beiEingabe);
  form.addEventListener("submit", (e) => e.preventDefault());

  // ---------- Klicks ----------

  function personHinzufuegen() {
    if (zustand.personen.length >= GRENZEN.personen) return;
    zustand.zaehler += 1;
    const p = { id: "p" + zustand.zaehler, name: "", nummer: "", groesse: "", artikel: {}, initialen: null };
    zustand.personen.push(p);
    geaendert();
    const karte = $(`[data-person="${p.id}"]`);
    const name = karte && $('[data-p="name"]', karte);
    if (name) name.focus();
  }

  function personEntfernen(id) {
    zustand.personen = zustand.personen.filter((p) => p.id !== id);
    geaendert();
    el.neu.focus();
  }

  function stepper(li, schritt) {
    const id = li.dataset.teamposten;
    const e = zustand.teambedarf[id] || (zustand.teambedarf[id] = { n: 0, details: "" });
    e.n = ganzzahl(e.n + schritt);
    geaendert();
  }

  // Springt zum Feld einer Lücke (Schlüssel wie in pruefeBestellung)
  function geheZuFeld(schluessel) {
    let ziel = form.querySelector(`[data-schluessel="${schluessel.replaceAll('"', '\\"')}"]`);
    if (!ziel) return;
    if (ziel.tagName === "FIELDSET") ziel = ziel.querySelector("input"); // Gruppe (Bezahlung): das erste Kästchen
    if (!ziel) return;
    ziel.scrollIntoView({ block: "center" });
    ziel.focus({ preventScroll: true });
  }

  // Fehlt etwas: Liste der Lücken zeigen, Fokus auf die erste Lücke der Liste (Enter springt zum Feld). Das Mailprogramm bleibt zu.
  function meldeLuecken() {
    ui.zeigeLuecken = true;
    aktualisiere();
    const erste = $("[data-luecke]", el.lueckenListe);
    if (erste) erste.focus();
  }

  function alleDa() {
    if (pruefeBestellung(konfig, zustand).length === 0) return true;
    meldeLuecken();
    return false;
  }

  el.senden.addEventListener("click", (e) => {
    if (!alleDa()) {
      e.preventDefault();
      return;
    }
    // Die Bestell-Nr. entsteht jetzt und bleibt bis „Neue Bestellung beginnen“ gleich.
    zustand.bestellNr = waehleBestellNr(zustand.bestellNr, zustand.team, jetzt());
    zustand.status = "mail";
    ui.zeigeLuecken = false;
    ui.meldung = "";
    speichere();
    aktualisiere(); // setzt den Link auf die endgültige Adresse; danach öffnet der Browser das Mailprogramm
  });

  // Rückfall ohne Zwischenablage-Schnittstelle (ältere Browser, unsichere Seiten): unsichtbares Feld markieren und kopieren
  function kopiereMitMarkierung(text) {
    const feld = document.createElement("textarea");
    feld.value = text;
    feld.setAttribute("readonly", "");
    feld.setAttribute("aria-hidden", "true");
    feld.style.cssText = "position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;";
    document.body.appendChild(feld);
    let ok = false;
    try {
      feld.focus();
      feld.select();
      feld.setSelectionRange(0, text.length);
      ok = document.execCommand("copy") === true;
    } catch (e) {
      ok = false;
    }
    feld.remove();
    return ok;
  }

  async function kopiere(text) {
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (e) {
      /* weiter mit dem Rückfall */
    }
    return kopiereMitMarkierung(text);
  }

  el.kopieren.addEventListener("click", async () => {
    if (!alleDa()) return;
    const nr = waehleBestellNr(zustand.bestellNr, zustand.team, jetzt());
    const mail = baueMail(konfig, { ...zustand, bestellNr: nr }, jetzt());
    const ok = await kopiere(kopierText(mail));
    if (ok) {
      zustand.bestellNr = nr;
      zustand.status = "kopiert";
      ui.zeigeLuecken = false;
      ui.meldung = "Kopiert.";
      speichere();
    } else {
      // Nichts kopiert: „Mail ansehen“ aufklappen und den Text markieren, damit man ihn von Hand kopieren kann
      ui.meldung = "Kopieren hat nicht geklappt. Kopiere den Text unter „Mail ansehen“ von Hand.";
      el.vorschau.open = true;
      aktualisiere();
      el.vorschauText.focus();
      el.vorschauText.select();
      return;
    }
    aktualisiere();
  });

  function neueBestellung() {
    if (!window.confirm("Neue Bestellung beginnen? Deine Eingaben für diese Bestellung werden gelöscht. Mannschaft, Name, Telefon und Lieferanschrift bleiben erhalten.")) return;
    zustand = Object.assign(leererEntwurf(), absenderVon(zustand));
    ui.zeigeLuecken = false;
    ui.meldung = "";
    el.personen.textContent = "";
    speicher.loesche(SCHLUESSEL_ENTWURF);
    speichere();
    aktualisiere();
    window.scrollTo(0, 0);
    el.titel.focus({ preventScroll: true });
  }

  form.addEventListener("click", (e) => {
    const knopf = e.target instanceof Element ? e.target.closest("button") : null;
    if (!knopf || !form.contains(knopf)) return;
    if (knopf.hasAttribute("data-bst-person-neu")) return personHinzufuegen();
    if (knopf.hasAttribute("data-schnellwahl")) {
      const p = person(knopf.closest("[data-person]").dataset.person);
      if (p) {
        schnellwahlAnwenden(konfig, p, knopf.dataset.schnellwahl);
        geaendert();
      }
      return;
    }
    if (knopf.hasAttribute("data-person-entfernen")) return personEntfernen(knopf.closest("[data-person]").dataset.person);
    if (knopf.hasAttribute("data-schritt")) return stepper(knopf.closest("[data-teamposten]"), Number(knopf.dataset.schritt));
    if (knopf.hasAttribute("data-luecke")) return geheZuFeld(knopf.dataset.luecke);
    if (knopf.hasAttribute("data-bst-neu")) return neueBestellung();
  });

  // „Mail ansehen“ auf: Text mit der aktuellen Uhrzeit auffrischen (die Bestell-Nr. entsteht erst beim Senden)
  el.vorschau.addEventListener("toggle", () => {
    if (el.vorschau.open) aktualisiere();
  });

  el.vergessen.addEventListener("click", () => haken.vergessen());

  speichere();
  aktualisiere();
}

start();
