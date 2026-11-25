// Bestellung für dein Team /bestellung/ (25.11.2026) – Prototyp einer Bestellseite für Trainerinnen und Trainer.
// Am Handy wird für die eigene Mannschaft Vereinskleidung je Person und Teambedarf (Trainingsmaterial) zusammengestellt;
// ein Knopf öffnet das eigene Mailprogramm mit der fertigen Mail an die interne Bestelladresse (mailto). Es gibt keinen
// Server, kein Konto und keine Datenbank; der Entwurf bleibt nur auf dem Gerät (localStorage).
//
// Aufbau: Dieses Modul baut nur das Gerüst (Kopf, Felder zu „Wer bestellt?“, Teambedarf, Bezahlung, Übersicht, Fuß) und
// bettet die Konfiguration ein (#bestellung-konfig: data/bestellung.json plus die Mannschaften aus data/teams.json).
// Die Karten je Person, die Prüfung und die Mail baut das Skript assets/js/bestellung/seite.js im Browser; Betreff, Text
// und mailto kommen aus assets/js/bestellung/mailtext.js (reine Funktionen, in Node getestet: tools/bestellung-test/).
//
// Ein Prototyp: nicht im Menü, nicht in der Sitemap (ohneSitemap in seite(), tools/build.mjs), nicht im appack-Paket
// (tools/appack-paket.mjs: AUSGESCHLOSSENE_DATEIEN). Den Prüfmodus (Hinweis oben, „[TEST]“ im Betreff, Testzeile in der
// Mail) schaltet data/bestellung.json › einstellungen › pruefmodus; zum Livegang auf false setzen und neu bauen.

import { pruefeKonfig } from "../../assets/js/bestellung/mailtext.js";

// Diese Seite liegt als Workspace-Seite unter docs/ws/ (build.mjs schreibt nur den Inhalt um, nicht den Kopf):
// die Pfade in kopfZusatz gelten daher schon für docs/ws/.
const PFAD_WS = "../";

function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

// JSON sicher in ein <script type="application/json"> einbetten ("</script>" und "<!--" dürfen im Text nicht vorkommen).
function jsonImSkript(wert) {
  return JSON.stringify(wert).replace(/</g, "\\u003c");
}

// Konfiguration der Seite: data/bestellung.json (ohne den Pflegehinweis) plus die Mannschaften aus data/teams.json
// (Reihenfolge der Datei; angezeigt wird name, die Bestell-Nr. nutzt slug). Wird auch von den Tests benutzt.
export function baueKonfig(daten) {
  const roh = daten && daten.bestellung;
  if (!roh) throw new Error("bestellung.mjs: data/bestellung.json fehlt");
  const { _hinweis, ...rest } = roh;
  const teams = Array.isArray(daten.teams) ? daten.teams : [];
  const konfig = { ...rest, mannschaften: teams.map((t) => ({ slug: t.slug, name: t.name })) };
  if (konfig.mannschaften.length === 0) console.warn("Bestellseite: data/teams.json enthält keine Mannschaften – die Auswahl auf der Seite bleibt leer.");
  pruefeKonfig(konfig);
  return konfig;
}

// ---------- Abschnitte ----------

function kopfAbschnitt(konfig) {
  const pruefmodus = konfig.einstellungen.pruefmodus
    ? `
    <div class="hinweis hinweis--info bst-pruefmodus" role="note">
      <p><strong>Prototyp:</strong> Die Mail geht als TEST an die Bestelladresse und löst keine Bestellung aus.</p>
    </div>`
    : "";
  return `<header class="bst-kopf">${pruefmodus}
    <h1 id="bst-titel" tabindex="-1">Bestellung für dein Team</h1>
    <p class="bst-lead">Hier stellst du zusammen, was dein Team braucht. Am Ende öffnet sich dein Mailprogramm mit der fertigen Bestellung an den Verein – du musst nur noch auf „Senden“ tippen.</p>
  </header>
  <noscript><div class="hinweis hinweis--offen"><p>Diese Seite braucht JavaScript. Bitte schalte es in deinem Browser ein.</p></div></noscript>
  <div class="hinweis hinweis--offen bst-ladefehler" data-bst-ladefehler hidden role="alert"><p>Die Seite konnte nicht geladen werden. Bitte lade sie neu.</p></div>`;
}

