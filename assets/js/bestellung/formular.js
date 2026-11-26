/*
  Bestellung für dein Team (Prototyp) – das Formular als HTML-Text (reine Funktionen ohne DOM).

  Die Seite öffnet sich nur mit einem Code (zugang.js). Das ausgelieferte HTML enthält darum nur den Kopf, den Prototyp-Hinweis und die
  Zugangsbox (src/seiten/bestellung.mjs). Das Formular und alle Texte, in denen Preise oder der Rabatt vorkommen, entstehen erst nach dem
  Entschlüsseln: seite.js ruft baueFormular() mit der Konfiguration samt Preisen (konfig.preise, mailtext.js › mitPreisen) auf und setzt den
  Text in die Seite. Die Karten je Person baut seite.js danach aus dem Katalog.

  Läuft in Node (die Tests in tools/bestellung-test/ prüfen die Texte) und im Browser.
*/

import { GRENZEN, preisQuelle, zahlDe } from "./mailtext.js";

export const TEXT_LEAD =
  "Hier stellst du zusammen, was dein Team braucht. Am Ende öffnet sich dein Mailprogramm mit der fertigen Bestellung an den Verein – du musst nur noch auf „Senden“ tippen.";

export const TEXT_HINWEIS_SPONSOR =
  "Für die Geschäftsstelle: Die Kosten für den Sponsordruck werden künftig getrennt in Rechnung gestellt. Dazu gibt es einen kurzen Sponsorenvertrag. Darum kümmert sich die Geschäftsstelle.";

