/*
  Bestellung für dein Team (Prototyp) – Oberfläche.

  Das Gerüst der Seite baut src/seiten/bestellung.mjs (Kopf, Felder, Teambedarf, Bezahlung, Übersicht, Fuß) und bettet die
  Konfiguration ein (#bestellung-konfig). Dieses Skript baut die Karten je Person, hält den Zustand, speichert den Entwurf auf
  dem Gerät, prüft die Eingaben und öffnet beim Senden das Mailprogramm (mailto). Betreff, Text, Prüfung und Bestell-Nr. kommen
  aus mailtext.js (reine Funktionen, ohne DOM).

  Es gibt keinen Server: Der Entwurf liegt in localStorage (Schlüssel speuzer-bestellung-v1-entwurf; Mannschaft, Name und
  Telefon zusätzlich unter speuzer-bestellung-v1-absender). Jeder Zugriff darauf steht in try/catch, die Seite funktioniert
  auch ohne Speicher. Nur statische Importe (nie ein dynamischer Import zur Laufzeit): Safari merkt sich einen gescheiterten
  dynamischen Import für die ganze Sitzung.

  Aufbau: Die Felder werden einmal gebaut und danach nur noch aus dem Zustand nachgeführt (aktualisiere); so bleibt der Fokus
  beim Tippen, wo er ist. Ein Eingabefeld mit Fokus wird nie von außen überschrieben.
*/

import {
  GRENZEN,
  MAILTO_LAENGE_MAX,
  artikelGroesse,
  baueMail,
  bereinigeEntwurf,
  formatEuro,
  ganzzahl,
  initialenVorschlag,
  katalogVon,
  kopierText,
  leererEntwurf,
  preisText,
  pruefeBestellung,
  schnellwahlAnwenden,
  vorauswahlGroesse,
  vorauswahlHinweis,
  waehleBestellNr,
  zahlwort,
  zusammenfassung,
} from "./mailtext.js";

const SCHLUESSEL_ENTWURF = "speuzer-bestellung-v1-entwurf";
const SCHLUESSEL_ABSENDER = "speuzer-bestellung-v1-absender";

