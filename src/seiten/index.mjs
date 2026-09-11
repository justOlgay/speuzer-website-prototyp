// Startseite (P2) – Hero, nächste Spiele, Trainingszeiten, Aktuelles,
// Probetraining, Adresse & Anfahrt, Karneval. Ersetzt den P0-Platzhalter.

import { bild } from "../vorlagen/bild.mjs";
import { datumLang, naechsteSpiele, spielZeile, mailLink } from "../vorlagen/hilfen.mjs";

// Diese Seite ist immer die Wurzel ("/"), daher ist der Pfad zu den Assets
// immer "./" (siehe pfadZurWurzel() in tools/build.mjs für Tiefe 0).
const PFAD = "./";

const MAILTO_PROBETRAINING =
  "mailto:jugendleitung@sportfreunde04.de?subject=Probetraining%20beim%20FFV%20Sportfreunde%2004&body=Hallo%2C%0A%0Awir%20interessieren%20uns%20f%C3%BCr%20ein%20Probetraining.%0AJahrgang%20des%20Kindes%3A%20%0AVorerfahrung%3A%20%0A%0AViele%20Gr%C3%BC%C3%9Fe";

const TAG_KUERZEL = {
  Montag: "Mo",
  Dienstag: "Di",
  Mittwoch: "Mi",
  Donnerstag: "Do",
  Freitag: "Fr",
  Samstag: "Sa",
  Sonntag: "So",
};

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

// Platzhalter für Seiten, die im aktuellen Paket noch nicht existieren –
// gleiches Muster wie header.mjs/footer.mjs (siehe navigation.mjs).
function baldSpan(titel, { knopf = false } = {}) {
  const klassen = ["nav__bald", knopf ? "knopf" : null].filter(Boolean).join(" ");
  return `<span class="${klassen}" aria-disabled="true" title="Seite folgt">${escapeHtml(titel)}</span>`;
}

// Erster Satz eines Textes (bis zum ersten "." oder "!", das von Leerzeichen
// oder Textende gefolgt wird – vermeidet Fehltreffer bei Datumsangaben wie
// "06.09.2026"), ohne Emojis, maximal `maxLaenge` Zeichen.
function ersterSatz(text, maxLaenge = 160) {
  const ohneEmoji = String(text ?? "")
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
  const treffer = ohneEmoji.match(/^(.*?[.!])(?:\s|$)/);
  let satz = treffer ? treffer[1] : ohneEmoji;
  if (satz.length > maxLaenge) {
    satz = satz.slice(0, maxLaenge).trim();
  }
  return satz;
}

// ---------- D1: Hero ----------

function heroAbschnitt(daten) {
  const verein = daten.verein ?? {};
  return `<section class="hero abschnitt--blau">
  <div class="container hero__raster">
    <div class="hero__text">
      <p class="hero__kicker">Frankfurter Fußballverein Sportfreunde 1904 e.V. · Gallus</p>
      <h1 class="hero__titel">Fußball im Gallus – seit 1904.</h1>
      <p class="hero__lead">Elf Fußballmannschaften von der G-Jugend bis zu den Herren, eine Karnevalabteilung und ein eigener Platz an der Mainzer Landstraße. Wir sind ein Verein für Menschen: Gemeinschaft, Respekt und Freude am Spiel.</p>
      <p class="knopfzeile">
        <a class="knopf knopf--weiss knopf--gross" href="${escapeHtml(MAILTO_PROBETRAINING)}">Probetraining vereinbaren</a>
        ${baldSpan("Mitglied werden", { knopf: true })}
      </p>
      <ul class="hero__fakten" role="list">
        <li>Gegründet ${escapeHtml(String(verein.gruendung_jahr ?? ""))}</li>
        <li>${escapeHtml(String(verein.anzahl_mannschaften ?? ""))} Mannschaften</li>
        <li>${escapeHtml(verein.sportstaette?.strasse ?? "")}</li>
      </ul>
    </div>
    <div class="hero__wappen-block">
      <span class="hero__wappen-ring" aria-hidden="true"></span>
      <img class="hero__wappen" src="${PFAD}assets/logo/wappen-weiss.svg" width="219" height="213" alt="" aria-hidden="true">
    </div>
  </div>
</section>`;
}

// ---------- D2: Nächste Spiele ----------

