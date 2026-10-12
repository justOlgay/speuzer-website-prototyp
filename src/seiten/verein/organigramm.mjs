// Wer macht was /verein/organigramm/ (M13, 11.10.2026) – das Organigramm des Vereins für Mitglieder, neue Mitglieder und den
// Vorstand. Wunsch der 1. Vorsitzenden, Entscheidung Olgay 11.10.2026: Die Seite zeigt nur die Ämter, die es gibt; für alles
// andere steht unten die Geschäftsstelle.
//
// Quellen (nichts davon steht in diesem Modul):
//   data/vorstand.json     Namen, Funktionen, Fotos und Funktions-Postfächer (öffentlich, wie die Vorstandsseite)
//   data/organigramm.json  Bereiche, Reihenfolge und die Zuordnung Aufgabe -> Funktion (Schreibweise der Funktion wie in
//                          vorstand.json; der Bau bricht ab, wenn eine Funktion dort fehlt)
//   data/geschaeftsstelle.json  Telefon und E-Mail der Geschäftsstelle (Rückfall: data/verein.json, wie /kontakt/)
// Unbesetzte Ämter (name null, z. B. Schriftführer) werden nicht gezeigt, ein Bereich ohne Person entfällt.
//
// Gestaltung wie die übrigen Seiten: Seitenkopf mit Rücklink, Vereinsblau, Barlow/Inter, Fotos über bild() mit dem
// Initialen-Kreis als Rückfall (wie Vorstand und Trainerteam). Das Stylesheet der Seite steht unten in ORG_CSS und kommt über
// kopfZusatz in die Seite – site.css bleibt unverändert, damit das appack-Paket außer dieser Seite byte-gleich bleibt.
// App-Modus (?app=1): Links führen wie bei den anderen Workspace-Seiten in die App-Seiten, siehe APP_MODUS_SKRIPT.
//
// Der Link auf diese Seite steht nur mit ORGANIGRAMM_LIVE (src/vorlagen/hilfen.mjs) auf der Verein-Seite.

import { eMailSchreibenLink, initialen, ruecklink, telefonAnzeige, APP_MODUS_SKRIPT } from "../../vorlagen/hilfen.mjs";
import { bild } from "../../vorlagen/bild.mjs";

// Diese Seite liegt immer unter "/verein/organigramm/" (Tiefe 2), daher immer "../../" (siehe pfadZurWurzel() in
// tools/build.mjs).
const PFAD = "../../";

function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function telHref(nummer) {
  return "tel:" + String(nummer ?? "").replace(/[^\d+]/g, "");
}

// Kommentare und Einrückung aus dem Stylesheet nehmen (wie minifiziereCss() in tools/build.mjs): Die Entwicklerkommentare
// gehören nicht in die ausgelieferte Seite.
function kompakt(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([{}:;,])\s*/g, "$1")
    .trim();
}

// Wie auf /kontakt/: data/geschaeftsstelle.json (appack-Worksheet) zuerst, data/verein.json als Rückfall.
function ausWorksheetOderVerein(wert, fallback) {
  const text = String(wert ?? "").trim();
  return text || fallback;
}