function esc(text) {
  return String(text === null || text === undefined ? "" : text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

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

// ---------- Start ----------

function start() {
  const wurzel = document.getElementById("bestellung");
  const konfigKnoten = document.getElementById("bestellung-konfig");
  if (!wurzel || !konfigKnoten) return;

  let konfig;
  try {
    konfig = JSON.parse(konfigKnoten.textContent || "");
    katalogVon(konfig);
  } catch (e) {
    const fehler = wurzel.querySelector("[data-bst-ladefehler]");
    if (fehler) fehler.hidden = false;
    return;
  }
  const katalog = katalogVon(konfig);
  const empfaenger = konfig.einstellungen.empfaenger;
  const TEXT_MAIL = `Dein Mailprogramm öffnet sich mit der fertigen Mail. Tippe dort auf „Senden“. Öffnet sich nichts? Dann „Text kopieren“ und an ${empfaenger} schicken.`;
  const TEXT_KOPIERT = `Der Text ist kopiert. Füge ihn in eine neue Mail an ${empfaenger} ein und tippe dort auf „Senden“.`;

  const $ = (auswahl, ort) => (ort || wurzel).querySelector(auswahl);
  const form = $("#bst-form");
  const el = {
    titel: $("#bst-titel"),
    personen: $("#bst-personen"),
    keine: $("#bst-keine"),
    neu: $("#bst-person-neu"),
    teamListe: $(".bst-posten-liste"),
    bezahlungLeer: $("[data-bst-bezahlung-leer]"),
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
    }
    return e;
  }

  function speichere() {
    const a = speicher.schreibe(SCHLUESSEL_ENTWURF, JSON.stringify(zustand));
    const b = speicher.schreibe(SCHLUESSEL_ABSENDER, JSON.stringify({ team: zustand.team, name: zustand.name, tel: zustand.tel }));
    ui.speicherFehler = !(a && b);
  }

  function geaendert() {
    ui.meldung = "";
    speichere();
    aktualisiere();
  }

  // ---------- Karten je Person ----------

  const personGroessen =
    `<option value="">Bitte wählen</option>` +
    `<optgroup label="Kindergrößen">${konfig.groessen.kinder.map((w) => `<option value="${esc(w)}">${esc(w)}</option>`).join("")}</optgroup>` +
    `<optgroup label="Erwachsenengrößen">${konfig.groessen.erwachsene.map((w) => `<option value="${esc(w)}">${esc(w)}</option>`).join("")}</optgroup>`;

  function artikelGroessenOptionen(a) {
    const option = (g) => `<option value="${esc(g.wert)}">${esc(g.wert)}</option>`;
    if (!a.gruppiert) return `<option value="">Bitte wählen</option>` + a.groessen.map(option).join("");
    const kinder = a.groessen.filter((g) => g.gruppe === "kinder");
    const erwachsene = a.groessen.filter((g) => g.gruppe === "erwachsene");
    return (
      `<option value="">Bitte wählen</option>` +
      (kinder.length ? `<optgroup label="Kindergrößen">${kinder.map(option).join("")}</optgroup>` : "") +
      (erwachsene.length ? `<optgroup label="Erwachsenengrößen">${erwachsene.map(option).join("")}</optgroup>` : "")
    );
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
    const initialenFeld =
      a.einzeldruck === "initialen"
        ? `<div class="bst-feld">
          <label for="${idp}-ini">Initialen<span class="sr-only"> (${esc(a.anzeige)})</span></label>
          <input type="text" id="${idp}-ini" data-a="initialen" data-schluessel="p:${p.id}:initialen" maxlength="${GRENZEN.initialen}" autocomplete="off" autocapitalize="characters" placeholder="z. B. BK" aria-describedby="${idp}-titel">
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
          <label for="${idp}-name">Name (wird aufgedruckt)</label>
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
      const haken = $('[data-a="an"]', zeile);
      if (haken.checked !== gewaehlt) haken.checked = gewaehlt;
      $("[data-a-optionen]", zeile).hidden = !gewaehlt;
      const groesse = artikelGroesse(konfig, p, a.id);
      const preis = preisText(konfig, a.id, groesse);
      const preisKnoten = $("[data-a-preis]", zeile);
      if (preisKnoten.textContent !== preis) preisKnoten.textContent = preis;
      if (!gewaehlt) continue;
      setzeWert($('[data-a="groesse"]', zeile), groesse);
      setzeWert($('[data-a="initialen"]', zeile), p.initialen === null || p.initialen === undefined ? initialenVorschlag(p.name) : p.initialen);
      const hinweis = $("[data-a-hinweis]", zeile);
      const text = p.artikel[a.id].groesse ? "" : vorauswahlHinweis(konfig, a.id, p.groesse);
      if (hinweis.textContent !== text) hinweis.textContent = text;
      hinweis.hidden = text === "";
    }
    const summe = z.personen.find((x) => x.person === p);
    const text = summe ? `Zwischensumme: ${formatEuro(summe.summeCent)} (${zahlwort(summe.teile, "Teil", "Teile")})` : "Noch kein Artikel gewählt.";
    const summeKnoten = $("[data-p-summe]", karte);
    if (summeKnoten.textContent !== text) summeKnoten.textContent = text;
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
      const wahl = zustand.bezahlung[block];
      for (const r of gruppe.querySelectorAll('input[type="radio"]')) {
        const an = r.value === wahl;
        if (r.checked !== an) r.checked = an;
      }
      const opt = konfig.bezahlung.find((o) => o.id === wahl);
      $("[data-sponsor-feld]", gruppe).hidden = !(opt && opt.mitName);
    }
    el.bezahlungLeer.hidden = z.hatKleidung || z.hatTeambedarf;
  }

  function syncUebersicht(z) {
    const setze = (name, text) => {
      const k = $(`[data-u="${name}"]`);
      if (k.textContent !== text) k.textContent = text;
    };
    setze("personen", String(z.personen.length));
    setze("teile", String(z.teile));
    setze("summe", formatEuro(z.summeCent));
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
    const felder = new Set(sichtbar ? luecken.map((l) => l.feld) : []);
    for (const knoten of form.querySelectorAll("[data-schluessel]")) {
      if (knoten.tagName === "BUTTON") continue;
      const an = felder.has(knoten.dataset.schluessel);
      if (an && knoten.getAttribute("aria-invalid") !== "true") knoten.setAttribute("aria-invalid", "true");
      if (!an && knoten.hasAttribute("aria-invalid")) knoten.removeAttribute("aria-invalid");
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
      const text = zustand.status === "kopiert" ? TEXT_KOPIERT : TEXT_MAIL;
      if (el.gesendetText.textContent !== text) el.gesendetText.textContent = text;
      if (el.nr.textContent !== zustand.bestellNr) el.nr.textContent = zustand.bestellNr;
    }
    if (el.meldung.textContent !== ui.meldung) el.meldung.textContent = ui.meldung;
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
      const gruppe = t.closest("[data-bezahlung]");
      if (gruppe && t.checked) zustand.bezahlung[gruppe.dataset.bezahlung] = t.value;
      verarbeitet = true;
    } else if (t.closest("[data-person]")) {
      const p = person(t.closest("[data-person]").dataset.person);
      if (!p) return;
      const zeile = t.closest("[data-artikel]");
      if (zeile && t.dataset.a) {
        const id = zeile.dataset.artikel;
        if (t.dataset.a === "an") {
          if (t.checked) p.artikel[id] = p.artikel[id] || { groesse: "" };
          else delete p.artikel[id];
        } else if (t.dataset.a === "groesse" && p.artikel[id]) {
          // gleich der Vorauswahl › „Vorauswahl“ merken, damit die Größe der Person weiter mitgeht
          p.artikel[id].groesse = t.value === vorauswahlGroesse(konfig, id, p.groesse) ? "" : t.value;
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
    if (ziel.tagName === "FIELDSET") ziel = ziel.querySelector("input:checked") || ziel.querySelector("input");
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
    if (!window.confirm("Neue Bestellung beginnen? Deine Eingaben für diese Bestellung werden gelöscht. Mannschaft, Name und Telefon bleiben erhalten.")) return;
    const { team, name, tel } = zustand;
    zustand = Object.assign(leererEntwurf(), { team, name, tel });
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

  speichere();
  aktualisiere();
  wurzel.setAttribute("data-bereit", "");
}

start();