export function esc(text) {
  return String(text === null || text === undefined ? "" : text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

// ---------- Abschnitte ----------

function werBestelltAbschnitt(konfig) {
  const mannschaften = konfig.mannschaften
    .map((m) => `<option value="${esc(m.slug)}">${esc(m.name)}</option>`)
    .join("");
  return `<section class="bst-abschnitt" aria-labelledby="bst-h-wer">
    <h2 id="bst-h-wer">Wer bestellt?</h2>
    <div class="bst-felder">
      <div class="bst-feld">
        <label for="bst-team">Mannschaft</label>
        <select id="bst-team" data-feld="team" data-schluessel="team"><option value="">Bitte wählen</option>${mannschaften}</select>
      </div>
      <div class="bst-feld">
        <label for="bst-name">Dein Name</label>
        <input type="text" id="bst-name" data-feld="name" data-schluessel="name" autocomplete="name" maxlength="${GRENZEN.besteller}">
      </div>
      <div class="bst-feld">
        <label for="bst-tel">Telefon (freiwillig)</label>
        <input type="tel" id="bst-tel" data-feld="tel" autocomplete="tel" inputmode="tel" maxlength="${GRENZEN.tel}">
      </div>
      <div class="bst-feld">
        <label for="bst-bis">Gebraucht bis (freiwillig)</label>
        <input type="date" id="bst-bis" data-feld="bis">
      </div>
    </div>
    <fieldset class="bst-gruppe bst-lieferung">
      <legend>Lieferanschrift (die Bestellung kommt zu dir)</legend>
      <div class="bst-felder">
        <div class="bst-feld bst-feld--breit">
          <label for="bst-liefer-name">Name</label>
          <input type="text" id="bst-liefer-name" data-feld="lieferName" data-schluessel="lieferName" autocomplete="name" maxlength="${GRENZEN.lieferName}">
        </div>
        <div class="bst-feld bst-feld--breit">
          <label for="bst-liefer-strasse">Straße und Hausnummer</label>
          <input type="text" id="bst-liefer-strasse" data-feld="lieferStrasse" data-schluessel="lieferStrasse" autocomplete="address-line1" maxlength="${GRENZEN.strasse}">
        </div>
        <div class="bst-feld bst-feld--breit">
          <label for="bst-liefer-ort">PLZ und Ort</label>
          <input type="text" id="bst-liefer-ort" data-feld="lieferOrt" data-schluessel="lieferOrt" autocomplete="off" maxlength="${GRENZEN.ort}" placeholder="z. B. 60439 Frankfurt">
        </div>
      </div>
    </fieldset>
  </section>`;
}

// Die Karten je Person baut seite.js (aus dem Katalog der Konfiguration); hier steht nur der Rahmen.
function kleidungAbschnitt() {
  return `<section class="bst-abschnitt" aria-labelledby="bst-h-kleidung">
    <h2 id="bst-h-kleidung">Kleidung je Person</h2>
    <p class="bst-hinweis">Name und Nummer werden nur gedruckt, wo du es anhakst.</p>
    <div class="bst-personen" id="bst-personen" data-bst-personen></div>
    <p class="bst-keine" id="bst-keine">Noch keine Person. Tippe auf „+ Person hinzufügen“.</p>
    <p class="bst-aktion"><button type="button" class="knopf knopf--sekundaer" id="bst-person-neu" data-bst-person-neu data-schluessel="leer">+ Person hinzufügen</button></p>
  </section>`;
}

function teambedarfAbschnitt(konfig) {
  const zeilen = konfig.teambedarf
    .map((t) => {
      const id = esc(t.id);
      const name = esc(t.anzeige);
      return `<li class="bst-posten" data-teamposten="${id}">
        <div class="bst-posten__kopf">
          <span class="bst-posten__name" id="bst-t-${id}">${name}</span>
          <div class="bst-schritt" role="group" aria-labelledby="bst-t-${id}">
            <button type="button" class="bst-schritt__knopf" data-schritt="-1" aria-label="${name}: eine weniger">−</button>
            <input type="number" class="bst-schritt__wert" data-n inputmode="numeric" min="0" max="${GRENZEN.anzahl}" step="1" value="0" aria-label="${name}: Anzahl">
            <button type="button" class="bst-schritt__knopf" data-schritt="1" aria-label="${name}: eine mehr">+</button>
          </div>
        </div>
        <div class="bst-posten__details bst-feld" data-details-feld hidden>
          <label for="bst-d-${id}">Details</label>
          <input type="text" id="bst-d-${id}" data-details maxlength="${GRENZEN.details}" autocomplete="off" aria-label="Details zu ${name}" placeholder="${esc(t.platzhalter || "")}">
        </div>
      </li>`;
    })
    .join("\n      ");
  return `<section class="bst-abschnitt" aria-labelledby="bst-h-team">
    <h2 id="bst-h-team">Teambedarf</h2>
    <p class="bst-hinweis">Trainingsmaterial für dein Team: Stelle mit „+“ die Anzahl ein.</p>
    <ul class="bst-posten-liste" role="list">
      ${zeilen}
    </ul>
    <div class="bst-feld">
      <label for="bst-sonstiges">Sonstiges</label>
      <textarea id="bst-sonstiges" data-feld="sonstiges" rows="3" maxlength="${GRENZEN.sonstiges}"></textarea>
    </div>
    <p class="bst-hinweis">Preise klärt der Vorstand.</p>
  </section>`;
}

// Je Block (Kleidung, Teambedarf) Kontrollkästchen mit den Antworten aus data/bestellung.json in deren Reihenfolge: Mehrere Antworten
// sind möglich, mindestens eine ist Pflicht (assets/js/bestellung/mailtext.js › pruefeBestellung). Die Angaben zum Sponsor stehen in einem
// eigenen Block (sponsorBlock), den seite.js nur zeigt, wenn „Sponsor“ angehakt ist oder ein Stück das Sponsorlogo trägt.
function bezahlGruppe(konfig, block, frage) {
  const optionen = konfig.bezahlung
    .map(
      (b) => `<label class="bst-option"><input type="checkbox" name="bez-${block}" value="${esc(b.id)}" data-bez-wert><span>${esc(b.text)}</span></label>`
    )
    .join("\n        ");
  return `<fieldset class="bst-gruppe" data-bezahlung="${block}" data-schluessel="bezahlung:${block}" aria-describedby="bst-bez-${block}-hilfe" hidden>
      <legend>${frage}</legend>
      <p class="bst-hinweis" id="bst-bez-${block}-hilfe">Mehrere möglich. Wie geteilt wird, kannst du unten bei „Hinweis zur Bezahlung“ schreiben.</p>
      <div class="bst-optionen">
        ${optionen}
      </div>
    </fieldset>`;
}

// Der Block „Sponsor“: die Angaben für die Geschäftsstelle (Rechnung und Vertrag macht sie, nicht diese Seite). Die Firma ist Pflicht.
function sponsorBlock() {
  return `<fieldset class="bst-gruppe bst-sponsorblock" data-bst-sponsorblock aria-describedby="bst-sponsor-hilfe" hidden>
      <legend>Sponsor</legend>
      <p class="bst-hinweis" id="bst-sponsor-hilfe">${esc(TEXT_HINWEIS_SPONSOR)}</p>
      <div class="bst-felder">
        <div class="bst-feld bst-feld--breit">
          <label for="bst-sponsor-firma">Firma</label>
          <input type="text" id="bst-sponsor-firma" data-feld="sponsor.firma" data-schluessel="sponsor:firma" maxlength="${GRENZEN.firma}" autocomplete="off">
        </div>
        <div class="bst-feld">
          <label for="bst-sponsor-ansprech">Ansprechpartner (freiwillig)</label>
          <input type="text" id="bst-sponsor-ansprech" data-feld="sponsor.ansprechpartner" maxlength="${GRENZEN.ansprechpartner}" autocomplete="off">
        </div>
        <div class="bst-feld">
          <label for="bst-sponsor-email">E-Mail (freiwillig)</label>
          <input type="email" id="bst-sponsor-email" data-feld="sponsor.email" maxlength="${GRENZEN.sponsorEmail}" autocomplete="off" inputmode="email" autocapitalize="none" spellcheck="false">
        </div>
        <div class="bst-feld">
          <label for="bst-sponsor-tel">Telefon (freiwillig)</label>
          <input type="tel" id="bst-sponsor-tel" data-feld="sponsor.telefon" maxlength="${GRENZEN.sponsorTel}" autocomplete="off" inputmode="tel">
        </div>
        <div class="bst-feld bst-feld--breit">
          <label for="bst-sponsor-anschrift">Anschrift für die Rechnung (freiwillig)</label>
          <textarea id="bst-sponsor-anschrift" data-feld="sponsor.anschrift" rows="3" maxlength="${GRENZEN.anschrift}" autocomplete="off"></textarea>
        </div>
      </div>
    </fieldset>`;
}

function bezahlungAbschnitt(konfig) {
  return `<section class="bst-abschnitt" aria-labelledby="bst-h-bezahlung">
    <h2 id="bst-h-bezahlung">Bezahlung</h2>
    <p class="bst-hinweis" data-bst-bezahlung-leer>Sobald du Kleidung oder Teambedarf ausgewählt hast, fragen wir hier, wer zahlt.</p>
    ${bezahlGruppe(konfig, "kleidung", "Wer zahlt die Kleidung?")}
    ${bezahlGruppe(konfig, "teambedarf", "Wer zahlt den Teambedarf?")}
    ${sponsorBlock()}
    <div class="bst-feld">
      <label for="bst-hinweis-bezahlung">Hinweis zur Bezahlung (freiwillig)</label>
      <textarea id="bst-hinweis-bezahlung" data-feld="hinweisBezahlung" rows="2" maxlength="${GRENZEN.hinweis}"></textarea>
    </div>
    <div class="bst-feld">
      <label for="bst-hinweis">Sonstiger Hinweis (freiwillig)</label>
      <textarea id="bst-hinweis" data-feld="hinweis" rows="2" maxlength="${GRENZEN.hinweis}"></textarea>
    </div>
  </section>`;
}

function sendenAbschnitt(konfig) {
  const empfaenger = esc(konfig.einstellungen.empfaenger);
  return `<section class="bst-abschnitt" id="bst-senden-abschnitt" aria-labelledby="bst-h-senden">
    <h2 id="bst-h-senden">Übersicht und Senden</h2>
    <dl class="bst-uebersicht">
      <div><dt>Personen</dt><dd data-u="personen">0</dd></div>
      <div><dt>Teile</dt><dd data-u="teile">0</dd></div>
      <div><dt>Summe (Preise laut Angebot)</dt><dd data-u="summe">0,00 €</dd></div>
      <div><dt>Teambedarf</dt><dd data-u="teambedarf">–</dd></div>
    </dl>
    <div class="hinweis hinweis--offen bst-luecken" data-bst-luecken role="group" aria-labelledby="bst-luecken-titel" hidden>
      <p class="bst-luecken__titel" id="bst-luecken-titel">Bitte ergänze noch:</p>
      <ul role="list" class="bst-luecken__liste" data-bst-luecken-liste></ul>
    </div>
    <div class="bst-senden-zeile">
      <a class="knopf knopf--gross bst-senden" id="bst-senden" data-bst-senden href="#bst-senden-abschnitt">Bestellung per Mail senden</a>
      <button type="button" class="knopf knopf--sekundaer knopf--gross" id="bst-kopieren" data-bst-kopieren>Text kopieren</button>
    </div>
    <p class="bst-hinweis" data-bst-lang hidden>Die Bestellung ist lang. Falls in der Mail etwas fehlt: „Text kopieren“ und einfügen.</p>
    <p class="bst-meldung" data-bst-meldung role="status"></p>
    <div class="hinweis hinweis--info bst-gesendet" data-bst-gesendet hidden>
      <p data-bst-gesendet-text></p>
      <p class="bst-gesendet__nr">Bestell-Nr.: <strong data-bst-nr></strong></p>
      <p><button type="button" class="knopf knopf--sekundaer" data-bst-neu>Neue Bestellung beginnen</button></p>
    </div>
    <details class="bst-vorschau" data-bst-vorschau>
      <summary>Mail ansehen</summary>
      <p class="bst-vorschau__kopf"><span>An: <strong>${empfaenger}</strong></span><span>Betreff: <strong data-bst-betreff></strong></span></p>
      <label class="sr-only" for="bst-vorschau-text">Text der Mail</label>
      <textarea id="bst-vorschau-text" class="bst-vorschau__text" data-bst-vorschau-text readonly rows="16" spellcheck="false"></textarea>
    </details>
  </section>`;
}

// „Preise laut <Quelle> (Listenpreis − <Rabatt> %, Aufdrucke einzeln).“: Quelle und Rabatt kommen aus den Preisdaten (erst nach dem Entschlüsseln)
export function preisFussText(konfig) {
  return `${preisQuelle(konfig)} (Listenpreis − ${zahlDe(konfig.preise.rabattProzent)} %, Aufdrucke einzeln).`;
}

function fussAbschnitt(konfig) {
  return `<div class="bst-fuss">
    <p>Die Seite speichert nichts auf einem Server. Deine Eingaben bleiben auf diesem Gerät, bis du sie per Mail verschickst.</p>
    <p>${esc(preisFussText(konfig))}</p>
    <p class="hinweis hinweis--info bst-speicher" data-bst-speicher hidden>Dein Browser speichert deine Eingaben gerade nicht. Bleib auf dieser Seite, bis du die Mail gesendet hast.</p>
    <p class="bst-fuss__aktion"><button type="button" class="bst-textknopf" data-bst-vergessen>Code auf diesem Gerät vergessen</button></p>
  </div>`;
}

// Das ganze Formular samt Einleitung und Fuß. konfig muss die Preise tragen (konfig.preise): Der Fuß nennt Quelle und Rabatt.
export function baueFormular(konfig) {
  return `<p class="bst-lead">${esc(TEXT_LEAD)}</p>
  <form class="bst-form" id="bst-form" novalidate>
  ${[werBestelltAbschnitt(konfig), kleidungAbschnitt(), teambedarfAbschnitt(konfig), bezahlungAbschnitt(konfig), sendenAbschnitt(konfig)].join("\n  ")}
  </form>
  ${fussAbschnitt(konfig)}`;
}
