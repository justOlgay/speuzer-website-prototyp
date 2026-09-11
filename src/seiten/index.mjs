// Startseite (P2, Korrekturen P2-K) – Hero, nächste Spiele, Trainingszeiten,
// Aktuelles, Probetraining, Adresse & Anfahrt, Karneval.

import { bild } from "../vorlagen/bild.mjs";
import { datumLang, naechsteSpiele, spielZeile, mailLink, jahrgangText, PROBETRAINING_MAILTO } from "../vorlagen/hilfen.mjs";

// Diese Seite ist immer die Wurzel ("/"), daher ist der Pfad zu den Assets
// immer "./" (siehe pfadZurWurzel() in tools/build.mjs für Tiefe 0).
const PFAD = "./";

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

// ---------- K4: Teaser-Regel ----------

function istKomplettVersal(text) {
  const buchstaben = text.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ]/g, "");
  return buchstaben.length > 0 && buchstaben === buchstaben.toUpperCase() && buchstaben !== buchstaben.toLowerCase();
}

// Text in Sätze zerlegen: "." "!" "?" zählen nur als Satzende, wenn ihnen ein
// Leerzeichen/Textende folgt (sonst z. B. "19.09.2026" mitten im Satz) und
// ihnen kein einzelner Buchstabe nach einem Punkt/Leerzeichen vorausgeht
// (Abkürzungen wie "F.F.V." oder "e.V.").
function teiltSaetze(text) {
  const saetze = [];
  let start = 0;
  const re = /[.!?]+/g;
  let treffer;
  while ((treffer = re.exec(text))) {
    const ende = treffer.index + treffer[0].length;
    const danach = text.slice(ende, ende + 1);
    if (danach !== "" && !/\s/.test(danach)) continue;

    const davor1 = text[treffer.index - 1] ?? "";
    const davor2 = text[treffer.index - 2] ?? "";
    const istAbkuerzung =
      /[A-Za-zÀ-ÖØ-öø-ÿ]/.test(davor1) && (davor2 === "" || davor2 === "." || /\s/.test(davor2));
    if (istAbkuerzung) continue;

    saetze.push(text.slice(start, ende).trim());
    start = ende;
  }
  const rest = text.slice(start).trim();
  if (rest) saetze.push(rest);
  return saetze;
}

// Ersten Satz, der (a) nicht komplett in Versalien steht und (b) mindestens
// 40 Zeichen hat; Ausrufezeichen-Ketten auf eines gekürzt; auf `max` Zeichen
// an Wortgrenze mit „…" gekürzt.
function teaser(text, max = 160) {
  const bereinigt = String(text ?? "")
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, "")
    .replace(/!{2,}/g, "!")
    .replace(/\s+/g, " ")
    .trim();

  const saetze = teiltSaetze(bereinigt);
  let gewaehlt =
    saetze.find((s) => s.length >= 40 && !istKomplettVersal(s)) ??
    saetze.find((s) => s.length > 0) ??
    bereinigt;

  if (gewaehlt.length > max) {
    const abschnitt = gewaehlt.slice(0, max);
    const letzterRaum = abschnitt.lastIndexOf(" ");
    gewaehlt = (letzterRaum > 0 ? abschnitt.slice(0, letzterRaum) : abschnitt).trim() + "…";
  }
  return gewaehlt;
}

// ---------- D1: Hero (K1: Anordnung < 1024px geändert) ----------

function heroAbschnitt(daten) {
  const verein = daten.verein ?? {};
  return `<section class="hero abschnitt--blau">
  <div class="container hero__raster">
    <p class="hero__kicker">Frankfurter Fußballverein Sportfreunde 1904 e.V. · Gallus</p>
    <div class="hero__wappen-block">
      <span class="hero__wappen-ring" aria-hidden="true"></span>
      <img class="hero__wappen" src="${PFAD}assets/logo/wappen-weiss.svg" width="219" height="213" alt="" aria-hidden="true">
    </div>
    <div class="hero__inhalt">
      <h1 class="hero__titel">Fußball im Gallus – seit 1904.</h1>
      <p class="hero__lead">Elf Fußballmannschaften von der G-Jugend bis zu den Herren, eine Karnevalabteilung und ein eigener Platz an der Mainzer Landstraße. Wir sind ein Verein für Menschen: Gemeinschaft, Respekt und Freude am Spiel.</p>
      <p class="knopfzeile">
        <a class="knopf knopf--weiss knopf--gross" href="${escapeHtml(PROBETRAINING_MAILTO)}">Probetraining vereinbaren</a>
        ${baldSpan("Mitglied werden", { knopf: true })}
      </p>
      <ul class="hero__fakten" role="list">
        <li>Gegründet ${escapeHtml(String(verein.gruendung_jahr ?? ""))}</li>
        <li>${escapeHtml(String(verein.anzahl_mannschaften ?? ""))} Mannschaften</li>
        <li>${escapeHtml(verein.sportstaette?.strasse ?? "")}</li>
      </ul>
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
  <div class="container fluss">
    <h2>Nächste Spiele</h2>
    <p class="meta">Alle Mannschaften · Stand ${datumLang(daten.stand)}</p>
    ${inhalt}
    <p class="knopfzeile">
      <a class="knopf" href="${PFAD}spielplan/">Alle Spiele und Tabellen</a>
      <a href="https://justolgay.github.io/speuzer-spielplan/" rel="noopener" target="_blank">Spielplan im Handy-Kalender abonnieren</a>
    </p>
  </div>
</section>`;
}