function naechsteSpieleAbschnitt(daten) {
  const spiele = naechsteSpiele(daten, { anzahl: 5 });
  const zeilen = spiele
    .map((s, i) => spielZeile(s, { pfad: PFAD, mitTeam: true, naechstes: i === 0 }))
    .join("\n    ");
  const inhalt = spiele.length
    ? `<ul class="spiele" role="list">
    ${zeilen}
  </ul>`
    : `<p class="meta">Keine kommenden Spiele ab dem Build-Datum gefunden.</p>`;

  return `<section class="abschnitt">
  <div class="container">
    <h2>Nächste Spiele</h2>
    <p class="meta">Alle Mannschaften · Stand ${datumLang(daten.stand)}</p>
    ${inhalt}
    <p class="knopfzeile">
      ${baldSpan("Alle Spiele und Tabellen", { knopf: true })}
      <a href="https://justolgay.github.io/speuzer-spielplan/" rel="noopener" target="_blank">Spielplan im Handy-Kalender abonnieren</a>
    </p>
  </div>
</section>`;
}

// ---------- D3: Trainingszeiten ----------

function trainingszeitenAbschnitt(daten) {
  const verein = daten.verein ?? {};
  const zeilen = (daten.teams ?? [])
    .map((team) => {
      const trainingsZeile = (team.training ?? [])
        .map((t) => `${escapeHtml(TAG_KUERZEL[t.tag] ?? t.tag)} ${escapeHtml(t.von)}–${escapeHtml(t.bis)}`)
        .join("<br>");
      return `<tr>
        <td>${baldSpan(team.name)}</td>
        <td>${escapeHtml(team.jahrgang ?? "–")}</td>
        <td>${trainingsZeile}</td>
      </tr>`;
    })
    .join("\n      ");

  return `<section class="abschnitt--hell abschnitt">
  <div class="container">
    <h2>Trainingszeiten</h2>
    <p class="inhalt">Alle Mannschaften trainieren auf dem Vereinsplatz an der Mainzer Landstraße 480 – nur die Herren auf der Anlage von SW Griesheim am Rebstock.</p>
    <div class="tabelle-wrap">
      <table>
        <thead>
          <tr>
            <th>Mannschaft</th>
            <th>Jahrgang</th>
            <th>Training</th>
          </tr>
        </thead>
        <tbody>
      ${zeilen}
        </tbody>
      </table>
    </div>
    <div class="hinweis hinweis--info">
      <p style="margin:0;">${escapeHtml(verein.hinweise?.ferien ?? "")}</p>
    </div>
    <p class="knopfzeile">
      ${baldSpan("Zu den Mannschaften", { knopf: true })}
    </p>
  </div>
</section>`;
}

// ---------- D4: Aktuelles ----------

function aktuellesAbschnitt(daten) {
  const neueste = (daten.news ?? [])
    .slice()
    .sort((a, b) => String(b.datum).localeCompare(String(a.datum)))
    .slice(0, 2);

  const karten = neueste
    .map((n) => {
      const bildHtml = n.bild
        ? bild({
            pfad: PFAD,
            daten,
            name: n.bild.replace(/\.[^./]+$/, ""),
            alt: n.alt ?? "",
            sizes: "(min-width: 1024px) 50vw, 100vw",
            klasse: "karte__bild",
          })
        : "";
      const teaser = ersterSatz(n.text);
      return `<article class="karte">
      ${bildHtml}
      <p class="karte__meta">${datumLang(n.datum)} · ${escapeHtml(n.quelle)}</p>
      <h3 class="karte__titel">${escapeHtml(n.titel)}</h3>
      <p>${escapeHtml(teaser)}</p>
    </article>`;
    })
    .join("\n    ");

  return `<section class="abschnitt">
  <div class="container">
    <h2>Aktuelles</h2>
    <div class="raster raster--2">
    ${karten}
    </div>
    <p class="knopfzeile">
      ${baldSpan("Alle Meldungen", { knopf: true })}
    </p>
  </div>
</section>`;
}

// ---------- D5: Probetraining ----------

function probetrainingAbschnitt() {
  return `<section class="abschnitt--hell abschnitt">
  <div class="container">
    <h2>Einfach vorbeikommen und mittrainieren</h2>
    <p class="inhalt">Kinder und Jugendliche können ein- oder zweimal ohne Anmeldung mittrainieren. Vorher klären wir, ob in der passenden Mannschaft Platz ist – am einfachsten per E-Mail an die Jugendleitung mit dem Jahrgang des Kindes. Danach ist der Aufnahmeantrag Pflicht.</p>
    <ol class="schritte">
      <li><p>E-Mail an die Jugendleitung mit Jahrgang und Vorerfahrung</p></li>
      <li><p>Termin fürs Probetraining bekommen und ein- bis zweimal mitmachen</p></li>
      <li><p>Aufnahmeantrag ausfüllen – Beiträge und Unterlagen stehen unter „Mitglied werden“</p></li>
    </ol>
    <p class="knopfzeile">
      <a class="knopf" href="${escapeHtml(MAILTO_PROBETRAINING)}">Probetraining vereinbaren</a>
    </p>
  </div>
</section>`;
}

