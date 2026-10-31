// Seite „Platzbelegung“ (src/vorlagen/platzbelegung.mjs) – Skript für
// web/platzbelegung.html und die App-Kopie Platzbelegung-App.html. Den
// Datenblock DATEN setzt der Build aus data/platzbelegung.json und
// data/verein.json ein (Adresse der Quelle, Vorlage der Anfrage, Adresse der
// Geschäftsstelle).
//
// Die Belegung selbst liest die Seite zur Laufzeit aus platzbelegung.json
// (Spielplan-Generator, Schnittstelle Version 1, GitHub Pages) und rechnet im
// Browser: Training, Heimspiele auf unserem Platz, andere Nutzung („belegt“),
// Halle, Ferien und Feiertage, daraus die freien Zeiten je Platzteil. Es wird
// nichts gebucht: „frei“ öffnet eine Anfrage per E-Mail an die Geschäftsstelle.
//
// Heimspiele (31.10.2026): Je nach dem Wert „feld“ in der Datei belegt ein Spiel
// den ganzen Platz („ganz“, Tor 1 bis 4: Klasse D, A, Herren; gilt auch, wenn „feld“
// fehlt) oder eine Hälfte („halb“: Klasse E, F, G; linke Hälfte = Tor 1 und 2,
// rechte = Tor 3 und 4). Welche Hälfte, rechnet die Seite je Tag nach der Regel
// in SCHNITTSTELLE.md (siehe haelfteWaehlen), unabhängig von Filtern und Ansicht.
//
// Ansicht: Standard ist ein Tag (Tagesansicht, bei jeder Breite). Ab 1100 px lässt
// sich auf das Wochengitter umschalten (Umschalter „Tag | Woche“); darunter gibt
// es nur die Tagesansicht.
//
// Alle Werte aus der Datei kommen nur über textContent oder DOM-Methoden auf
// die Seite, nie als HTML. Kann die Datei nicht geladen werden oder ist sie
// ungültig (andere Version, fehlende Teile), zeigt die Seite einen ruhigen
// Hinweis mit Link zu den Terminen; im Browser steht dazu höchstens die
// Meldung zur fehlgeschlagenen Anfrage selbst.
// Keine FreeMarker-Zeichenfolgen in dieser Datei (Dollar vor geschweifter
// Klammer, eckige Klammer vor Raute): die Seite soll notfalls auch als
// appack-Vorlage laufen.
(function () {
  "use strict";

  var DATEN = __PLATZBELEGUNG_DATEN__;

  // ---------- Einstellungen ----------

  // Halbes Feld (E-, F- und G-Jugend): auf welcher Platzhälfte ein solches Spiel liegt, wenn beide Hälften gleich belegt sind:
  // "links" (Tor 1 und 2) oder "rechts" (Tor 3 und 4). ANNAHME: Welche Hälfte die E-Jugend sonst nimmt, steht in keiner Quelle;
  // "links zuerst" ist nur eine Voreinstellung und kann geändert werden. Gilt nur bei Gleichstand: sonst entscheidet die
  // geringere Überlappung mit Training, „belegt“ und früheren Spielen (siehe haelfteWaehlen).
  var HALBFELD_ZUERST = "links";

  var WARTEZEIT = 8000;       // ms für das Laden der Datei
  var APP = document.documentElement.classList.contains("app-modus");
  var MS = 864e5;
  var WT = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
  var WK = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
  var MONATE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
  var KAT = { training: "training", spiel: "spiele", festival: "spiele", belegt: "sonst", frei: "frei" };
  var TYPNAME = { training: "Training", spiel: "Spiel", festival: "Kinderfestival" };
  var GANZER_PLATZ = ["tor1", "tor2", "tor3", "tor4"];
  var LINKE_HAELFTE = ["tor1", "tor2"];
  var RECHTE_HAELFTE = ["tor3", "tor4"];
  var BREITE_WOCHE = "(min-width: 1100px)";   // ab hier: größere Tagesansicht und der Umschalter „Tag | Woche“
  // Geometrie je Ansicht (muss zum Stylesheet passen). pm = Pixel je Minute, kopf = Höhe über den Spuren (Gruppen- und
  // Spurnamen: gruppen + lanes, werden als Höhe gesetzt), zeit/typ = ab dieser Blockhöhe (px) steht die Zeit bzw. die dritte Zeile.
  // tagBreit = Tagesansicht ab 1100 px (größere Schrift, mindestens 13 px in den Blöcken).
  var GEOM = {
    tag: { pm: 1, kopf: 48, gruppen: 20, lanes: 28, zeit: 34, typ: 58 },
    tagBreit: { pm: 1.25, kopf: 64, gruppen: 26, lanes: 38, zeit: 50, typ: 68 },
    woche: { pm: 0.9, kopf: 93, zeit: 34, typ: 58 }
  };

  // ---------- Hilfen: DOM ----------

  function el(tag, klasse, text) {
    var e = document.createElement(tag);
    if (klasse) e.className = klasse;
    if (text !== undefined && text !== null) e.textContent = text;
    return e;
  }
  function leeren(e) { while (e.firstChild) e.removeChild(e.firstChild); }
  function $(id) { return document.getElementById(id); }

  // ---------- Hilfen: Datum und Zeit (ganze Tage, ohne Zeitzonen-Fallen) ----------

  function p2(n) { return (n < 10 ? "0" : "") + n; }
  function isoN(s) { var a = String(s).split("-"); return Math.round(Date.UTC(+a[0], +a[1] - 1, +a[2]) / MS); }
  function nIso(n) { var d = new Date(n * MS); return d.getUTCFullYear() + "-" + p2(d.getUTCMonth() + 1) + "-" + p2(d.getUTCDate()); }
  function wtag(n) { return ((n + 3) % 7 + 7) % 7; }            // 0 = Montag; der 1. Januar 1970 war ein Donnerstag
  function jahrN(n) { return new Date(n * MS).getUTCFullYear(); }
  function kwN(n) { var th = n - wtag(n) + 3; return Math.floor((th - isoN(jahrN(th) + "-01-01")) / 7) + 1; }
  function tm(n) { var d = new Date(n * MS); return p2(d.getUTCDate()) + "." + p2(d.getUTCMonth() + 1) + "."; }
  function tmj(n) { return tm(n) + jahrN(n); }
  // im Satz ausgeschrieben („31. August 2026“), in Listen und Beschriftungen als TT.MM.JJJJ
  function datumLang(n) { var d = new Date(n * MS); return d.getUTCDate() + ". " + MONATE[d.getUTCMonth()] + " " + d.getUTCFullYear(); }
  function mo(n) { return n - wtag(n); }
  function mi(s) { var a = String(s).split(":"); return (+a[0]) * 60 + (+a[1]); }
  function hm(m) { return p2(Math.floor(m / 60)) + ":" + p2(m % 60); }
  function zt(a, b) { return hm(a) + "–" + hm(b); }

  // „Heute“ nach Frankfurter Zeit, sonst nach der Uhr des Geräts
  var berlinFormat = null;
  try { berlinFormat = new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", year: "numeric", month: "numeric", day: "numeric" }); } catch (e) { berlinFormat = null; }
  function heuteN() {
    var d = new Date();
    if (berlinFormat && berlinFormat.formatToParts) {
      try {
        var t = {};
        berlinFormat.formatToParts(d).forEach(function (p) { t[p.type] = parseInt(p.value, 10); });
        if (isFinite(t.year) && isFinite(t.month) && isFinite(t.day)) return Math.round(Date.UTC(t.year, t.month - 1, t.day) / MS);
      } catch (e) { /* Rückfall: Gerätezeit */ }
    }
    return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / MS);
  }
  function wochenTitel(m0) {
    var a = m0, b = m0 + 6, da = new Date(a * MS), db = new Date(b * MS), txt;
    if (jahrN(a) !== jahrN(b)) txt = tmj(a) + "–" + tmj(b);
    else if (da.getUTCMonth() === db.getUTCMonth()) txt = p2(da.getUTCDate()) + ".–" + tmj(b);
    else txt = tm(a) + "–" + tmj(b);
    return { kw: "KW " + kwN(m0), datum: txt };
  }

  // ---------- Daten aus der Datei (gesetzt in bereite) ----------

  var D, R, TV, TB, FREI, HALLE, TRAINING, BELEGT, NAV0, NAV1, LANE, MA, SP, TEILE, FENSTER, MINFREI, HALBE;

  function zahl(x) { return typeof x === "number" && isFinite(x); }
  function text(x) { return typeof x === "string" ? x : ""; }

  function lanesVon(teile) {
    var l = [];
    (Array.isArray(teile) ? teile : []).forEach(function (t) { if (typeof t === "string" && LANE[t] !== undefined && l.indexOf(LANE[t]) < 0) l.push(LANE[t]); });
    return l.sort(function (a, b) { return a - b; });
  }
  function fensterVon(f) {
    if (!Array.isArray(f) || f.length !== 2) throw new Error("fenster");
    var a = mi(f[0]), b = mi(f[1]);
    if (!zahl(a) || !zahl(b) || b <= a) throw new Error("fenster");
    return [a, b];
  }

  // Prüft die Datei und bereitet sie auf. Jeder Fehler führt zum Hinweis
  // „nicht erreichbar“; einzelne unbrauchbare Einträge werden übersprungen.
  function bereite(d) {
    if (!d || typeof d !== "object" || d.version !== 1) throw new Error("Version");
    ["teile", "mannschaften", "training", "halle", "belegt", "spiele"].forEach(function (k) { if (!Array.isArray(d[k])) throw new Error("Feld " + k); });
    var r = d.regeln;
    if (!r || typeof r !== "object" || !Array.isArray(r.frei) || !r.fenster || !Array.isArray(r.navigation) || r.navigation.length !== 2) throw new Error("regeln");
    if (!d.stand || typeof d.stand !== "object") throw new Error("stand");
    D = d; R = r;
    TV = isoN(r.trainingVon); TB = isoN(r.trainingBis);
    NAV0 = mo(isoN(r.navigation[0])); NAV1 = mo(isoN(r.navigation[1]));
    MINFREI = r.minFrei;
    if (!zahl(TV) || !zahl(TB) || !zahl(NAV0) || !zahl(NAV1) || NAV1 < NAV0 || !zahl(MINFREI) || MINFREI < 1) throw new Error("Zahlen");
    FENSTER = { werktag: fensterVon(r.fenster.werktag), wochenende: fensterVon(r.fenster.wochenende) };

    TEILE = []; LANE = Object.create(null);
    d.teile.forEach(function (t) {
      if (!t || typeof t.id !== "string" || typeof t.name !== "string" || LANE[t.id] !== undefined) return;
      LANE[t.id] = TEILE.length; TEILE.push({ id: t.id, name: t.name });
    });
    if (!TEILE.length) throw new Error("teile");
    HALBE = TEILE.length >= 4 && GANZER_PLATZ.every(function (id, i) { return TEILE[i].id === id; });

    // rang = Stelle der Mannschaft in der Datei (entscheidet bei gleichem Anstoß, wer zuerst eine Platzhälfte wählt)
    MA = Object.create(null);
    d.mannschaften.forEach(function (m, i) {
      if (m && typeof m.id === "string" && typeof m.kurz === "string") MA[m.id] = { id: m.id, kurz: m.kurz, rang: i };
    });

    FREI = [];
    r.frei.forEach(function (f) {
      var v = f && isoN(f.von), b = f && isoN(f.bis);
      if (f && zahl(v) && zahl(b) && b >= v && typeof f.name === "string") FREI.push({ v: v, b: b, name: f.name });
    });
    HALLE = [];
    d.halle.forEach(function (h) {
      if (!h || !MA[h.t] || !(h.tag >= 0 && h.tag <= 6)) return;
      var ab = isoN(h.ab), bis = isoN(h.bisDatum);
      if (zahl(ab) && zahl(bis) && zahl(mi(h.von)) && zahl(mi(h.bis))) HALLE.push({ t: h.t, tag: h.tag, von: String(h.von), bis: String(h.bis), ort: text(h.ort), ab: ab, bisN: bis });
    });
    TRAINING = [];
    d.training.forEach(function (t) {
      if (!t || !MA[t.t] || !(t.tag >= 0 && t.tag <= 6)) return;
      var l = lanesVon(t.teile), v = mi(t.von), b = mi(t.bis);
      if (l.length && zahl(v) && zahl(b) && b > v) TRAINING.push({ t: t.t, tag: t.tag, von: v, bis: b, lanes: l, platz: text(t.platz) });
    });
    BELEGT = [];
    d.belegt.forEach(function (x) {
      if (!x || !(x.tag >= 0 && x.tag <= 6)) return;
      var l = lanesVon(x.teile), v = mi(x.von), b = mi(x.bis);
      if (l.length && zahl(v) && zahl(b) && b > v) BELEGT.push({ tag: x.tag, von: v, bis: b, lanes: l });
    });
    SP = Object.create(null);
    d.spiele.forEach(function (s) {
      if (!s || !MA[s.t] || typeof s.d !== "string" || !zahl(mi(s.z))) return;
      (SP[s.d] = SP[s.d] || []).push(s);
    });
    cache = {};
  }

  // ---------- Rechnen: Einträge und freie Zeiten je Tag ----------

  function statusN(n) {
    if (n < TV) return { k: "vor" };
    if (n > TB) return { k: "nach" };
    for (var i = 0; i < FREI.length; i++) if (n >= FREI[i].v && n <= FREI[i].b) return { k: "frei", name: FREI[i].name };
    return { k: "aktiv" };
  }
  function platzText(lanes) {
    var l = lanes.slice().sort(function (a, b) { return a - b; });
    if (HALBE) {
      var s = l.join(",");
      if (s === "0,1,2,3") return "ganzer Platz";
      if (s === "0,1") return "linke Hälfte";
      if (s === "2,3") return "rechte Hälfte";
    }
    return l.map(function (i) { return TEILE[i].name; }).join(", ");
  }
  function blockName(b) { return b.typ === "belegt" ? "belegt" : (b.typ === "frei" ? "frei" : MA[b.t].kurz); }

  // ---------- Rechnen: Platzhälfte bei Spielen mit halbem Feld ----------

  // Minuten, in denen [von, bis) die schon gesetzten Einträge auf den Spuren einer Hälfte überschneidet (jede Spur einzeln,
  // jeder Eintrag für sich: Training, „belegt“ und früher gesetzte Spiele)
  function ueberlappung(bl, spuren, von, bis) {
    var summe = 0;
    spuren.forEach(function (sp) {
      bl.forEach(function (b) {
        if (b.lanes.indexOf(sp) >= 0) summe += Math.max(0, Math.min(bis, b.bis) - Math.max(von, b.von));
      });
    });
    return summe;
  }
  // Die Hälfte mit der kleineren Überlappung; bei Gleichstand die bevorzugte (HALBFELD_ZUERST)
  function haelfteWaehlen(bl, von, bis, links, rechts) {
    var l = ueberlappung(bl, links, von, bis), r = ueberlappung(bl, rechts, von, bis);
    if (l === r) return HALBFELD_ZUERST === "rechts" ? "rechts" : "links";
    return l < r ? "links" : "rechts";
  }
  // Reihenfolge der Spiele eines Tages auf unserem Platz: Anstoß, dann Stelle der Mannschaft in der Datei, dann Spielnummer als Text
  function nrText(s) { return typeof s.nr === "string" ? s.nr : (zahl(s.nr) ? String(s.nr) : ""); }
  function spielVor(a, b) {
    var d = mi(a.z) - mi(b.z);
    if (d) return d;
    d = MA[a.t].rang - MA[b.t].rang;
    if (d) return d;
    var x = nrText(a), y = nrText(b);
    return x < y ? -1 : (x > y ? 1 : 0);
  }
  function listeVon(name, rueckfall) { return Array.isArray(D.belegung && D.belegung[name]) ? D.belegung[name] : rueckfall; }

  var cache = {};
  function tagDaten(n) {
    if (cache[n]) return cache[n];
    var wt = wtag(n), iso = nIso(n), st = statusN(n), bl = [], halle = [], andere = [], seq = 0;
    function neu(o) {
      o.id = iso + "#" + (seq++); o.kat = KAT[o.typ];
      o.x0 = Math.min.apply(null, o.lanes); o.x1 = Math.max.apply(null, o.lanes);
      o.col = 0; o.n = 1;
      bl.push(o); return o;
    }
    // Training und andere Nutzung gelten nur in der Saison und nicht in den Ferien;
    // Mannschaften in der Halle sind in dieser Zeit nicht auf dem Platz
    if (st.k === "aktiv") {
      var inHalle = Object.create(null);
      HALLE.forEach(function (h) { if (n >= h.ab && n <= h.bisN) inHalle[h.t] = true; });
      TRAINING.forEach(function (t) {
        if (t.tag === wt && !inHalle[t.t]) neu({ typ: "training", t: t.t, von: t.von, bis: t.bis, lanes: t.lanes, platz: t.platz });
      });
      HALLE.forEach(function (h) {
        if (h.tag === wt && n >= h.ab && n <= h.bisN) halle.push({ t: h.t, von: h.von, bis: h.bis, ort: h.ort });
      });
      BELEGT.forEach(function (x) {
        if (x.tag === wt) neu({ typ: "belegt", t: null, von: x.von, bis: x.bis, lanes: x.lanes, platz: platzText(x.lanes) });
      });
    }
    // Heimspiele auf unserem Platz: der ganze Platz (Tor 1 bis 4; „ganz“, auch wenn „feld“ fehlt) oder eine Hälfte („halb“), Dauer und
    // Feldteil geschätzt; alle anderen Heimspiele stehen nur in der Zeile „auf anderer Anlage“. Die Spiele kommen der Reihe nach
    // (spielVor) und sehen Training, „belegt“ und die früher gesetzten Spiele des Tages.
    var ganz = lanesVon(listeVon("ganzer Platz", GANZER_PLATZ));
    var links = lanesVon(listeVon("linke Hälfte", LINKE_HAELFTE)), rechts = lanesVon(listeVon("rechte Hälfte", RECHTE_HAELFTE));
    var spieleU = [];
    (SP[iso] || []).forEach(function (s) {
      if (s.ort === "u") spieleU.push(s);
      else andere.push({ t: s.t, z: text(s.z), ort: text(s.ort) });
    });
    spieleU.sort(spielVor);
    spieleU.forEach(function (s) {
      var v = mi(s.z), dauer = zahl(s.dauer) && s.dauer > 0 ? s.dauer : 90;
      var halb = s.feld === "halb" && links.length > 0 && rechts.length > 0;
      var lanes = halb ? (haelfteWaehlen(bl, v, v + dauer, links, rechts) === "links" ? links : rechts) : ganz;
      if (!lanes.length) return;
      neu({ typ: s.w === "Kinderfestival" ? "festival" : "spiel", t: s.t, von: v, bis: v + dauer, lanes: lanes, platz: platzText(lanes), spiel: s, halb: halb });
    });
    andere.sort(function (a, b) { return mi(a.z) - mi(b.z); });
    var fk = FENSTER[wt < 5 ? "werktag" : "wochenende"], f0 = fk[0], f1 = fk[1];
    // freie Zeiten je Platzteil: Lücken zwischen den Einträgen im Öffnungsfenster, ab MINFREI Minuten
    var frei = [];
    for (var L = 0; L < TEILE.length; L++) {
      var iv = bl.filter(function (b) { return b.lanes.indexOf(L) >= 0; })
        .map(function (b) { return [Math.max(b.von, f0), Math.min(b.bis, f1)]; })
        .filter(function (a) { return a[1] > a[0]; })
        .sort(function (a, b) { return a[0] - b[0]; });
      var cur = f0;
      iv.forEach(function (a) { if (a[0] - cur >= MINFREI) frei.push({ lane: L, von: cur, bis: a[0] }); cur = Math.max(cur, a[1]); });
      if (f1 - cur >= MINFREI) frei.push({ lane: L, von: cur, bis: f1 });
    }
    frei = frei.map(function (f, i) { return { id: iso + "#f" + i, typ: "frei", kat: "frei", t: null, lane: f.lane, lanes: [f.lane], x0: f.lane, x1: f.lane, von: f.von, bis: f.bis, col: 0, n: 1 }; });
    // Einträge mit denselben Platzteilen, die sich überschneiden und kurz nacheinander beginnen (höchstens 45 Minuten,
    // zum Beispiel drei Spiele um 11:00, 11:30 und 12:00), stehen nebeneinander, sonst würden sich die Beschriftungen
    // verdecken. Alle anderen liegen übereinander, der später beginnende oben.
    var gruppen = Object.create(null);
    bl.forEach(function (b) { var k = b.lanes.join(","); (gruppen[k] = gruppen[k] || []).push(b); });
    Object.keys(gruppen).forEach(function (k) {
      var g = gruppen[k].slice().sort(function (x, y) { return x.von - y.von || x.bis - y.bis; }), komp = [], c2 = null, ende = 0, letzter = 0;
      g.forEach(function (b) {
        if (c2 && b.von < ende && b.von - letzter <= 45) { c2.push(b); ende = Math.max(ende, b.bis); } else { c2 = [b]; komp.push(c2); ende = b.bis; }
        letzter = b.von;
      });
      komp.forEach(function (c) {
        var sp = [];
        c.forEach(function (b) { var s = 0; while (s < sp.length && sp[s] > b.von) s++; sp[s] = b.bis; b.col = s; });
        c.forEach(function (b) { b.n = sp.length; });
      });
    });
    var res = { n: n, iso: iso, wt: wt, fenster: [f0, f1], status: st, bloecke: bl, frei: frei, halle: halle, andere: andere };
    cache[n] = res;
    return res;
  }

  // ---------- Zustand ----------

  // ansicht: "tag" (Standard) oder "woche"; das Wochengitter gibt es nur ab 1100 px, darunter immer einen Tag
  var state = { wk: 0, tag: 0, filter: "alle", heute: 0, ansicht: "tag" };
  var gezeichnetBreite = 0;   // Fensterbreite beim letzten Zeichnen
  var mq = window.matchMedia ? window.matchMedia(BREITE_WOCHE) : { matches: false };
  function breit() { return mq.matches; }
  function modus() { return mq.matches && state.ansicht === "woche" ? "woche" : "tag"; }
  function sichtbar(it) {
    var f = state.filter;
    if (f === "alle") return true;
    if (f === "training" || f === "spiele" || f === "frei") return it.kat === f;
    return it.t === f;
  }

  // ---------- Anfrage per E-Mail (Dialog) ----------

  var dlg = null;
  var letzterFokus = null;

  function dialogSchliessen() {
    if (!dlg) return;
    if (typeof dlg.close === "function") { if (dlg.open) dlg.close(); } else dlg.removeAttribute("open");
  }
  function dialogOeffnen(titel, fuellen, opener) {
    letzterFokus = opener || null;
    $("pb-dialog-titel").textContent = titel;
    var host = $("pb-dialog-text");
    leeren(host);
    fuellen(host);
    if (typeof dlg.showModal === "function") { if (!dlg.open) dlg.showModal(); } else dlg.setAttribute("open", "");
  }
  function liste(host, paare) {
    var dl = el("dl", "pb-dialog__liste");
    paare.forEach(function (p) { dl.appendChild(el("dt", null, p[0])); dl.appendChild(el("dd", null, p[1])); });
    host.appendChild(dl);
  }
  // mailto nach RFC 6068: Zeilenwechsel als CRLF, Betreff und Text mit encodeURIComponent;
  // nichts, was eine Person betrifft, ist vorbelegt
  function anfrageLink(platzteil, tag, zeit) {
    function fuell(vorlage) {
      return String(vorlage).split("{platzteil}").join(platzteil).split("{tag}").join(tag).split("{zeit}").join(zeit);
    }
    var betreff = fuell(DATEN.betreff);
    var koerper = fuell(DATEN.text).replace(/\r?\n/g, "\r\n");
    return "mailto:" + DATEN.mail + "?subject=" + encodeURIComponent(betreff) + "&body=" + encodeURIComponent(koerper);
  }
  function dialogFrei(t, f, opener) {
    var platzteil = TEILE[f.lane].name, tag = WT[t.wt] + " " + tmj(t.n), zeit = zt(f.von, f.bis);
    dialogOeffnen("Platz anfragen", function (host) {
      liste(host, [["Platzteil", platzteil], ["Tag", tag], ["Zeit", zeit + " Uhr"]]);
      host.appendChild(el("p", null, "Frei heißt: kein Eintrag im Plan. Ob der Platz genutzt werden kann, entscheidet die Geschäftsstelle. Es wird nichts gebucht."));
      var p = el("p");
      p.appendChild(document.createTextNode("Anfrage per E-Mail an "));
      p.appendChild(el("span", "pb-dialog__adresse", DATEN.mail));
      p.appendChild(document.createTextNode("."));
      host.appendChild(p);
      var akt = el("div", "pb-dialog__aktionen");
      var senden = el("a", "knopf", "E-Mail schreiben");
      senden.href = anfrageLink(platzteil, tag, zeit);
      akt.appendChild(senden);
      var zu = el("button", "knopf knopf--sekundaer", "Schließen");
      zu.type = "button";
      zu.addEventListener("click", dialogSchliessen);
      akt.appendChild(zu);
      host.appendChild(akt);
    }, opener);
  }

  // ---------- Texte für Hinweise und Notizen ----------

  function statusText(t) {
    if (t.status.k === "frei") return t.status.name + ": Es steht kein Training im Plan.";
    if (t.status.k === "vor") return "Vor dem " + datumLang(TV) + " steht kein Training im Plan.";
    if (t.status.k === "nach") return "Nach dem " + datumLang(TB) + " steht kein Training im Plan.";
    return "";
  }
  function kopfKurz(t) { return WK[t.wt] + " " + tm(t.n); }

  // Hinweise der Woche: Ferien, Feiertage und Zeiten außerhalb der Saison (aufeinanderfolgende Tage mit gleichem Grund
  // zusammengefasst) und die Hallenzeiten
  function hinweiseWoche(tage) {
    var out = [], lauf = null;
    tage.forEach(function (t, i) {
      var s = t.status, key = s.k === "aktiv" ? null : s.k + (s.name || "");
      if (key && lauf && lauf.key === key) lauf.bis = i;
      else { if (lauf) out.push(lauf); lauf = key ? { art: "status", key: key, tag: i, bis: i, text: statusText(t) } : null; }
    });
    if (lauf) out.push(lauf);
    var hs = [];
    tage.forEach(function (t, i) { t.halle.forEach(function (h) { hs.push({ i: i, t: t, h: h }); }); });
    if (hs.length) {
      out.push({ art: "halle", tag: hs[0].i, eintraege: hs.map(function (x) {
        return MA[x.h.t].kurz + " " + WK[x.t.wt] + " " + tm(x.t.n) + " " + x.h.von + "–" + x.h.bis + ", " + x.h.ort; }) });
    }
    out.sort(function (a, b) { return a.tag - b.tag || (a.art === "status" ? -1 : 0) - (b.art === "status" ? -1 : 0); });
    return out;
  }

  // ---------- Zeichnen ----------

  function achse(f0, f1, geo) {
    var a = el("div", "pb-achse"); a.setAttribute("aria-hidden", "true");
    var sp = el("span", "pb-abstand"); sp.style.height = geo.kopf + "px"; a.appendChild(sp);
    var body = el("div"); body.style.cssText = "position:relative;height:" + ((f1 - f0) * geo.pm) + "px;margin-top:1px";
    for (var m = Math.ceil(f0 / 60) * 60; m <= f1; m += 60) {
      var l = el("span", "pb-zl" + (m === f0 ? " erste" : (m === f1 ? " letzte" : "")), hm(m)); l.style.top = ((m - f0) * geo.pm) + "px"; body.appendChild(l);
    }
    if (f0 % 60) { var e0 = el("span", "pb-zl erste", hm(f0)); e0.style.top = "0px"; body.appendChild(e0); }
    if (f1 % 60) { var e1 = el("span", "pb-zl letzte", hm(f1)); e1.style.top = ((f1 - f0) * geo.pm) + "px"; body.appendChild(e1); }
    a.appendChild(body);
    return a;
  }
  function laneKopf(geo) {
    var kb = el("div", "pb-kopfblock");
    var g = el("div", "pb-gruppen"); g.setAttribute("aria-hidden", "true");
    if (geo.gruppen) g.style.height = geo.gruppen + "px";   // Höhen der Köpfe kommen aus GEOM (die Achse richtet sich danach)
    g.appendChild(el("span", "g1", HALBE ? "linke Hälfte" : "")); g.appendChild(el("span", "g2", HALBE ? "rechte Hälfte" : "")); g.appendChild(el("span", "g3", ""));
    kb.appendChild(g);
    var lk = el("div", "pb-lk");
    if (geo.lanes) lk.style.height = geo.lanes + "px";
    TEILE.forEach(function (t) { lk.appendChild(el("span", null, t.name)); });
    kb.appendChild(lk);
    return kb;
  }
  function zeileMit(art, kopf, eintraege) {
    var z = el("p", "pb-zeile"); z.setAttribute("data-art", art);
    z.appendChild(el("b", null, kopf));
    eintraege.forEach(function (txt, i) {
      if (i) z.appendChild(document.createTextNode(" · "));
      z.appendChild(el("span", "pb-eintrag", txt));
    });
    return z;
  }
  // Zeilen unter dem Tag: Halle und Heimspiele auf anderer Anlage (nicht auf unserem Platz)
  function fussZeilen(t) {
    var fuss = el("div", "pb-fuss");
    var hal = t.halle.filter(function (h) { return sichtbar({ kat: "training", t: h.t }); });
    if (hal.length) fuss.appendChild(zeileMit("halle", "In der Halle: ", hal.map(function (h) { return MA[h.t].kurz + " " + h.von + "–" + h.bis + " (" + h.ort + ")"; })));
    var an = t.andere.filter(function (a) { return sichtbar({ kat: "spiele", t: a.t }); });
    if (an.length) fuss.appendChild(zeileMit("andere", "Heimspiele auf anderer Anlage: ", an.map(function (a) { return MA[a.t].kurz + " " + a.z + " (" + a.ort + ")"; })));
    return fuss;
  }
  function tagSpalte(t, geo, woche) {
    var f0 = t.fenster[0], f1 = t.fenster[1];
    var sec = el("section", "pb-tag"); sec.setAttribute("aria-label", WT[t.wt] + " " + tmj(t.n)); sec.setAttribute("data-datum", t.iso);
    if (woche) {
      var tk = el("div", "pb-tkopf" + (t.n === state.heute ? " pb-heute-tag" : ""));
      tk.appendChild(el("b", null, WK[t.wt] + " " + tm(t.n)));
      // eine kleine Zeile (die Höhe ist fest): Ferien oder Feiertag, außerhalb der Saison, sonst „heute“
      var kl = null;
      if (t.status.k === "frei") kl = t.status.name;
      else if (t.status.k !== "aktiv") kl = t.status.k === "vor" ? "vor der Saison" : "nach der Saison";
      else if (t.n === state.heute) kl = "heute";
      if (kl) { tk.appendChild(document.createTextNode(" ")); tk.appendChild(el("small", null, kl)); }
      sec.appendChild(tk);
    }
    sec.appendChild(laneKopf(geo));
    var lanes = el("div", "pb-lanes"); lanes.style.height = ((f1 - f0) * geo.pm) + "px";
    for (var m = Math.ceil(f0 / 30) * 30; m < f1; m += 30) {
      var rl = el("div", "pb-rl" + (m % 60 === 0 ? " voll" : "")); rl.style.top = ((m - f0) * geo.pm) + "px"; lanes.appendChild(rl);
    }
    var N = TEILE.length;
    for (var k = 1; k < N; k++) { var sp = el("div", "pb-sep" + (HALBE && (k === 2 || k === 4) ? " halb" : "")); sp.style.left = (k * 100 / N) + "%"; lanes.appendChild(sp); }
    sec.appendChild(lanes);
    if (woche) {
      sec.appendChild(fussZeilen(t));
      if (t.status.k !== "aktiv") sec.appendChild(el("p", "pb-notiz", statusText(t)));
    }
    return { sec: sec, lanes: lanes, t: t };
  }
  // Textform eines Eintrags nach verfügbarer Breite: 'rot1' = eine Zeile hochkant (sehr schmal), 'rot' = zwei Zeilen hochkant,
  // 'schmal' = Zeit in zwei Zeilen, 'breit' = normal
  function textModus(it, wpx) {
    if (wpx < 40) return "rot1";
    var lang = 0;   // längster Wortteil (an Leerzeichen, Bindestrich, weichem Trennstrich) passt nicht in die Spur: hochkant
    blockName(it).split(/[ \-­]/).forEach(function (x) { lang = Math.max(lang, x.length); });
    if (lang * 12 * 0.58 + 8 > wpx) return "rot";
    return wpx < 84 ? "schmal" : "breit";
  }
  function blockText(it, modus, hpx, wpx, geo) {
    var name = blockName(it), zeit = zt(it.von, it.bis);
    var typ = TYPNAME[it.typ] || "", tx = el("span", "tx");
    var nm = el("span", "nm", name);
    // Festival auf halbem Feld ist im Wochengitter nur rund 50 px breit: im Modus „schmal“ mit Trennstelle (Fes-tival), sonst passt das Wort nicht
    if (it.typ === "spiel" || it.typ === "festival") nm.textContent = name + (modus.indexOf("rot") === 0 ? (it.typ === "spiel" ? " Spiel" : " Festival") : " · " + (it.typ === "festival" && wpx < 120 ? (modus === "schmal" ? "Fes\u00ADtival" : "Festival") : typ));
    if (modus === "rot1") {
      if (hpx < 20) return null;
      tx.appendChild(nm);
      if (hpx - 6 >= (nm.textContent.length * 6.3 + 4 + 11 * 5)) { tx.appendChild(document.createTextNode(" ")); tx.appendChild(el("span", "zt", zeit)); }
    } else if (modus === "rot") {
      if (hpx < 20) return null;
      tx.appendChild(nm);
      if (hpx >= 62) tx.appendChild(el("span", "zt", zeit));
    } else if (modus === "schmal") {
      tx.appendChild(nm);
      if (hpx >= 40) { var z2 = el("span", "zt"); z2.appendChild(el("span", null, hm(it.von))); z2.appendChild(el("span", null, "–" + hm(it.bis))); tx.appendChild(z2); }
    } else {
      tx.appendChild(nm);
      if (hpx >= geo.zeit) tx.appendChild(el("span", "zt", it.spiel ? hm(it.von) + "–ca. " + hm(it.bis) : zeit));
      if (hpx >= geo.typ) {
        var zeile = it.typ === "training" ? (it.platz ? "Training · " + it.platz : "Training") : (it.spiel ? text(it.spiel.w) : (it.typ === "belegt" ? it.platz : ""));
        if (zeile) tx.appendChild(el("span", "ty", zeile));
      }
    }
    return tx;
  }
  function beschriftung(it, t) {
    var wann = WT[t.wt] + " " + tmj(t.n) + ", " + zt(it.von, it.bis) + " Uhr";
    if (it.typ === "frei") return "Frei: " + TEILE[it.lane].name + ", " + wann;
    if (it.typ === "belegt") return "belegt, " + platzText(it.lanes) + ", " + wann;
    var s = blockName(it) + ", " + TYPNAME[it.typ] + ", " + platzText(it.lanes) + (it.halb ? " (halbes Feld)" : "") + ", " + wann;
    if (it.spiel) s += it.halb ? ", Dauer und Feldteil geschätzt" : ", Dauer geschätzt";
    return s;
  }
  function fuelleLanes(sp) {
    var t = sp.t, f0 = t.fenster[0], f1 = t.fenster[1], geo = sp.geo;
    var N = TEILE.length, lw = sp.lanes.getBoundingClientRect().width / N;
    var alle = t.frei.concat(t.bloecke.slice().sort(function (a, b) { return (b.x1 - b.x0) - (a.x1 - a.x0) || a.von - b.von || b.bis - a.bis; }));
    alle.forEach(function (it) {
      var v = Math.max(it.von, f0), b = Math.min(it.bis, f1);
      if (b <= v) return;
      var breite = it.x1 - it.x0 + 1, slot = breite / it.n;
      var top = (v - f0) * geo.pm, hpx = (b - v) * geo.pm, wpx = slot * lw - 3;
      var md = textModus(it, wpx);
      var blk = el("div", "pb-bl" + (md === "breit" ? "" : " " + md));
      blk.setAttribute("data-typ", it.typ); blk.setAttribute("data-kat", it.kat);
      if (it.t) blk.setAttribute("data-t", it.t);
      blk.setAttribute("data-von", hm(it.von)); blk.setAttribute("data-bis", hm(it.bis));
      blk.setAttribute("data-teile", it.lanes.map(function (i) { return TEILE[i].id; }).join(","));
      blk.style.cssText = "left:calc(" + ((it.x0 + it.col * slot) / N * 100) + "% + 1px);width:calc(" + (slot / N * 100) + "% - 2px);top:" + top + "px;height:" + hpx +
        "px;z-index:" + (it.typ === "frei" ? 1 : (10 - breite));
      var label = beschriftung(it, t);
      blk.title = label;
      var tx = blockText(it, md, hpx, wpx, geo); if (tx) blk.appendChild(tx);
      if (it.typ === "frei") {
        // frei: Knopf (Tastatur und Bildschirmleser); öffnet die Anfrage
        blk.setAttribute("role", "button"); blk.tabIndex = 0; blk.setAttribute("aria-haspopup", "dialog");
        blk.setAttribute("aria-label", label + ". Platz anfragen.");
        blk.addEventListener("click", function () { dialogFrei(t, it, blk); });
        blk.addEventListener("keydown", function (e) {
          if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") { e.preventDefault(); dialogFrei(t, it, blk); }
        });
      } else {
        blk.setAttribute("role", "img");
        blk.setAttribute("aria-label", label);
      }
      if (!sichtbar(it)) { blk.className += " aus"; blk.setAttribute("aria-hidden", "true"); blk.tabIndex = -1; }
      sp.lanes.appendChild(blk);
    });
  }
  function baueEinzeltag(t) {
    var geo = breit() ? GEOM.tagBreit : GEOM.tag, wrap = el("div", "pb-tagansicht");
    var h2 = el("h2", "pb-tag-titel", WT[t.wt] + ", " + tmj(t.n));
    if (t.n === state.heute) { h2.appendChild(document.createTextNode(" ")); h2.appendChild(el("small", null, "heute")); }
    wrap.appendChild(h2);
    if (t.status.k !== "aktiv") { var nz = el("div", "pb-notizen"); nz.appendChild(el("p", "pb-notiz", statusText(t))); wrap.appendChild(nz); }
    var fuss = fussZeilen(t);
    if (fuss.childNodes.length) { fuss.style.margin = "6px 0 8px"; wrap.appendChild(fuss); }
    var z = el("div", "pb-zeitleiste");
    z.appendChild(achse(t.fenster[0], t.fenster[1], geo));
    var sp = tagSpalte(t, geo, false); sp.geo = geo; z.appendChild(sp.sec);
    wrap.appendChild(z);
    return { el: wrap, spalten: [sp] };
  }
  function baueWoche(tage) {
    var geo = GEOM.woche, g = el("div", "pb-woche"), sps = [];
    g.appendChild(achse(tage[0].fenster[0], tage[0].fenster[1], geo));
    tage.slice(0, 5).forEach(function (t) { var sp = tagSpalte(t, geo, true); sp.geo = geo; sps.push(sp); g.appendChild(sp.sec); });
    g.appendChild(el("div"));
    g.appendChild(achse(tage[5].fenster[0], tage[5].fenster[1], geo));
    tage.slice(5).forEach(function (t) { var sp = tagSpalte(t, geo, true); sp.geo = geo; sps.push(sp); g.appendChild(sp.sec); });
    return { el: g, spalten: sps };
  }

  function render() {
    var m0 = state.wk, tage = [], i;
    for (i = 0; i < 7; i++) tage.push(tagDaten(m0 + i));
    var wt = wochenTitel(m0), titel = $("pb-titel");
    leeren(titel);
    titel.appendChild(el("strong", null, wt.kw)); titel.appendChild(el("span", null, wt.datum));
    $("pb-zurueck").disabled = m0 <= NAV0; $("pb-vor").disabled = m0 >= NAV1;
    var tabs = $("pb-tagwahl").children;
    for (i = 0; i < 7; i++) {
      var tb = tabs[i], t = tage[i];
      tb.querySelector("span").textContent = tm(t.n).slice(0, 5);
      var fz = tb.querySelector("i"); fz.textContent = t.status.k === "frei" ? (/ferien$/.test(t.status.name) ? "Ferien" : "Feiertag") : (t.status.k === "aktiv" ? "" : "–");
      tb.setAttribute("aria-selected", i === state.tag ? "true" : "false"); tb.tabIndex = i === state.tag ? 0 : -1;
      tb.className = "pb-tab" + (t.n === state.heute ? " pb-heute-tag" : "");
      tb.setAttribute("aria-label", WT[t.wt] + ", " + tmj(t.n) + (t.n === state.heute ? ", heute" : "") + (t.status.k === "frei" ? ", " + t.status.name : ""));
    }
    Array.prototype.forEach.call(document.querySelectorAll(".pb-chip"), function (c) { c.setAttribute("aria-pressed", c.getAttribute("data-f") === state.filter ? "true" : "false"); });
    Array.prototype.forEach.call(document.querySelectorAll(".pb-umschalt"), function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-ansicht") === state.ansicht ? "true" : "false"); });
    var host = $("pb-ansicht"), woche = modus() === "woche", ans = woche ? baueWoche(tage) : baueEinzeltag(tage[state.tag]);
    // im Wochengitter braucht es die Tagwahl nicht (alle sieben Tage stehen da)
    if (woche) $("pb").classList.add("pb-ist-woche"); else $("pb").classList.remove("pb-ist-woche");
    leeren(host); host.appendChild(ans.el);
    if (woche) { host.setAttribute("role", "group"); host.setAttribute("aria-label", "Belegung der Woche"); host.removeAttribute("aria-labelledby"); }
    else { host.setAttribute("role", "tabpanel"); host.setAttribute("aria-labelledby", "pb-tab-" + state.tag); host.removeAttribute("aria-label"); }
    ans.spalten.forEach(function (sp) { fuelleLanes(sp); });
    // erst nach dem Zeichnen lesen: window.innerWidth erzwingt das Berechnen der Stile, und die Tagwahl und die Filter
    // würden beim ersten Zeichnen sichtbar überblendet statt gleich in ihrer Farbe zu erscheinen
    gezeichnetBreite = window.innerWidth;
    // Hinweise der Woche
    var ul = $("pb-hinweise"); leeren(ul);
    var hin = hinweiseWoche(tage);
    if (!hin.length) ul.appendChild(el("li", null, "Keine Ferien und keine Hallenzeiten in dieser Woche."));
    hin.forEach(function (h) {
      var li = el("li"); li.setAttribute("data-art", h.art);
      if (h.art === "status") {
        li.appendChild(el("span", "art", (h.tag === h.bis ? kopfKurz(tage[h.tag]) : kopfKurz(tage[h.tag]) + "–" + kopfKurz(tage[h.bis])) + ": "));
        li.appendChild(document.createTextNode(h.text + (tage[h.tag].status.k === "frei" ? " Ob trotzdem trainiert wird, sagt das Trainerteam." : "")));
      } else {
        li.appendChild(el("span", "art", "In der Halle (nicht auf dem Platz): "));
        h.eintraege.forEach(function (txt, k) {
          if (k) li.appendChild(document.createTextNode(" · "));
          li.appendChild(el("span", "pb-eintrag", txt));
        });
      }
      ul.appendChild(li);
    });
  }

  // ---------- Steuerung ----------

  function setzeWoche(m0, tag) {
    state.wk = Math.max(NAV0, Math.min(NAV1, m0));
    if (tag !== null && tag !== undefined) state.tag = tag;
    render();
  }
  function heuteWoche() {
    var h = state.heute, hin = $("pb-heute-hinweis");
    if (h < NAV0) { hin.hidden = false; hin.textContent = "Heute liegt vor dem Plan der Saison " + text(D.saison) + ". Gezeigt wird die erste Woche."; setzeWoche(NAV0, 0); }
    else if (h > NAV1 + 6) { hin.hidden = false; hin.textContent = "Heute liegt nach dem Plan der Saison " + text(D.saison) + ". Gezeigt wird die letzte Woche."; setzeWoche(NAV1, 0); }
    else { hin.hidden = true; setzeWoche(mo(h), wtag(h)); }
  }
  // Adresse #JJJJ-MM-TT öffnet die Tagesansicht dieses Tages (und seiner Woche). Der Umschalter „Tag | Woche“ ändert die Adresse nicht.
  function ausAdresse() {
    var h = (location.hash || "").replace(/^#/, "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(h)) return null;
    var n = isoN(h);
    return zahl(n) && nIso(n) === h ? n : null;
  }
  function vonAdresse() {
    var n = ausAdresse();
    if (n === null) return false;
    $("pb-heute-hinweis").hidden = true;
    state.ansicht = "tag";
    setzeWoche(mo(n), wtag(n));
    return true;
  }

  // Bedienelemente einmal aufbauen (nach dem Laden der Datei: die Mannschaften stehen darin)
  var aufgebaut = false;
  function bauen() {
    if (aufgebaut) return;
    aufgebaut = true;
    var tw = $("pb-tagwahl");
    WK.forEach(function (k, i) {
      var b = el("button", "pb-tab"); b.type = "button"; b.setAttribute("role", "tab"); b.setAttribute("aria-controls", "pb-ansicht"); b.id = "pb-tab-" + i;
      b.appendChild(el("b", null, k)); b.appendChild(el("span", null, "")); b.appendChild(el("i", null, ""));
      b.addEventListener("click", function () { state.tag = i; render(); });
      b.addEventListener("keydown", function (e) {
        var j = null;
        if (e.key === "ArrowRight") j = (i + 1) % 7; else if (e.key === "ArrowLeft") j = (i + 6) % 7;
        else if (e.key === "Home") j = 0; else if (e.key === "End") j = 6;
        if (j !== null) { e.preventDefault(); state.tag = j; render(); $("pb-tab-" + j).focus(); }
      });
      tw.appendChild(b);
    });
    function chip(host, f, txt, label) {
      var c = el("button", "pb-chip", txt); c.type = "button"; c.setAttribute("data-f", f); c.setAttribute("aria-pressed", "false"); c.setAttribute("aria-label", label);
      c.addEventListener("click", function () { state.filter = f; render(); });
      host.appendChild(c);
    }
    // Umschalter „Tag | Woche“ (nur ab 1100 px sichtbar, siehe Stylesheet)
    Array.prototype.forEach.call(document.querySelectorAll(".pb-umschalt"), function (b) {
      b.addEventListener("click", function () { state.ansicht = b.getAttribute("data-ansicht") === "woche" ? "woche" : "tag"; render(); });
    });
    [["alle", "Alle"], ["training", "Training"], ["spiele", "Spiele"], ["frei", "Frei"]].forEach(function (x) { chip($("pb-chips-art"), x[0], x[1], "Anzeigen: " + x[1]); });
    D.mannschaften.forEach(function (m) { if (m && MA[m.id]) chip($("pb-chips-team"), m.id, MA[m.id].kurz, "Mannschaft " + MA[m.id].kurz); });
    $("pb-zurueck").addEventListener("click", function () { setzeWoche(state.wk - 7); });
    $("pb-vor").addEventListener("click", function () { setzeWoche(state.wk + 7); });
    $("pb-heute").addEventListener("click", heuteWoche);
    // Legende: jede Art mit ihrem Muster
    var lg = $("pb-legende");
    [["training", "Training einer Mannschaft"], ["spiel", "Heimspiel auf unserem Platz (Dauer und Feldteil geschätzt)"], ["festival", "Kinderfestival"],
     ["belegt", "belegt (andere Nutzung)"], ["frei", "frei (anklicken oder antippen: Platz anfragen)"]].forEach(function (x) {
      var li = el("li"), sw = el("span", "pb-sw"); sw.setAttribute("data-typ", x[0]); sw.setAttribute("aria-hidden", "true"); li.appendChild(sw); li.appendChild(document.createTextNode(x[1])); lg.appendChild(li);
    });
    $("pb-stand").textContent = "Plan vom " + text(D.stand.plan) + " · Spielplan vom " + text(D.stand.spiele) + " · Spieldauer und Feldteil geschätzt";
    if (mq.addEventListener) mq.addEventListener("change", render);
    else if (mq.addListener) mq.addListener(render);
    // Die Beschriftung der Einträge hängt von der Spurbreite ab: bei geänderter Fensterbreite neu zeichnen. Eine bloße
    // Änderung der Höhe (Adressleiste am Handy beim Scrollen) zeichnet nichts neu.
    var rt = null;
    window.addEventListener("resize", function () {
      clearTimeout(rt);
      rt = setTimeout(function () { if (Math.abs(window.innerWidth - gezeichnetBreite) >= 1) render(); }, 160);
    });
    window.addEventListener("hashchange", vonAdresse);
  }

  function start(d) {
    bereite(d);
    state.heute = heuteN();
    bauen();
    $("pb-laden").hidden = true; $("pb-fehler").hidden = true;
    $("pb-inhalt").hidden = false; $("pb-stand").hidden = false;
    if (!vonAdresse()) heuteWoche();
  }
  function fehlerZeigen() {
    $("pb-laden").hidden = true; $("pb-inhalt").hidden = true; $("pb-stand").hidden = true;
    $("pb-fehler").hidden = false;
  }

  // ---------- Daten holen ----------

  function holen() {
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
      // keine Cookies, kein erzwungener Zwischenspeicher: die Seite hält sich an die Vorgaben des Servers
      var optionen = { credentials: "omit" };
      if (abbruch) optionen.signal = abbruch.signal;
      fetch(DATEN.quelle, optionen)
        .then(function (antwort) {
          if (!antwort.ok) throw new Error("HTTP " + antwort.status);
          return antwort.json();
        })
        .then(function (json) {
          if (fertig) return;
          fertig = true;
          clearTimeout(uhrzeit);
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

  function init() {
    dlg = $("pb-dialog");
    if (APP) {
      // App-Modus: kein eigener Titel (die App-Kopfleiste zeigt ihn), Link zu den Terminen als App-Seite
      var h1 = document.querySelector(".seitenkopf h1");
      if (h1 && h1.parentNode) h1.parentNode.removeChild(h1);
      var link = $("pb-fehler-link");
      if (link && DATEN.termineModul) link.setAttribute("href", "nav://" + DATEN.termineModul);
    }
    // Dialog: Klick neben das Fenster schließt (Escape und „Schließen“ ebenfalls)
    dlg.addEventListener("click", function (e) { if (e.target === dlg) dialogSchliessen(); });
    dlg.addEventListener("close", function () {
      var f = letzterFokus; letzterFokus = null;
      if (f && document.body.contains(f)) { try { f.focus(); } catch (e) { /* egal */ } }
    });
    dlg.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && typeof dlg.showModal !== "function") dialogSchliessen();
    });
    $("pb-laden").hidden = false;
    holen().then(start).catch(fehlerZeigen);
  }

  init();
})();