// ---------- D3: Trainingszeiten (K7: .trainingsraster statt Tabelle) ----------

function trainingszeitenAbschnitt(daten) {
  const verein = daten.verein ?? {};
  const zeilen = (daten.teams ?? [])
    .map((team) => {
      const einheiten = (team.training ?? [])
        .map((t) => `<span>${escapeHtml(TAG_KUERZEL[t.tag] ?? t.tag)} ${escapeHtml(t.von)}–${escapeHtml(t.bis)}</span>`)
        .join("\n        ");
      return `<li class="trainingsraster__zeile">
        <span class="trainingsraster__name">${baldSpan(team.name)}</span>
        <span class="trainingsraster__jahrgang meta">${escapeHtml(jahrgangText(team))}</span>
        <span class="trainingsraster__einheiten">
        ${einheiten}
        </span>
      </li>`;
    })
    .join("\n      ");

  return `<section class="abschnitt--hell abschnitt">
  <div class="container fluss">
    <h2>Trainingszeiten</h2>
    <p class="inhalt">Alle Mannschaften trainieren auf dem Vereinsplatz an der Mainzer Landstraße 480 – nur die Herren auf der Anlage von SW Griesheim am Rebstock.</p>
    <ul class="trainingsraster" role="list">
      <li class="trainingsraster__kopf" aria-hidden="true">
        <span>Mannschaft</span><span>Jahrgang</span><span>Training</span>
      </li>
      ${zeilen}
    </ul>
    <div class="hinweis hinweis--info">
      <p style="margin:0;">${escapeHtml(verein.hinweise?.ferien ?? "")}</p>
    </div>
    <p class="knopfzeile">
      ${baldSpan("Zu den Mannschaften", { knopf: true })}
    </p>
  </div>
</section>`;
}

// ---------- D4: Aktuelles (K5: bild_passung) ----------

function aktuellesAbschnitt(daten) {
  const neueste = (daten.news ?? [])
    .slice()
    .sort((a, b) => String(b.datum).localeCompare(String(a.datum)))
    .slice(0, 2);

  const karten = neueste
    .map((n) => {
      const passungKlasse = n.bild_passung === "contain" ? " karte__bild--contain" : "";
      const bildHtml = n.bild
        ? bild({
            pfad: PFAD,
            daten,
            name: n.bild.replace(/\.[^./]+$/, ""),
            alt: n.alt ?? "",
            sizes: "(min-width: 1024px) 50vw, 100vw",
            klasse: `karte__bild${passungKlasse}`,
          })
        : "";
      const teaserText = teaser(n.text);
      return `<article class="karte">
      ${bildHtml}
      <p class="karte__meta">${datumLang(n.datum)} · ${escapeHtml(n.quelle)}</p>
      <h3 class="karte__titel">${escapeHtml(n.titel)}</h3>
      <p>${escapeHtml(teaserText)}</p>
    </article>`;
    })
    .join("\n    ");

  return `<section class="abschnitt">
  <div class="container fluss">
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
  <div class="container fluss">
    <h2>Einfach vorbeikommen und mittrainieren</h2>
    <p class="inhalt">Kinder und Jugendliche können ein- oder zweimal ohne Anmeldung mittrainieren. Vorher klären wir, ob in der passenden Mannschaft Platz ist – am einfachsten per E-Mail an die Jugendleitung mit dem Jahrgang des Kindes. Danach ist der Aufnahmeantrag Pflicht.</p>
    <ol class="schritte">
      <li><p>E-Mail an die Jugendleitung mit Jahrgang und Vorerfahrung</p></li>
      <li><p>Termin fürs Probetraining bekommen und ein- bis zweimal mitmachen</p></li>
      <li><p>Aufnahmeantrag ausfüllen – Beiträge und Unterlagen stehen unter „Mitglied werden“</p></li>
    </ol>
    <p class="knopfzeile">
      <a class="knopf" href="${escapeHtml(PROBETRAINING_MAILTO)}">Probetraining vereinbaren</a>
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
  <div class="container fluss">
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

// P5: /verein/karneval/ existiert jetzt – echter Link statt baldSpan().
function karnevalAbschnitt(daten) {
  const verein = daten.verein ?? {};
  return `<section class="abschnitt--hell abschnitt abschnitt--eng">
  <div class="container fluss">
    <article class="karte fluss">
      <h2 class="karte__titel">Karnevalabteilung „Die Schnauzer“</h2>
      <p>Fünf Gruppen von den Little Fruities bis zu den Dreamboys – die zweite Abteilung des Vereins.</p>
      <p class="knopfzeile">
        <a class="knopf" href="${PFAD}verein/karneval/">Zur Karnevalabteilung</a>
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
    // unverändert. Siehe Abschlussbericht (P2), Abschnitt „Abweichungen“.
    description:
      "F.F.V. Sportfreunde 04 im Frankfurter Gallus: Trainingszeiten, nächste Spiele und Aktuelles unserer elf Fußballmannschaften. Probetraining vereinbaren und Mitglied werden",
    inhalt,
  };
}