// ---------- Stylesheet nur dieser Seite ----------
// Nur Tokens aus assets/css/tokens.css (Vereinsblau, keine weitere Farbe). Mobil eine Spalte; die Bereiche hängen an einem
// Stamm mit Knoten (links), der Vorstand ist der gefüllte Knoten oben. Ab 640px stehen die Personen eines Bereichs in zwei
// Spalten, ab 1024px steht der Bereich links und seine Karte rechts.
const ORG_CSS = `
.org {
  --org-knoten: 18px;
  --org-versatz: 32px;
  --org-abstand: var(--sp-6);
  --org-oben: 5px;
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--org-abstand);
}

/* Knoten auf dem Stamm: Ring in Vereinsblau, der Vorstand (Wurzel) gefüllt */
.org-ast {
  position: relative;
  padding-left: var(--org-versatz);
}

.org-ast::before {
  content: "";
  position: absolute;
  z-index: 1;
  left: 0;
  top: var(--org-oben);
  width: var(--org-knoten);
  height: var(--org-knoten);
  box-sizing: border-box;
  border: 3px solid var(--blau-700);
  border-radius: 50%;
  background: var(--bg);
}

.org-ast--wurzel::before {
  background: var(--blau-700);
}

/* Stamm: vom Knoten bis zum Knoten des nächsten Bereichs (beim letzten Bereich endet er am Knoten) */
.org-ast:not(:last-child)::after {
  content: "";
  position: absolute;
  z-index: 0;
  left: calc(var(--org-knoten) / 2 - 1px);
  top: calc(var(--org-oben) + var(--org-knoten) / 2);
  bottom: calc(-1 * (var(--org-abstand) + var(--org-oben) + var(--org-knoten) / 2));
  width: 2px;
  background: var(--line);
}

.org-kopf h2 {
  margin: 0;
}

.org-kopf__aufgaben {
  margin: var(--sp-2) 0 0;
  max-width: 34ch;
  color: var(--ink-2);
}

.org-karte {
  margin-top: var(--sp-4);
  padding: var(--sp-4);
  background: var(--surface);
  border-radius: var(--r-lg);
  box-shadow: var(--sh-1);
}

/* ein einzelnes Amt: Karte nur so breit wie nötig (eine Spalte), statt eine halbleere Fläche aufzuspannen */
.org-karte--einzeln {
  max-width: 28rem;
}

.org-karte--einzeln .org-personen {
  grid-template-columns: minmax(0, 1fr);
}

.org-personen {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: var(--sp-4);
}

.org-person {
  display: flex;
  align-items: flex-start;
  gap: var(--sp-3);
  min-width: 0;
}

.org-person + .org-person {
  padding-top: var(--sp-4);
  border-top: 1px solid var(--line);
}

/* Porträt oder Initialen: der 48px-Kreis der Trainerzeilen (.person-mini__bild), hier 56px */
.org .person-mini__bild {
  width: 56px;
  height: 56px;
}

.org .person-mini__bild--platzhalter {
  font-size: var(--fs-md);
}

.org-person__text {
  flex: 1 1 auto;
  min-width: 0;
  overflow-wrap: anywhere;
}

.org-person__aufgaben {
  margin-top: 2px;
  font-size: var(--fs-sm);
  color: var(--ink);
}

.org-person__text .person__mail {
  margin-top: var(--sp-1);
}

/* Geschäftsstelle unten: Adresse als Text unter den Knöpfen */
.org-adresse {
  overflow-wrap: anywhere;
}

@media (min-width: 480px) {
  .org {
    --org-oben: 9px;
  }
}

@media (min-width: 640px) {
  .org-karte {
    padding: var(--sp-5);
  }

  .org-personen {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--sp-5);
  }

  .org-person + .org-person {
    padding-top: 0;
    border-top: 0;
  }
}

@media (min-width: 1024px) {
  .org {
    --org-versatz: 48px;
    --org-abstand: var(--sp-7);
  }

  .org-ast {
    display: grid;
    grid-template-columns: minmax(220px, 300px) minmax(0, 1fr);
    column-gap: var(--sp-6);
    align-items: start;
  }

  .org-karte {
    margin-top: 0;
  }
}

@media print {
  .org-ast {
    break-inside: avoid;
  }
}
`;

// ---------- Personen ----------

// Porträt (bild(), dekorativ, der Name steht daneben) oder Initialen-Kreis – wie Trainerteam und Vorstand.
function avatarHtml(person, daten) {
  if (person.foto) {
    return bild({
      pfad: PFAD,
      daten,
      name: person.foto.quelle,
      alt: "",
      sizes: "56px",
      klasse: "person-mini__bild",
    });
  }
  return `<span class="person-mini__bild person-mini__bild--platzhalter" aria-hidden="true">${escapeHtml(initialen(person.name))}</span>`;
}

// Das lange Wort "Kinderschutzbeauftragter" darf auf sehr schmalen Handys (320px) an der Wortfuge mit Trennstrich brechen
// (&shy;) statt mitten im Wort. Muss NACH escapeHtml() laufen (die Entity darf nicht mit-escaped werden).
function funktionHtml(funktion) {
  return escapeHtml(funktion).replace("Kinderschutzbeauftragter", "Kinderschutz&shy;beauftragter");
}

// "E-Mail schreiben ›" wie auf der Vorstandsseite (eMailSchreibenLink, Adresse im title); der Name im aria-label
// unterscheidet die 15 gleich lautenden Links für Screenreader ("E-Mail schreiben an …" enthält den sichtbaren Text).
function mailHtml(person) {
  if (!person.mail) return "";
  const link = eMailSchreibenLink(person.mail).replace(
    "<a ",
    `<a aria-label="E-Mail schreiben an ${escapeHtml(person.name)}" `
  );
  return `<p class="person__mail">${link}</p>`;
}

function personHtml({ person, aufgaben }, daten) {
  return `<li class="org-person">
          ${avatarHtml(person, daten)}
          <div class="org-person__text">
            <p class="person__name">${escapeHtml(person.name)}</p>
            <p class="person__funktion">${funktionHtml(person.funktion)}</p>
            ${aufgaben ? `<p class="org-person__aufgaben">${escapeHtml(aufgaben)}</p>` : ""}
            ${mailHtml(person)}
          </div>
        </li>`;
}

// Ämter des Bereichs -> Personen aus data/vorstand.json (in deren Reihenfolge). Eine Funktion, die dort nicht steht, ist ein
// Tippfehler in data/organigramm.json und bricht den Bau ab; ein unbesetztes Amt (name null) wird übersprungen.
function personenDesBereichs(bereich, nachFunktion) {
  const personen = [];
  for (const amt of bereich.aemter ?? []) {
    const treffer = nachFunktion.get(amt.funktion);
    if (!treffer) {
      throw new Error(
        `organigramm.mjs: Funktion "${amt.funktion}" (Bereich "${bereich.titel}") steht nicht in data/vorstand.json`
      );
    }
    for (const person of treffer) {
      if (!person.name) continue;
      personen.push({ person, aufgaben: amt.aufgaben });
    }
  }
  return personen;
}