// ---------- D6: Adresse & Anfahrt ----------

function adresseAbschnitt(daten) {
  const verein = daten.verein ?? {};
  const sportstaette = verein.sportstaette ?? {};
  const hinweise = verein.hinweise ?? {};
  const karten = verein.karten ?? {};

  return `<section class="abschnitt">
  <div class="container">
    <h2>Sportplatz Mainzer Landstraße</h2>
    <div class="anfahrt__raster">
      <div>
        <address>
          <p>${escapeHtml(verein.name_register ?? "")}</p>
          <p>${escapeHtml(sportstaette.strasse ?? "")}</p>
          <p>${escapeHtml(sportstaette.plz ?? "")} ${escapeHtml(sportstaette.ort ?? "")}</p>
        </address>
        <p>${mailLink(verein.mail ?? "geschaeftsstelle@sportfreunde04.de")}</p>
        <p><a href="${telHref(verein.tel_geschaeftsstelle)}">Geschäftsstelle ${escapeHtml(verein.tel_geschaeftsstelle ?? "")}</a></p>
        <p><a href="${telHref(verein.tel_platzwart)}">Platzwart ${escapeHtml(verein.tel_platzwart ?? "")}</a></p>
        <p class="knopfzeile">
          <a class="knopf knopf--sekundaer" href="${escapeHtml(karten.apple ?? "")}" rel="noopener" target="_blank">Route in Apple Karten</a>
          <a class="knopf knopf--sekundaer" href="${escapeHtml(karten.google ?? "")}" rel="noopener" target="_blank">Route in Google Maps</a>
        </p>
      </div>
      <div>
        <div class="hinweis hinweis--info">
          <h3 style="margin:0 0 var(--sp-2);">Parken</h3>
          <p style="margin:0;">${escapeHtml(hinweise.parken ?? "")}</p>
          <p class="meta" style="margin-top:var(--sp-2);">Quelle: ${escapeHtml(hinweise.parken_quelle ?? "")}</p>
        </div>
        <div class="hinweis hinweis--offen" style="margin-top:var(--sp-4);">
          <p style="margin:0;">ÖPNV: Haltestelle und Fußweg folgen.</p>
        </div>
      </div>
    </div>
  </div>
</section>`;
}

// ---------- D7: Karneval ----------

function karnevalAbschnitt(daten) {
  const verein = daten.verein ?? {};
  return `<section class="abschnitt--hell abschnitt abschnitt--eng">
  <div class="container">
    <article class="karte">
      <h2 class="karte__titel">Karnevalabteilung „Die Schnauzer“</h2>
      <p>Fünf Gruppen von den Little Fruities bis zu den Dreamboys – die zweite Abteilung des Vereins.</p>
      <p class="knopfzeile">
        ${baldSpan("Zur Karnevalabteilung")}
        ${mailLink(verein.mails?.karneval ?? "karnevalabteilung@sportfreunde04.de")}
      </p>
    </article>
  </div>
</section>`;
}

export function seite(daten) {
  const inhalt = [
    heroAbschnitt(daten),
    naechsteSpieleAbschnitt(daten),
    trainingszeitenAbschnitt(daten),
    aktuellesAbschnitt(daten),
    probetrainingAbschnitt(),
    adresseAbschnitt(daten),
    karnevalAbschnitt(daten),
  ].join("\n");

  return {
    url: "/",
    title: "Start",
    // Wörtlicher Text lt. Plan hat 171 Zeichen (Grenze im Plan selbst 120–170,
    // dazu hartes Gate in tools/pruefen.mjs bei > 170) – kleinstmögliche
    // Korrektur: abschließenden Punkt entfernt (170 Zeichen), Wortlaut sonst
    // unverändert. Siehe Abschlussbericht, Abschnitt „Abweichungen“.
    description:
      "F.F.V. Sportfreunde 04 im Frankfurter Gallus: Trainingszeiten, nächste Spiele und Aktuelles unserer elf Fußballmannschaften. Probetraining vereinbaren und Mitglied werden",
    inhalt,
  };
}