function werBestelltAbschnitt(konfig) {
  const mannschaften = konfig.mannschaften
    .map((m) => `<option value="${escapeHtml(m.slug)}">${escapeHtml(m.name)}</option>`)
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
        <input type="text" id="bst-name" data-feld="name" data-schluessel="name" autocomplete="name" maxlength="60">
      </div>
      <div class="bst-feld">
        <label for="bst-tel">Telefon (freiwillig)</label>
        <input type="tel" id="bst-tel" data-feld="tel" autocomplete="tel" inputmode="tel" maxlength="30">
      </div>
      <div class="bst-feld">
        <label for="bst-bis">Gebraucht bis (freiwillig)</label>
        <input type="date" id="bst-bis" data-feld="bis">
      </div>
    </div>
  </section>`;
}

// Die Karten je Person baut seite.js (aus dem Katalog der Konfiguration); hier steht nur der Rahmen.
function kleidungAbschnitt() {
  return `<section class="bst-abschnitt" aria-labelledby="bst-h-kleidung">
    <h2 id="bst-h-kleidung">Kleidung je Person</h2>
    <p class="bst-hinweis">Name und Nummer werden auf Trikot, Präsi-Jacke und Winterjacke gedruckt.</p>
    <div class="bst-personen" id="bst-personen" data-bst-personen></div>
    <p class="bst-keine" id="bst-keine">Noch keine Person. Tippe auf „+ Person hinzufügen“.</p>
    <p class="bst-aktion"><button type="button" class="knopf knopf--sekundaer" id="bst-person-neu" data-bst-person-neu data-schluessel="leer">+ Person hinzufügen</button></p>
  </section>`;
}

function teambedarfAbschnitt(konfig) {
  const zeilen = konfig.teambedarf
    .map((t) => {
      const id = escapeHtml(t.id);
      const name = escapeHtml(t.anzeige);
      return `<li class="bst-posten" data-teamposten="${id}">
        <div class="bst-posten__kopf">
          <span class="bst-posten__name" id="bst-t-${id}">${name}</span>
          <div class="bst-schritt" role="group" aria-labelledby="bst-t-${id}">
            <button type="button" class="bst-schritt__knopf" data-schritt="-1" aria-label="${name}: eine weniger">−</button>
            <input type="number" class="bst-schritt__wert" data-n inputmode="numeric" min="0" max="999" step="1" value="0" aria-label="${name}: Anzahl">
            <button type="button" class="bst-schritt__knopf" data-schritt="1" aria-label="${name}: eine mehr">+</button>
          </div>
        </div>
        <div class="bst-posten__details bst-feld" data-details-feld hidden>
          <label for="bst-d-${id}">Details</label>
          <input type="text" id="bst-d-${id}" data-details maxlength="100" autocomplete="off" aria-label="Details zu ${name}" placeholder="${escapeHtml(t.platzhalter || "")}">
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
      <textarea id="bst-sonstiges" data-feld="sonstiges" rows="3" maxlength="600"></textarea>
    </div>
    <p class="bst-hinweis">Preise klärt der Vorstand.</p>
  </section>`;
}

// Je Block (Kleidung, Teambedarf) Kontrollkästchen mit den Antworten aus data/bestellung.json in deren Reihenfolge: Mehrere Antworten
// sind möglich, mindestens eine ist Pflicht (assets/js/bestellung/mailtext.js › pruefeBestellung). Das Feld für den Namen des Sponsors
// zeigt seite.js nur bei angehaktem Sponsor (Antwort mit „mitName“).
function bezahlGruppe(konfig, block, frage) {
  const optionen = konfig.bezahlung
    .map(
      (b) => `<label class="bst-option"><input type="checkbox" name="bez-${block}" value="${escapeHtml(b.id)}" data-bez-wert><span>${escapeHtml(b.text)}</span></label>`
    )
    .join("\n        ");
  return `<fieldset class="bst-gruppe" data-bezahlung="${block}" data-schluessel="bezahlung:${block}" aria-describedby="bst-bez-${block}-hilfe" hidden>
      <legend>${frage}</legend>
      <p class="bst-hinweis" id="bst-bez-${block}-hilfe">Mehrere möglich. Wie geteilt wird, kannst du unten bei „Hinweis zur Bezahlung“ schreiben.</p>
      <div class="bst-optionen">
        ${optionen}
      </div>
      <div class="bst-feld bst-sponsor" data-sponsor-feld hidden>
        <label for="bst-sponsor-${block}">Name des Sponsors</label>
        <input type="text" id="bst-sponsor-${block}" data-feld="bezahlung.${block}Sponsor" data-schluessel="sponsor:${block}" maxlength="80" autocomplete="off">
      </div>
    </fieldset>`;
}

function bezahlungAbschnitt(konfig) {
  return `<section class="bst-abschnitt" aria-labelledby="bst-h-bezahlung">
    <h2 id="bst-h-bezahlung">Bezahlung</h2>
    <p class="bst-hinweis" data-bst-bezahlung-leer>Sobald du Kleidung oder Teambedarf ausgewählt hast, fragen wir hier, wer zahlt.</p>
    ${bezahlGruppe(konfig, "kleidung", "Wer zahlt die Kleidung?")}
    ${bezahlGruppe(konfig, "teambedarf", "Wer zahlt den Teambedarf?")}
    <div class="bst-feld">
      <label for="bst-hinweis-bezahlung">Hinweis zur Bezahlung (freiwillig)</label>
      <textarea id="bst-hinweis-bezahlung" data-feld="hinweisBezahlung" rows="2" maxlength="400"></textarea>
    </div>
    <div class="bst-feld">
      <label for="bst-hinweis">Sonstiger Hinweis (freiwillig)</label>
      <textarea id="bst-hinweis" data-feld="hinweis" rows="2" maxlength="400"></textarea>
    </div>
  </section>`;
}

function sendenAbschnitt(konfig) {
  const empfaenger = escapeHtml(konfig.einstellungen.empfaenger);
  return `<section class="bst-abschnitt" id="bst-senden-abschnitt" aria-labelledby="bst-h-senden">
    <h2 id="bst-h-senden">Übersicht und Senden</h2>
    <dl class="bst-uebersicht">
      <div><dt>Personen</dt><dd data-u="personen">0</dd></div>
      <div><dt>Teile</dt><dd data-u="teile">0</dd></div>
      <div><dt>Summe (Preise für Eltern bzw. Spieler)</dt><dd data-u="summe">0 €</dd></div>
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

function fussAbschnitt(konfig) {
  return `<div class="bst-fuss">
    <p>Die Seite speichert nichts auf einem Server. Deine Eingaben bleiben auf diesem Gerät, bis du sie per Mail verschickst.</p>
    <p>Preise für Eltern bzw. Spieler, Stand ${escapeHtml(konfig.einstellungen.preisstand)}.</p>
    <p class="hinweis hinweis--info bst-speicher" data-bst-speicher hidden>Dein Browser speichert deine Eingaben gerade nicht. Bleib auf dieser Seite, bis du die Mail gesendet hast.</p>
  </div>`;
}

export function seite(daten) {
  const konfig = baueKonfig(daten);
  const inhalt = `<div class="bst" id="bestellung" data-bst-wurzel>
  ${kopfAbschnitt(konfig)}
  <form class="bst-form" id="bst-form" novalidate>
  ${[werBestelltAbschnitt(konfig), kleidungAbschnitt(), teambedarfAbschnitt(konfig), bezahlungAbschnitt(konfig), sendenAbschnitt(konfig)].join("\n  ")}
  </form>
  ${fussAbschnitt(konfig)}
</div>
<script type="application/json" id="bestellung-konfig">${jsonImSkript(konfig)}</script>`;

  return {
    url: "/bestellung/",
    title: "Bestellung für dein Team",
    description:
      "Bestellung für dein Team: Vereinskleidung je Person und Trainingsmaterial zusammenstellen und als fertige Mail an den Verein schicken.",
    // Führendes "\n": workspace.html setzt "{{kopfZusatz}}" ans Ende der Stylesheet-Zeile. noindex: Prototyp, nicht in Suchmaschinen.
    // ohneSitemap: tools/build.mjs lässt die Seite aus docs/sitemap.xml weg (wie die Trainerseite).
    ohneSitemap: true,
    kopfZusatz:
      "\n" +
      [
        `<meta name="robots" content="noindex">`,
        `<link rel="stylesheet" href="${PFAD_WS}assets/css/bestellung.css">`,
        `<link rel="modulepreload" href="${PFAD_WS}assets/js/bestellung/mailtext.js">`,
        `<script type="module" src="${PFAD_WS}assets/js/bestellung/seite.js"></script>`,
      ].join("\n"),
    inhalt,
    bodyclass: "bestellung",
  };
}