// ---------- Abschnitte ----------

function seitenkopfAbschnitt(seite) {
  return `<section class="abschnitt seitenkopf">
  <div class="container">
    ${ruecklink(`${PFAD}verein/`, "Verein")}
    <h1>${escapeHtml(seite.titel)}</h1>
    <p class="seitenkopf__lead">${escapeHtml(seite.lead)}</p>
  </div>
</section>`;
}

function bereichHtml(bereich, personen, daten) {
  const klassen = bereich.wurzel ? "org-ast org-ast--wurzel" : "org-ast";
  const karteKlassen = personen.length === 1 ? "org-karte org-karte--einzeln" : "org-karte";
  const aufgaben = bereich.aufgaben ? `\n      <p class="org-kopf__aufgaben">${escapeHtml(bereich.aufgaben)}</p>` : "";
  return `<li class="${klassen}" data-bereich="${escapeHtml(bereich.id)}">
    <div class="org-kopf">
      <h2>${escapeHtml(bereich.titel)}</h2>${aufgaben}
    </div>
    <div class="${karteKlassen}">
      <ul class="org-personen" role="list">
        ${personen.map((p) => personHtml(p, daten)).join("\n        ")}
      </ul>
    </div>
  </li>`;
}

function baumAbschnitt(bereiche, daten) {
  return `<section class="abschnitt">
  <div class="container">
    <ol class="org" role="list" aria-label="Bereiche des Vereins">
  ${bereiche.map(({ bereich, personen }) => bereichHtml(bereich, personen, daten)).join("\n  ")}
    </ol>
  </div>
</section>`;
}

// Unten: alles, was kein Amt oben abdeckt, geht an die Geschäftsstelle (blauer Abschnitt wie auf "Mach mit & Ehrenamt").
function geschaeftsstelleAbschnitt(geschaeftsstelle, daten) {
  const kontakt = daten.geschaeftsstelle?.kontakt ?? {};
  const verein = daten.verein ?? {};
  const telefon = ausWorksheetOderVerein(kontakt.phoneNumber, verein.tel_geschaeftsstelle);
  const mail = ausWorksheetOderVerein(kontakt.email, verein.mail);
  if (!telefon || !mail) {
    throw new Error("organigramm.mjs: Telefon oder E-Mail der Geschäftsstelle fehlt (data/geschaeftsstelle.json, data/verein.json)");
  }
  const mailAnzeige = escapeHtml(mail).replace("@", "<wbr>@");
  return `<section class="abschnitt--blau abschnitt abschnitt--eng">
  <div class="container fluss">
    <h2>${escapeHtml(geschaeftsstelle.titel)}</h2>
    <p>${escapeHtml(geschaeftsstelle.text)}</p>
    <p class="knopfzeile">
      <a class="knopf knopf--weiss" href="${escapeHtml(telHref(telefon))}">Anrufen: ${escapeHtml(telefonAnzeige(telefon))}</a>
      <a class="knopf knopf--weiss" href="mailto:${escapeHtml(mail)}">E-Mail schreiben</a>
    </p>
    <p class="org-adresse">${mailAnzeige}</p>
  </div>
</section>`;
}

// ---------- Seite ----------

export function seite(daten) {
  const org = daten.organigramm;
  if (!org?.seite || !Array.isArray(org.bereiche) || !org.geschaeftsstelle) {
    throw new Error("organigramm.mjs: data/organigramm.json fehlt oder ist unvollständig (seite, bereiche, geschaeftsstelle)");
  }

  const vorstand = daten.vorstand ?? [];
  const nachFunktion = new Map();
  for (const person of vorstand) {
    if (!nachFunktion.has(person.funktion)) nachFunktion.set(person.funktion, []);
    nachFunktion.get(person.funktion).push(person);
  }

  const bereiche = org.bereiche
    .map((bereich) => ({ bereich, personen: personenDesBereichs(bereich, nachFunktion) }))
    .filter(({ personen }) => personen.length > 0);

  // Wer in data/vorstand.json steht, aber im Organigramm fehlt, fällt hier auf (z. B. ein neu besetztes Amt).
  const gezeigt = new Set(bereiche.flatMap(({ personen }) => personen.map(({ person }) => person)));
  const fehlend = vorstand.filter((person) => person.name && !gezeigt.has(person));
  if (fehlend.length) {
    console.warn(
      `  Warnung: Organigramm zeigt nicht: ${fehlend.map((person) => `${person.name} (${person.funktion})`).join(", ")} – in data/organigramm.json einordnen`
    );
  }

  const inhalt = [
    seitenkopfAbschnitt(org.seite),
    baumAbschnitt(bereiche, daten),
    geschaeftsstelleAbschnitt(org.geschaeftsstelle, daten),
  ].join("\n");

  return {
    url: "/verein/organigramm/",
    // Stylesheet der Seite und App-Modus (?app=1): Links führen in die App-Seiten, siehe hilfen.mjs
    kopfZusatz: `\n<style>${kompakt(ORG_CSS)}</style>${APP_MODUS_SKRIPT}`,
    title: org.seite.titel,
    description: org.seite.beschreibung,
    inhalt,
  };
}
