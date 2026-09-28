// Terminseite (src/vorlagen/termine.mjs) – Skript für web/termine.html und
// die App-Kopie Termine-App.html. Den Datenblock DATEN setzt der Build aus
// data/termine.json, data/teams.json und data/verein.json ein.
//
// Daten: appack-GraphQL mit dem öffentlichen Embedded-Token (derselbe wie im
// Terminblock von assets/app/Startseite_v3.tpl, gültig bis tokenGueltigBis,
// Erneuern siehe assets/app/LIESMICH.md). CORS erlaubt die Herkunft
// https://cdn.appack.de (Website-Seiten, statische App-Seiten) und
// https://appack.de (drender).
//  1. listCalendarByComponentId: welche Kalender hängen am Terminmodul und
//     sind lesbar (canRead)? Nur die werden abgefragt – ein nicht lesbarer
//     Kalender in einer Abfrage ließe sie ganz scheitern. Fällt die Liste
//     aus, gelten die bekannten Kalender aus data/termine.json.
//  2. findCalendarEvents je Kalender als eigenes Feld (Alias) in EINER
//     Anfrage: Spiele/Veranstaltungen für HIGHLIGHT_WOCHEN, Trainings nur für
//     die gezeigte Woche. Ein nicht lesbarer Kalender liefert null, die
//     anderen Felder bleiben (Teilergebnis).
//  3. Jede weitere Trainingswoche einzeln, die folgende wird vorgeladen.
// Solange der Trainingskalender nicht öffentlich ist, zeigt die Seite die
// regelmäßigen Zeiten aus data/teams.json.
// Keine FreeMarker-Zeichenfolgen in dieser Datei (Dollar vor geschweifter
// Klammer, eckige Klammer vor Raute): die Seite soll notfalls auch als
// appack-Vorlage laufen.
(function () {
  "use strict";

  var DATEN = __TERMINE_DATEN__;

  // ---------- Einstellungen ----------

  var WARTEZEIT = 8000;       // ms je Anfrage
  var HIGHLIGHT_WOCHEN = 16;  // so weit reicht „Spiele & Veranstaltungen“ (inkl. „Weitere“)
  var ERSTE_TAGE = 14;        // sichtbar: alle Highlights der nächsten 14 Tage …
  var MINDESTENS = 4;         // … aber mindestens vier Einträge (ganze Tage)
  var MEHR_TAGE = 14;         // „Weitere Termine“: jeweils 14 Tage mehr
  var SPAETER_ANZAHL = 3;     // „Später im Verein“: so viele Veranstaltungen
  var WOCHEN_VORAUS = 30;     // so weit lässt sich die Trainingswoche vorblättern
  var SUCHE_WOCHEN = 6;       // so weit wird nach dem nächsten Training gesucht (Ferien)
  var SPEICHER = "speuzer.termine.mannschaft";
  var APP = document.documentElement.classList.contains("app-modus");
  var KOMPONENTE = DATEN.komponente;
  var MANNSCHAFTEN = DATEN.mannschaften;

  var MONATE = ["JAN", "FEB", "MÄR", "APR", "MAI", "JUN", "JUL", "AUG", "SEP", "OKT", "NOV", "DEZ"];
  var MONATE_LANG = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
  var WT = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
  var WT_LANG = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
  var SVG_KOPF = '<svg viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"';
  var PFEIL = SVG_KOPF + ' class="ts-pfeil" stroke-width="2"><path d="M9 6l6 6-6 6"/></svg>';
  var PFEIL_RECHTS = SVG_KOPF + ' stroke-width="2"><path d="M9 6l6 6-6 6"/></svg>';
  var HALLE = SVG_KOPF + ' class="ts-halle" stroke-width="2"><path d="M3 10.5L12 4l9 6.5V20H3z"/><path d="M9.5 20v-5h5v5"/></svg>';
  var SONNE = SVG_KOPF + ' stroke-width="1.8"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4"/></svg>';
  var STERN = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><path d="M12 3.2l2.6 5.5 6 .8-4.4 4.1 1.1 5.9L12 16.6l-5.3 2.9 1.1-5.9-4.4-4.1 6-.8z"/></svg>';

  // ---------- Hilfen: DOM ----------

  function el(tag, klasse, text) {
    var e = document.createElement(tag);
    if (klasse) e.className = klasse;
    if (text !== undefined && text !== null) e.textContent = text;
    return e;
  }

  function leeren(e) { while (e.firstChild) e.removeChild(e.firstChild); }

  function vh(text) { return el("span", "sr-only", text); }

  // Linkziel je Modus. Website: Seiten im selben Ordner (web/), fremde
  // Adressen im neuen Tab. App: Mannschaftsseiten und Kalender als App-Modul
  // (nav://), alles andere öffnet extern (ext://) – wie APP_MODUS_SKRIPT in
  // src/vorlagen/hilfen.mjs.
  function setzeLink(a, ziel) {
    var extern = /^https?:/i.test(ziel);
    if (APP) {
      if (/^mannschaften(-[a-z0-9-]+)?\.html$/.test(ziel)) ziel = "nav://" + DATEN.module.mannschaften;
      else if (ziel === "kalender") ziel = "nav://" + KOMPONENTE;
      else if (extern) ziel = "ext://" + ziel;
    } else {
      if (ziel === "kalender") ziel = DATEN.kalenderansicht;
      else if (extern && !/\.ics$/i.test(ziel)) { a.target = "_blank"; a.rel = "noopener"; }
    }
    a.href = ziel;
    return a;
  }

  // Zeile wie .zeile in site.css (Titel, Untertitel, „›“)
  function zeileLink(titel, untertitel, ziel) {
    var a = el("a", "zeile");
    var text = el("span", "zeile__text");
    text.appendChild(el("span", "zeile__titel", titel));
    if (untertitel) text.appendChild(el("span", "zeile__untertitel", untertitel));
    a.appendChild(text);
    var pfeil = el("span", "zeile__pfeil", "›");
    pfeil.setAttribute("aria-hidden", "true");
    a.appendChild(pfeil);
    return setzeLink(a, ziel);
  }

  function kasten(titel, satz) {
    var k = el("div", "hinweis hinweis--info ts-kasten");
    k.appendChild(el("strong", "ts-kasten__titel", titel));
    k.appendChild(el("p", "", satz));
    return k;
  }

  function knopf(text, klick) {
    var b = el("button", "knopf knopf--sekundaer", text);
    b.type = "button";
    b.addEventListener("click", klick);
    return b;
  }

  // Nur das eigene Dokument scrollen: im Rahmen der Website-Hülle würde
  // scrollIntoView oder eine Sprungmarke auch die Hülle verschieben.
  function scrolleZu(ziel, fokus) {
    if (!ziel) return;
    var oben = ziel.getBoundingClientRect().top + (window.pageYOffset || 0) - 8;
    var sanft = !(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    try { window.scrollTo({ top: oben, behavior: sanft ? "smooth" : "auto" }); } catch (e) { window.scrollTo(0, oben); }
    if (fokus) {
      if (!fokus.hasAttribute("tabindex") && !/^(A|BUTTON|SUMMARY)$/.test(fokus.tagName)) fokus.setAttribute("tabindex", "-1");
      try { fokus.focus({ preventScroll: true }); } catch (e) { fokus.focus(); }
    }
  }

  function markiere(e) {
    if (!e) return;
    e.classList.add("ts-ziel");
    setTimeout(function () { e.classList.remove("ts-ziel"); }, 2200);
  }

  function schluessel(id) { return String(id || "").replace(/[^A-Za-z0-9_-]/g, "_"); }

  // ---------- Hilfen: Datum (immer Frankfurter Zeit) ----------

  var berlinFormat = null;
  try {
    berlinFormat = new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", hour12: false });
  } catch (e) { berlinFormat = null; }

  function teile(datum) {
    if (berlinFormat && berlinFormat.formatToParts) {
      try {
        var t = {};
        berlinFormat.formatToParts(datum).forEach(function (p) { t[p.type] = parseInt(p.value, 10); });
        if (isFinite(t.year) && isFinite(t.month) && isFinite(t.day) && isFinite(t.hour) && isFinite(t.minute)) {
          // manche Engines schreiben Mitternacht als „24“
          return { jahr: t.year, monat: t.month - 1, tag: t.day, stunde: t.hour % 24, minute: t.minute };
        }
      } catch (e) { /* Rückfall: Gerätezeit */ }
    }
    return { jahr: datum.getFullYear(), monat: datum.getMonth(), tag: datum.getDate(), stunde: datum.getHours(), minute: datum.getMinutes() };
  }
  function tagNr(t) { return Math.round(Date.UTC(t.jahr, t.monat, t.tag) / 86400000); }
  function ausNr(nr) { var d = new Date(nr * 86400000); return { jahr: d.getUTCFullYear(), monat: d.getUTCMonth(), tag: d.getUTCDate() }; }
  function wtVonNr(nr) { return new Date(nr * 86400000).getUTCDay(); }
  function nrAusIso(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || "")); return m ? Math.round(Date.UTC(+m[1], +m[2] - 1, +m[3]) / 86400000) : NaN; }
  function zwei(z) { return (z < 10 ? "0" : "") + z; }
  function uhr(t) { return zwei(t.stunde) + ":" + zwei(t.minute); }
  function kurzDatum(nr) { var t = ausNr(nr); return zwei(t.tag) + "." + zwei(t.monat + 1) + "."; }
  function wtKurzDatum(nr) { return WT[wtVonNr(nr)] + " " + kurzDatum(nr); }
  function langDatum(nr) { var t = ausNr(nr); return WT_LANG[wtVonNr(nr)] + ", " + t.tag + ". " + MONATE_LANG[t.monat]; }
  function montagVon(nr) { return nr - ((wtVonNr(nr) + 6) % 7); }
  function heuteNr() { return tagNr(teile(new Date())); }
  // Zeitraum als „05.–17.10.“ bzw. „23.12.–12.01.“
  function spanne(von, bis) {
    var a = ausNr(von), b = ausNr(bis);
    if (von === bis) return kurzDatum(von);
    if (a.monat === b.monat) return zwei(a.tag) + ".–" + kurzDatum(bis);
    return kurzDatum(von) + "–" + kurzDatum(bis);
  }
  // … und ausgeschrieben: „5.–17. Oktober“, „23. Dezember bis 12. Januar“
  function spanneLang(von, bis) {
    var a = ausNr(von), b = ausNr(bis);
    if (von === bis) return a.tag + ". " + MONATE_LANG[a.monat];
    if (a.monat === b.monat) return a.tag + ".–" + b.tag + ". " + MONATE_LANG[b.monat];
    return a.tag + ". " + MONATE_LANG[a.monat] + " bis " + b.tag + ". " + MONATE_LANG[b.monat];
  }
  function wochenText(von, bis) {
    var n = Math.max(1, Math.round((bis - von + 1) / 7));
    return n === 1 ? "1 Woche" : n + " Wochen";
  }
  function relativ(nr, heute) {
    if (nr === heute) return "Heute";
    if (nr === heute + 1) return "Morgen";
    return "";
  }

  // Trainingsfreie Zeiten (data/termine.json, wie der Trainingsgenerator).
  // Nur zur Beschriftung; stehen an einem Tag trotzdem Trainings im
  // Kalender, gilt der Kalender (siehe bauePlan).
  var FREI = (DATEN.frei || []).map(function (f) {
    return { von: nrAusIso(f.von), bis: nrAusIso(f.bis), name: String(f.name || ""), ferien: f.ferien === true };
  }).filter(function (f) { return isFinite(f.von) && isFinite(f.bis) && f.bis >= f.von && f.name; });
  function freiAm(nr) {
    for (var i = 0; i < FREI.length; i++) if (nr >= FREI[i].von && nr <= FREI[i].bis) return FREI[i];
    return null;
  }

  // ---------- Mannschaften (data/teams.json) ----------

  function normName(text) { return String(text || "").toLowerCase().replace(/[^a-z0-9äöüß]+/g, ""); }
  function mannschaftVon(name) {
    var n = normName(name);
    for (var i = 0; i < MANNSCHAFTEN.length; i++) if (MANNSCHAFTEN[i].namen.indexOf(n) !== -1) return MANNSCHAFTEN[i];
    return null;
  }
  function mannschaftNachSlug(slug) {
    for (var i = 0; i < MANNSCHAFTEN.length; i++) if (MANNSCHAFTEN[i].slug === slug) return MANNSCHAFTEN[i];
    return null;
  }
  var unbekannte = {};
  function unbekannteMannschaft(name) {
    var slug = "x-" + normName(name);
    if (!unbekannte[slug]) unbekannte[slug] = { slug: slug, kurz: name, pille: name, name: name, unbekannt: true, training: [] };
    return unbekannte[slug];
  }

  // ---------- Termine verstehen ----------

  function woerter(text) {
    var s = String(text || "");
    if (s.normalize) s = s.normalize("NFC");
    return s.toLowerCase().split(/[^a-zäöüß]+/).filter(Boolean);
  }
  // wie istTraining() im Terminblock der Startseite: Trainingswort in
  // Kategorie oder Titel (Probetraining/Schnuppertraining zählen nicht),
  // Kategorie „Veranstaltung“ hat Vorrang
  function istTrainingWort(w) { return ["probetraining", "schnuppertraining"].indexOf(w) === -1 && (w === "trainings" || /training$/.test(w)); }
  function istTraining(roh) {
    var k = (Array.isArray(roh.categories) ? roh.categories : []).map(function (c) { return String((c && c.title) || "").toLowerCase(); });
    if (k.some(function (t) { return /veranstaltung/.test(t); })) return false;
    if (k.some(function (t) { return woerter(t).some(istTrainingWort); })) return true;
    return woerter(roh.title).some(istTrainingWort);
  }

  function aufraeumen(titel) {
    var text = String(titel || "");
    if (text.normalize) text = text.normalize("NFC");
    text = text.replace(/\s+/g, " ").trim();
    var vorher;
    do {
      vorher = text;
      text = text.replace(/\s*\((?:\d{2}\/\d{2}|\d{4}\/\d{2,4}|[A-G]-Junior(?:inn)?en|Herren|Frauen|Senioren|Alte Herren)\)$/i, "");
    } while (text !== vorher);
    // kurzes Titelende nicht allein umbrechen („FC 02 2“, „Kalbach I / 1 2“)
    return text.replace(/ - /g, " – ").replace(/ (\S{1,3})$/, "\u00a0$1");
  }

  // Ort kurz für die Zeile: Vereinsplatz/Rebstock beim Namen, sonst in
  // Frankfurt die Straße, außerhalb die Stadt.
  function ortKurz(ort) {
    var s = String(ort || "").trim();
    if (!s) return "";
    if (/mainzer land(str\.|straße|strasse)\s*480|sportplatz mainzer landstra/i.test(s)) return "Vereinsplatz";
    if (/römerhof\s*9|rebstock/i.test(s)) return "Rebstock";
    var t = s.split(/\s*,\s*/);
    var stadt = (/^\d{5}\s+(.+)$/.exec(t[t.length - 1] || "") || [])[1] || "";
    if (stadt && !/^frankfurt/i.test(stadt)) return stadt;
    return t[0].replace(/ (\d+\s?[a-z]?)$/i, "\u00a0$1"); // Hausnummer nicht allein umbrechen
  }

  // Wettbewerb lesbar wie staffelLesbar() in hilfen.mjs: Liga ohne
  // DFBnet-Kürzel, dazu „Gruppe N“.
  function wettbewerbLesbar(beschreibung) {
    var w = /Wettbewerb:\s*(.+?)\s+(?:Heimspiel|Auswärtsspiel|Spielnummer|Spielstätte:|Alle Infos|$)/.exec(beschreibung);
    if (!w) return "";
    var stuecke = w[1].split(" · ");
    var gruppe = /Gr\.\s*0*(\d+)/.exec(stuecke[1] || "");
    return stuecke[0] + (gruppe ? ", Gruppe " + gruppe[1] : "");
  }

  // Beschreibung eines Trainings aus dem Trainingsgenerator, mit oder ohne
  // Zeilenumbrüche (appack macht beim Import mitunter eine Zeile daraus):
  // „Training F1 / Platz: Tor 1 / 17:30 bis 19:00 Uhr / [Hinweis] / Bitte
  // Schienbeinschoner … / Absagen …“. Platz = Feld „Platz:“ bzw. „Halle:“,
  // Hinweis = die Sätze nach der Uhrzeit, die Winter oder Halle nennen –
  // so erscheinen spätere Angaben ohne Änderung an dieser Seite.
  function trainingsAngaben(text) {
    var s = String(text || "").replace(/\r/g, "");
    var feld = /(?:^|\s)(Platz|Halle):\s*([^\n]+?)(?=\s+\d{1,2}:\d{2}\s+bis\s|\s*\n|\s*$)/.exec(s);
    var rest = s.replace(/^[\s\S]*?\d{1,2}:\d{2}\s+bis\s+\d{1,2}:\d{2}\s*Uhr\.?/, "");
    var saetze = rest.replace(/([.!?])\s+/g, "$1\n").split(/\n+/).map(function (z) { return z.trim(); });
    var hinweis = saetze.filter(function (z) { return z && /\b(Winter|Halle|Hallen\w*)\b/i.test(z) && !/^(Platz|Halle):/.test(z); }).join(" ");
    return { platz: feld ? feld[2].trim() : "", halle: !!(feld && feld[1] === "Halle"), hinweis: hinweis };
  }

  function httpLink(u) { return /^https?:\/\//i.test(String(u || "")) ? String(u) : ""; }

  // Ein Termin aus der API in unsere Form. rolle = Rolle seines Kalenders.
  function normalisiere(roh, rolle) {
    roh = roh || {};
    var start = new Date(roh.dateStart);
    if (isNaN(start.getTime())) return null;
    var ende = roh.dateEnd ? new Date(roh.dateEnd) : start;
    if (isNaN(ende.getTime()) || ende.getTime() < start.getTime()) ende = start;
    var titel = aufraeumen(roh.title);
    if (!titel) return null;
    var m = /^Speuzer\s+(.+?)\s+[·•|–-]\s+(.+)$/.exec(titel);
    var team = m ? (mannschaftVon(m[1]) || unbekannteMannschaft(m[1])) : null;
    var art = rolle === "training" || (rolle !== "verein" && istTraining(roh)) ? "training" : (rolle || (team ? "spiel" : "verein"));
    var beschreibung = String(roh.description || "");
    if (beschreibung.normalize) beschreibung = beschreibung.normalize("NFC");
    var e = {
      id: String(roh.id || ""),
      art: art,
      team: team,
      titel: titel,
      text: m ? m[2] : titel,
      start: start,
      ende: ende,
      ganztags: roh.allDay === true,
      ort: roh.location && roh.location.title ? String(roh.location.title).trim() : "",
      link: httpLink(roh.detailLink),
      beschreibung: beschreibung,
      aus: /\b(abgesagt|fällt aus|entfällt|ausgefallen)\b/i.test(titel)
    };
    e.schluessel = schluessel(e.id || (e.titel + "-" + start.getTime()));
    e.startNr = tagNr(teile(start));
    var endNr;
    if (e.ganztags) {
      // Ganztägig: das Ende steht je nach Eingabe auf 23:59 UTC, 23:59
      // Ortszeit oder Mitternacht des Folgetags – drei Stunden zurück
      // ergibt in allen Fällen den letzten Kalendertag (Berlin).
      endNr = tagNr(teile(new Date(ende.getTime() - 3 * 3600000)));
    } else {
      var et = teile(ende);
      endNr = tagNr(et);
      if (ende.getTime() > start.getTime() && et.stunde === 0 && et.minute === 0) endNr -= 1;
    }
    e.endNr = Math.max(endNr, e.startNr);
    if (art === "spiel") {
      e.spielart = /kinderfestival|spielfest|funino|turnier/i.test(e.text) ? "Kinderfestival" : (/^heim/i.test(e.text) ? "Heimspiel" : (/^ausw/i.test(e.text) ? "Auswärtsspiel" : "Spiel"));
      e.wettbewerb = e.spielart === "Kinderfestival" ? "" : wettbewerbLesbar(beschreibung);
    }
    if (art === "training") {
      var angaben = trainingsAngaben(beschreibung);
      e.platz = angaben.platz;
      e.inHalle = angaben.halle;
      e.halle = angaben.hinweis;
    }
    return e;
  }

  function platzKurz(platz) {
    return String(platz || "").replace(/^Bezirkssportanlage am\s+/i, "").replace(/\s*\(.*\)\s*$/, "").split(/\s*,\s*/)[0];
  }

  function aktuell(e, jetzt, heute) {
    return e.ganztags ? e.endNr >= heute : e.ende.getTime() >= jetzt;
  }

  function eindeutig(liste) {
    var gesehen = {};
    return liste.filter(function (e) {
      var s = [e.titel.toLowerCase() + "|" + e.start.getTime()];
      if (e.id) s.push("id|" + e.id);
      if (s.some(function (x) { return gesehen[x]; })) return false;
      s.forEach(function (x) { gesehen[x] = true; });
      return true;
    }).sort(function (a, b) { return a.start.getTime() - b.start.getTime(); });
  }

  // ---------- Daten holen ----------

  function graphql(abfrage) {
    return new Promise(function (erfuellt, abgelehnt) {
      if (!window.fetch) { abgelehnt(new Error("kein fetch")); return; }
      var abbruch = null;
      try { abbruch = window.AbortController ? new AbortController() : null; } catch (e) { abbruch = null; }
      var fertig = false;
      var uhrzeit = setTimeout(function () {
        if (fertig) return;
        fertig = true;
        if (abbruch) { try { abbruch.abort(); } catch (e) { /* egal */ } }
        abgelehnt(new Error("Zeitüberschreitung"));
      }, WARTEZEIT);
      var optionen = {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + DATEN.token },
        body: JSON.stringify({ query: abfrage }),
        // keine Cookies: der Token reicht, die Antwort braucht so keine
        // Freigabe für Anmeldedaten
        credentials: "omit"
      };
      if (abbruch) optionen.signal = abbruch.signal;
      fetch(DATEN.api, optionen)
        .then(function (antwort) {
          if (!antwort.ok) throw new Error("HTTP " + antwort.status);
          return antwort.json();
        })
        .then(function (json) {
          if (fertig) return;
          fertig = true;
          clearTimeout(uhrzeit);
          if (!json || typeof json !== "object") throw new Error("keine Antwort");
          erfuellt(json);
        })
        .catch(function (fehler) {
          if (fertig) return;
          fertig = true;
          clearTimeout(uhrzeit);
          abgelehnt(fehler);
        });
    });
  }

  // Rolle eines Kalenders: training, spiel oder verein. Bekannte Ids aus
  // data/termine.json haben Vorrang; interne Kalender nie.
  function kalenderRolle(k) {
    for (var i = 0; i < DATEN.kalender.length; i++) if (DATEN.kalender[i].id === k.id) return DATEN.kalender[i].rolle;
    var titel = String(k.title || "");
    var kats = (Array.isArray(k.categories) ? k.categories : []).map(function (c) { return String((c && c.title) || ""); }).join(" ");
    if (/\bintern\b/i.test(titel)) return "";
    if (/training/i.test(titel) || /training/i.test(kats)) return "training";
    if (/spielplan|spiele\b/i.test(titel) || /fu(ss|ß)ball|spiel/i.test(kats)) return "spiel";
    return "verein";
  }

  var FELDER = "id calendarId title description dateStart dateEnd allDay categories { title } detailLink location { title }";
  var FELDER_KURZ = "id calendarId title dateStart dateEnd allDay categories { title }";
  function feld(alias, id, von, bis, felder) {
    return alias + ": findCalendarEvents(calendarIds: " + JSON.stringify([id]) +
      ", range: {from: \"" + von.toISOString() + "\", to: \"" + bis.toISOString() + "\"}) { " + (felder || FELDER) + " }";
  }
  // Zeitraum einer Trainingswoche (Mo–So in Berlin), großzügig um einen Tag
  // erweitert; genau zugeordnet wird danach über die Tagesnummer.
  function wochenBereich(montag) {
    return { von: new Date((montag - 1) * 86400000), bis: new Date((montag + 8) * 86400000) };
  }

  var zustand = {
    lauf: 0,               // zählt Neustarts; Antworten eines alten Laufs werden verworfen
    kalender: [],          // [{ id, rolle }]
    trainingLesbar: false,
    highlights: null,      // Array oder "fehler"
    wochen: {},            // montag -> { status: "laedt"|"ok"|"fehler"|"gesperrt", liste, versprechen }
    suche: null,           // Suche nach dem nächsten Training (Ferien): Promise
    sucheListe: null,      // Array oder "fehler"
    team: "",
    woche: null,
    ersteWoche: null,
    bisNr: null,
    ladeFehler: false,
    bereit: false
  };

  function kalenderNach(rolle) {
    return zustand.kalender.filter(function (k) { return k.rolle === rolle; });
  }

  // Eine Anfrage mit je einem Feld pro Kalender; liefert { alias: Array|null }
  function ladeFelder(felder) {
    var namen = Object.keys(felder);
    if (!namen.length) return Promise.resolve({});
    return graphql("query { " + namen.map(function (n) { return felder[n]; }).join(" ") + " }").then(function (json) {
      var daten = json.data || {};
      var aus = {};
      namen.forEach(function (n) { aus[n] = Array.isArray(daten[n]) ? daten[n] : null; });
      return aus;
    });
  }

  function holeKalender() {
    return graphql('query { listCalendarByComponentId(componentId: "' + KOMPONENTE + '") { id title canRead categories { title } } }')
      .then(function (json) {
        var liste = json && json.data && json.data.listCalendarByComponentId;
        if (!Array.isArray(liste)) throw new Error("keine Kalenderliste");
        return liste
          .filter(function (k) { return k && k.id && k.canRead === true; })
          .map(function (k) { return { id: String(k.id), rolle: kalenderRolle(k) }; })
          .filter(function (k) { return k.rolle; });
      })
      .catch(function () {
        // Rückfall: die bekannten Kalender; ein nicht lesbarer liefert je
        // Feld still null
        return DATEN.kalender.map(function (k) { return { id: k.id, rolle: k.rolle }; });
      });
  }

  function trainingsAusFeldern(ergebnis, namen, von, bis) {
    var liste = [];
    var gelesen = 0;
    namen.forEach(function (n) {
      if (!ergebnis[n]) return;
      gelesen++;
      ergebnis[n].forEach(function (roh) {
        var e = normalisiere(roh, "training");
        if (e && e.startNr >= von && e.startNr <= bis) liste.push(e);
      });
    });
    return { gelesen: gelesen, liste: eindeutig(liste) };
  }

  function wochenFelder(montag) {
    var b = wochenBereich(montag);
    var felder = {};
    kalenderNach("training").forEach(function (k, i) { felder["t_" + i] = feld("t_" + i, k.id, b.von, b.bis); });
    return felder;
  }

  function merkeWoche(montag, ergebnis, namen) {
    var t = trainingsAusFeldern(ergebnis, namen, montag, montag + 6);
    zustand.wochen[montag] = t.gelesen ? { status: "ok", liste: t.liste } : { status: "gesperrt", liste: [] };
    return t.gelesen > 0;
  }

  function ladeWoche(montag) {
    var eintrag = zustand.wochen[montag];
    if (eintrag && eintrag.status !== "fehler") return eintrag.versprechen || Promise.resolve();
    var lauf = zustand.lauf;
    var felder = wochenFelder(montag);
    var namen = Object.keys(felder);
    zustand.wochen[montag] = { status: "laedt", liste: [] };
    var versprechen = ladeFelder(felder)
      .then(function (ergebnis) { if (lauf === zustand.lauf) merkeWoche(montag, ergebnis, namen); })
      .catch(function () { if (lauf === zustand.lauf) zustand.wochen[montag] = { status: "fehler", liste: [] }; });
    zustand.wochen[montag].versprechen = versprechen;
    return versprechen;
  }

  // Nächste Trainings über mehrere Wochen (nur Titel und Zeiten): für die
  // Karte „Als Nächstes“ und freie Wochen, wenn die geladenen Wochen nichts
  // mehr enthalten (Ferien, Saisonende).
  function sucheTrainings() {
    if (zustand.suche) return zustand.suche;
    var lauf = zustand.lauf;
    var von = new Date(Date.now() - 3600000);
    var bis = new Date(Date.now() + SUCHE_WOCHEN * 7 * 86400000);
    var felder = {};
    kalenderNach("training").forEach(function (k, i) { felder["t_" + i] = feld("t_" + i, k.id, von, bis, FELDER_KURZ); });
    zustand.suche = ladeFelder(felder).then(function (ergebnis) {
      if (lauf !== zustand.lauf) return;
      var t = trainingsAusFeldern(ergebnis, Object.keys(felder), -Infinity, Infinity);
      zustand.sucheListe = t.gelesen ? t.liste : "fehler";
    }, function () {
      if (lauf === zustand.lauf) zustand.sucheListe = "fehler";
    });
    return zustand.suche;
  }

  function start() {
    var lauf = ++zustand.lauf;
    zustand.ladeFehler = false;
    zustand.highlights = null;
    zustand.wochen = {};
    zustand.suche = null;
    zustand.sucheListe = null;
    zustand.bereit = false;
    var heute = heuteNr();
    // Wochenende: die kommende Woche zeigen (unter der Woche die laufende)
    var wt = wtVonNr(heute);
    zustand.ersteWoche = montagVon(heute) + (wt === 6 || wt === 0 ? 7 : 0);
    if (zustand.woche === null || zustand.woche < zustand.ersteWoche) zustand.woche = zustand.ersteWoche;
    zustand.bisNr = heute + ERSTE_TAGE - 1;
    zeigeLaden();

    holeKalender()
      .then(function (kalender) {
        if (lauf !== zustand.lauf) return;
        zustand.kalender = kalender;
        // Highlights (alle Nicht-Trainings-Kalender) + gezeigte Trainingswoche
        var jetzt = Date.now();
        var von = new Date(jetzt - 7 * 86400000);
        var bis = new Date(jetzt + HIGHLIGHT_WOCHEN * 7 * 86400000);
        var felder = {};
        kalender.forEach(function (k, i) {
          if (k.rolle === "training") return;
          var alias = (k.rolle === "spiel" ? "s_" : "v_") + i;
          felder[alias] = feld(alias, k.id, von, bis);
        });
        var montag = zustand.woche;
        var wf = wochenFelder(montag);
        Object.keys(wf).forEach(function (n) { felder[n] = wf[n]; });
        return ladeFelder(felder).then(function (ergebnis) {
          if (lauf !== zustand.lauf) return;
          var hl = [];
          var hlNamen = Object.keys(ergebnis).filter(function (n) { return n.charAt(0) !== "t"; });
          var hlGelesen = 0;
          hlNamen.forEach(function (n) {
            if (!ergebnis[n]) return;
            hlGelesen++;
            ergebnis[n].forEach(function (roh) {
              var e = normalisiere(roh, n.charAt(0) === "s" ? "spiel" : "verein");
              if (e && e.art !== "training") hl.push(e);
            });
          });
          zustand.highlights = hlGelesen || !hlNamen.length ? eindeutig(hl) : "fehler";
          zustand.trainingLesbar = Object.keys(wf).length ? merkeWoche(montag, ergebnis, Object.keys(wf)) : false;
          if (!zustand.trainingLesbar) delete zustand.wochen[montag];
        });
      })
      .then(function () {
        if (lauf !== zustand.lauf) return;
        zustand.bereit = true;
        zeigeAlles();
        vorladen();
        springeNachAdresse();
      })
      .catch(function () {
        if (lauf !== zustand.lauf) return;
        zustand.ladeFehler = true;
        zustand.bereit = true;
        zeigeAlles();
      });
  }

  function vorladen() {
    if (!zustand.trainingLesbar) return;
    var naechste = zustand.woche + 7;
    if (naechste <= zustand.ersteWoche + WOCHEN_VORAUS * 7 && !zustand.wochen[naechste]) {
      ladeWoche(naechste).then(function () { if (zustand.team) zeigeNaechstes(); });
    }
  }

  // ---------- Anzeige: gemeinsam ----------

  // Beim ersten Laden stehen die Platzhalter schon im HTML; bei „Erneut
  // versuchen“ kommen sie hierüber zurück.
  var PLATZHALTER_HL = document.getElementById("hl-inhalt").innerHTML;
  var PLATZHALTER_TR = document.getElementById("tr-inhalt").innerHTML;
  function zeigeLaden() {
    var hl = document.getElementById("hl-inhalt");
    var tr = document.getElementById("tr-inhalt");
    if (hl.getAttribute("aria-busy") !== "true") hl.innerHTML = PLATZHALTER_HL;
    if (tr.getAttribute("aria-busy") !== "true") tr.innerHTML = PLATZHALTER_TR;
    hl.setAttribute("aria-busy", "true");
    tr.setAttribute("aria-busy", "true");
    document.getElementById("hl-mehr").hidden = true;
    document.getElementById("spaeter").hidden = true;
  }

  function zeigeAlles() {
    zeigeWahl();
    zeigeAbos();
    if (!zustand.bereit) return;
    zeigeNaechstes();
    zeigeHighlights();
    zeigeTraining();
  }

  function melde(text) {
    var s = document.getElementById("termine-status");
    if (s) s.textContent = text;
  }

  // ---------- Anzeige: Mannschaftswahl ----------

  function zeigeWahl() {
    var knoepfe = document.querySelectorAll(".ts-pille");
    for (var i = 0; i < knoepfe.length; i++) {
      knoepfe[i].setAttribute("aria-pressed", knoepfe[i].getAttribute("data-team") === zustand.team ? "true" : "false");
    }
    var team = mannschaftNachSlug(zustand.team);
    document.getElementById("hl-lead").textContent = team
      ? "Spiele der " + team.name + " und Veranstaltungen des Vereins."
      : "Die nächsten Spiele, Kinderfestivals und Veranstaltungen.";
  }

  function waehle(slug, merken) {
    if (slug && !mannschaftNachSlug(slug)) slug = "";
    zustand.team = slug;
    zustand.bisNr = heuteNr() + ERSTE_TAGE - 1;
    if (merken) {
      try { if (slug) localStorage.setItem(SPEICHER, slug); else localStorage.removeItem(SPEICHER); } catch (e) { /* ohne Speicher */ }
      try {
        // ?team=/?ansicht= aus der Adresse nehmen, die Wahl steht im Hash
        var suche = location.search.replace(/^\?/, "").split("&").filter(function (p) { return p && !/^(team|ansicht)=/.test(p); }).join("&");
        history.replaceState(null, "", location.pathname + (suche ? "?" + suche : "") + (slug ? "#" + slug : ""));
      } catch (e) { /* egal */ }
    }
    zeigeAlles();
    if (merken && zustand.bereit) {
      var team = mannschaftNachSlug(slug);
      var zahl = highlightsFuerTeam().filter(function (e) { return Math.max(e.startNr, heuteNr()) <= zustand.bisNr; }).length;
      melde((team ? team.name : "Alle Mannschaften") + ": " + (zahl === 1 ? "1 Spiel oder Veranstaltung" : zahl + " Spiele und Veranstaltungen") + " in den nächsten zwei Wochen.");
    }
  }

  // ---------- Anzeige: Kalender abonnieren ----------

  function zeigeAbos() {
    var liste = document.getElementById("abo-liste");
    if (!liste) return;
    leeren(liste);
    var team = mannschaftNachSlug(zustand.team);
    if (team) {
      liste.appendChild(zeileLink("Spielplan der " + team.name + " abonnieren", "", team.kalender));
      liste.appendChild(zeileLink("Trainingszeiten der " + team.name + " abonnieren", "", team.trainingsKalender));
    } else {
      liste.appendChild(zeileLink("Spiele aller Mannschaften abonnieren", "", DATEN.abo.spiele));
      liste.appendChild(zeileLink("Trainingszeiten aller Mannschaften abonnieren", "", DATEN.abo.training));
    }
  }

  // ---------- Anzeige: Als Nächstes (nur mit gewählter Mannschaft) ----------

  function naechstesTraining(team) {
    var jetzt = Date.now();
    var montage = Object.keys(zustand.wochen).map(Number).sort(function (a, b) { return a - b; });
    var bisGeladen = null;
    for (var i = 0; i < montage.length; i++) {
      var w = zustand.wochen[montage[i]];
      if (w.status !== "ok") break;
      if (bisGeladen !== null && montage[i] !== bisGeladen + 1) break;
      var treffer = w.liste.filter(function (e) { return e.team === team && e.ende.getTime() >= jetzt; })[0];
      if (treffer) return treffer;
      bisGeladen = montage[i] + 6;
    }
    if (zustand.sucheListe === "fehler") return "fehler";
    if (Array.isArray(zustand.sucheListe)) {
      return zustand.sucheListe.filter(function (e) { return e.team === team && e.ende.getTime() >= jetzt; })[0] || null;
    }
    return undefined; // noch unbekannt, Suche läuft
  }

  function naechstesEintrag(art, titel, meta, ziel, klick) {
    var li = el("li", "ts-naechstes__eintrag");
    var zeile = el(ziel ? "a" : "div", "ts-naechstes__zeile" + (ziel ? "" : " ts-naechstes__zeile--leer"));
    zeile.appendChild(el("span", "ts-naechstes__art", art));
    var text = el("span", "ts-naechstes__text");
    text.appendChild(el("span", "ts-naechstes__titel", titel));
    if (meta) text.appendChild(el("span", "ts-naechstes__meta", meta));
    zeile.appendChild(text);
    if (ziel) {
      zeile.href = ziel;
      zeile.insertAdjacentHTML("beforeend", PFEIL);
      if (klick) zeile.addEventListener("click", function (ev) { ev.preventDefault(); klick(); });
    }
    li.appendChild(zeile);
    return li;
  }

  function wannKurz(e, heute) {
    var rel = relativ(e.startNr, heute);
    var tag = rel || wtKurzDatum(e.startNr);
    if (e.ganztags) return tag + " · ganztags";
    var bis = e.art === "training" && e.ende.getTime() > e.start.getTime() ? "–" + uhr(teile(e.ende)) : "";
    return tag + " · " + uhr(teile(e.start)) + bis + " Uhr";
  }

  // Regelmäßige Zeiten kurz: „Di und Fr · 17:30–19:30 Uhr“, bei gleichem
  // Beginn „Di, Mi und Fr · ab 17:30 Uhr“, sonst „Mo 17:30 · Di 16:30 Uhr“
  function regelText(team) {
    var t = team.training || [];
    if (!t.length) return "";
    var tage = t.map(function (x) { return x.tag.slice(0, 2); });
    var tageText = tage.length === 1 ? tage[0] : tage.slice(0, -1).join(", ") + " und " + tage[tage.length - 1];
    var gleich = function (feld) { return t.every(function (x) { return x[feld] === t[0][feld]; }); };
    if (gleich("von") && gleich("bis")) return tageText + " · " + t[0].von + "–" + t[0].bis + " Uhr";
    if (gleich("von")) return tageText + " · ab " + t[0].von + " Uhr";
    return t.map(function (x) { return x.tag.slice(0, 2) + " " + x.von; }).join(" · ") + " Uhr";
  }

  function zeigeNaechstes() {
    var karte = document.getElementById("als-naechstes");
    var liste = document.getElementById("an-liste");
    var team = mannschaftNachSlug(zustand.team);
    if (!team || !zustand.bereit || zustand.ladeFehler) { karte.hidden = true; return; }
    document.getElementById("an-team").textContent = team.name;
    leeren(liste);
    var heute = heuteNr();
    var jetzt = Date.now();
    var hl = Array.isArray(zustand.highlights) ? zustand.highlights : [];

    var spiel = hl.filter(function (e) { return e.art === "spiel" && e.team === team && aktuell(e, jetzt, heute); })[0];
    if (spiel) {
      liste.appendChild(naechstesEintrag(spiel.spielart === "Kinderfestival" ? "Kinderfestival" : "Spiel", spiel.text,
        wannKurz(spiel, heute) + (ortKurz(spiel.ort) ? " · " + ortKurz(spiel.ort) : ""), "#ts-e-" + spiel.schluessel,
        function () { springeZuHighlight(spiel); }));
    } else {
      liste.appendChild(naechstesEintrag(team.kinder ? "Kinderfestival" : "Spiel",
        team.kinder ? "Noch kein Kinderfestival im Kalender" : "Noch kein Spiel im Kalender", "", "", null));
    }

    if (zustand.trainingLesbar) {
      var tr = naechstesTraining(team);
      if (tr === undefined) {
        liste.appendChild(naechstesEintrag("Training", "Wird gesucht …", "", "", null));
        sucheTrainings().then(function () { if (zustand.team === team.slug) zeigeNaechstes(); });
      } else if (tr === "fehler") {
        liste.appendChild(naechstesEintrag("Training", "Siehe Trainingswoche", "", "#training",
          function () { scrolleZu(document.getElementById("training"), document.getElementById("tr-titel")); }));
      } else if (tr) {
        liste.appendChild(naechstesEintrag("Training", wannKurz(tr, heute), tr.platz ? "Platz: " + tr.platz : "", "#ts-t-" + tr.schluessel,
          function () { springeZuTraining(tr); }));
      } else {
        liste.appendChild(naechstesEintrag("Training", "Kein Training eingetragen", "in den nächsten " + SUCHE_WOCHEN + " Wochen", "", null));
      }
    } else if (team.training && team.training.length) {
      liste.appendChild(naechstesEintrag("Training", regelText(team), "Regelmäßige Zeiten", "#training",
        function () { scrolleZu(document.getElementById("training"), document.getElementById("tr-titel")); }));
    }

    var fest = hl.filter(function (e) { return e.art === "verein" && aktuell(e, jetzt, heute); })[0];
    if (fest) {
      liste.appendChild(naechstesEintrag("Veranstaltung", fest.titel, wannKurz(fest, heute), "#ts-e-" + fest.schluessel,
        function () { springeZuHighlight(fest); }));
    }
    karte.hidden = false;
  }

  // Aus „Als Nächstes“ zum Eintrag: sichtbar machen, aufklappen, Fokus.
  function springeZuHighlight(e) {
    var heute = heuteNr();
    if (e.art !== "verein" && Math.max(e.startNr, heute) > zustand.bisNr) {
      zustand.bisNr = Math.max(e.startNr, heute);
      zeigeHighlights();
    }
    var ziel = document.getElementById("ts-e-" + e.schluessel);
    if (!ziel && e.art === "verein") {
      zustand.bisNr = Math.max(zustand.bisNr, e.startNr);
      zeigeHighlights();
      ziel = document.getElementById("ts-e-" + e.schluessel);
    }
    if (!ziel) return;
    var details = ziel.querySelector("details");
    if (details) details.open = true;
    scrolleZu(ziel, ziel.querySelector("summary"));
    markiere(ziel);
  }

  function springeZuTraining(e) {
    var montag = montagVon(e.startNr);
    geheZuWoche(montag, false).then(function () {
      var ziel = document.getElementById("ts-t-" + e.schluessel);
      if (!ziel) { scrolleZu(document.getElementById("training"), document.getElementById("tr-titel")); return; }
      var details = ziel.querySelector("details");
      if (details) details.open = true;
      scrolleZu(ziel, ziel.querySelector("summary"));
      markiere(ziel);
    });
  }

  // ---------- Anzeige: Spiele & Veranstaltungen ----------

  function highlightsFuerTeam() {
    var jetzt = Date.now();
    var heute = heuteNr();
    var team = zustand.team;
    return (Array.isArray(zustand.highlights) ? zustand.highlights : []).filter(function (e) {
      if (!aktuell(e, jetzt, heute)) return false;
      if (!team) return true;
      return e.art === "verein" || (e.team && e.team.slug === team);
    });
  }

  function zeitText(e, heute) {
    if (e.endNr > e.startNr) {
      if (e.startNr < heute) return { kurz: "läuft", klein: true, lang: "läuft noch bis " + langDatum(e.endNr) };
      return { kurz: e.ganztags ? "ganztags" : uhr(teile(e.start)), klein: e.ganztags, lang: (e.ganztags ? "" : uhr(teile(e.start)) + " Uhr, ") + "bis " + langDatum(e.endNr) };
    }
    if (e.ganztags) return { kurz: "ganztags", klein: true, lang: "ganztägig" };
    var bis = e.ende.getTime() > e.start.getTime() ? " bis " + uhr(teile(e.ende)) : "";
    return { kurz: uhr(teile(e.start)), klein: false, lang: uhr(teile(e.start)) + bis + " Uhr" };
  }

  function artZeile(e, heute) {
    var stuecke = [];
    if (e.art === "spiel") stuecke.push(e.spielart);
    if (e.endNr > e.startNr && e.startNr >= heute) stuecke.push("bis " + wtKurzDatum(e.endNr));
    var ort = ortKurz(e.ort);
    if (ort) stuecke.push(ort);
    return stuecke.join(" · ");
  }

  // Ein Eintrag: <details> mit der Zeile als <summary>. kachel =
  // Datumskachel statt Uhrzeit (für „Später im Verein“).
  function baueEintrag(e, heute, kachel) {
    var li = el("li", "ts-hl" + (e.art === "verein" ? " ts-hl--verein" : "") + (e.aus ? " ts-hl--aus" : ""));
    li.id = "ts-e-" + e.schluessel;
    var details = el("details");
    var zusammen = el("summary", "ts-hl__zeile");
    var zeit = zeitText(e, heute);
    if (kachel) {
      var t = ausNr(e.startNr);
      var k = el("span", "ts-hl__kachel");
      k.setAttribute("aria-hidden", "true");
      k.appendChild(el("span", "ts-hl__kachel-tag", zwei(t.tag)));
      k.appendChild(el("span", "ts-hl__kachel-monat", MONATE[t.monat]));
      zusammen.appendChild(k);
    } else {
      var z = el("span", "ts-hl__zeit" + (zeit.klein ? " ts-hl__zeit--klein" : ""), zeit.kurz);
      z.setAttribute("aria-hidden", "true");
      zusammen.appendChild(z);
    }
    var text = el("span", "ts-hl__text");
    var titel = el("span", "ts-hl__titel");
    if (e.art === "verein") {
      var mv = el("span", "ts-marke ts-marke--verein");
      mv.insertAdjacentHTML("afterbegin", STERN);
      mv.appendChild(document.createTextNode("Verein"));
      mv.setAttribute("aria-hidden", "true");
      titel.appendChild(mv);
      titel.appendChild(vh("Veranstaltung des Vereins: "));
    } else if (e.team) {
      var marke = el("span", "ts-marke", e.team.kurz);
      marke.setAttribute("aria-hidden", "true");
      titel.appendChild(marke);
      titel.appendChild(vh(e.team.name + ": "));
    }
    titel.appendChild(document.createTextNode(e.art === "verein" ? e.titel : e.text));
    if (e.aus) titel.appendChild(vh(" (fällt aus)"));
    text.appendChild(titel);
    var artTeile = kachel ? [wtKurzDatum(e.startNr), zeit.klein ? zeit.kurz : zeit.kurz + " Uhr"] : [];
    if (artZeile(e, heute)) artTeile.push(artZeile(e, heute));
    var art = el("span", "ts-hl__art", artTeile.join(" · "));
    art.setAttribute("aria-hidden", "true");
    text.appendChild(art);
    // vollständig für Bildschirmleser: Tag, Uhrzeit, Art und Ort
    var rel = relativ(e.startNr, heute);
    text.appendChild(vh(", " + (rel ? rel + ", " : "") + langDatum(e.startNr) + ", " + zeit.lang + (artZeile(e, heute) ? ", " + artZeile(e, heute) : "")));
    zusammen.appendChild(text);
    zusammen.insertAdjacentHTML("beforeend", PFEIL);
    details.appendChild(zusammen);

    var mehr = el("div", "ts-hl__mehr");
    if (e.wettbewerb) mehr.appendChild(el("p", "", e.wettbewerb));
    if (e.art === "verein" && e.beschreibung) {
      var b = e.beschreibung.replace(/<[^>]*>/g, " ").replace(/[ \t]+/g, " ").trim();
      if (b.length > 600) b = b.slice(0, 597).replace(/\s+\S*$/, "") + " …";
      if (b) mehr.appendChild(el("p", "ts-hl__beschreibung", b));
    }
    if (e.ort) mehr.appendChild(el("p", "", e.ort));
    var links = el("p", "ts-links");
    if (e.ort) links.appendChild(setzeLink(el("a", "", "Route planen"), "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(e.ort)));
    if (e.link) links.appendChild(setzeLink(el("a", "", /fussball\.de/i.test(e.link) ? "Spiel auf FUSSBALL.DE" : "Mehr Infos"), e.link));
    if (e.team && !e.team.unbekannt && e.art === "spiel") links.appendChild(setzeLink(el("a", "", "Zur Mannschaft"), "mannschaften-" + e.team.slug + ".html"));
    if (links.childNodes.length) mehr.appendChild(links);
    if (mehr.childNodes.length) details.appendChild(mehr);
    li.appendChild(details);
    return li;
  }

  // Ferien als Zwischenzeile (nur Ferien, keine einzelnen Feiertage)
  function ferienZeile(f, heute) {
    var div = el("div", "ts-frei");
    div.insertAdjacentHTML("afterbegin", SONNE);
    var p = el("p");
    p.appendChild(el("strong", "", f.name));
    p.appendChild(document.createTextNode((f.von <= heute ? " bis " + kurzDatum(f.bis) : " " + spanne(f.von, f.bis)) + " · kein Training eingetragen"));
    div.appendChild(p);
    return div;
  }

  function zeigeHighlights() {
    var inhalt = document.getElementById("hl-inhalt");
    var mehrKnopf = document.getElementById("hl-mehr");
    var spaeter = document.getElementById("spaeter");
    leeren(inhalt);
    inhalt.removeAttribute("aria-busy");
    mehrKnopf.hidden = true;
    spaeter.hidden = true;

    if (zustand.ladeFehler || zustand.highlights === "fehler") {
      var k = kasten("Termine gerade nicht erreichbar", "Die Termine lassen sich im Moment nicht laden. Spielpläne stehen auch auf den Mannschaftsseiten.");
      k.appendChild(knopf("Erneut versuchen", function () { start(); }));
      inhalt.appendChild(k);
      var weiter = el("div", "zeilen-liste");
      weiter.style.marginTop = "var(--sp-2)";
      weiter.appendChild(zeileLink("Zu den Mannschaften", "Spielplan und Tabelle je Team", "mannschaften.html"));
      inhalt.appendChild(weiter);
      return;
    }

    var heute = heuteNr();
    var liste = highlightsFuerTeam();
    var team = mannschaftNachSlug(zustand.team);

    if (!liste.length) {
      FREI.filter(function (f) { return f.ferien && f.bis >= heute && f.von <= heute + ERSTE_TAGE; }).slice(0, 1).forEach(function (f) {
        var fz = ferienZeile(f, heute);
        fz.style.marginTop = "var(--sp-4)";
        inhalt.appendChild(fz);
      });
      inhalt.appendChild(el("p", "ts-leer", team
        ? "Für die " + team.name + " stehen in den nächsten Wochen keine Spiele im Kalender."
        : "In den nächsten Wochen stehen keine Spiele oder Veranstaltungen im Kalender."));
      return;
    }

    // Mannschaft gewählt, aber (noch) kein Spiel im Kalender: kurz sagen,
    // warum nur Vereinstermine dastehen
    if (team && !liste.some(function (e) { return e.team && e.team.slug === team.slug; })) {
      inhalt.appendChild(el("p", "ts-leer", "Für die " + team.name + " steht in den nächsten Wochen " + (team.kinder ? "kein Kinderfestival" : "kein Spiel") + " im Kalender." +
        (team.kinder ? " Der Kreis setzt die Termine in Blöcken an, deshalb reicht der Plan nur wenige Wochen voraus." : "")));
    }

    // Sichtbar: alles bis bisNr, mindestens MINDESTENS Einträge, ganze Tage
    var n = liste.filter(function (e) { return Math.max(e.startNr, heute) <= zustand.bisNr; }).length;
    if (n < MINDESTENS) n = Math.min(MINDESTENS, liste.length);
    while (n < liste.length && Math.max(liste[n].startNr, heute) === Math.max(liste[n - 1].startNr, heute)) n++;
    var sichtbar = liste.slice(0, n);
    var rest = liste.slice(n);
    var letzterTag = Math.max(sichtbar[sichtbar.length - 1].startNr, heute);

    // nach Tagen gruppieren (laufende mehrtägige Termine unter „Heute“)
    var tage = [];
    sichtbar.forEach(function (e) {
      var nr = Math.max(e.startNr, heute);
      if (!tage.length || tage[tage.length - 1].nr !== nr) tage.push({ nr: nr, eintraege: [] });
      tage[tage.length - 1].eintraege.push(e);
    });

    var ferien = FREI.filter(function (f) { return f.ferien && f.bis >= heute && f.von <= letzterTag; });
    var ol = el("ol", "ts-tage");
    var fi = 0;
    tage.forEach(function (tag) {
      while (fi < ferien.length && ferien[fi].von <= tag.nr) {
        var fz = el("li");
        fz.appendChild(ferienZeile(ferien[fi], heute));
        ol.appendChild(fz);
        fi++;
      }
      var li = el("li");
      var kopf = el("h3", "ts-tag__kopf");
      var rel = relativ(tag.nr, heute);
      if (rel) kopf.appendChild(el("span", "ts-tag__rel", rel + " · "));
      kopf.appendChild(document.createTextNode(langDatum(tag.nr)));
      li.appendChild(kopf);
      var ul = el("ul", "ts-liste");
      tag.eintraege.forEach(function (e) { ul.appendChild(baueEintrag(e, heute, false)); });
      li.appendChild(ul);
      ol.appendChild(li);
    });
    inhalt.appendChild(ol);

    // „Später im Verein“: Veranstaltungen nach dem sichtbaren Teil – sie
    // sollen nicht hinter „Weitere Termine“ verschwinden.
    var spaetere = rest.filter(function (e) { return e.art === "verein"; }).slice(0, SPAETER_ANZAHL);
    if (spaetere.length) {
      var sl = document.getElementById("spaeter-liste");
      leeren(sl);
      spaetere.forEach(function (e) { sl.appendChild(baueEintrag(e, heute, true)); });
      spaeter.hidden = false;
    }
    // „Weitere“ nur, wenn danach noch etwas kommt, das nicht schon unter
    // „Später im Verein“ steht
    var spieleRest = rest.filter(function (e) { return e.art !== "verein"; }).length;
    var vereinRest = rest.filter(function (e) { return e.art === "verein"; }).length - spaetere.length;
    if (spieleRest || vereinRest > 0) {
      mehrKnopf.hidden = false;
      mehrKnopf.textContent = spieleRest ? "Weitere Termine anzeigen" : "Weitere Veranstaltungen anzeigen";
    }
  }

  // ---------- Anzeige: Trainingswoche ----------

  function zeigeWochenTitel(montag) {
    var diese = montagVon(heuteNr());
    var titel = document.getElementById("woche-titel");
    var name = montag === diese ? "Diese Woche" : (montag === diese + 7 ? "Nächste Woche" : "Woche ab " + kurzDatum(montag));
    leeren(titel);
    titel.appendChild(el("strong", "", name));
    titel.appendChild(el("span", "", kurzDatum(montag) + " – " + kurzDatum(montag + 6)));
    document.getElementById("woche-zurueck").disabled = montag <= zustand.ersteWoche;
    document.getElementById("woche-vor").disabled = montag >= zustand.ersteWoche + WOCHEN_VORAUS * 7;
  }

  function aufzaehlung(namen) {
    if (namen.length <= 1) return namen.join("");
    return namen.slice(0, -1).join(", ") + " und " + namen[namen.length - 1];
  }

  // gleicher Hinweissatz -> eine Fußnote mit allen betroffenen Mannschaften
  function hinweise(liste) {
    var saetze = {};
    var reihenfolge = [];
    liste.forEach(function (e) {
      var satz = e.halle;
      if (!satz || !e.team) return;
      if (!saetze[satz]) { saetze[satz] = []; reihenfolge.push(satz); }
      if (saetze[satz].indexOf(e.team) === -1) saetze[satz].push(e.team);
    });
    return reihenfolge.map(function (satz) {
      return { satz: satz, teams: saetze[satz].sort(function (a, b) { return MANNSCHAFTEN.indexOf(a) - MANNSCHAFTEN.indexOf(b); }) };
    });
  }

  function baueEinheit(e, jetzt) {
    var s = el("span", "ts-einheit" + (e.ende && e.ende.getTime() < jetzt ? " ts-einheit--vorbei" : "") + (e.aus ? " ts-einheit--aus" : ""));
    s.appendChild(el("span", "ts-einheit__von", e.von));
    if (e.bis) {
      s.appendChild(vh(" bis "));
      s.appendChild(el("span", "ts-einheit__bis", e.bis));
    }
    s.appendChild(vh(" Uhr" + (e.aus ? ", fällt aus" : "")));
    if (e.platz) {
      var p = el("span", "ts-einheit__platz", platzKurz(e.platz));
      p.title = e.platz;
      s.appendChild(vh(", "));
      s.appendChild(p);
    }
    return s;
  }

  // Wochenplan als Tabelle. spalten: [{ schluessel, wt, dt, lang, heute,
  // frei }], einheiten(team, spalte) -> [{ von, bis, platz, ende, aus }].
  function bauePlan(spalten, teams, einheiten, gewaehlt, halleTeams, caption) {
    var rahmen = el("div", "ts-plan-rahmen");
    var tabelle = el("table", "ts-plan");
    tabelle.appendChild(el("caption", "sr-only", caption));
    var thead = el("thead");
    var kopf = el("tr");
    var ecke = el("th", "ts-plan__ecke");
    ecke.scope = "col";
    ecke.appendChild(vh("Mannschaft"));
    kopf.appendChild(ecke);
    spalten.forEach(function (sp) {
      var th = el("th", (sp.heute ? "ts-plan__heute" : "") + (sp.frei ? " ts-plan__frei" : ""));
      th.scope = "col";
      var wt = el("span", "ts-plan__wt", sp.wt);
      wt.setAttribute("aria-hidden", "true");
      th.appendChild(wt);
      if (sp.dt) {
        var dt = el("span", "ts-plan__dt", sp.dt);
        dt.setAttribute("aria-hidden", "true");
        th.appendChild(dt);
      }
      th.appendChild(vh(sp.lang));
      if (sp.frei) {
        var fm = el("span", "ts-plan__frei-marke", sp.frei.ferien ? "Ferien" : "Feiertag");
        fm.title = sp.frei.name;
        th.appendChild(fm);
      }
      kopf.appendChild(th);
    });
    thead.appendChild(kopf);
    tabelle.appendChild(thead);

    var jetzt = Date.now();
    var tbody = el("tbody");
    teams.forEach(function (team) {
      var tr = el("tr", team.slug === gewaehlt ? "ts-plan__zeile--gewaehlt" : "");
      var th = el("th", "ts-plan__team");
      th.scope = "row";
      var inhalt = el("span", "ts-plan__team-inhalt");
      var kurz = el("span", "", team.pille);
      kurz.setAttribute("aria-hidden", "true");
      if (team.pilleLang) kurz.appendChild(el("span", "ts-lang", team.pilleLang));
      inhalt.appendChild(kurz);
      inhalt.appendChild(vh(team.name));
      if (halleTeams.indexOf(team) !== -1) {
        inhalt.insertAdjacentHTML("beforeend", HALLE);
        inhalt.appendChild(vh(", Hinweis zum Hallentraining unter der Tabelle"));
      }
      th.appendChild(inhalt);
      tr.appendChild(th);
      spalten.forEach(function (sp) {
        var td = el("td", (sp.heute ? "ts-plan__heute" : "") + (sp.frei ? " ts-plan__frei" : ""));
        var amTag = einheiten(team, sp);
        if (amTag.length) {
          amTag.forEach(function (e) { td.appendChild(baueEinheit(e, jetzt)); });
        } else {
          var leer = el("span", "ts-plan__leer", "–");
          leer.setAttribute("aria-hidden", "true");
          td.appendChild(leer);
          td.appendChild(vh(sp.frei ? sp.frei.name : "kein Training"));
        }
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    tabelle.appendChild(tbody);
    rahmen.appendChild(tabelle);
    return rahmen;
  }

  function hinweisFuss(h, klasse) {
    var p = el("p", klasse);
    p.insertAdjacentHTML("afterbegin", HALLE);
    var span = el("span");
    if (h.teams) span.appendChild(el("strong", "", aufzaehlung(h.teams.map(function (t) { return t.kurz; })) + ": "));
    span.appendChild(document.createTextNode(h.satz));
    p.appendChild(span);
    return p;
  }

  // Wochenplan aus dem Kalender. Ein Tag gilt nur als frei, wenn an ihm
  // auch nichts eingetragen ist.
  function kalenderPlan(montag, liste, gewaehlt) {
    var heute = heuteNr();
    var tage = [0, 1, 2, 3, 4];
    if (liste.some(function (e) { return e.startNr === montag + 5; })) tage.push(5);
    if (liste.some(function (e) { return e.startNr === montag + 6; })) tage.push(6);
    var spalten = tage.map(function (d) {
      var nr = montag + d;
      var frei = liste.some(function (e) { return e.startNr === nr; }) ? null : freiAm(nr);
      return { nr: nr, wt: WT[wtVonNr(nr)], dt: zwei(ausNr(nr).tag) + ".", lang: langDatum(nr) + (nr === heute ? ", heute" : ""), heute: nr === heute, frei: frei };
    });
    var teams = MANNSCHAFTEN.slice();
    liste.forEach(function (e) { if (e.team && teams.indexOf(e.team) === -1) teams.push(e.team); });
    var h = hinweise(liste);
    var halleTeams = [];
    h.forEach(function (x) { x.teams.forEach(function (t) { halleTeams.push(t); }); });
    var frag = document.createDocumentFragment();
    frag.appendChild(bauePlan(spalten, teams, function (team, sp) {
      return liste.filter(function (e) { return e.team === team && e.startNr === sp.nr; }).map(function (e) {
        return { von: uhr(teile(e.start)), bis: e.ende.getTime() > e.start.getTime() ? uhr(teile(e.ende)) : "", platz: e.platz, ende: e.ende, aus: e.aus };
      });
    }, gewaehlt, halleTeams, "Training vom " + kurzDatum(montag) + " bis " + kurzDatum(montag + tage[tage.length - 1]) + ": Zeilen Mannschaften, Spalten Wochentage"));
    h.forEach(function (x) { frag.appendChild(hinweisFuss(x, "ts-plan-fuss")); });
    return frag;
  }

  // Regelmäßige Zeiten aus data/teams.json – solange der Trainingskalender
  // nicht lesbar ist (oder die Termine gerade nicht laden)
  var TAG_INDEX = { Sonntag: 0, Montag: 1, Dienstag: 2, Mittwoch: 3, Donnerstag: 4, Freitag: 5, Samstag: 6 };
  function regelPlan(gewaehlt) {
    var tage = [1, 2, 3, 4, 5];
    MANNSCHAFTEN.forEach(function (t) { (t.training || []).forEach(function (x) { var i = TAG_INDEX[x.tag]; if (tage.indexOf(i) === -1) tage.push(i); }); });
    tage.sort(function (a, b) { return ((a + 6) % 7) - ((b + 6) % 7); });
    var spalten = tage.map(function (i) { return { index: i, wt: WT[i], lang: WT_LANG[i] }; });
    var halleTeams = MANNSCHAFTEN.filter(function (t) { return t.hinweis; });
    var frag = document.createDocumentFragment();
    frag.appendChild(bauePlan(spalten, MANNSCHAFTEN, function (team, sp) {
      return (team.training || []).filter(function (x) { return TAG_INDEX[x.tag] === sp.index; }).map(function (x) { return { von: x.von, bis: x.bis, platz: x.platz || "" }; });
    }, gewaehlt, halleTeams, "Regelmäßige Trainingszeiten: Zeilen Mannschaften, Spalten Wochentage"));
    var saetze = {};
    halleTeams.forEach(function (t) { (saetze[t.hinweis] = saetze[t.hinweis] || []).push(t); });
    Object.keys(saetze).forEach(function (s) { frag.appendChild(hinweisFuss({ satz: s, teams: saetze[s] }, "ts-plan-fuss")); });
    return frag;
  }

  function teamKopf(box, team, zahl) {
    var kopf = el("div", "ts-team-woche__kopf");
    kopf.appendChild(el("h3", "ts-team-woche__titel", team.name));
    if (zahl !== null) kopf.appendChild(el("span", "ts-team-woche__zahl", zahl === 1 ? "1 Training" : zahl + " Trainings"));
    box.appendChild(kopf);
  }

  // Eine Einheit der gewählten Mannschaft, aufklappbar: Wann, Platz, Wo,
  // Hinweis, Route
  function baueTrainingEintrag(e, heute, jetzt) {
    var vorbei = e.ende.getTime() < jetzt;
    var li = el("li", "ts-tw" + (e.startNr === heute ? " ts-tw--heute" : "") + (vorbei ? " ts-tw--vorbei" : "") + (e.aus ? " ts-tw--aus" : ""));
    li.id = "ts-t-" + e.schluessel;
    var details = el("details");
    var zeile = el("summary", "ts-tw__zeile");
    var rel = relativ(e.startNr, heute);
    var tag = el("span", "ts-tw__tag", rel || wtKurzDatum(e.startNr));
    tag.setAttribute("aria-hidden", "true");
    zeile.appendChild(tag);
    var bis = e.ende.getTime() > e.start.getTime() ? "–" + uhr(teile(e.ende)) : "";
    var zeit = el("span", "ts-tw__zeit", uhr(teile(e.start)) + bis + " Uhr" + (e.aus ? " · fällt aus" : "") + (vorbei && !e.aus ? " · vorbei" : ""));
    zeit.setAttribute("aria-hidden", "true");
    if (e.platz) zeit.appendChild(el("span", "ts-tw__platz", (e.inHalle ? "Halle: " : "Platz: ") + e.platz));
    zeile.appendChild(zeit);
    zeile.appendChild(vh(langDatum(e.startNr) + (rel ? " (" + rel.toLowerCase() + ")" : "") + ", " + uhr(teile(e.start)) + (bis ? " bis " + uhr(teile(e.ende)) : "") + " Uhr" +
      (e.aus ? ", fällt aus" : "") + (e.platz ? ", " + (e.inHalle ? "Halle " : "Platz ") + e.platz : "")));
    zeile.insertAdjacentHTML("beforeend", PFEIL);
    details.appendChild(zeile);
    var mehr = el("div", "ts-tw__mehr");
    mehr.appendChild(el("p", "", "Wann: " + langDatum(e.startNr) + ", " + uhr(teile(e.start)) + (bis ? " bis " + uhr(teile(e.ende)) : "") + " Uhr"));
    if (e.platz) mehr.appendChild(el("p", "", (e.inHalle ? "Halle: " : "Platz: ") + e.platz));
    if (e.ort && !e.inHalle) mehr.appendChild(el("p", "", "Wo: " + e.ort));
    if (e.halle) mehr.appendChild(el("p", "", "Hinweis: " + e.halle));
    var ort = e.inHalle ? e.platz : e.ort;
    if (ort) {
      var links = el("p", "ts-links");
      links.appendChild(setzeLink(el("a", "", "Route planen"), "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(ort)));
      mehr.appendChild(links);
    }
    details.appendChild(mehr);
    li.appendChild(details);
    return li;
  }

  function baueTeamWoche(team, montag, liste) {
    var heute = heuteNr();
    var jetzt = Date.now();
    var eigene = liste.filter(function (e) { return e.team === team; });
    var box = el("div", "ts-team-woche");
    teamKopf(box, team, eigene.length);
    if (eigene.length) {
      var ul = el("ul", "ts-team-woche__liste");
      eigene.forEach(function (e) { ul.appendChild(baueTrainingEintrag(e, heute, jetzt)); });
      box.appendChild(ul);
    } else {
      var frei = null;
      for (var d = 0; d < 5 && !frei; d++) frei = freiAm(montag + d);
      box.appendChild(el("p", "ts-tw-leer", frei && frei.ferien ? frei.name + ": in dieser Woche kein Training." : "In dieser Woche ist kein Training eingetragen."));
    }
    hinweise(eigene).forEach(function (h) { box.appendChild(hinweisFuss({ satz: h.satz }, "ts-hinweiszeile")); });
    box.appendChild(zeileLink("Zur Mannschaftsseite", "Spielplan, Trainerteam, Tabelle", "mannschaften-" + team.slug + ".html"));
    return box;
  }

  function baueRegelWoche(team) {
    var box = el("div", "ts-team-woche");
    teamKopf(box, team, null);
    var ul = el("ul", "ts-team-woche__liste");
    (team.training || []).forEach(function (x) {
      var li = el("li", "ts-tw");
      var zeile = el("div", "ts-tw__zeile");
      zeile.appendChild(el("span", "ts-tw__tag", x.tag));
      var zeit = el("span", "ts-tw__zeit", x.von + "–" + x.bis + " Uhr");
      if (x.platz) zeit.appendChild(el("span", "ts-tw__platz", "Platz: " + x.platz));
      zeile.appendChild(zeit);
      li.appendChild(zeile);
      ul.appendChild(li);
    });
    box.appendChild(ul);
    if (team.hinweis) box.appendChild(hinweisFuss({ satz: team.hinweis }, "ts-hinweiszeile"));
    box.appendChild(zeileLink("Zur Mannschaftsseite", "Spielplan, Trainerteam, Tabelle", "mannschaften-" + team.slug + ".html"));
    return box;
  }

  function mitAllen(inhalt, team, plan) {
    var alle = el("details", "ts-alle-teams");
    var s = el("summary");
    s.insertAdjacentHTML("afterbegin", PFEIL_RECHTS);
    s.appendChild(document.createTextNode("Trainingsplan aller Mannschaften"));
    alle.appendChild(s);
    var box = el("div");
    box.appendChild(plan);
    alle.appendChild(box);
    inhalt.appendChild(alle);
  }

  // Ganze Woche ohne Training: eine ruhige Karte statt leerer Tabelle, mit
  // dem ganzen freien Zeitraum am Stück („5.–17. Oktober · 2 Wochen“) und
  // dem Sprung zur nächsten Trainingswoche. Ferien aus data/termine.json;
  // fehlt ein Eintrag, wird das nächste Training im Kalender gesucht.
  function baueFreieWoche(montag, inhalt) {
    var f = null;
    for (var d = 0; d < 5; d++) { var x = freiAm(montag + d); if (x && x.ferien) { f = x; break; } }
    var k;
    if (f) {
      k = kasten(f.name + " – kein Training eingetragen", spanneLang(f.von, f.bis) + " · " + wochenText(f.von, f.bis) + ". Ob in den Ferien trainiert wird, entscheidet das Trainerteam der Mannschaft. Spiele und Veranstaltungen stehen weiter oben.");
      var erster = f.bis + 1;
      while (wtVonNr(erster) === 6 || wtVonNr(erster) === 0) erster++;
      var naechste = montagVon(erster);
      if (naechste > montag && naechste <= zustand.ersteWoche + WOCHEN_VORAUS * 7) {
        k.appendChild(knopf("Zur Trainingswoche ab " + wtKurzDatum(erster), function () { geheZuWoche(naechste, true); }));
      }
      inhalt.appendChild(k);
      return;
    }
    k = kasten("Kein Training eingetragen", "In dieser Woche steht kein Training im Kalender.");
    inhalt.appendChild(k);
    sucheTrainings().then(function () {
      if (zustand.woche !== montag || !k.parentNode) return;
      var liste = Array.isArray(zustand.sucheListe) ? zustand.sucheListe : [];
      var danach = liste.filter(function (e) { return e.startNr > montag + 6; })[0];
      var p = k.querySelector("p");
      if (danach) {
        var bisTag = danach.startNr - 1;
        p.textContent = "Bis einschließlich " + wtKurzDatum(bisTag) + " steht kein Training im Kalender" + (bisTag - montag >= 13 ? " (" + wochenText(montag, bisTag) + ")" : "") + ".";
        var ziel = montagVon(danach.startNr);
        if (ziel <= zustand.ersteWoche + WOCHEN_VORAUS * 7) k.appendChild(knopf("Zur Trainingswoche ab " + wtKurzDatum(danach.startNr), function () { geheZuWoche(ziel, true); }));
      } else if (zustand.sucheListe !== "fehler") {
        p.textContent = "In den nächsten " + SUCHE_WOCHEN + " Wochen steht kein Training im Kalender.";
      }
    });
  }

  function zeigeTraining() {
    var inhalt = document.getElementById("tr-inhalt");
    var nav = document.getElementById("woche-nav");
    var titel = document.getElementById("tr-titel");
    var team = mannschaftNachSlug(zustand.team);
    leeren(inhalt);

    if (zustand.ladeFehler || !zustand.trainingLesbar) {
      // Trainingskalender (noch) nicht öffentlich oder gerade nicht
      // erreichbar: die regelmäßigen Zeiten wie auf den Mannschaftsseiten
      inhalt.removeAttribute("aria-busy");
      nav.hidden = true;
      titel.textContent = "Trainingszeiten";
      document.getElementById("tr-lead").hidden = false;
      if (team) {
        inhalt.appendChild(baueRegelWoche(team));
        mitAllen(inhalt, team, regelPlan(team.slug));
      } else {
        inhalt.appendChild(regelPlan(""));
      }
      return;
    }
    nav.hidden = false;
    titel.textContent = "Trainingswoche";
    document.getElementById("tr-lead").hidden = true;
    var montag = zustand.woche;
    zeigeWochenTitel(montag);
    var woche = zustand.wochen[montag];
    if (!woche || woche.status === "laedt") {
      inhalt.setAttribute("aria-busy", "true");
      inhalt.innerHTML = PLATZHALTER_TR;
      ladeWoche(montag).then(function () { if (zustand.woche === montag) zeigeTraining(); });
      return;
    }
    inhalt.removeAttribute("aria-busy");
    if (woche.status === "fehler") {
      var k = kasten("Trainingszeiten gerade nicht erreichbar", "Die Trainingswoche lässt sich im Moment nicht laden.");
      k.appendChild(knopf("Erneut versuchen", function () { delete zustand.wochen[montag]; zeigeTraining(); }));
      inhalt.appendChild(k);
      return;
    }
    if (woche.status === "gesperrt") {
      if (team) inhalt.appendChild(baueRegelWoche(team)); else inhalt.appendChild(regelPlan(""));
      return;
    }
    var liste = woche.liste;
    if (!liste.length) {
      baueFreieWoche(montag, inhalt);
      return;
    }
    if (team) {
      inhalt.appendChild(baueTeamWoche(team, montag, liste));
      mitAllen(inhalt, team, kalenderPlan(montag, liste, team.slug));
    } else {
      inhalt.appendChild(kalenderPlan(montag, liste, ""));
    }
  }

  function geheZuWoche(montag, fokus) {
    var min = zustand.ersteWoche, max = zustand.ersteWoche + WOCHEN_VORAUS * 7;
    zustand.woche = Math.min(max, Math.max(min, montag));
    zeigeTraining();
    vorladen();
    if (fokus) { var t = document.getElementById("woche-titel"); if (t) { t.setAttribute("tabindex", "-1"); t.focus(); } }
    // erfüllt, sobald die Woche gezeichnet ist (zeigeTraining hängt sich
    // beim Laden zuerst an dieselbe Anfrage)
    var w = zustand.wochen[zustand.woche];
    return w && w.versprechen ? w.versprechen.then(function () {}) : Promise.resolve();
  }

  // ---------- Start ----------

  // Mannschaft aus der Adresse: #d3 oder ?team=d3 (Links von den
  // Mannschaftsseiten); ?ansicht=training bzw. #training springt zur
  // Trainingswoche.
  function adressWert(name) {
    var m = new RegExp("(?:^|[?&])" + name + "=([^&#]*)").exec(location.search);
    return m ? decodeURIComponent(m[1]) : "";
  }
  function teamAusAdresse() {
    var h = String(location.hash || "").replace(/^#/, "");
    if (mannschaftNachSlug(h)) return h;
    var t = adressWert("team");
    return mannschaftNachSlug(t) ? t : null;
  }
  function springeNachAdresse() {
    if (location.hash === "#training" || adressWert("ansicht") === "training") {
      scrolleZu(document.getElementById("training"), document.getElementById("tr-titel"));
    }
  }

  var ausAdresse = teamAusAdresse();
  var gemerkt = "";
  try { gemerkt = localStorage.getItem(SPEICHER) || ""; } catch (e) { gemerkt = ""; }
  zustand.team = ausAdresse !== null ? ausAdresse : (mannschaftNachSlug(gemerkt) ? gemerkt : "");
  if (ausAdresse !== null) { try { localStorage.setItem(SPEICHER, ausAdresse); } catch (e) { /* egal */ } }
  zeigeWahl();
  zeigeAbos();

  document.getElementById("wahl-knoepfe").addEventListener("click", function (ev) {
    var k = ev.target && ev.target.closest ? ev.target.closest(".ts-pille") : null;
    if (!k) return;
    waehle(k.getAttribute("data-team") || "", true);
  });
  document.getElementById("woche-zurueck").addEventListener("click", function () { geheZuWoche(zustand.woche - 7, false); });
  document.getElementById("woche-vor").addEventListener("click", function () { geheZuWoche(zustand.woche + 7, false); });
  document.getElementById("hl-mehr").addEventListener("click", function () {
    var liste = highlightsFuerTeam();
    var heute = heuteNr();
    var naechster = liste.filter(function (e) { return Math.max(e.startNr, heute) > zustand.bisNr; })[0];
    zustand.bisNr = Math.max(zustand.bisNr, naechster ? naechster.startNr : zustand.bisNr) + MEHR_TAGE - 1;
    zeigeHighlights();
  });
  window.addEventListener("hashchange", function () {
    var t = teamAusAdresse();
    if (t !== null && t !== zustand.team) waehle(t, true);
    else if (location.hash === "#training") springeNachAdresse();
  });
  setzeLink(document.getElementById("kalender-link"), "kalender");
  document.getElementById("sprung-training").addEventListener("click", function (ev) {
    ev.preventDefault();
    scrolleZu(document.getElementById("training"), document.getElementById("tr-titel"));
  });

  start();
})();
