/*
  Aufnahmeantrag online (28.09.2026) – Verhalten der Seite
  web/aufnahmeantrag.html (Markup: src/seiten/aufnahmeantrag.mjs).

  Ablauf: Formular in Schritten (nichts geht beim Zurückblättern verloren,
  alle Schritte bleiben im DOM, sie werden nur ein- und ausgeblendet),
  Prüfungen je Schritt, Unterschrift mit Finger oder Maus (Pointer Events),
  daraus erzeugt pdf-lib im Browser den vollständigen, unterschriebenen
  Aufnahmeantrag auf Basis des Original-PDF des Vereins (Vorlage von
  cdn.appack.de, Prüfsumme gegen data/aufnahmeantrag-felder.json) und der
  vermessenen Feldpositionen. Danach: herunterladen, ansehen, am Handy teilen
  (Web Share API mit Datei) und die vorbereitete E-Mail an die
  Geschäftsstelle.

  Datenschutz: Keine Angabe verlässt den Browser. Geladen werden nur die
  leere Vorlage (gleich beim Start, um eine im CMS ersetzte Datei sofort zu
  bemerken), pdf-lib (nach dem ersten Schritt), fontkit (web/, selbst
  ausgeliefert) und die Schrift Liberation Sans nur bei Bedarf – alles per
  GET ohne Angaben aus dem Formular. Kein Speichern im Browser (kein
  localStorage): Beim Schließen oder Neuladen sind die Angaben weg.

  Einpassen (Nachbesserung 28.09.2026): Gemessen wird so, wie pdf-lib
  zeichnet – bei Helvetica ohne Unterschneidung (siehe messerFuer()). Das
  Formular prüft schon beim „Weiter“ mit den Zeichenbreiten aus
  data/aufnahmeantrag-schriftbreiten.json, dass jede Angabe in mindestens
  UNTERGRENZE pt ins Feld passt; lange Zusatzzeilen werden umbrochen.

  Versand: gekapselt in VERSAND (Abschnitt „Versand“ unten), heute
  "manuell"; mit { art: "endpunkt", url } in src/seiten/aufnahmeantrag.mjs
  schickt das Skript das PDF später an einen eigenen Endpunkt.
*/
(function () {
  "use strict";

  // Im App-Modus (?app=1) entfernt APP_MODUS_SKRIPT das Formular (data-nur-web)
  // – dort gilt das App-Formular.
  if (/(^|[?&])app=1(&|$)/.test(location.search)) return;

  const wurzel = document.getElementById("antrag");
  const formular = document.getElementById("antrag-formular");
  const konfigElement = document.getElementById("antrag-konfiguration");
  if (!wurzel || !formular || !konfigElement) return;

  const K = JSON.parse(konfigElement.textContent);
  const F = K.felder;
  const V = K.vorgaben;
  const VERSAND = K.versand || { art: "manuell" };

  // Tinte der Unterschrift (Kugelschreiber-Blau), Strichstärke am Bildschirm
  // in CSS-Pixeln und größter Maßstab beim Einsetzen ins PDF (Punkt je
  // CSS-Pixel): Kleine Unterschriften werden nicht aufgeblasen, der Strich
  // bleibt höchstens etwa 1,3 pt stark.
  const TINTE = "#1b2a80";
  const LINIE_PX = 2.4;
  const MAX_PT_JE_PX = 0.55;
  const MAX_FAMILIE = 6;

  // Kleinste Schrift im PDF (data/aufnahmeantrag-felder.json, vorgaben) und
  // ab welcher Größe eine mehrzeilige Zusatzzeile lieber umbricht, als noch
  // kleiner zu werden.
  const UNTERGRENZE = V.untergrenze_schriftgroesse || 6;
  const EINZEILIG_AB = 7;

  // Zeichen, die im PDF darstellbar sind: lateinische Schrift samt
  // Erweiterungen (Liberation Sans 2.1.5 hat hier alle Zeichen, geprüft
  // 28.09.2026) und übliche Satzzeichen. Andere Schriften (z. B.
  // Kyrillisch) weist das Formular ab – der Verein braucht die Schreibweise
  // wie im Ausweis.
  const ERLAUBT = /^[ -~ -ɏḀ-ẛẞẠ-ỹ‐‒-―‘-„†-•…‰‹›€™]*$/;

  // ---------- Hilfen ----------

  function $(sel, el) { return (el || document).querySelector(sel); }
  function $$(sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); }

  function sauber(text) {
    return String(text == null ? "" : text)
      .normalize("NFC")
      .replace(/[  -​  　]/g, " ")
      .replace(/‑/g, "-")
      .replace(/\s+/g, " ")
      .trim();
  }

  function element(name) {
    return formular.elements.namedItem(name);
  }

  // Wert eines Feldes: Text (bereinigt), Kästchen (true/false) oder bei
  // Knopfgruppen der gewählte Wert ("" wenn keiner).
  function wert(name) {
    const el = element(name);
    if (!el) return "";
    if (typeof RadioNodeList !== "undefined" && el instanceof RadioNodeList) {
      const gewaehlt = Array.prototype.find.call(el, (r) => r.checked);
      return gewaehlt ? gewaehlt.value : "";
    }
    if (el.type === "checkbox") return el.checked;
    if (el.type === "radio") return el.checked ? el.value : "";
    return sauber(el.value);
  }

  function zweistellig(n) { return (n < 10 ? "0" : "") + n; }

  function heute() {
    const d = new Date();
    return { tag: d.getDate(), monat: d.getMonth() + 1, jahr: d.getFullYear() };
  }

  function datumText(d) { return zweistellig(d.tag) + "." + zweistellig(d.monat) + "." + d.jahr; }

  // Datum aus drei Feldern (<praefix>_tag/_monat/_jahr).
  function liesDatum(praefix) {
    const t = wert(praefix + "_tag").replace(/\D/g, "");
    const m = wert(praefix + "_monat").replace(/\D/g, "");
    const j = wert(praefix + "_jahr").replace(/\D/g, "");
    if (!t && !m && !j) return { leer: true };
    if (!t || !m || j.length !== 4) return { fehler: "unvollstaendig" };
    const tag = Number(t), monat = Number(m), jahr = Number(j);
    const d = new Date(jahr, monat - 1, tag);
    if (d.getFullYear() !== jahr || d.getMonth() !== monat - 1 || d.getDate() !== tag) return { fehler: "ungueltig" };
    const h = heute();
    const heuteDatum = new Date(h.jahr, h.monat - 1, h.tag);
    if (d > heuteDatum) return { fehler: "zukunft" };
    if (jahr < 1900) return { fehler: "zu-alt" };
    return { tag: tag, monat: monat, jahr: jahr };
  }

  function alter(geb) {
    const h = heute();
    let a = h.jahr - geb.jahr;
    if (h.monat < geb.monat || (h.monat === geb.monat && h.tag < geb.tag)) a -= 1;
    return a;
  }

  function nurZiffern(text) { return String(text || "").replace(/\D/g, ""); }

  function ibanNormal(text) { return String(text || "").toUpperCase().replace(/[^A-Z0-9]/g, ""); }

  // Beim Kopieren aus der Banking-App kommt oft „IBAN DE89 …“ bzw.
  // „BIC: COBADEFFXXX“ mit – die Vorsilbe gehört nicht zur Nummer.
  function ibanEingabe(text) { return ibanNormal(String(text || "").replace(/^\s*IBAN(?:\s*:\s*|\s+)/i, "")); }
  function bicEingabe(text) { return ibanNormal(String(text || "").replace(/^\s*(?:SWIFT[\s-]*)?BIC(?:\s*:\s*|\s+)/i, "")); }

  function ibanGruppiert(iban) { return iban.replace(/(.{4})/g, "$1 ").trim(); }

  // Prüfziffer nach ISO 13616 (mod 97): Ländercode und Prüfziffern ans Ende,
  // Buchstaben als Zahlen (A = 10 … Z = 35), Rest bei Division durch 97 = 1.
  function ibanPruefzifferOk(iban) {
    const umgestellt = iban.slice(4) + iban.slice(0, 4);
    let rest = 0;
    for (const zeichen of umgestellt) {
      const code = zeichen.charCodeAt(0);
      const zahl = code >= 65 && code <= 90 ? String(code - 55) : zeichen;
      for (const ziffer of zahl) rest = (rest * 10 + Number(ziffer)) % 97;
    }
    return rest === 1;
  }

  // Dateiname ohne Umlaute und Sonderzeichen (Mailprogramme und Windows
  // kommen damit am sichersten zurecht).
  function dateiTeil(text) {
    return String(text || "")
      .replace(/Ä/g, "Ae").replace(/Ö/g, "Oe").replace(/Ü/g, "Ue")
      .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
      .replace(/Æ/g, "Ae").replace(/æ/g, "ae").replace(/Œ/g, "Oe").replace(/œ/g, "oe")
      .replace(/Ø/g, "O").replace(/ø/g, "o").replace(/Ł/g, "L").replace(/ł/g, "l")
      .replace(/Đ/g, "D").replace(/đ/g, "d").replace(/ı/g, "i").replace(/Þ/g, "Th").replace(/þ/g, "th")
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^A-Za-z0-9-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  }

  function dateiname(vorname, nachname) {
    const teile = ["Aufnahmeantrag", dateiTeil(nachname), dateiTeil(vorname)].filter(Boolean);
    return teile.join("_") + ".pdf";
  }

  // Nur schreiben, wenn sich der Text ändert – jede Änderung am DOM kann
  // Screenreader zu einer neuen Ansage bringen.
  function setzeText(schluessel, text) {
    $$('[data-text="' + schluessel + '"]', wurzel).forEach((el) => { if (el.textContent !== text) el.textContent = text; });
  }

  function setzeAttribut(el, name, wert) {
    if (wert === null) { if (el.hasAttribute(name)) el.removeAttribute(name); }
    else if (el.getAttribute(name) !== wert) el.setAttribute(name, wert);
  }

  function kbText(bytes) {
    return bytes >= 1000000
      ? (bytes / 1000000).toFixed(1).replace(".", ",") + " MB"
      : Math.max(1, Math.round(bytes / 1000)) + " KB";
  }

  // ---------- Zustand (abgeleitet aus den Eingaben) ----------

  function zustand() {
    const geb = liesDatum("geb");
    const gebOk = !geb.leer && !geb.fehler;
    const minder = gebOk && alter(geb) < 18;
    const fussball = wert("abteilung_fussball") === true;
    const karneval = wert("abteilung_karneval") === true;
    const bf = fussball ? wert("beitrag_fussball") : "";
    const bk = karneval ? wert("beitrag_karneval") : "";
    const sepa = wert("zahlung") === "sepa";
    let ki = sepa ? wert("kontoinhaber") : "";
    if ((ki === "mitglied" && minder) || (ki === "erziehungsberechtigt" && !minder)) ki = "";
    const kontoFremd = ki === "erziehungsberechtigt" || ki === "andere";
    const papier = wert("unterschrift_papier") === true;
    const vorname = wert("vorname");
    const nachname = wert("nachname");
    const ebVorname = wert("eb_vorname");
    const ebNachname = wert("eb_nachname");
    let kiVorname = "", kiNachname = "";
    if (ki === "mitglied") { kiVorname = vorname; kiNachname = nachname; }
    if (ki === "erziehungsberechtigt") { kiVorname = ebVorname; kiNachname = ebNachname; }
    if (ki === "andere") { kiVorname = wert("ki_vorname"); kiNachname = wert("ki_nachname"); }
    const z = {
      geb: geb, gebOk: gebOk, minder: minder,
      fussball: fussball, karneval: karneval, bf: bf, bk: bk,
      familie: bf === "familie" || bk === "familie",
      fotos: wert("fotos"),
      sepa: sepa, rechnung: wert("zahlung") === "rechnung", ki: ki, kontoFremd: kontoFremd,
      // Ist die Kontoinhaberin dieselbe Person, die den Antrag unterschreibt
      // (volljähriges Mitglied bzw. Erziehungsberechtigte/r)? Dann genügt eine
      // Unterschrift für alle drei Stellen.
      kontoGleichePerson: (ki === "mitglied" && !minder) || (ki === "erziehungsberechtigt" && minder),
      anschriftGleich: wert("ki_anschrift_gleich") === true,
      papier: papier,
      vorname: vorname, nachname: nachname,
      name: [vorname, nachname].filter(Boolean).join(" "),
      ebName: [ebVorname, ebNachname].filter(Boolean).join(" "),
      kiVorname: kiVorname, kiNachname: kiNachname,
      kiName: [kiVorname, kiNachname].filter(Boolean).join(" "),
    };
    z.beitragHinweis = beitragHinweis(z);
    return z;
  }

  // Passt die gewählte Beitragsgruppe zum Alter? Nur ein Hinweis, kein
  // Fehler – Ausnahmen kennt die Geschäftsstelle. Fußball-Jugend nach
  // Jahrgang (A-Jugend = U19 der laufenden Saison, Wechsel am 1. Juli), sonst
  // nach dem Alter heute.
  function beitragHinweis(z) {
    if (!z.gebOk) return "";
    const a = alter(z.geb);
    const h = heute();
    const saison = h.monat >= 7 ? h.jahr : h.jahr - 1;
    const teile = [];
    const merke = (abteilung, name) => teile.push(abteilung + " ist „" + optionText(name) + "“ gewählt");
    if (z.bf === "jugendlicher" && z.geb.jahr < saison - 18) merke("Fußball", "beitrag_fussball");
    if (z.bf === "erwachsener" && a < 18) merke("Fußball", "beitrag_fussball");
    if (z.bk === "kinder" && a >= 18) merke("Karneval", "beitrag_karneval");
    if (z.bk === "erwachsener" && a < 18) merke("Karneval", "beitrag_karneval");
    if (z.bk === "rentner" && a < 65) merke("Karneval", "beitrag_karneval");
    if (!teile.length) return "";
    return "Passt der Beitrag? Für " + teile.join(", für ") + ", das neue Mitglied ist laut Geburtsdatum aber " +
      a + (a === 1 ? " Jahr" : " Jahre") + " alt.";
  }

  // ---------- Sichtbarkeit und veränderliche Texte ----------

  const BEDINGUNGEN = {
    fussball: (z) => z.fussball,
    karneval: (z) => z.karneval,
    doppel: (z) => z.fussball && z.karneval,
    azubi: (z) => z.bk === "azubi",
    minderjaehrig: (z) => z.minder,
    "beitrag-alter": (z) => !!z.beitragHinweis,
    volljaehrig: (z) => !z.minder,
    "fotos-ja": (z) => z.fotos === "ja",
    sepa: (z) => z.sepa,
    rechnung: (z) => z.rechnung,
    "konto-andere": (z) => z.ki === "andere",
    "konto-fremd": (z) => z.kontoFremd,
    "ki-anschrift-eigene": (z) => z.kontoFremd && !z.anschriftGleich,
    digital: (z) => !z.papier,
    papier: (z) => z.papier,
    "unterschrift-konto": (z) => z.sepa && z.ki !== "" && !z.kontoGleichePerson && !z.papier,
  };

  function aktualisiere() {
    const z = zustand();
    $$("[data-wenn]", wurzel).forEach((el) => {
      const bedingung = BEDINGUNGEN[el.getAttribute("data-wenn")];
      if (bedingung && el.hidden !== !bedingung(z)) el.hidden = !bedingung(z);
    });
    // Ausgeblendete Kontoinhaber-Wahl zurücknehmen (z. B. „Das neue Mitglied“,
    // wenn sich das Geburtsdatum als minderjährig herausstellt).
    $$('input[name="kontoinhaber"]', formular).forEach((r) => {
      if (r.checked && r.closest("[data-wenn][hidden]")) r.checked = false;
    });
    setzeText("eb-name", z.ebName || "Die erziehungsberechtigte Person");
    setzeText("mitglied-dativ", "des neuen Mitglieds" + (z.name ? " (" + z.name + ")" : ""));
    setzeText("unterschrift-antrag-titel", z.minder
      ? "Unterschrift der erziehungsberechtigten Person" + (z.ebName ? ": " + z.ebName : "")
      : "Unterschrift des neuen Mitglieds" + (z.name ? ": " + z.name : ""));
    setzeText("unterschrift-antrag-hinweis",
      "Gilt für den Aufnahmeantrag (Seite 2) und die Einwilligung zu Fotos (Seite 3)" +
      (z.sepa && z.kontoGleichePerson ? " und – als Kontoinhaber – für das SEPA-Lastschriftmandat (Seite 4)." : "."));
    setzeText("unterschrift-konto-titel", "Unterschrift der Kontoinhaberin oder des Kontoinhabers" + (z.kiName ? ": " + z.kiName : ""));
    setzeText("beitrag-hinweis", z.beitragHinweis);
    const hinzu = $("[data-familie-hinzu]", wurzel);
    const voll = familienEintraege().length >= MAX_FAMILIE;
    if (hinzu) hinzu.hidden = voll;
    const vollHinweis = $("[data-familie-voll]", wurzel);
    if (vollHinweis) vollHinweis.hidden = !voll;
    return z;
  }

  // ---------- Familienmitglieder ----------

  const familienListe = $("[data-familie-liste]", wurzel);
  const familienVorlage = document.getElementById("antrag-familie-vorlage");
  let familienZaehler = 0;

  function familienEintraege() {
    return familienListe ? $$("[data-familie-eintrag]", familienListe) : [];
  }

  function familieNummerieren() {
    familienEintraege().forEach((eintrag, i) => {
      $$("[data-familie-nummer]", eintrag).forEach((el) => { el.textContent = String(i + 1); });
    });
  }

  function familieHinzu(fokus) {
    if (!familienListe || !familienVorlage || familienEintraege().length >= MAX_FAMILIE) return;
    familienZaehler += 1;
    const huelle = document.createElement("div");
    huelle.innerHTML = familienVorlage.innerHTML.replace(/__N__/g, String(familienZaehler));
    const eintrag = huelle.firstElementChild;
    eintrag.setAttribute("data-familie-id", String(familienZaehler));
    familienListe.appendChild(eintrag);
    familieNummerieren();
    aktualisiere();
    if (fokus) { const erstes = $("input", eintrag); if (erstes) erstes.focus(); }
  }

  function familieEntfernen(eintrag) {
    eintrag.remove();
    familieNummerieren();
    aktualisiere();
    geaendert();
    const hinzu = $("[data-familie-hinzu]", wurzel);
    if (hinzu) hinzu.focus();
  }

  function familienWerte() {
    return familienEintraege().map((eintrag) => {
      const id = eintrag.getAttribute("data-familie-id");
      return {
        id: id,
        vorname: wert("fam_vorname_" + id),
        nachname: wert("fam_nachname_" + id),
        geb: liesDatum("fam_geb_" + id),
      };
    });
  }

  // ---------- Unterschriftsfelder ----------

  function Unterschrift(el) {
    const leinwand = $("canvas", el);
    const stand = $(".unterschrift__stand", el);
    const ctx = leinwand.getContext("2d");
    // Striche als Punktlisten, x und y in Einheiten der Leinwandbreite – so
    // bleibt die Form erhalten, wenn sich die Breite ändert (Drehen des
    // Handys, Fenstergröße).
    let striche = [];
    let aktiv = null;
    let breite = 0, hoehe = 0, dpr = 1;
    // Maßstab der Anzeige (höchstens 1): Nach dem Drehen des Handys ist das
    // Feld breiter, aber kaum höher – die Striche (in Einheiten der Breite)
    // würden unten abgeschnitten. Dann zeigt die Leinwand sie verkleinert;
    // neue Striche kommen im selben Maßstab dazu. Das PDF nutzt die
    // gespeicherten Punkte und ist nicht betroffen.
    let ansicht = 1;
    let geplant = false;
    const beobachter = [];

    function einheitPx() { return breite * ansicht; }

    function zeichneStrich(c, punkte, lw) {
      c.lineWidth = lw;
      c.lineCap = "round";
      c.lineJoin = "round";
      c.strokeStyle = TINTE;
      c.fillStyle = TINTE;
      if (punkte.length === 1) {
        c.beginPath();
        c.arc(punkte[0].x, punkte[0].y, lw / 2, 0, Math.PI * 2);
        c.fill();
        return;
      }
      c.beginPath();
      c.moveTo(punkte[0].x, punkte[0].y);
      for (let i = 1; i < punkte.length - 1; i++) {
        const mx = (punkte[i].x + punkte[i + 1].x) / 2;
        const my = (punkte[i].y + punkte[i + 1].y) / 2;
        c.quadraticCurveTo(punkte[i].x, punkte[i].y, mx, my);
      }
      const letzter = punkte[punkte.length - 1];
      c.lineTo(letzter.x, letzter.y);
      c.stroke();
    }

    function zeichneAlles() {
      geplant = false;
      if (!breite) return;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, leinwand.width, leinwand.height);
      const s = einheitPx() * dpr;
      ctx.setTransform(s, 0, 0, s, 0, 0);
      striche.forEach((p) => zeichneStrich(ctx, p, LINIE_PX / einheitPx()));
    }

    function plane() {
      if (geplant) return;
      geplant = true;
      window.requestAnimationFrame(zeichneAlles);
    }

    function groesse() {
      const r = leinwand.getBoundingClientRect();
      if (!r.width || !r.height) return;
      breite = r.width;
      hoehe = r.height;
      if (!aktiv) {
        let maxX = 0, maxY = 0;
        striche.forEach((p) => p.forEach((q) => { maxX = Math.max(maxX, q.x); maxY = Math.max(maxY, q.y); }));
        const rand = LINIE_PX / breite;
        // Nur verkleinern, wenn sonst etwas abgeschnitten würde – dann mit
        // etwas Luft zum Rand (2 bzw. 4 %).
        const rechts = maxX + rand, unten = (maxY + rand) * breite;
        ansicht = Math.min(1, rechts > 1 ? 0.98 / rechts : 1, unten > hoehe ? (0.96 * hoehe) / unten : 1);
      }
      dpr = Math.min(3, Math.max(1, window.devicePixelRatio || 1));
      leinwand.width = Math.round(breite * dpr);
      leinwand.height = Math.round(hoehe * dpr);
      zeichneAlles();
    }

    let rahmen = null;
    function punkt(e) {
      const m = rahmen.width * ansicht;
      return { x: (e.clientX - rahmen.left) / m, y: (e.clientY - rahmen.top) / m };
    }

    function melden() {
      stand.textContent = istUnterschrieben() ? "Unterschrieben" : (striche.length ? "Zu kurz – bitte vollständig unterschreiben" : "Noch nicht unterschrieben");
      el.classList.toggle("unterschrift--fertig", istUnterschrieben());
      beobachter.forEach((f) => f());
    }

    leinwand.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      e.preventDefault();
      if (!breite) groesse();
      rahmen = leinwand.getBoundingClientRect();
      try { leinwand.setPointerCapture(e.pointerId); } catch (fehler) { /* ältere Browser */ }
      aktiv = { id: e.pointerId, punkte: [punkt(e)] };
      striche.push(aktiv.punkte);
      plane();
    });

    leinwand.addEventListener("pointermove", (e) => {
      if (!aktiv || e.pointerId !== aktiv.id) return;
      e.preventDefault();
      const liste = typeof e.getCoalescedEvents === "function" ? e.getCoalescedEvents() : [];
      (liste.length ? liste : [e]).forEach((ev) => {
        const p = punkt(ev);
        const vorher = aktiv.punkte[aktiv.punkte.length - 1];
        if (Math.abs(p.x - vorher.x) + Math.abs(p.y - vorher.y) > 0.0015) aktiv.punkte.push(p);
      });
      plane();
    });

    function ende(e) {
      if (!aktiv || e.pointerId !== aktiv.id) return;
      aktiv = null;
      melden();
    }
    leinwand.addEventListener("pointerup", ende);
    leinwand.addEventListener("pointercancel", ende);
    leinwand.addEventListener("lostpointercapture", ende);

    function leeren() {
      striche = [];
      ansicht = 1;
      zeichneAlles();
      melden();
    }
    $(".unterschrift__neu", el).addEventListener("click", leeren);

    if (typeof ResizeObserver === "function") {
      new ResizeObserver(groesse).observe(leinwand);
    } else {
      window.addEventListener("resize", groesse);
    }

    // Unterschrieben = genug Strich (kein bloßes Antippen): mindestens 60
    // CSS-Pixel Linienlänge und 24 Pixel Breite.
    function istUnterschrieben() {
      if (!striche.length || !breite) return false;
      let laenge = 0, minX = Infinity, maxX = -Infinity;
      striche.forEach((p) => {
        p.forEach((q, i) => {
          minX = Math.min(minX, q.x); maxX = Math.max(maxX, q.x);
          if (i) laenge += Math.hypot(q.x - p[i - 1].x, q.y - p[i - 1].y);
        });
      });
      return laenge * einheitPx() >= 60 && (maxX - minX) * einheitPx() >= 24;
    }

    // Bild der Tinte (auf die Striche zugeschnitten, transparenter Grund) in
    // hoher Auflösung, neu gezeichnet aus den Punkten statt aus der
    // Bildschirm-Leinwand. breitePx/hoehePx: Größe in CSS-Pixeln (für den
    // Maßstab beim Einsetzen).
    function bild() {
      if (!istUnterschrieben()) return null;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      striche.forEach((p) => p.forEach((q) => {
        minX = Math.min(minX, q.x); maxX = Math.max(maxX, q.x);
        minY = Math.min(minY, q.y); maxY = Math.max(maxY, q.y);
      }));
      const lw = LINIE_PX / einheitPx();
      minX -= lw; minY -= lw; maxX += lw; maxY += lw;
      const breitePx = (maxX - minX) * einheitPx();
      const hoehePx = (maxY - minY) * einheitPx();
      const faktor = Math.min(4, 2400 / breitePx, 1200 / hoehePx);
      const c = document.createElement("canvas");
      c.width = Math.max(1, Math.ceil(breitePx * faktor));
      c.height = Math.max(1, Math.ceil(hoehePx * faktor));
      const x = c.getContext("2d");
      const s = einheitPx() * faktor;
      x.setTransform(s, 0, 0, s, -minX * s, -minY * s);
      striche.forEach((p) => zeichneStrich(x, p, lw));
      return { leinwand: c, breitePx: breitePx, hoehePx: hoehePx };
    }

    melden();
    return {
      element: el,
      istUnterschrieben: istUnterschrieben,
      bild: bild,
      leeren: leeren,
      beiAenderung: (f) => beobachter.push(f),
      fokus: () => { const knopf = $(".unterschrift__neu", el); if (knopf) knopf.focus(); },
    };
  }

  const unterschriften = {};
  $$("[data-unterschrift]", wurzel).forEach((el) => {
    unterschriften[el.getAttribute("data-unterschrift")] = Unterschrift(el);
  });

  function leinwandZuPng(leinwand) {
    return new Promise((ok, fehler) => {
      leinwand.toBlob((blob) => {
        if (!blob) { fehler(new Error("Unterschrift ließ sich nicht umwandeln")); return; }
        new Response(blob).arrayBuffer().then((b) => ok(new Uint8Array(b)), fehler);
      }, "image/png");
    });
  }

  // ---------- Passt es ins Vereins-PDF? ----------

  // Zeichenbreiten (1/1000 em) aus data/aufnahmeantrag-schriftbreiten.json:
  // je Zeichen der größere Wert aus Helvetica und Liberation Sans, also eher
  // zu breit geschätzt. So prüft das Formular ohne pdf-lib, ob eine Angabe in
  // mindestens UNTERGRENZE pt in ihr Feld passt – beim Zeichnen misst dann
  // pdf-lib selbst (messerFuer()).
  const BREITEN = new Map();
  Object.keys(K.schriftbreiten.breiten).forEach((w) => {
    for (const c of K.schriftbreiten.breiten[w]) BREITEN.set(c, Number(w));
  });

  function geschaetzteBreite(text, groesse) {
    let summe = 0;
    for (const c of text) {
      let w = BREITEN.get(c);
      if (w === undefined) w = BREITEN.get(c.normalize("NFD").charAt(0));
      summe += w === undefined ? K.schriftbreiten.ersatz : w;
    }
    return (summe * groesse) / 1000;
  }

  // Platz eines Textfeldes: bis zum nächsten gedruckten Element (breite_max),
  // sonst die Linie.
  function platz(schluessel) {
    const f = F[schluessel];
    return Math.max(f.breite, f.breite_max || 0);
  }

  function pruefeBreite(melde, name, bezeichnung, platzPt, text, eigeneMeldung) {
    if (!text || geschaetzteBreite(text, UNTERGRENZE) <= platzPt) return;
    const versal = /\p{Lu}{4}/u.test(text) && text === text.toLocaleUpperCase("de-DE");
    melde(name, versal
      ? bezeichnung + " ist in Großbuchstaben zu breit für das Feld im Vereinsformular – bitte in normaler Schreibweise eingeben (z. B. „Müller“ statt „MÜLLER“)."
      : eigeneMeldung || bezeichnung + " ist zu lang für das Feld im Vereinsformular – bitte kürzen.");
  }

  // ---------- Prüfungen ----------

  // Jede Prüfung meldet über melde(feld, text[, fokusName]) – feld ist der
  // Schlüssel aus data-feld (Fehlerstelle), fokusName das Eingabefeld, auf
  // das der Link in der Fehlerliste springt. pruefeText() gibt true zurück,
  // wenn ein Text da und in Ordnung ist (dann folgt die Breitenprüfung).
  function pruefeText(melde, name, bezeichnung, optionen) {
    const o = optionen || {};
    const text = wert(name);
    if (!text) {
      if (!o.freiwillig) melde(name, o.leer || "Bitte geben Sie " + bezeichnung + " ein.");
      return false;
    }
    if (!ERLAUBT.test(text)) {
      melde(name, "Bitte nur lateinische Buchstaben, Ziffern und übliche Satzzeichen verwenden (so wie im Ausweis).");
      return false;
    }
    if (o.max && text.length > o.max) {
      melde(name, "Bitte höchstens " + o.max + " Zeichen – mehr passt nicht ins Formular.");
      return false;
    }
    return true;
  }

  function pruefeDatum(melde, praefix, bezeichnung, fuerMitglied) {
    const d = liesDatum(praefix);
    const fokus = praefix + "_tag";
    if (d.leer) { melde(praefix, "Bitte geben Sie " + bezeichnung + " ein.", fokus); return; }
    const meldungen = {
      unvollstaendig: "Bitte " + bezeichnung + " vollständig eingeben: Tag, Monat und Jahr (vierstellig).",
      ungueltig: "Dieses Datum gibt es nicht – bitte prüfen Sie Tag und Monat.",
      zukunft: "Das Geburtsdatum darf nicht in der Zukunft liegen.",
      "zu-alt": "Bitte prüfen Sie das Jahr.",
    };
    if (d.fehler) { melde(praefix, meldungen[d.fehler], d.fehler === "unvollstaendig" ? leerstesDatumsfeld(praefix) : fokus); return; }
    if (fuerMitglied && alter(d) > 110) melde(praefix, "Bitte prüfen Sie das Jahr.", praefix + "_jahr");
  }

  function leerstesDatumsfeld(praefix) {
    const teile = ["_tag", "_monat", "_jahr"];
    for (const t of teile) { if (!wert(praefix + t)) return praefix + t; }
    return praefix + "_jahr";
  }

  function pruefePlz(melde, name) {
    const plz = wert(name);
    if (!plz) { melde(name, "Bitte geben Sie die Postleitzahl ein."); return; }
    if (!/^\d{5}$/.test(plz.replace(/\s/g, ""))) melde(name, "Die Postleitzahl hat fünf Ziffern.");
  }

  function pruefeTelefon(melde, name, feld) {
    const nummer = wert(name);
    if (!nummer) return;
    if (!/^[0-9+()\/\-\s.]+$/.test(nummer)) { melde(name, "Bitte nur Ziffern, Leerzeichen und + / - ( ) verwenden."); return; }
    const ziffern = nurZiffern(nummer).length;
    if (ziffern < 6 || ziffern > 20) { melde(name, "Bitte prüfen Sie die Telefonnummer."); return; }
    pruefeBreite(melde, name, "Die Telefonnummer", platz(feld), nummer, "Die Telefonnummer ist zu lang für das Feld im Vereinsformular – bitte ohne Zusätze eingeben.");
  }

  const PRUEFUNGEN = {
    mitgliedschaft(z, melde) {
      if (!z.fussball && !z.karneval) melde("abteilung", "Bitte wählen Sie mindestens eine Abteilung.", "abteilung_fussball");
      if (z.fussball && !z.bf) melde("beitrag_fussball", "Bitte wählen Sie den Beitrag für die Fußballabteilung.");
      if (z.karneval && !z.bk) melde("beitrag_karneval", "Bitte wählen Sie den Beitrag für die Karnevalabteilung.");
    },
    // Namen und Anschrift des Mitglieds stehen auf Seite 1 und – wenn es
    // selbst Kontoinhaber ist – auf Seite 4; geprüft wird gegen das engere
    // Feld.
    person(z, melde) {
      const vornameOk = pruefeText(melde, "vorname", "den Vornamen", { max: 40 });
      if (vornameOk) pruefeBreite(melde, "vorname", "Der Vorname", Math.min(platz("s1.vorname"), platz("s4.kontoinhaber.vorname")), z.vorname);
      const nachnameOk = pruefeText(melde, "nachname", "den Nachnamen", { max: 40 });
      if (nachnameOk) pruefeBreite(melde, "nachname", "Der Nachname", Math.min(platz("s1.nachname"), platz("s4.kontoinhaber.name")), z.nachname);
      if (vornameOk && nachnameOk) pruefeBreite(melde, "nachname", "Vor- und Nachname zusammen", platz("s4.mitglied"), z.name,
        "Vor- und Nachname zusammen sind zu lang für das Formular – bitte weitere Vornamen abkürzen.");
      pruefeDatum(melde, "geb", "das Geburtsdatum", true);
      if (pruefeText(melde, "strasse", "Straße und Hausnummer", { max: 60 })) {
        pruefeBreite(melde, "strasse", "Die Anschrift", Math.min(platz("s1.strasse"), platz("s4.strasse")), wert("strasse"));
      }
      pruefePlz(melde, "plz");
      if (pruefeText(melde, "ort", "den Wohnort", { max: 50 })) {
        pruefeBreite(melde, "ort", "Der Wohnort", Math.min(platz("s1.plz_ort"), platz("s4.plz_ort")), "00000 " + wert("ort"));
      }
    },
    kontakt(z, melde) {
      if (z.minder) {
        // Die erziehungsberechtigte Person steht unter den Unterschriften
        // (Seite 2 nur eine Zeile) und ist oft auch Kontoinhaberin (Seite 4).
        const vOk = pruefeText(melde, "eb_vorname", "den Vornamen der erziehungsberechtigten Person", { max: 40 });
        if (vOk) pruefeBreite(melde, "eb_vorname", "Der Vorname", platz("s4.kontoinhaber.vorname"), wert("eb_vorname"));
        const nOk = pruefeText(melde, "eb_nachname", "den Nachnamen der erziehungsberechtigten Person", { max: 40 });
        if (nOk) pruefeBreite(melde, "eb_nachname", "Der Nachname", platz("s4.kontoinhaber.name"), wert("eb_nachname"));
        if (vOk && nOk) pruefeBreite(melde, "eb_nachname", "Vor- und Nachname zusammen", F["s2.zusatz_unterzeichner"].breite,
          "Erziehungsberechtigte/r: " + z.ebName, "Vor- und Nachname zusammen sind zu lang für das Formular – bitte weitere Vornamen abkürzen.");
      }
      const mail = wert("email");
      if (!mail) melde("email", "Bitte geben Sie eine E-Mail-Adresse ein.");
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail) || !ERLAUBT.test(mail)) melde("email", "Bitte geben Sie eine gültige E-Mail-Adresse ein (mit @ und Domain).");
      else pruefeBreite(melde, "email", "Die E-Mail-Adresse", platz("s1.email"), mail);
      if (!wert("mobil") && !wert("telefon")) melde("telefon_gruppe", "Bitte geben Sie mindestens eine Telefonnummer an.", "mobil");
      pruefeTelefon(melde, "mobil", "s1.mobil");
      pruefeTelefon(melde, "telefon", "s1.telefon");
    },
    familie(z, melde) {
      const liste = familienWerte();
      if (!liste.length) { melde("familie", "Bitte tragen Sie mindestens ein weiteres Familienmitglied ein – oder wählen Sie im ersten Schritt einen anderen Beitrag."); return; }
      // Auf Seite 2 steht je Familienmitglied „Nachname, Vorname“ in einer
      // Spalte von 130 pt.
      const spalte = F["s2.familie"].spalten[0].breite;
      liste.forEach((m, i) => {
        const nr = " (Familienmitglied " + (i + 1) + ")";
        const vOk = pruefeText(melde, "fam_vorname_" + m.id, "den Vornamen" + nr, { max: 40 });
        const nOk = pruefeText(melde, "fam_nachname_" + m.id, "den Nachnamen" + nr, { max: 40 });
        if (vOk && nOk) {
          pruefeBreite(melde, "fam_nachname_" + m.id, "Name und Vorname" + nr, spalte, m.nachname + ", " + m.vorname,
            "Name und Vorname zusammen sind zu lang für die Spalte im Vereinsformular – bitte weitere Vornamen abkürzen" + nr + ".");
        }
        pruefeDatum(melde, "fam_geb_" + m.id, "das Geburtsdatum" + nr, true);
      });
    },
    einwilligungen(z, melde) {
      if (wert("satzung") !== true) melde("satzung_gruppe", "Bitte bestätigen Sie, dass Sie die Satzung zur Kenntnis genommen haben.", "satzung");
      if (!z.fotos) melde("fotos", "Bitte wählen Sie Ja oder Nein.");
      else if (z.fotos === "ja" && !["medien_intern", "medien_web", "medien_presse", "medien_dokumentation"].some((n) => wert(n) === true)) {
        melde("medien", "Bitte wählen Sie mindestens ein Medium – oder oben „Nein“.", "medien_intern");
      }
    },
    zahlung(z, melde) {
      if (!wert("zahlung")) { melde("zahlung", "Bitte wählen Sie, wie der Beitrag bezahlt werden soll."); return; }
      if (!z.sepa) return;
      if (!z.ki) melde("kontoinhaber", "Bitte wählen Sie, wer Kontoinhaber ist.");
      if (z.ki === "andere") {
        if (pruefeText(melde, "ki_vorname", "den Vornamen der Kontoinhaberin oder des Kontoinhabers", { max: 40 })) {
          pruefeBreite(melde, "ki_vorname", "Der Vorname", platz("s4.kontoinhaber.vorname"), wert("ki_vorname"));
        }
        if (pruefeText(melde, "ki_nachname", "den Nachnamen der Kontoinhaberin oder des Kontoinhabers", { max: 38 })) {
          pruefeBreite(melde, "ki_nachname", "Der Nachname", platz("s4.kontoinhaber.name"), wert("ki_nachname"));
        }
      }
      if (z.kontoFremd && !z.anschriftGleich) {
        if (pruefeText(melde, "ki_strasse", "Straße und Hausnummer", { max: 60 })) {
          pruefeBreite(melde, "ki_strasse", "Die Anschrift", platz("s4.strasse"), wert("ki_strasse"));
        }
        pruefePlz(melde, "ki_plz");
        if (pruefeText(melde, "ki_ort", "den Ort", { max: 50 })) {
          pruefeBreite(melde, "ki_ort", "Der Ort", platz("s4.plz_ort"), "00000 " + wert("ki_ort"));
        }
      }
      const iban = ibanEingabe(wert("iban"));
      if (!iban) melde("iban", "Bitte geben Sie die IBAN ein.");
      else if (!/^DE/.test(iban)) melde("iban", "Das Formular sieht nur deutsche Konten vor (IBAN beginnt mit DE). Für ein Konto im Ausland wenden Sie sich bitte an die Geschäftsstelle.");
      else if (!/^DE\d{20}$/.test(iban)) melde("iban", "Eine deutsche IBAN hat 22 Stellen: DE und 20 Ziffern.");
      else if (!ibanPruefzifferOk(iban)) melde("iban", "Diese IBAN stimmt nicht – bitte prüfen Sie die Eingabe (die Prüfziffer passt nicht).");
      const bic = bicEingabe(wert("bic"));
      if (bic) {
        if (!/^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(bic)) melde("bic", "Die BIC hat 8 oder 11 Stellen (Buchstaben und Ziffern).");
        else if (bic.slice(4, 6) !== "DE") melde("bic", "Diese BIC gehört nicht zu einer deutschen Bank (Stelle 5 und 6 müssen DE sein).");
      }
      if (pruefeText(melde, "kreditinstitut", "das Kreditinstitut", { max: 60, freiwillig: true })) {
        pruefeBreite(melde, "kreditinstitut", "Das Kreditinstitut", platz("s4.kreditinstitut"), wert("kreditinstitut"));
      }
    },
    unterschrift(z, melde) {
      // Wer von Hand unterschreibt, trägt Ort und Datum auf dem Ausdruck ein.
      if (z.papier) return;
      // Seite 3 hat für „Ort, Datum“ am wenigsten Platz (bis kurz vor
      // „Unterschrift Mitglied:“).
      if (pruefeText(melde, "unterschrift_ort", "den Ort", { max: 26 })) {
        pruefeBreite(melde, "unterschrift_ort", "Der Ort", F["s3.ort_datum"].breite, wert("unterschrift_ort") + ", " + datumText(heute()),
          "Der Ort passt so nicht neben das Datum auf Seite 3 des Vereinsformulars – bitte kürzen, z. B. ohne Zusatz in Klammern.");
      }
      const ausweg = " Ohne Zeichnen geht es mit „Ich unterschreibe den Ausdruck von Hand“ weiter unten.";
      if (!unterschriften.antrag.istUnterschrieben()) {
        melde("unterschrift_antrag", "Bitte unterschreiben Sie im Feld – mit dem Finger, einem Stift oder der Maus." + ausweg);
      }
      if (BEDINGUNGEN["unterschrift-konto"](z) && !unterschriften.konto.istUnterschrieben()) {
        melde("unterschrift_konto", "Bitte unterschreiben Sie als Kontoinhaberin oder Kontoinhaber im zweiten Feld." + ausweg);
      }
    },
    pruefen() {},
  };

  function pruefeSchritt(name) {
    const z = zustand();
    const fehler = [];
    const pruefung = PRUEFUNGEN[name];
    if (pruefung) pruefung(z, (feld, meldung, fokusName) => fehler.push({ feld: feld, meldung: meldung, fokus: fokusName || feld }));
    return fehler;
  }

  // ---------- Fehleranzeige ----------

  // Die Fehlerliste ist bewusst keine Live-Region: Angesagt wird sie über den
  // Fokus beim „Weiter“. Beim Tippen (pruefeLaufend) werden nur die
  // Meldungen nachgeführt, und nur, wenn sich wirklich etwas ändert – sonst
  // hören Screenreader-Nutzer nach jedem Buchstaben die ganze Liste.
  const fehlerliste = $("[data-fehlerliste]", formular);
  const fehlerEintraege = $("[data-fehler-eintraege]", formular);
  let pruefeLaufend = false; // nach dem ersten Fehlversuch: Meldungen beim Tippen nachführen
  let fehlerStand = ""; // Schritt und Meldungen der angezeigten Liste

  // Ziel für den Sprung aus der Fehlerliste: das Eingabefeld, bei
  // Knopfgruppen der erste sichtbare Knopf, bei Unterschriften das Feld
  // selbst (die Leinwand lässt sich nicht per Tastatur bedienen).
  function fokusElement(name) {
    const el = element(name);
    if (!el) {
      const container = $('[data-feld="' + name + '"]', formular);
      if (!container) return null;
      if (container.getAttribute("role") === "group") { container.tabIndex = -1; return container; }
      return $("input, button", container);
    }
    if (typeof RadioNodeList !== "undefined" && el instanceof RadioNodeList) {
      return Array.prototype.find.call(el, (r) => !r.closest("[data-wenn][hidden]")) || el[0];
    }
    return el;
  }

  function beschreibung(el, id, an) {
    const liste = (el.getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean).filter((x) => x !== id);
    if (an) liste.push(id);
    setzeAttribut(el, "aria-describedby", liste.length ? liste.join(" ") : null);
  }

  function schrittElement(name) { return $('[data-schritt="' + name + '"]', formular); }

  function zeigeFehler(schrittName, fehler, fokussieren) {
    const schritt = schrittElement(schrittName);
    const jeFeld = {};
    fehler.forEach((f) => { if (!jeFeld[f.feld]) jeFeld[f.feld] = f; });
    // Alle Meldungen des Schritts zurücksetzen, dann die aktuellen setzen.
    $$(".formular__fehler", schritt).forEach((p) => {
      const container = p.closest("[data-feld]");
      const feld = container ? container.getAttribute("data-feld") : "";
      const f = jeFeld[feld];
      const text = f ? f.meldung : "";
      if (p.textContent !== text) p.textContent = text;
      if (p.hidden !== !f) p.hidden = !f;
      if (!container) return;
      if (container.classList.contains("antrag__feld--fehler") !== !!f) container.classList.toggle("antrag__feld--fehler", !!f);
      $$("input", container).forEach((input) => {
        // Eingaben in verschachtelten Feldern mit eigener Meldung nicht
        // doppelt markieren.
        if (input.closest("[data-feld]") !== container) return;
        setzeAttribut(input, "aria-invalid", f ? "true" : null);
        beschreibung(input, p.id, !!f);
      });
      if (container.matches("fieldset, [role=group], [role=radiogroup]")) beschreibung(container, p.id, !!f);
    });
    const stand = schrittName + "\u0002" + fehler.map((f) => f.fokus + "\u0001" + f.meldung).join("\u0002");
    if (stand === fehlerStand) {
      if (fehler.length && fokussieren) fehlerZeigen();
      return;
    }
    fehlerStand = stand;
    fehlerEintraege.textContent = "";
    fehler.forEach((f) => {
      const li = document.createElement("li");
      const a = document.createElement("a");
      const ziel = fokusElement(f.fokus);
      a.href = ziel && ziel.id ? "#" + ziel.id : "#";
      a.textContent = f.meldung;
      a.addEventListener("click", (e) => {
        e.preventDefault();
        const el = fokusElement(f.fokus);
        if (el) { el.focus(); if (el.scrollIntoView) el.scrollIntoView({ block: "center" }); }
      });
      li.appendChild(a);
      fehlerEintraege.appendChild(li);
    });
    setzeText("fehler-titel", fehler.length === 1 ? "Bitte prüfen Sie diese Angabe:" : "Bitte prüfen Sie diese " + fehler.length + " Angaben:");
    fehlerliste.hidden = !fehler.length;
    if (fehler.length && fokussieren) fehlerZeigen();
  }

  function fehlerZeigen() {
    fehlerliste.focus({ preventScroll: true });
    if (fehlerliste.scrollIntoView) fehlerliste.scrollIntoView({ block: "start" });
  }

  // ---------- Schritte und Verlauf ----------

  const ALLE_SCHRITTE = $$("[data-schritt]", formular).map((el) => el.getAttribute("data-schritt"));
  let aktuell = ALLE_SCHRITTE[0];
  const knopfWeiter = $("[data-weiter]", formular);
  const knopfZurueck = $("[data-zurueck]", formular);
  const standElement = $(".antrag__stand", formular);

  // Verlauf: jeder Schritt ist ein Eintrag, damit das Zurück des Browsers
  // (und am Android-Handy) einen Schritt zurückgeht. verlauf[i] ist der
  // Schritt von Eintrag i, tiefe der aktuelle Eintrag. Führt der Knopf
  // „Zurück“ zum vorigen Eintrag, geht er per history.back() dorthin (statt
  // einen neuen Eintrag anzulegen) – so bleibt die Reihenfolge stimmig.
  let verlauf = [];
  let tiefe = 0;
  function merkeVerlauf(art, name) {
    if (art === "push") {
      tiefe += 1;
      verlauf = verlauf.slice(0, tiefe);
      verlauf[tiefe] = name;
      history.pushState({ antragSchritt: name, antragTiefe: tiefe }, "");
    } else if (art === "replace") {
      verlauf[tiefe] = name;
      history.replaceState({ antragSchritt: name, antragTiefe: tiefe }, "");
    }
  }

  function aktiveSchritte(z) {
    return ALLE_SCHRITTE.filter((s) => s !== "familie" || z.familie);
  }

  function zeigeSchritt(name, optionen) {
    const o = optionen || {};
    const z = aktualisiere();
    const liste = aktiveSchritte(z);
    if (liste.indexOf(name) === -1) {
      // z. B. „Familienmitglieder“ aus dem Verlauf, obwohl kein
      // Familienbeitrag mehr gewählt ist: der Schritt davor
      const stelle = ALLE_SCHRITTE.indexOf(name);
      name = liste.filter((s) => ALLE_SCHRITTE.indexOf(s) < stelle).pop() || liste[0];
    }
    aktuell = name;
    pruefeLaufend = false;
    ALLE_SCHRITTE.forEach((s) => { schrittElement(s).hidden = s !== name; });
    zeigeFehler(name, [], false);
    const nr = standAnzeigen(z);
    const titel = $("h2", schrittElement(name));
    knopfZurueck.hidden = nr === 1;
    knopfWeiter.textContent = name === "pruefen" ? "PDF erstellen" : "Weiter";
    knopfWeiter.hidden = name === "pruefen" && !!ergebnis;
    if (name === "familie" && !familienEintraege().length) familieHinzu(false);
    if (name === "pruefen") baueZusammenfassung(z);
    merkeVerlauf(o.verlauf, name);
    if (o.fokus !== false) {
      // Auf die Schrittanzeige scrollen, nicht an den Anfang des Bereichs –
      // sonst steht am Handy jedes Mal der Einleitungskasten über dem Schritt.
      titel.focus({ preventScroll: true });
      const oben = standElement.getBoundingClientRect().top;
      if (oben < 0 || oben > window.innerHeight * 0.4) standElement.scrollIntoView({ block: "start" });
    }
  }

  // „Schritt 3 von 8“ – die Zahl der Schritte ändert sich, sobald ein
  // Familienbeitrag gewählt oder abgewählt wird.
  function standAnzeigen(z) {
    const liste = aktiveSchritte(z);
    const nr = liste.indexOf(aktuell) + 1;
    const titel = $("h2", schrittElement(aktuell));
    setzeText("schritt-nummer", "Schritt " + nr + " von " + liste.length);
    const balken = $("[data-balken]", formular);
    const breiteBalken = Math.round((nr / liste.length) * 100) + "%";
    if (balken && balken.style.width !== breiteBalken) balken.style.width = breiteBalken;
    let srHinweis = $(".sr-only", titel);
    if (!srHinweis) {
      srHinweis = document.createElement("span");
      srHinweis.className = "sr-only";
      titel.insertBefore(srHinweis, titel.firstChild);
    }
    const srText = "Schritt " + nr + " von " + liste.length + ": ";
    if (srHinweis.textContent !== srText) srHinweis.textContent = srText;
    return nr;
  }

  function weiter() {
    const fehler = pruefeSchritt(aktuell);
    zeigeFehler(aktuell, fehler, true);
    pruefeLaufend = fehler.length > 0;
    if (fehler.length) return;
    if (aktuell === "pruefen") { erstellen(); return; }
    vorladen();
    const liste = aktiveSchritte(zustand());
    zeigeSchritt(liste[liste.indexOf(aktuell) + 1], { verlauf: "push" });
  }

  function zurueck() {
    const liste = aktiveSchritte(zustand());
    const i = liste.indexOf(aktuell);
    if (i <= 0) return;
    if (tiefe > 0 && verlauf[tiefe - 1] === liste[i - 1]) history.back();
    else zeigeSchritt(liste[i - 1], { verlauf: "push" });
  }

  formular.addEventListener("submit", (e) => { e.preventDefault(); weiter(); });
  knopfZurueck.addEventListener("click", zurueck);

  window.addEventListener("popstate", (e) => {
    const s = e.state && e.state.antragSchritt;
    if (!s || ALLE_SCHRITTE.indexOf(s) === -1) return;
    tiefe = Number(e.state.antragTiefe) || 0;
    verlauf[tiefe] = s;
    zeigeSchritt(s, { verlauf: null });
  });

  // ---------- Zusammenfassung ----------

  function optionText(name) {
    const input = $('input[name="' + name + '"]:checked', formular);
    if (!input) return "";
    const text = $(".antrag__option-text", input.closest("label"));
    return text && text.firstChild ? sauber(text.firstChild.textContent) : input.value;
  }

  function baueZusammenfassung(z) {
    const ziel = $("[data-zusammenfassung]", formular);
    ziel.textContent = "";
    const bereiche = [];
    const eintrag = (liste, begriff, text) => { if (text) liste.push([begriff, text]); };

    const mitgliedschaft = [];
    if (z.fussball) eintrag(mitgliedschaft, "Fußball", optionText("beitrag_fussball"));
    if (z.karneval) eintrag(mitgliedschaft, "Karneval", optionText("beitrag_karneval"));
    eintrag(mitgliedschaft, "Hinweis", z.beitragHinweis);
    bereiche.push({ titel: "Mitgliedschaft", schritt: "mitgliedschaft", zeilen: mitgliedschaft });

    const person = [];
    eintrag(person, "Name", z.name);
    if (z.gebOk) eintrag(person, "Geburtsdatum", datumText(z.geb) + (z.minder ? " (minderjährig)" : ""));
    eintrag(person, "Anschrift", wert("strasse") + ", " + wert("plz") + " " + wert("ort"));
    bereiche.push({ titel: "Neues Mitglied", schritt: "person", zeilen: person });

    const kontakt = [];
    if (z.minder) eintrag(kontakt, "Erziehungsberechtigt", z.ebName);
    eintrag(kontakt, "E-Mail", wert("email"));
    eintrag(kontakt, "Mobil", wert("mobil"));
    eintrag(kontakt, "Festnetz", wert("telefon"));
    bereiche.push({ titel: "Kontakt", schritt: "kontakt", zeilen: kontakt });

    if (z.familie) {
      const familie = familienWerte().map((m, i) => [
        "Familienmitglied " + (i + 1),
        [m.vorname, m.nachname].filter(Boolean).join(" ") + (m.geb && !m.geb.leer && !m.geb.fehler ? ", geb. " + datumText(m.geb) : ""),
      ]);
      bereiche.push({ titel: "Familienmitglieder", schritt: "familie", zeilen: familie });
    }

    const einwilligung = [];
    eintrag(einwilligung, "Satzung", wert("satzung") === true ? "zur Kenntnis genommen" : "");
    if (z.fotos === "nein") eintrag(einwilligung, "Fotos und Namen", "Nein, keine Einwilligung");
    if (z.fotos === "ja") {
      const medien = ["medien_intern", "medien_web", "medien_presse", "medien_dokumentation"]
        .filter((n) => wert(n) === true)
        .map((n) => sauber($(".antrag__option-text", element(n).closest("label")).textContent));
      eintrag(einwilligung, "Fotos und Namen", "Ja: " + medien.join("; "));
    }
    bereiche.push({ titel: "Satzung und Fotos", schritt: "einwilligungen", zeilen: einwilligung });

    const zahlung = [];
    if (z.rechnung) eintrag(zahlung, "Zahlung", "Per Rechnung");
    if (z.sepa) {
      eintrag(zahlung, "Zahlung", "SEPA-Lastschrift");
      eintrag(zahlung, "Kontoinhaber", z.kiName);
      if (z.kontoFremd && !z.anschriftGleich) eintrag(zahlung, "Anschrift", wert("ki_strasse") + ", " + wert("ki_plz") + " " + wert("ki_ort"));
      eintrag(zahlung, "IBAN", ibanGruppiert(ibanEingabe(wert("iban"))));
      eintrag(zahlung, "BIC", bicEingabe(wert("bic")));
      eintrag(zahlung, "Kreditinstitut", wert("kreditinstitut"));
    }
    bereiche.push({ titel: "Beitragszahlung", schritt: "zahlung", zeilen: zahlung });

    const unterschrift = [];
    if (z.papier) eintrag(unterschrift, "Ort, Datum, Unterschrift", "von Hand auf dem Ausdruck");
    else eintrag(unterschrift, "Ort, Datum", wert("unterschrift_ort") + ", " + datumText(heute()));
    bereiche.push({ titel: "Unterschrift", schritt: "unterschrift", zeilen: unterschrift, bilder: !z.papier });

    bereiche.forEach((b) => {
      const karte = document.createElement("section");
      karte.className = "antrag__zusammenfassung-bereich";
      const kopf = document.createElement("div");
      kopf.className = "antrag__zusammenfassung-kopf";
      const h = document.createElement("h3");
      h.textContent = b.titel;
      const knopf = document.createElement("button");
      knopf.type = "button";
      knopf.className = "knopf knopf--sekundaer antrag__aendern";
      knopf.textContent = "Ändern";
      knopf.setAttribute("aria-label", b.titel + " ändern");
      knopf.addEventListener("click", () => zeigeSchritt(b.schritt, { verlauf: "push" }));
      kopf.appendChild(h);
      kopf.appendChild(knopf);
      karte.appendChild(kopf);
      const dl = document.createElement("dl");
      dl.className = "angaben";
      b.zeilen.forEach((zeile) => {
        const dt = document.createElement("dt");
        dt.textContent = zeile[0];
        const dd = document.createElement("dd");
        dd.textContent = zeile[1];
        dl.appendChild(dt);
        dl.appendChild(dd);
      });
      if (b.bilder) {
        const pads = [["Unterschrift", unterschriften.antrag]];
        if (BEDINGUNGEN["unterschrift-konto"](z)) pads.push(["Kontoinhaber", unterschriften.konto]);
        pads.forEach((p) => {
          const b2 = p[1].bild();
          if (!b2) return;
          const dt = document.createElement("dt");
          dt.textContent = p[0];
          const dd = document.createElement("dd");
          const img = document.createElement("img");
          img.className = "antrag__unterschrift-vorschau";
          img.alt = p[0] + " (Vorschau)";
          img.src = b2.leinwand.toDataURL("image/png");
          dd.appendChild(img);
          dl.appendChild(dt);
          dl.appendChild(dd);
        });
      }
      karte.appendChild(dl);
      ziel.appendChild(karte);
    });
  }

  // ---------- PDF erzeugen ----------

  const laden = {};
  function ladeSkript(attribut, globalName) {
    if (window[globalName]) return Promise.resolve(window[globalName]);
    const url = new URL(wurzel.getAttribute(attribut), document.baseURI).href;
    if (!laden[url]) {
      laden[url] = new Promise((ok, fehler) => {
        const s = document.createElement("script");
        s.src = url;
        s.async = true;
        s.onload = () => (window[globalName] ? ok(window[globalName]) : fehler(fehlerMit("bibliothek", url)));
        s.onerror = () => { delete laden[url]; fehler(fehlerMit("bibliothek", url)); };
        document.head.appendChild(s);
      });
    }
    return laden[url];
  }

  function fehlerMit(art, detail) {
    const f = new Error(art + (detail ? ": " + detail : ""));
    f.art = art;
    return f;
  }

  function hex(puffer) {
    return Array.prototype.map.call(new Uint8Array(puffer), (b) => (b < 16 ? "0" : "") + b.toString(16)).join("");
  }

  // Nur einmal laden (Start-Prüfung, Vorladen und Erstellen teilen sich die
  // Anfrage); nach einem Fehler beim nächsten Aufruf neu versuchen.
  let vorlageLaden = null;
  function ladeVorlage() {
    if (!vorlageLaden) vorlageLaden = holeVorlage().catch((e) => { vorlageLaden = null; throw e; });
    return vorlageLaden;
  }

  let vorlageBytes = null;
  async function holeVorlage() {
    if (vorlageBytes) return vorlageBytes;
    let antwort;
    try {
      antwort = await fetch(K.vorlage.url, { credentials: "omit" });
    } catch (e) {
      throw fehlerMit("vorlage-netz", e.message);
    }
    if (!antwort.ok) throw fehlerMit("vorlage-netz", "HTTP " + antwort.status);
    const puffer = await antwort.arrayBuffer();
    // Die Feldpositionen gelten nur für genau diese Datei – wird das PDF im
    // CMS ersetzt, bricht die Seite ab, statt Einträge an falsche Stellen zu
    // schreiben.
    if (puffer.byteLength !== K.vorlage.bytes) throw fehlerMit("vorlage-geaendert", puffer.byteLength + " Byte");
    if (window.crypto && window.crypto.subtle) {
      const pruefsumme = hex(await window.crypto.subtle.digest("SHA-256", puffer));
      if (pruefsumme !== K.vorlage.sha256) throw fehlerMit("vorlage-geaendert", pruefsumme);
    }
    vorlageBytes = new Uint8Array(puffer);
    return vorlageBytes;
  }

  let schriftBytes = null;
  async function ladeSchrift() {
    if (schriftBytes) return schriftBytes;
    const url = new URL(wurzel.getAttribute("data-schrift"), document.baseURI).href;
    let antwort;
    try { antwort = await fetch(url, { credentials: "omit" }); } catch (e) { throw fehlerMit("bibliothek", url); }
    if (!antwort.ok) throw fehlerMit("bibliothek", url + " HTTP " + antwort.status);
    schriftBytes = new Uint8Array(await antwort.arrayBuffer());
    return schriftBytes;
  }

  // Zeichen der PDF-Standardschrift Helvetica (WinAnsi) – reicht sie für
  // alle Einträge, braucht es keine eingebettete Schrift (und kein fontkit).
  let helveticaZeichen = null;
  async function winAnsiZeichen(L) {
    if (helveticaZeichen) return helveticaZeichen;
    const probe = await L.PDFDocument.create();
    const h = await probe.embedFont(L.StandardFonts.Helvetica);
    helveticaZeichen = new Set(h.getCharacterSet());
    return helveticaZeichen;
  }

  // Alle Einträge fürs PDF: Texte, Kreuze, Zellen (BIC/IBAN), Familie,
  // Unterschriften – Schlüssel wie in data/aufnahmeantrag-felder.json.
  function pdfWerte(z) {
    const texte = {};
    const kreuze = [];
    const zellen = {};
    const unterschriftStellen = {};
    // Von Hand unterschreiben: Ort und Datum trägt die Person beim
    // Unterschreiben auf dem Ausdruck ein (leere Einträge fallen unten weg).
    const ortDatum = z.papier ? "" : wert("unterschrift_ort") + ", " + datumText(heute());

    if (z.fussball) kreuze.push("s1.fussball." + z.bf);
    if (z.karneval) kreuze.push("s1.karneval." + z.bk);
    texte["s1.nachname"] = z.nachname;
    texte["s1.vorname"] = z.vorname;
    texte["s1.strasse"] = wert("strasse");
    texte["s1.plz_ort"] = nurZiffern(wert("plz")) + " " + wert("ort");
    texte["s1.geburtsdatum.tag"] = zweistellig(z.geb.tag);
    texte["s1.geburtsdatum.monat"] = zweistellig(z.geb.monat);
    texte["s1.geburtsdatum.jahr"] = String(z.geb.jahr);
    texte["s1.telefon"] = wert("telefon");
    texte["s1.mobil"] = wert("mobil");
    texte["s1.email"] = wert("email");
    if (wert("satzung") === true) kreuze.push("s1.satzung");

    texte["s2.ort_datum"] = ortDatum;
    texte["s3.ort_datum"] = ortDatum;
    // Seite 3 hat kein Namensfeld – die Zeile „Mitglied: …, geb. …“ steht bei
    // allen Mitgliedern (nicht nur bei Minderjährigen), damit die Seite auch
    // abgetrennt zuordenbar bleibt; bei langen Namen mehrzeilig.
    texte["s3.zusatz_mitglied"] = "Mitglied: " + z.name + ", geb. " + datumText(z.geb);
    if (z.minder) {
      texte["s2.zusatz_unterzeichner"] = "Erziehungsberechtigte/r: " + z.ebName;
      texte["s3.zusatz_unterzeichner"] = "Erziehungsberechtigte/r: " + z.ebName;
    }
    if (z.fotos === "ja") {
      kreuze.push("s3.einwilligung.ja");
      [["medien_intern", "intern"], ["medien_web", "web"], ["medien_presse", "presse"], ["medien_dokumentation", "dokumentation"]]
        .forEach((m) => { if (wert(m[0]) === true) kreuze.push("s3.medien." + m[1]); });
    } else if (z.fotos === "nein") {
      kreuze.push("s3.einwilligung.nein");
    }
    if (!z.papier) {
      unterschriftStellen["s2.unterschrift"] = "antrag";
      unterschriftStellen["s3.unterschrift"] = "antrag";
    }

    if (z.sepa) {
      texte["s4.kontoinhaber.name"] = z.kiNachname;
      texte["s4.kontoinhaber.vorname"] = z.kiVorname;
      const eigene = z.kontoFremd && !z.anschriftGleich;
      texte["s4.strasse"] = eigene ? wert("ki_strasse") : wert("strasse");
      texte["s4.plz_ort"] = eigene ? nurZiffern(wert("ki_plz")) + " " + wert("ki_ort") : nurZiffern(wert("plz")) + " " + wert("ort");
      if (z.ki !== "mitglied") texte["s4.mitglied"] = z.name;
      texte["s4.kreditinstitut"] = wert("kreditinstitut");
      const bic = bicEingabe(wert("bic"));
      if (bic) zellen["s4.bic"] = bic;
      zellen["s4.iban"] = ibanEingabe(wert("iban")).slice(2); // „DE“ ist vorgedruckt
      texte["s4.ort_datum"] = ortDatum;
      if (!z.papier) unterschriftStellen["s4.unterschrift"] = z.kontoGleichePerson ? "antrag" : "konto";
    }

    const familie = z.familie
      ? familienWerte().map((m) => ({ name: m.nachname + ", " + m.vorname, geburtsdatum: datumText(m.geb) }))
      : [];

    Object.keys(texte).forEach((k) => { if (!texte[k]) delete texte[k]; });
    return { texte: texte, kreuze: kreuze, zellen: zellen, familie: familie, unterschriften: unterschriftStellen };
  }

  // Breite eines Textes so messen, wie pdf-lib ihn zeichnet. Bei den
  // Standardschriften (Helvetica) rechnet widthOfTextAtSize() die
  // Unterschneidungspaare (Kerning) mit ein, drawText setzt den Text aber
  // ohne (Operator Tj) – gezeichnet wird er damit bis zu 10 % breiter als
  // gemessen (z. B. „AVATAR“). Deshalb dort Zeichen für Zeichen summieren.
  // Eingebettete Schriften (fontkit) messen und zeichnen dieselben Glyphen
  // ohne Kerning, dort stimmt widthOfTextAtSize().
  function messerFuer(schrift, standard) {
    if (!standard) return (text, groesse) => schrift.widthOfTextAtSize(text, groesse);
    const je = new Map();
    return (text, groesse) => {
      let summe = 0;
      for (const zeichen of text) {
        let w = je.get(zeichen);
        if (w === undefined) { w = schrift.widthOfTextAtSize(zeichen, 1000); je.set(zeichen, w); }
        summe += w;
      }
      return (summe * groesse) / 1000;
    };
  }

  // Schriftgröße nach der Regel aus der Vermessung (vorgaben.anpassung):
  // erst auf die Linie einpassen; würde die Schrift kleiner als 9 pt, den
  // freien Platz daneben (breite_max) nutzen; sonst bis
  // min_schriftgroesse verkleinern. Reicht selbst das nicht, weiter
  // verkleinern – lieber klein als über den Rand. Unter UNTERGRENZE kommt es
  // nicht, weil das Formular zu lange Angaben vorher abweist
  // (pruefeBreite()). Auf 0,01 pt abgerundet.
  function schriftgroesse(feld, text, messen) {
    const g0 = feld.schriftgroesse || V.schriftgroesse;
    const w1 = messen(text, 1);
    if (!w1) return g0;
    const gmin = feld.min_schriftgroesse || V.min_schriftgroesse;
    let g = Math.min(g0, feld.breite / w1);
    if (g < 9 && feld.breite_max) g = Math.min(g0, Math.max(g, feld.breite_max / w1));
    if (g < gmin) g = (feld.breite_max || feld.breite) / w1;
    return Math.floor(g * 100) / 100;
  }

  // Text an Leerzeichen auf Zeilen der Breite `breite` verteilen; null, wenn
  // ein einzelnes Wort schon zu breit ist.
  function umbrechen(text, breite, groesse, messen) {
    const zeilen = [];
    let zeile = "";
    for (const wort of text.split(" ")) {
      const probe = zeile ? zeile + " " + wort : wort;
      if (messen(probe, groesse) <= breite) { zeile = probe; continue; }
      if (!zeile || messen(wort, groesse) > breite) return null;
      zeilen.push(zeile);
      zeile = wort;
    }
    if (zeile) zeilen.push(zeile);
    return zeilen;
  }

  // Größe und Zeilen eines Eintrags. Felder mit zeilen_max > 1 (Zusatzzeilen
  // auf Seite 3) bleiben einzeilig, solange die Schrift mindestens
  // EINZEILIG_AB pt groß bleibt; sonst werden sie in der größten Schrift
  // umbrochen, bei der alles in zeilen_max Zeilen passt.
  function satz(feld, text, messen) {
    const einzeilig = schriftgroesse(feld, text, messen);
    const g0 = feld.schriftgroesse || V.schriftgroesse;
    const max = feld.zeilen_max || 1;
    if (max > 1 && einzeilig < Math.min(g0, EINZEILIG_AB)) {
      for (let g = g0; g >= UNTERGRENZE; g -= 0.25) {
        const zeilen = umbrechen(text, feld.breite, g, messen);
        if (zeilen && zeilen.length <= max) return { groesse: g, zeilen: zeilen };
      }
    }
    return { groesse: einzeilig, zeilen: [text] };
  }

  async function baueAntrag(z) {
    const w = pdfWerte(z);
    const L = await ladeSkript("data-pdf-lib", "PDFLib");
    const bytes = await ladeVorlage();
    const pdf = await L.PDFDocument.load(bytes);

    const E = F["s2.familie"].erweiterung;
    const alleTexte = Object.keys(w.texte).map((k) => w.texte[k])
      .concat(Object.keys(w.zellen).map((k) => w.zellen[k]))
      .concat(w.familie.map((m) => m.name + m.geburtsdatum))
      .concat([E.beschriftung_name, E.beschriftung_geburtsdatum]);
    const winAnsi = await winAnsiZeichen(L);
    const reichtHelvetica = alleTexte.every((t) => Array.from(t).every((c) => winAnsi.has(c.codePointAt(0))));
    let schrift;
    if (reichtHelvetica) {
      schrift = await pdf.embedFont(L.StandardFonts.Helvetica);
    } else {
      const fontkit = await ladeSkript("data-fontkit", "fontkit");
      const ttf = await ladeSchrift();
      pdf.registerFontkit(fontkit);
      schrift = await pdf.embedFont(ttf, { subset: true });
    }
    const messen = messerFuer(schrift, reichtHelvetica);

    const seiten = pdf.getPages();
    const schwarz = L.rgb(V.farbe_rgb[0], V.farbe_rgb[1], V.farbe_rgb[2]);
    const seite = (feld) => seiten[feld.seite - 1];

    function text(feld, inhalt) {
      const s = satz(feld, inhalt, messen);
      if (s.groesse < UNTERGRENZE) console.warn("Aufnahmeantrag: Eintrag kleiner als " + UNTERGRENZE + " pt (" + s.groesse + " pt)");
      s.zeilen.forEach((zeile, i) => {
        const breite = messen(zeile, s.groesse);
        const x = feld.ausrichtung === "mitte" ? feld.x - breite / 2 : feld.x;
        const y = feld.y - i * s.groesse * (feld.zeilenabstand || 1.2);
        seite(feld).drawText(zeile, { x: x, y: y, size: s.groesse, font: schrift, color: schwarz });
      });
    }

    Object.keys(w.texte).forEach((k) => {
      if (!F[k]) throw new Error("Feld fehlt in der Vermessung: " + k);
      text(F[k], w.texte[k]);
    });

    w.kreuze.forEach((k) => {
      const feld = F[k];
      if (!feld) throw new Error("Feld fehlt in der Vermessung: " + k);
      const e = V.kreuz.einzug;
      const opt = { thickness: V.kreuz.strichstaerke, color: schwarz, lineCap: L.LineCapStyle.Round };
      seite(feld).drawLine(Object.assign({ start: { x: feld.x + e, y: feld.y + e }, end: { x: feld.x + feld.breite - e, y: feld.y + feld.hoehe - e } }, opt));
      seite(feld).drawLine(Object.assign({ start: { x: feld.x + e, y: feld.y + feld.hoehe - e }, end: { x: feld.x + feld.breite - e, y: feld.y + e } }, opt));
    });

    Object.keys(w.zellen).forEach((k) => {
      const feld = F[k];
      Array.from(w.zellen[k]).slice(0, feld.anzahl).forEach((zeichen, i) => {
        const zelle = feld.zellen[i];
        const breite = messen(zeichen, feld.schriftgroesse);
        seite(feld).drawText(zeichen, { x: zelle.x - breite / 2, y: feld.y, size: feld.schriftgroesse, font: schrift, color: schwarz });
      });
    });

    if (w.familie.length) {
      const feld = F["s2.familie"];
      // Alle Namen in derselben Größe (die kleinste, die jeder Name braucht),
      // sonst wirken die Spalten unruhig.
      const spaltenFeld = (spalte, y) => ({
        seite: feld.seite, x: spalte.x, y: y, breite: spalte.breite, ausrichtung: "links",
        schriftgroesse: feld.schriftgroesse, min_schriftgroesse: feld.min_schriftgroesse,
      });
      const einheitlich = Math.min.apply(null, w.familie.map((m) => schriftgroesse(spaltenFeld(feld.spalten[0], 0), m.name, messen)));
      const zeile = (spalte, y, inhalt, istName) => {
        const f = spaltenFeld(spalte, y);
        if (istName) { f.schriftgroesse = einheitlich; f.min_schriftgroesse = Math.min(einheitlich, f.min_schriftgroesse); }
        text(f, inhalt);
      };
      w.familie.slice(0, feld.max_im_kasten).forEach((m, i) => {
        zeile(feld.spalten[i], feld.zeilen.name.y, m.name, true);
        zeile(feld.spalten[i], feld.zeilen.geburtsdatum.y, m.geburtsdatum, false);
      });
      const rest = w.familie.slice(feld.max_im_kasten, feld.max_im_kasten + E.max);
      if (rest.length) {
        const s = seite(feld);
        s.drawText(E.beschriftung_name, { x: E.beschriftung_x, y: E.zeilen.name.y, size: E.beschriftung_groesse, font: schrift, color: schwarz });
        s.drawText(E.beschriftung_geburtsdatum, { x: E.beschriftung_x, y: E.zeilen.geburtsdatum.y, size: E.beschriftung_groesse, font: schrift, color: schwarz });
        rest.forEach((m, i) => {
          zeile(feld.spalten[i], E.zeilen.name.y, m.name, true);
          zeile(feld.spalten[i], E.zeilen.geburtsdatum.y, m.geburtsdatum, false);
        });
      }
    }

    const bilder = {};
    for (const k of Object.keys(w.unterschriften)) {
      const quelle = w.unterschriften[k];
      if (!bilder[quelle]) {
        const b = unterschriften[quelle].bild();
        if (!b) throw new Error("Unterschrift fehlt: " + quelle);
        bilder[quelle] = { bild: await pdf.embedPng(await leinwandZuPng(b.leinwand)), breitePx: b.breitePx, hoehePx: b.hoehePx };
      }
      const feld = F[k];
      const b = bilder[quelle];
      // Proportional einpassen, links unten ausrichten (Unterkante 2 pt
      // unter der Linie, siehe Vermessung).
      const m = Math.min(feld.breite / b.breitePx, feld.hoehe / b.hoehePx, MAX_PT_JE_PX);
      seite(feld).drawImage(b.bild, { x: feld.x, y: feld.y, width: b.breitePx * m, height: b.hoehePx * m });
    }

    // Angaben zum Dokument: Die Vorlage bringt aus Word den Autor der
    // Vorlage und XMP-Metadaten (dc:creator, Erstelldatum) mit – beides
    // ersetzen bzw. entfernen, sonst widersprechen sie den Angaben hier.
    pdf.setTitle("Aufnahmeantrag " + K.verein + " – " + z.name);
    pdf.setAuthor(z.minder && z.ebName ? z.ebName : z.name);
    pdf.setSubject("Aufnahmeantrag / Vereinsanmeldung, online ausgefüllt");
    pdf.setKeywords(["Aufnahmeantrag", K.verein]);
    pdf.setCreator("Website " + K.verein + " – Aufnahmeantrag online");
    pdf.setProducer("pdf-lib");
    pdf.setLanguage("de-DE");
    pdf.setCreationDate(new Date());
    pdf.setModificationDate(new Date());
    pdf.catalog.delete(L.PDFName.of("Metadata"));
    return { bytes: await pdf.save(), seiten: seiten.length };
  }

  // ---------- Ergebnis und Versand ----------

  const ergebnisBereich = $("[data-ergebnis]", formular);
  const meldungEl = $("[data-meldung]", formular);
  const arbeitet = $("[data-arbeitet]", formular);
  let ergebnis = null; // { blob, datei, name, url }
  let gesichert = false;
  let aenderungen = false;

  function meldung(text) { meldungEl.textContent = text; }

  function verwerfeErgebnis() {
    if (!ergebnis) return;
    URL.revokeObjectURL(ergebnis.url);
    ergebnis = null;
    ergebnisBereich.hidden = true;
    meldung("");
    if (aktuell === "pruefen") knopfWeiter.hidden = false;
  }

  // Teilen mit Datei: nur wenn der Browser es kann und – im Rahmen der
  // Website-Hülle von appack.de – der Rahmen es erlaubt (Chrome sperrt
  // navigator.share in fremden Rahmen ohne allow="web-share").
  function kannTeilen(datei) {
    if (!datei || typeof navigator.share !== "function" || typeof navigator.canShare !== "function") return false;
    try { if (!navigator.canShare({ files: [datei] })) return false; } catch (e) { return false; }
    const regel = teilenRegel();
    if (regel) {
      const bekannt = typeof regel.features !== "function" || regel.features().indexOf("web-share") !== -1;
      if (bekannt && !regel.allowsFeature("web-share")) return false;
    }
    return true;
  }

  function teilenRegel() {
    const regel = document.permissionsPolicy || document.featurePolicy;
    return regel && typeof regel.allowsFeature === "function" ? regel : null;
  }

  // Liegt die Seite im Rahmen einer anderen Adresse (Website-Hülle auf
  // appack.de)? Dort teilt Chrome nur mit allow="web-share" am Rahmen (das
  // prüft kannTeilen()); Safari am iPhone lässt sich die Regel nicht abfragen
  // – ob es dort teilt, ist offen. Dann bleibt „PDF herunterladen“ der
  // Hauptknopf und „Teilen“ ein zweiter Weg (schlägt es fehl, lädt die Seite
  // das PDF herunter).
  function imFremdenRahmen() {
    try { return window.top !== window.self && !window.top.location.href; } catch (e) { return true; }
  }

  function zeigeErgebnis(bytes, seitenAnzahl, name) {
    verwerfeErgebnis();
    const blob = new Blob([bytes], { type: "application/pdf" });
    let datei = null;
    try { datei = new File([blob], name, { type: "application/pdf", lastModified: Date.now() }); } catch (e) { datei = null; }
    ergebnis = { blob: blob, datei: datei, name: name, url: URL.createObjectURL(blob) };
    setzeText("datei-name", name);
    setzeText("datei-info", "(" + seitenAnzahl + " Seiten, " + kbText(blob.size) + ")");
    const teilen = $('[data-aktion="teilen"]', ergebnisBereich);
    const laden = $('[data-aktion="herunterladen"]', ergebnisBereich);
    const handy = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
    const kann = kannTeilen(datei);
    // Am Handy ist Teilen der Hauptweg (direkt in die Mail-App), am Rechner
    // das Herunterladen – im fremden Rahmen nur, wenn sich die Regel prüfen
    // ließ (siehe imFremdenRahmen()).
    const teilenZuerst = handy && kann && (!imFremdenRahmen() || !!teilenRegel());
    teilen.hidden = !kann;
    teilen.classList.toggle("knopf--sekundaer", !teilenZuerst);
    laden.classList.toggle("knopf--sekundaer", teilenZuerst);
    if (teilenZuerst) laden.parentNode.insertBefore(teilen, laden);
    else laden.parentNode.insertBefore(laden, teilen);
    versandEinrichten();
    ergebnisBereich.hidden = false;
    knopfWeiter.hidden = true;
    meldung("");
    ergebnisBereich.focus();
    if (ergebnisBereich.scrollIntoView) ergebnisBereich.scrollIntoView({ block: "start" });
  }

  function herunterladen(text) {
    if (!ergebnis) return;
    const a = document.createElement("a");
    a.href = ergebnis.url;
    a.download = ergebnis.name;
    a.rel = "noopener";
    a.hidden = true;
    document.body.appendChild(a);
    a.click();
    a.remove();
    gesichert = true;
    meldung(text || ("„" + ergebnis.name + "“ wird gespeichert – meist im Ordner „Downloads“ (am iPhone: App Dateien › Downloads)."));
  }

  function ansehen() {
    if (!ergebnis) return;
    const a = document.createElement("a");
    a.href = ergebnis.url;
    a.target = "_blank";
    a.rel = "noopener";
    a.hidden = true;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function teilen() {
    if (!ergebnis || !ergebnis.datei) { herunterladen(); return; }
    navigator.share({
      files: [ergebnis.datei],
      title: "Aufnahmeantrag",
      text: "Aufnahmeantrag für den " + K.verein + " – bitte an " + K.mail + " senden.",
    }).then(() => {
      gesichert = true;
      meldung("Geteilt. Falls Sie die Mail-App gewählt haben: bitte an " + K.mail + " mit dem Betreff „Aufnahmeantrag“ senden.");
    }).catch((e) => {
      if (e && e.name === "AbortError") return;
      herunterladen("Teilen ist hier nicht möglich – das PDF wurde stattdessen heruntergeladen. Bitte hängen Sie es an die E-Mail an.");
    });
  }

  // Versand (gekapselt): "manuell" – der Nutzer speichert oder teilt das PDF
  // und sendet es selbst (vorbereitete E-Mail). "endpunkt" – später: POST
  // an eine eigene Annahme (multipart/form-data, Feld "antrag"); dann
  // erscheint zusätzlich „An die Geschäftsstelle senden“. Nur hier wird das
  // PDF je übertragen, und nur auf ausdrücklichen Klick.
  function versandEinrichten() {
    if (VERSAND.art !== "endpunkt" || !VERSAND.url) return;
    let knopf = $('[data-aktion="senden"]', ergebnisBereich);
    if (!knopf) {
      knopf = document.createElement("button");
      knopf.type = "button";
      knopf.className = "knopf";
      knopf.setAttribute("data-aktion", "senden");
      knopf.textContent = "An die Geschäftsstelle senden";
      const zeile = $(".knopfzeile", ergebnisBereich);
      zeile.insertBefore(knopf, zeile.firstChild);
      knopf.addEventListener("click", sendeAnEndpunkt);
    }
  }

  async function sendeAnEndpunkt() {
    if (!ergebnis) return;
    const daten = new FormData();
    daten.append("antrag", ergebnis.datei || ergebnis.blob, ergebnis.name);
    meldung("Wird gesendet …");
    try {
      const antwort = await fetch(VERSAND.url, { method: "POST", body: daten, credentials: "omit" });
      if (!antwort.ok) throw new Error("HTTP " + antwort.status);
      gesichert = true;
      meldung("Gesendet. Die Geschäftsstelle meldet sich per E-Mail.");
    } catch (e) {
      meldung("Senden hat nicht geklappt. Bitte laden Sie das PDF herunter und schicken Sie es per E-Mail an " + K.mail + ".");
    }
  }

  const FEHLERTEXTE = {
    "vorlage-netz": "Die Vorlage des Vereins ließ sich nicht laden. Bitte prüfen Sie die Internetverbindung und tippen Sie noch einmal auf „PDF erstellen“.",
    "vorlage-geaendert": "Die Vorlage des Vereins wurde inzwischen geändert, das Online-Formular muss erst angepasst werden. Bitte nutzen Sie bis dahin den Aufnahmeantrag als PDF zum Ausdrucken (Link unten) und sagen Sie der Geschäftsstelle kurz Bescheid.",
    bibliothek: "Ein Programmteil für das PDF ließ sich nicht laden. Bitte prüfen Sie die Internetverbindung und versuchen Sie es noch einmal.",
  };

  let erstelltGerade = false;
  async function erstellen() {
    if (erstelltGerade) return;
    // Alle Schritte noch einmal prüfen – bei einem Fehler dorthin springen.
    for (const s of aktiveSchritte(zustand())) {
      const fehler = pruefeSchritt(s);
      if (fehler.length) {
        zeigeSchritt(s, { verlauf: "push" });
        zeigeFehler(s, fehler, true);
        pruefeLaufend = true;
        return;
      }
    }
    erstelltGerade = true;
    knopfWeiter.disabled = true;
    arbeitet.hidden = false;
    arbeitet.textContent = "PDF wird erstellt …";
    try {
      const z = zustand();
      const antrag = await baueAntrag(z);
      zeigeErgebnis(antrag.bytes, antrag.seiten, dateiname(z.vorname, z.nachname));
      arbeitet.hidden = true;
      if (stoerungWeich) stoerung.hidden = true;
    } catch (e) {
      console.error("Aufnahmeantrag: PDF-Erzeugung fehlgeschlagen", e);
      arbeitet.textContent = FEHLERTEXTE[e && e.art] ||
        "Das PDF ließ sich nicht erstellen. Bitte versuchen Sie es noch einmal oder nutzen Sie den Aufnahmeantrag als PDF zum Ausdrucken (Link unten).";
    } finally {
      erstelltGerade = false;
      knopfWeiter.disabled = false;
    }
  }

  // Hinweis oben im Formular, wenn etwas für das PDF fehlt. formularAus:
  // Das Formular lässt sich gar nicht nutzen (Vorlage im CMS ersetzt) – dann
  // bleibt nur der Papierweg, und das gleich, nicht erst nach zehn Minuten
  // Eingabe.
  const stoerung = $("[data-stoerung]", wurzel);
  let stoerungWeich = false;
  function zeigeStoerung(titel, text, formularAus) {
    setzeText("stoerung-titel", titel);
    setzeText("stoerung", text);
    stoerung.hidden = false;
    stoerungWeich = !formularAus;
    if (!formularAus) return;
    const fokusDrin = formular.contains(document.activeElement);
    formular.hidden = true;
    const alternative = $(".antrag__alternative", wurzel);
    if (alternative) alternative.hidden = true;
    aenderungen = false;
    if (fokusDrin) stoerung.focus();
  }

  function pruefeVorlageFrueh() {
    ladeVorlage().catch((e) => {
      if (e && e.art === "vorlage-geaendert") {
        zeigeStoerung("Das Online-Formular ist gerade nicht nutzbar.",
          "Die Vorlage des Vereins wurde geändert, das Formular muss erst angepasst werden. Bitte nutzen Sie bis dahin den Papierweg:", true);
      }
    });
  }

  // pdf-lib nach dem ersten Schritt im Hintergrund laden – dann geht „PDF
  // erstellen“ schneller, und fehlt die Datei (z. B. nicht im Workspace
  // ausgeliefert), zeigt es sich früh. erstellen() versucht es ohnehin neu.
  let vorgeladen = false;
  function vorladen() {
    if (vorgeladen) return;
    vorgeladen = true;
    ladeSkript("data-pdf-lib", "PDFLib").catch(() => {
      vorgeladen = false;
      if (stoerung.hidden) {
        zeigeStoerung("Hinweis:", "Ein Programmteil für das PDF ließ sich gerade nicht laden. Sie können trotzdem weiter ausfüllen – beim Erstellen versucht es das Formular noch einmal. Klappt es auch dann nicht, gibt es den Papierweg:", false);
      }
    });
    ladeVorlage().catch(() => {});
  }

  let loeschenBestaetigen = null;
  function alleLoeschen(knopf) {
    if (!loeschenBestaetigen) {
      knopf.textContent = "Wirklich alle Angaben löschen? Noch einmal tippen";
      // Die neue Beschriftung sagt ein Screenreader nicht von selbst an –
      // deshalb auch in die Meldungszeile (aria-live).
      meldung("Zum Löschen aller Angaben bitte noch einmal auf den Knopf tippen. Das lässt sich nicht rückgängig machen.");
      loeschenBestaetigen = window.setTimeout(() => {
        loeschenBestaetigen = null;
        knopf.textContent = "Alle Angaben löschen";
        meldung("");
      }, 6000);
      return;
    }
    window.clearTimeout(loeschenBestaetigen);
    loeschenBestaetigen = null;
    knopf.textContent = "Alle Angaben löschen";
    verwerfeErgebnis();
    formular.reset();
    familienEintraege().forEach((e) => e.remove());
    Object.keys(unterschriften).forEach((k) => unterschriften[k].leeren());
    grundeinstellung();
    aenderungen = false;
    gesichert = false;
    zeigeSchritt(ALLE_SCHRITTE[0], { verlauf: "push" });
  }

  ergebnisBereich.addEventListener("click", (e) => {
    const knopf = e.target.closest("[data-aktion]");
    if (!knopf) return;
    const aktion = knopf.getAttribute("data-aktion");
    if (aktion === "herunterladen") herunterladen();
    else if (aktion === "ansehen") ansehen();
    else if (aktion === "teilen") teilen();
    else if (aktion === "loeschen") alleLoeschen(knopf);
  });

  // ---------- Änderungen verfolgen ----------

  function geaendert() {
    aenderungen = true;
    // Ein schon gespeichertes PDF passt nach einer Änderung nicht mehr – beim
    // Verlassen wieder warnen.
    gesichert = false;
    verwerfeErgebnis();
    standAnzeigen(aktualisiere());
    if (pruefeLaufend) zeigeFehler(aktuell, pruefeSchritt(aktuell), false);
  }

  formular.addEventListener("input", geaendert);
  formular.addEventListener("change", geaendert);
  Object.keys(unterschriften).forEach((k) => unterschriften[k].beiAenderung(geaendert));

  // IBAN und BIC beim Verlassen lesbar formatieren.
  const ibanFeld = element("iban");
  if (ibanFeld) ibanFeld.addEventListener("blur", () => {
    const iban = ibanEingabe(ibanFeld.value);
    if (iban && ibanGruppiert(iban) !== ibanFeld.value) ibanFeld.value = ibanGruppiert(iban);
  });
  const bicFeld = element("bic");
  if (bicFeld) bicFeld.addEventListener("blur", () => {
    const bic = bicEingabe(bicFeld.value);
    if (bic !== bicFeld.value) bicFeld.value = bic;
  });

  // Unterschrifts-Ort mit dem Wohnort vorbelegen, solange er leer ist.
  const ortFeld = element("ort");
  const unterschriftOrt = element("unterschrift_ort");
  if (ortFeld && unterschriftOrt) ortFeld.addEventListener("change", () => {
    if (!unterschriftOrt.value && ortFeld.value && sauber(ortFeld.value).length <= 26) unterschriftOrt.value = sauber(ortFeld.value);
  });

  wurzel.addEventListener("click", (e) => {
    if (e.target.closest("[data-familie-hinzu]")) { familieHinzu(true); geaendert(); return; }
    const entfernen = e.target.closest("[data-familie-entfernen]");
    if (entfernen) familieEntfernen(entfernen.closest("[data-familie-eintrag]"));
  });

  // Warnung beim Verlassen, solange Angaben da sind, die noch nicht als PDF
  // gesichert wurden.
  // mailto:-Links lösen in manchen Browsern ebenfalls beforeunload aus –
  // dafür keine Warnung.
  let mailKlick = 0;
  wurzel.addEventListener("click", (e) => {
    if (e.target.closest('a[href^="mailto:"]')) mailKlick = Date.now();
  });
  window.addEventListener("beforeunload", (e) => {
    if (!aenderungen || gesichert || Date.now() - mailKlick < 2000) return;
    e.preventDefault();
    e.returnValue = "";
  });

  // ---------- Start ----------

  function grundeinstellung() {
    const gleich = element("ki_anschrift_gleich");
    if (gleich) gleich.checked = true;
    setzeText("heute", datumText(heute()));
  }

  grundeinstellung();
  $$("[data-ohne-skript]", wurzel).forEach((el) => { el.hidden = true; });
  formular.hidden = false;
  // Immer am Anfang beginnen – nach einem Neuladen sind die Angaben weg.
  zeigeSchritt(ALLE_SCHRITTE[0], { verlauf: "replace", fokus: false });

  // Die leere Vorlage gleich prüfen (Größe, SHA-256): Wurde sie im CMS
  // ersetzt, erfährt man es jetzt und nicht erst beim Erstellen.
  window.setTimeout(pruefeVorlageFrueh, 500);
})();
