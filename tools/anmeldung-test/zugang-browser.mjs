// Gemeinsame Browser-Prüfungen für den Zugang mit Code vom Probetraining und die Übergabe in der App (Paket P1, 12.10.2026).
// Zwei Aufrufer, ein Satz Prüfungen: e2e.mjs (Begleitseite /anmeldung/ über den Testserver) und e2e-paket.mjs (Live-Seite
// anmeldung.html im Paket). Jeder Aufrufer reicht ein Objekt `c` mit seiner Umgebung herein.
// Ausgeführt werden: pruefeZugangImBrowser (Code-Seite, Link, SHA-256, Tastatur), pruefeUebergabeImBrowser (?app=1),
// pruefeUmgebungshinweisImBrowser und pruefeUmgebungshinweisSprachen (Zusätze zu P1: der Hinweis oben auf dem ersten Bildschirm, wenn die Seite in einem
// Rahmen oder im Browser einer anderen App läuft; Texte in allen Sprachen). Das Objekt `c`:
//
//   c.name            "Begleitseite" oder "Live-Seite" (steht in den Prüfungsnamen)
//   c.oeffne(vp, name, { abfrage, vorLaden })   öffnet die Seite und wartet auf #anmeldung[data-bereit]; Ergebnis: puppeteer-Seite
//   c.setzeZugang(liste)    stellt die Prüfwerte ein, die die Seite beim Laden bekommt (leere Liste = keine Code-Abfrage)
//   c.testCode, c.testPruefwert, c.fremderPruefwert   Zufallscode dieses Laufs, sein SHA-256, ein fremder SHA-256
//   c.ok(name, bedingung, detail)               meldet eine Prüfung
//   c.axe(page, name)       axe-core auf der Ansicht (critical und serious sind Fehler)
//   c.foto(page, dateiname, optionen)           Bildschirmfoto (optional)
//   c.zugangModul           Adresse des Moduls zugang.js (Quelle oder Paket), für die SHA-256-Probe im Browser
//   c.probetrainingZiel     erwartetes Ziel des Links „Probetraining vereinbaren“ (relative Adresse der Konfiguration)
//   c.geschaeftsstelle      erwartete E-Mail-Adresse der Geschäftsstelle
//   c.beispiele             true: Es gibt die Knöpfe der Vorführung (nur Begleitseite)
//   c.weiterImErstenBildschirm  true: Der Knopf „Weiter“ der Code-Seite liegt bei 390 x 844 im ersten Bildschirm
//   c.browserBasis          Adresse der Seite ohne Abfrage, wie sie im Browser steht (für die Übergabe)
//   c.uebergabePraefix      womit die Adresse des Knopfes „Im Browser öffnen“ beginnen muss (Standard „ext://http“; die Live-Seite auf dem CDN: „ext://https://“)
//   c.huelle(vp, name, { abfrage, vorLaden })   öffnet eine Testseite („Hülle“) mit einem <iframe> ohne allow-Angaben auf die Seite des Assistenten (anderer Port bzw.
//                           andere Herkunft) und wartet, bis der Assistent im Rahmen bereit ist; Ergebnis: { aussen: Seite, rahmen: Frame, schliessen() }
//   c.neuesFensterOeffnen   true: Der Klick auf „In neuem Fenster öffnen“ lässt sich wirklich ausführen (das neue Fenster lädt über das echte Netz, hier: der lokale Testserver);
//                           die Live-Seite im Paket wird vom Test nur über abgefangene Anfragen ausgeliefert, dort prüft der Test nur die Attribute des Links
//   c.woerterbuch(code)     das Wörterbuch der Oberfläche einer Sprache (Quelle oder Paket), für die erwarteten Texte
//   c.sprachen              die Sprachen, die die Seite anbietet (["de", "en", "tr", "ar"])
//
// Nichts hier steht im ausgelieferten Code: Die Prüfwerte setzt der Server der Aufrufer zur Laufzeit.

import { uaVon } from "./user-agents.mjs";

export const MOBIL = { name: "390x844", breite: 390, hoehe: 844, mobil: true };
export const DESKTOP = { name: "1440x900", breite: 1440, hoehe: 900, mobil: false };

const warte = (ms) => new Promise((r) => setTimeout(r, ms));

// Der Zustand der Seite: Schritt, Feld, Fehler, Fokus.
async function zustand(page) {
  return page.evaluate(() => {
    const w = document.getElementById("anmeldung");
    const sicht = (e) => !!e && e.checkVisibility();
    const feld = w.querySelector('[data-feld="code"]');
    const eingabe = w.querySelector('[data-pfad="zugang.code"]');
    const fehlerEl = feld ? feld.querySelector(".anm-fehler") : null;
    const box = w.querySelector(".anm-fehlerbox");
    const titel = w.querySelector(".anm-titel");
    const aktiv = document.activeElement;
    return {
      schritt: w.dataset.schritt,
      teil: w.dataset.teil,
      suche: location.search,
      titel: titel ? titel.textContent.trim() : "",
      eingabe: eingabe ? { wert: eingabe.value, aria: eingabe.getAttribute("aria-invalid"), beschr: eingabe.getAttribute("aria-describedby") || "" } : null,
      fehlerAmFeld: fehlerEl && !fehlerEl.hidden ? fehlerEl.textContent.trim() : "",
      fehlerBox: box && !box.hidden ? Array.from(box.querySelectorAll("li")).map((li) => li.textContent.trim()) : [],
      fokus: aktiv ? { tag: aktiv.tagName.toLowerCase(), klasse: String(aktiv.className || ""), id: aktiv.id || "" } : null,
      felder: Array.from(w.querySelectorAll("input, select, textarea")).filter((e) => sicht(e) && !e.closest("dialog")).map((e) => e.getAttribute("data-pfad") || e.name || e.id),
      querScroll: document.documentElement.scrollWidth > window.innerWidth,
    };
  });
}

// Wartet, bis sich Schritt oder Fehlerliste ändern (nach "Weiter").
async function warteNachWeiter(page, vorher) {
  await page.waitForFunction(
    (v) => {
      const w = document.getElementById("anmeldung");
      const box = w.querySelector(".anm-fehlerbox");
      return w.dataset.schritt !== v || (box && !box.hidden);
    },
    { timeout: 8000 },
    vorher
  ).catch(() => {});
}

// Setzt den Text im Feld: alles markieren, löschen, tippen (wie eine Person mit der Tastatur).
async function tippeCode(page, text) {
  await page.$eval('[data-pfad="zugang.code"]', (e) => {
    e.focus();
    e.select();
  });
  await page.keyboard.press("Backspace");
  if (text) await page.keyboard.type(text);
}

async function weiter(page) {
  const vorher = (await zustand(page)).schritt;
  await page.click('#anmeldung [data-aktion="weiter"]');
  await warteNachWeiter(page, vorher);
  return zustand(page);
}

// Vor dem Laden der Seite: merkt sich, ob die Code-Seite je gezeichnet wurde (ein Link mit gültigem Code zeichnet sie nie).
const MERKE_CODESEITE = () => {
  window.__codeSeiteGesehen = false;
  new MutationObserver(() => {
    if (document.querySelector('[data-feld="code"]')) window.__codeSeiteGesehen = true;
  }).observe(document, { childList: true, subtree: true });
};

// Ohne crypto.subtle (Seite nicht über https, ältere Webansicht) bzw. mit einem digest, das scheitert
const OHNE_SUBTLE = () => {
  Object.defineProperty(window.crypto, "subtle", { get: () => undefined, configurable: true });
};
const SUBTLE_SCHEITERT = () => {
  Object.defineProperty(window.crypto, "subtle", { get: () => ({ digest: () => Promise.reject(new Error("nicht erlaubt")) }), configurable: true });
};

// ---------- Zugang ----------

export async function pruefeZugangImBrowser(c) {
  const ok = c.ok;
  const N = c.name + ": ";
  console.log("\n=== P1: Zugang mit Code vom Probetraining – " + c.name + " ===");
  const code = c.testCode;
  const codeNorm = code.replace(/[\s-]/g, "").toUpperCase();
  const FALSCH = "FALSCH-" + code.slice(-4);
  try {
    // ---- A. Keine Prüfwerte: keine Code-Abfrage ----
    c.setzeZugang([]);
    {
      const page = await c.oeffne(MOBIL, "zugang-aus");
      const z = await zustand(page);
      ok(N + "ohne Prüfwerte (leere Liste) ist der Startschritt der erste Bildschirm, es gibt keine Code-Seite und kein Feld „Code“", z.schritt === "start" && z.eingabe === null && !(await page.$('#anmeldung [data-feld="code"]')), JSON.stringify({ schritt: z.schritt, suche: z.suche }));
      await page.close();
      const p2 = await c.oeffne(MOBIL, "zugang-aus-mit-code", { abfrage: "?code=irgendwas" });
      const z2 = await zustand(p2);
      ok(N + "ohne Prüfwerte ändert ein ?code=… in der Adresse nichts (Startschritt, Adresse unverändert)", z2.schritt === "start" && z2.suche === "?code=irgendwas", JSON.stringify(z2.suche));
      await p2.close();
    }

    // ---- B. Mit Prüfwert ----
    c.setzeZugang([c.testPruefwert]);

    // B1. Erster Bildschirm am Handy
    {
      const page = await c.oeffne(MOBIL, "code-390");
      const z = await zustand(page);
      const d = await page.evaluate(() => {
        const sicht = (e) => !!e && e.checkVisibility();
        const r = (e) => e.getBoundingClientRect();
        const w = document.getElementById("anmeldung");
        const leiste = document.querySelector("[data-anm-sprachleiste]");
        const knoepfe = Array.from(document.querySelectorAll("[data-anm-sprachleiste] button[data-sprache]"));
        const eingabe = w.querySelector('[data-pfad="zugang.code"]');
        const label = w.querySelector('[data-feld="code"] label');
        const weiterKnopf = w.querySelector('[data-aktion="weiter"]');
        const links = Array.from(w.querySelectorAll(".anm-code-hilfen a")).map((a) => ({ text: a.textContent.trim(), href: a.getAttribute("href"), aktion: a.getAttribute("data-aktion"), umgebung: a.parentElement.textContent.replace(/\s+/g, " ").trim() }));
        const absaetze = Array.from(w.querySelectorAll(".anm-absaetze p")).map((p) => p.textContent.trim());
        const hoehe = window.innerHeight;
        return {
          titel: (w.querySelector(".anm-titel") || {}).textContent,
          absaetze,
          label: label ? label.textContent.trim() : null,
          attribute: eingabe ? { autocomplete: eingabe.getAttribute("autocomplete"), autocapitalize: eingabe.getAttribute("autocapitalize"), spellcheck: eingabe.getAttribute("spellcheck"), required: eingabe.getAttribute("aria-required"), type: eingabe.type, labelFor: label && label.getAttribute("for") === eingabe.id } : null,
          weiterText: weiterKnopf ? weiterKnopf.textContent.trim() : null,
          weiterUnten: weiterKnopf ? Math.round(r(weiterKnopf).bottom) : null,
          eingabeUnten: eingabe ? Math.round(r(eingabe).bottom) : null,
          hoehe,
          leisteSichtbar: sicht(leiste),
          leisteUnten: leiste ? Math.round(r(leiste).bottom) : null,
          sprachen: knoepfe.map((b) => b.getAttribute("data-sprache")),
          sprachenSichtbar: knoepfe.every((b) => sicht(b) && r(b).bottom <= hoehe),
          abschnitte: sicht(w.querySelector(".anm-abschnitte")),
          fuss: sicht(w.querySelector(".anm-fuss")),
          zurueck: sicht(w.querySelector('[data-aktion="zurueck"]')),
          sprachAuswahlImKopf: sicht(w.querySelector("#anm-sprache")),
          links,
          speicher: { ls: (() => { try { return localStorage.length; } catch (e) { return -1; } })(), cookie: document.cookie },
        };
      });
      ok(N + "Code-Seite ist der erste Bildschirm (Schritt „code“), noch ohne ?code= in der Adresse", z.schritt === "code" && z.teil === "haupt" && z.suche === "", JSON.stringify({ schritt: z.schritt, suche: z.suche }));
      ok(N + "Code-Seite: Titel „Anmeldung nach dem Probetraining“, zwei kurze Sätze „Bitte geben Sie den Code ein.“ und „Sie bekommen ihn beim Probetraining.“", d.titel === "Anmeldung nach dem Probetraining" && JSON.stringify(d.absaetze) === JSON.stringify(["Bitte geben Sie den Code ein.", "Sie bekommen ihn beim Probetraining."]), JSON.stringify([d.titel, d.absaetze]));
      ok(N + "Code-Seite: genau ein Feld „Code“ mit sichtbarer Beschriftung; vor jeder persönlichen Frage nichts anderes", d.label === "Code" && JSON.stringify(z.felder) === JSON.stringify(["zugang.code"]), JSON.stringify(z.felder) + " / " + d.label);
      ok(N + "Code-Feld: autocomplete=off, autocapitalize=characters, spellcheck=false, Pflichtfeld (aria-required), Beschriftung am Feld, Typ text", !!d.attribute && d.attribute.autocomplete === "off" && d.attribute.autocapitalize === "characters" && d.attribute.spellcheck === "false" && d.attribute.required === "true" && d.attribute.type === "text" && d.attribute.labelFor === true, JSON.stringify(d.attribute));
      ok(N + "Code-Seite: Knopf „Weiter“", d.weiterText === "Weiter", String(d.weiterText));
      ok(N + "Code-Seite: Sprachwahl oben, alle vier Knöpfe im ersten Bildschirm (390 x 844)", d.leisteSichtbar && JSON.stringify(d.sprachen) === JSON.stringify(["de", "en", "tr", "ar"]) && d.sprachenSichtbar, "unterste Kante " + d.leisteUnten + " von " + d.hoehe);
      ok(N + "Code-Seite: das Feld liegt im ersten Bildschirm" + (c.weiterImErstenBildschirm ? ", der Knopf „Weiter“ auch" : ""), d.eingabeUnten <= d.hoehe && (!c.weiterImErstenBildschirm || d.weiterUnten <= d.hoehe), "Feld unten " + d.eingabeUnten + ", Weiter unten " + d.weiterUnten + " von " + d.hoehe);
      ok(N + "Code-Seite: keine Abschnitte, keine Fußzeile, kein Zurück, keine zweite Sprachauswahl in der Leiste des Assistenten", !d.abschnitte && !d.fuss && !d.zurueck && !d.sprachAuswahlImKopf, JSON.stringify({ abschnitte: d.abschnitte, fuss: d.fuss, zurueck: d.zurueck }));
      const kein = d.links.find((l) => l.aktion === "probetraining");
      const passiv = d.links.find((l) => l.aktion === "code-anfragen");
      ok(N + "Code-Seite, klein darunter: „Noch kein Probetraining? Probetraining vereinbaren“ mit Link auf „Mitglied werden“ (Abschnitt Probetraining)", !!kein && kein.umgebung === "Noch kein Probetraining? Probetraining vereinbaren" && kein.text === "Probetraining vereinbaren" && kein.href === c.probetrainingZiel, JSON.stringify(kein));
      ok(N + "Code-Seite, klein darunter: „Passives Mitglied? Den Code bekommen Sie von der Geschäftsstelle.“ mit E-Mail-Link (mailto an die Geschäftsstelle)", !!passiv && passiv.umgebung === "Passives Mitglied? Den Code bekommen Sie von der Geschäftsstelle." && passiv.text === "Geschäftsstelle" && passiv.href === "mailto:" + c.geschaeftsstelle + "?subject=" + encodeURIComponent("Code für die Anmeldung"), JSON.stringify(passiv));
      ok(N + "Code-Seite: nichts im Speicher des Browsers (localStorage, Cookies), kein Querscrollen", d.speicher.ls === 0 && d.speicher.cookie === "" && !z.querScroll, JSON.stringify(d.speicher));
      await c.axe(page, N + "Code-Seite (390)");
      if (c.foto) await c.foto(page, "code-390-de.png", { fullPage: false });
      await page.close();
    }

    // B2. Desktop
    {
      const page = await c.oeffne(DESKTOP, "code-1440");
      const z = await zustand(page);
      ok(N + "Code-Seite am Rechner (1440 x 900): erster Bildschirm, kein Querscrollen", z.schritt === "code" && !z.querScroll, JSON.stringify(z.schritt));
      await c.axe(page, N + "Code-Seite (1440)");
      if (c.foto) await c.foto(page, "code-1440-de.png", { fullPage: false });
      await page.close();
    }

    // B3. Leer, falsch, richtig – am Handy, mit Tastatur und Knopf
    {
      const page = await c.oeffne(MOBIL, "code-eingabe");
      // leer
      const leer = await weiter(page);
      ok(N + "leerer Code: kein Weiter (Schritt bleibt „code“), Meldung am Feld „Bitte geben Sie den Code ein.“, aria-invalid, Meldung hängt am Feld (aria-describedby)", leer.schritt === "code" && leer.fehlerAmFeld === "Bitte geben Sie den Code ein." && leer.eingabe.aria === "true" && leer.eingabe.beschr.length > 0, JSON.stringify({ schritt: leer.schritt, feld: leer.fehlerAmFeld, aria: leer.eingabe && leer.eingabe.aria }));
      ok(N + "leerer Code: Fehlerliste „Code: Bitte geben Sie den Code ein.“, der Fokus liegt auf der Fehlerliste", JSON.stringify(leer.fehlerBox) === JSON.stringify(["Code: Bitte geben Sie den Code ein."]) && leer.fokus && /anm-fehlerbox/.test(leer.fokus.klasse), JSON.stringify([leer.fehlerBox, leer.fokus]));
      await c.axe(page, N + "Code-Seite mit Fehler „leer“ (390)");
      // Klick auf den Eintrag der Fehlerliste setzt den Fokus ins Feld
      await page.click("#anmeldung .anm-fehlerbox a");
      const aufFeld = await page.evaluate(() => document.activeElement && document.activeElement.getAttribute("data-pfad"));
      ok(N + "leerer Code: der Eintrag der Fehlerliste führt in das Feld", aufFeld === "zugang.code", String(aufFeld));
      // nur Leerzeichen und Bindestriche zählen als leer
      await tippeCode(page, "  - - ");
      const nurLeer = await weiter(page);
      ok(N + "nur Leerzeichen und Bindestriche gelten als leer (gleiche Meldung)", nurLeer.schritt === "code" && nurLeer.fehlerAmFeld === "Bitte geben Sie den Code ein.", nurLeer.fehlerAmFeld);
      // falsch
      await tippeCode(page, FALSCH);
      const falsch = await weiter(page);
      ok(N + "falscher Code: kein Weiter, Meldung am Feld „Der Code stimmt nicht. Bitte prüfen Sie ihn.“, aria-invalid, Fehlerliste, Fokus auf der Fehlerliste", falsch.schritt === "code" && falsch.fehlerAmFeld === "Der Code stimmt nicht. Bitte prüfen Sie ihn." && falsch.eingabe.aria === "true" && JSON.stringify(falsch.fehlerBox) === JSON.stringify(["Code: Der Code stimmt nicht. Bitte prüfen Sie ihn."]) && /anm-fehlerbox/.test(falsch.fokus.klasse) && falsch.eingabe.wert === FALSCH, JSON.stringify({ feld: falsch.fehlerAmFeld, box: falsch.fehlerBox, wert: falsch.eingabe && falsch.eingabe.wert }));
      ok(N + "falscher Code: die Adresse bleibt ohne ?code= (nichts Falsches in der Adresse)", falsch.suche === "", falsch.suche);
      await c.axe(page, N + "Code-Seite mit Fehler „falsch“ (390)");
      if (c.foto) await c.foto(page, "code-fehler-390-de.png", { fullPage: false });
      // Weitertippen nimmt die Meldung weg
      await page.focus('[data-pfad="zugang.code"]');
      await page.keyboard.type("X");
      const getippt = await zustand(page);
      ok(N + "Weitertippen nimmt die Meldung weg (am Feld und in der Fehlerliste), aria-invalid fällt weg", getippt.fehlerAmFeld === "" && getippt.fehlerBox.length === 0 && getippt.eingabe.aria === null, JSON.stringify({ feld: getippt.fehlerAmFeld, box: getippt.fehlerBox, aria: getippt.eingabe.aria }));
      // richtig, mit Enter
      await tippeCode(page, code);
      await page.keyboard.press("Enter");
      await warteNachWeiter(page, "code");
      const richtig = await zustand(page);
      ok(N + "richtiger Code mit der Eingabetaste: Startschritt, die Adresse trägt code=" + codeNorm + ", der Fokus liegt auf der Überschrift", richtig.schritt === "start" && richtig.suche === "?code=" + codeNorm && richtig.fokus && richtig.fokus.id === "anm-titel", JSON.stringify({ schritt: richtig.schritt, suche: richtig.suche, fokus: richtig.fokus }));
      const nachStart = await page.evaluate(() => ({
        zurueck: document.querySelector('[data-aktion="zurueck"]').checkVisibility(),
        titel: document.querySelector(".anm-titel").textContent,
        abschnitte: document.querySelector(".anm-abschnitte").checkVisibility(),
        leiste: document.querySelector("[data-anm-sprachleiste]").checkVisibility(),
      }));
      ok(N + "nach dem Code: Startschritt „Willkommen“ wie sonst (Abschnitte oben, Sprachwahl oben, kein Zurück)", nachStart.titel === "Willkommen" && nachStart.abschnitte && nachStart.leiste && !nachStart.zurueck, JSON.stringify(nachStart));
      // der Verlauf: Zurück führt nicht auf die Code-Seite
      await page.click('#anmeldung [data-aktion="weiter"]');
      await page.waitForFunction(() => document.getElementById("anmeldung").dataset.schritt === "wer", { timeout: 5000 });
      await page.click('#anmeldung [data-aktion="zurueck"]');
      await page.waitForFunction(() => document.getElementById("anmeldung").dataset.schritt === "start", { timeout: 5000 });
      const zurueck = await zustand(page);
      ok(N + "nach dem Code: Weiter und Zurück bleiben im Assistenten; Zurück führt nie auf die Code-Seite", zurueck.schritt === "start" && zurueck.suche === "?code=" + codeNorm, JSON.stringify(zurueck.schritt));
      await page.goBack().catch(() => {});
      await warte(300);
      ok(N + "nach dem Code: die Zurück-Taste des Browsers verlässt die Seite (die Code-Seite steht nicht im Verlauf)", !/anmeldung/.test(page.url()) || page.url() === "about:blank", page.url());
      await page.close();
    }

    // B4. Schreibweisen des richtigen Codes
    {
      const gross = code;
      const varianten = [
        ["klein geschrieben", gross.toLowerCase()],
        ["Bindestriche durch Leerzeichen ersetzt", gross.replace(/-/g, " ")],
        ["ohne Bindestriche", gross.replace(/-/g, "")],
        ["mit Leerzeichen an den Rändern", "  " + gross + "  "],
        ["gemischt, mit geschütztem Leerzeichen und Gedankenstrich", gross.toLowerCase().replace(/-/, " ").replace(/-/, "–")],
        ["mit unsichtbaren Richtungszeichen (eingefügt aus einem Chat)", "‎" + gross + "‏"],
      ];
      for (const [name, text] of varianten) {
        const page = await c.oeffne(MOBIL, "code-variante");
        await tippeCode(page, text);
        const r = await weiter(page);
        ok(N + "richtiger Code, " + name + ": Startschritt, Adresse mit code=" + codeNorm, r.schritt === "start" && r.suche === "?code=" + codeNorm, JSON.stringify([r.schritt, r.suche]));
        await page.close();
      }
      // andere Angaben der Adresse bleiben
      const page = await c.oeffne(MOBIL, "code-andere-parameter", { abfrage: "?foo=1&bar=%C3%A4" });
      await tippeCode(page, code);
      const r = await weiter(page);
      const such = new URLSearchParams(r.suche);
      ok(N + "richtiger Code: andere Angaben der Adresse bleiben (foo=1, bar=ä), code= kommt dazu", r.schritt === "start" && such.get("foo") === "1" && such.get("bar") === "ä" && such.get("code") === codeNorm, r.suche);
      // Neuladen braucht den Code nicht noch einmal
      await page.reload({ waitUntil: "networkidle0" });
      await page.waitForSelector("#anmeldung[data-bereit]", { timeout: 10000 });
      const nachNeuladen = await zustand(page);
      ok(N + "Neuladen: der Startschritt erscheint, ohne Code-Seite und ohne neue Abfrage", nachNeuladen.schritt === "start" && nachNeuladen.eingabe === null && new URLSearchParams(nachNeuladen.suche).get("code") === codeNorm, JSON.stringify(nachNeuladen.schritt));
      await page.close();
    }

    // B5. Link mit Code
    {
      const page = await c.oeffne(MOBIL, "code-link-gueltig", { abfrage: "?code=" + encodeURIComponent(code), vorLaden: async (p) => p.evaluateOnNewDocument(MERKE_CODESEITE) });
      const z = await zustand(page);
      const gesehen = await page.evaluate(() => window.__codeSeiteGesehen);
      ok(N + "Link mit gültigem ?code=: Startschritt ohne Code-Seite (die Code-Seite wurde nie gezeichnet)", z.schritt === "start" && gesehen === false && z.eingabe === null, JSON.stringify({ schritt: z.schritt, gesehen }));
      ok(N + "Link mit gültigem ?code=: die Adresse bleibt, wie sie ist", z.suche === "?code=" + encodeURIComponent(code), z.suche);
      await page.close();
      const klein = await c.oeffne(MOBIL, "code-link-klein", { abfrage: "?code=" + encodeURIComponent(code.toLowerCase().replace(/-/g, " ")) });
      ok(N + "Link mit gültigem Code in anderer Schreibweise (klein, Leerzeichen): Startschritt", (await zustand(klein)).schritt === "start");
      await klein.close();
      const falsch = await c.oeffne(MOBIL, "code-link-falsch", { abfrage: "?code=" + encodeURIComponent(FALSCH) });
      const zf = await zustand(falsch);
      ok(N + "Link mit ungültigem ?code=: Code-Seite, das Feld ist vorbelegt, Meldung am Feld „Der Code stimmt nicht. Bitte prüfen Sie ihn.“ (aria-invalid), Fehlerliste", zf.schritt === "code" && zf.eingabe.wert === FALSCH && zf.fehlerAmFeld === "Der Code stimmt nicht. Bitte prüfen Sie ihn." && zf.eingabe.aria === "true" && zf.fehlerBox.length === 1, JSON.stringify({ schritt: zf.schritt, wert: zf.eingabe && zf.eingabe.wert, feld: zf.fehlerAmFeld, aria: zf.eingabe && zf.eingabe.aria }));
      ok(N + "Link mit ungültigem ?code=: die Adresse bleibt, wie sie ist", zf.suche === "?code=" + encodeURIComponent(FALSCH), zf.suche);
      await c.axe(falsch, N + "Code-Seite aus einem Link mit falschem Code (390)");
      if (c.foto) await c.foto(falsch, "code-link-falsch-390-de.png", { fullPage: false });
      // den Fehler im Feld verbessern: richtiger Code, Weiter
      await tippeCode(falsch, code);
      const verbessert = await weiter(falsch);
      ok(N + "Link mit ungültigem Code: den Code im Feld verbessern und „Weiter“ führt zum Startschritt, die Adresse trägt den richtigen Code", verbessert.schritt === "start" && new URLSearchParams(verbessert.suche).get("code") === codeNorm, verbessert.suche);
      await falsch.close();
      const leerLink = await c.oeffne(MOBIL, "code-link-leer", { abfrage: "?code=" });
      const zl = await zustand(leerLink);
      ok(N + "Link mit leerem ?code=: Code-Seite ohne Meldung (kein Fehler, solange nichts eingegeben ist)", zl.schritt === "code" && zl.fehlerAmFeld === "" && zl.fehlerBox.length === 0 && zl.eingabe.wert === "", JSON.stringify({ schritt: zl.schritt, feld: zl.fehlerAmFeld }));
      await leerLink.close();
    }

    // B6. Ohne crypto.subtle und mit scheiterndem digest
    {
      for (const [name, vorLaden] of [["ohne crypto.subtle", OHNE_SUBTLE], ["crypto.subtle.digest scheitert", SUBTLE_SCHEITERT]]) {
        const p1 = await c.oeffne(MOBIL, "code-ohne-subtle", { vorLaden: async (p) => p.evaluateOnNewDocument(vorLaden) });
        const check = await p1.evaluate(() => ({ subtle: window.crypto.subtle === undefined ? "fehlt" : typeof window.crypto.subtle.digest }));
        await tippeCode(p1, code);
        const r = await weiter(p1);
        ok(N + name + " (" + check.subtle + "): der richtige Code führt zum Startschritt", r.schritt === "start" && new URLSearchParams(r.suche).get("code") === codeNorm, JSON.stringify(r.schritt));
        await p1.close();
        const p2 = await c.oeffne(MOBIL, "code-ohne-subtle-falsch", { vorLaden: async (p) => p.evaluateOnNewDocument(vorLaden) });
        await tippeCode(p2, FALSCH);
        const r2 = await weiter(p2);
        ok(N + name + ": ein falscher Code wird abgewiesen", r2.schritt === "code" && r2.fehlerAmFeld === "Der Code stimmt nicht. Bitte prüfen Sie ihn.", r2.fehlerAmFeld);
        await p2.close();
        const p3 = await c.oeffne(MOBIL, "code-ohne-subtle-link", { abfrage: "?code=" + encodeURIComponent(code), vorLaden: async (p) => p.evaluateOnNewDocument(vorLaden) });
        ok(N + name + ": Link mit gültigem Code führt zum Startschritt", (await zustand(p3)).schritt === "start");
        await p3.close();
      }
      // eigene SHA-256-Funktion gegen crypto.subtle im Browser
      const page = await c.oeffne(MOBIL, "sha-browser");
      const sha = await page.evaluate(async (modul) => {
        const m = await import(modul);
        const te = new TextEncoder();
        const subtle = async (t) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", te.encode(t))), (b) => b.toString(16).padStart(2, "0")).join("");
        const vektoren = { leer: "", abc: "abc", tausendA: "a".repeat(1000), umlaute: "Müßiggänger – Übergrößenträger äöüÄÖÜß", emoji: "😀 𝒳", arabisch: "الرمز İstanbul" };
        const aus = {};
        for (const [name, text] of Object.entries(vektoren)) aus[name] = { eigen: m.sha256HexEigen(text), subtle: await subtle(text), sha256Hex: await m.sha256Hex(text) };
        let abweichung = 0;
        for (let n = 0; n <= 200; n++) if (m.sha256HexEigen("q".repeat(n)) !== (await subtle("q".repeat(n)))) abweichung++;
        return { aus, abweichung, subtleDa: !!crypto.subtle };
      }, c.zugangModul);
      const gleich = Object.entries(sha.aus).filter(([, v]) => v.eigen === v.subtle && v.sha256Hex === v.subtle).map(([k]) => k);
      ok(N + "im Browser: eigene SHA-256-Funktion = crypto.subtle (Testvektoren leer, „abc“, 1000 Zeichen, Umlaute, Emoji, Arabisch; alle Längen 0 bis 200)", sha.subtleDa && gleich.length === Object.keys(sha.aus).length && sha.abweichung === 0, gleich.length + " von " + Object.keys(sha.aus).length + " Vektoren gleich, " + sha.abweichung + " Abweichungen");
      ok(N + "im Browser: SHA-256 von „abc“ = ba7816bf…15ad", sha.aus.abc.eigen === "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
      await page.close();
    }

    // B7. Mehrere Prüfwerte, nur ein fremder Prüfwert
    {
      c.setzeZugang([c.fremderPruefwert, c.testPruefwert]);
      const p1 = await c.oeffne(MOBIL, "zwei-pruefwerte");
      await tippeCode(p1, code);
      ok(N + "zwei Prüfwerte in der Liste: der Code zum zweiten Prüfwert gilt", (await weiter(p1)).schritt === "start");
      await p1.close();
      c.setzeZugang([c.fremderPruefwert]);
      const p2 = await c.oeffne(MOBIL, "fremder-pruefwert");
      await tippeCode(p2, code);
      const r2 = await weiter(p2);
      ok(N + "ein fremder Prüfwert in der Liste (so steht der echte Prüfwert im Repo): der Testcode gilt nicht, die Code-Seite bleibt", r2.schritt === "code" && r2.fehlerAmFeld === "Der Code stimmt nicht. Bitte prüfen Sie ihn.", r2.fehlerAmFeld);
      await p2.close();
      const p3 = await c.oeffne(MOBIL, "fremder-pruefwert-link", { abfrage: "?code=" + encodeURIComponent(code) });
      ok(N + "ein fremder Prüfwert: auch ein Link mit dem Testcode führt auf die Code-Seite (mit Meldung)", (await zustand(p3)).schritt === "code");
      await p3.close();
      c.setzeZugang([c.testPruefwert]);
    }

    // B8. Tastatur
    {
      const page = await c.oeffne(MOBIL, "code-tastatur");
      const reihe = [];
      for (let i = 0; i < 40; i++) {
        await page.keyboard.press("Tab");
        const f = await page.evaluate(() => {
          const e = document.activeElement;
          if (!e || e === document.body) return null;
          return { tag: e.tagName.toLowerCase(), sprache: e.getAttribute("data-sprache"), aktion: e.getAttribute("data-aktion"), pfad: e.getAttribute("data-pfad"), text: (e.textContent || "").trim().slice(0, 40) };
        });
        if (f) reihe.push(f);
        if (f && f.aktion === "code-anfragen") break;
      }
      const idx = (p) => reihe.findIndex(p);
      const iDe = idx((f) => f.sprache === "de");
      const iAr = idx((f) => f.sprache === "ar");
      const iFeld = idx((f) => f.pfad === "zugang.code");
      const iWeiter = idx((f) => f.aktion === "weiter");
      const iKein = idx((f) => f.aktion === "probetraining");
      const iPassiv = idx((f) => f.aktion === "code-anfragen");
      ok(N + "Tastatur: Tab erreicht in dieser Reihenfolge die vier Sprachen, das Feld „Code“, „Weiter“ und beide Links darunter", iDe >= 0 && iAr > iDe && iFeld > iAr && iWeiter > iFeld && iKein > iWeiter && iPassiv > iKein, reihe.map((f) => f.sprache || f.aktion || f.pfad || f.tag).join(" › "));
      await page.focus('[data-pfad="zugang.code"]');
      await page.keyboard.type(FALSCH);
      await page.keyboard.press("Enter");
      await warteNachWeiter(page, "code");
      const z1 = await zustand(page);
      ok(N + "Tastatur: Eingabetaste im Feld schickt den Code ab (falscher Code: Meldung)", z1.schritt === "code" && z1.fehlerAmFeld === "Der Code stimmt nicht. Bitte prüfen Sie ihn.");
      await tippeCode(page, code);
      await page.focus('[data-aktion="weiter"]');
      await page.keyboard.press("Enter");
      await warteNachWeiter(page, "code");
      ok(N + "Tastatur: „Weiter“ mit der Eingabetaste bei richtigem Code führt zum Startschritt", (await zustand(page)).schritt === "start");
      await page.close();
      // Sprachwahl mit der Tastatur (Leertaste auf dem Knopf)
      const p2 = await c.oeffne(MOBIL, "code-sprache-tastatur");
      await p2.focus('[data-anm-sprachleiste] [data-sprache="en"]');
      await p2.keyboard.press("Space");
      await p2.waitForFunction(() => document.getElementById("anmeldung").getAttribute("data-sprache") === "en", { timeout: 6000 }).catch(() => {});
      const en = await zustand(p2);
      ok(N + "Tastatur: Sprache mit der Leertaste wählen; die Code-Seite folgt (Englisch), ein getippter Code bleibt im Feld", en.titel === "Registration after the trial training" && en.schritt === "code", en.titel);
      await p2.close();
    }

    // B9. Die Sprache wechseln, der Code im Feld bleibt
    {
      const page = await c.oeffne(MOBIL, "code-sprache-wechsel");
      await tippeCode(page, code);
      await page.click('[data-anm-sprachleiste] [data-sprache="tr"]');
      await page.waitForFunction(() => document.getElementById("anmeldung").getAttribute("data-sprache") === "tr", { timeout: 6000 });
      const tr = await zustand(page);
      ok(N + "Sprache gewechselt (Türkisch): die Code-Seite folgt, der getippte Code bleibt im Feld", tr.schritt === "code" && tr.eingabe.wert === code && tr.titel === "Deneme antrenmanından sonra kayıt", JSON.stringify({ titel: tr.titel, wert: tr.eingabe && tr.eingabe.wert }));
      const r = await weiter(page);
      ok(N + "Sprache gewechselt (Türkisch): der richtige Code führt zum Startschritt, auf Türkisch", r.schritt === "start" && r.titel === "Hoş geldiniz", r.titel);
      await page.close();
    }

    // B10. Vorführung (nur Begleitseite): Beispiele sind kein Weg am Code vorbei
    if (c.beispiele) {
      const page = await c.oeffne(MOBIL, "code-beispiel");
      // Die Code-Seite hat den kompakten Kopf: Der Knopf „Vorführung“ holt den Werkzeugkasten (wie auf jeder Frageseite).
      await page.click("[data-anm-vorfuehrung]");
      await page.$eval("[data-anm-werkzeuge]", (d) => (d.open = true));
      await page.click('[data-beispiel="kind-neu"]');
      await warte(300);
      const z = await page.evaluate(() => ({ schritt: document.getElementById("anmeldung").dataset.schritt, meldung: (document.querySelector(".anm-meldung") || {}).textContent }));
      ok(N + "Vorführung: ein Beispiel lässt sich ohne Code nicht laden (Code-Seite bleibt, Meldung „Bitte geben Sie zuerst den Code ein.“)", z.schritt === "code" && z.meldung === "Bitte geben Sie zuerst den Code ein.", JSON.stringify(z));
      await tippeCode(page, code);
      await weiter(page);
      await page.$eval("[data-anm-werkzeuge]", (d) => (d.open = true));
      await page.click('[data-beispiel="kind-neu"]');
      await page.waitForFunction(() => /Beispiel geladen/.test((document.querySelector(".anm-meldung") || {}).textContent || ""), { timeout: 4000 }).catch(() => {});
      const nach = await page.evaluate(() => ({ schritt: document.getElementById("anmeldung").dataset.schritt, meldung: (document.querySelector(".anm-meldung") || {}).textContent }));
      ok(N + "Vorführung: nach dem Code lässt sich das Beispiel laden", nach.schritt === "start" && /Beispiel geladen/.test(nach.meldung), JSON.stringify(nach));
      await page.close();
    }
  } finally {
    c.setzeZugang([]);
  }
}

// ---------- Übergabe in der App ----------

// Öffnet die Seite mit ?app=1 (so öffnet die Vereins-App sie, wenn ein Link nicht über ext:// führt): Es steht nur die Übergabe in den Browser da.
// Die Adresse des Knopfes beginnt mit c.uebergabePraefix („ext://https://“ auf dem CDN, in Tests der Begleitseite „ext://http://127.0.0.1:…“).
export async function pruefeUebergabeImBrowser(c) {
  const ok = c.ok;
  const N = c.name + ": ";
  console.log("\n=== P1: Übergabe in den Browser (?app=1) – " + c.name + " ===");
  const code = c.testCode;
  const codeNorm = code.replace(/[\s-]/g, "").toUpperCase();
  try {
    for (const [zugang, zugangName] of [[[], "ohne Prüfwerte"], [[c.testPruefwert], "mit Prüfwert"]]) {
      c.setzeZugang(zugang);
      const page = await c.oeffne(MOBIL, "uebergabe", { abfrage: "?app=1" });
      const d = await page.evaluate(() => {
        const w = document.getElementById("anmeldung");
        const sicht = (e) => !!e && e.checkVisibility();
        const a = w.querySelector('a[data-aktion="im-browser-oeffnen"]');
        return {
          schritt: w.dataset.schritt,
          appKlasse: document.documentElement.classList.contains("app-modus"),
          titel: (w.querySelector(".anm-titel") || {}).textContent,
          linkText: a ? a.textContent.trim() : null,
          href: a ? a.getAttribute("href") : null,
          target: a ? a.getAttribute("target") : null,
          linkSichtbar: sicht(a),
          felder: Array.from(w.querySelectorAll("input, select, textarea")).filter((e) => sicht(e) && !e.closest("dialog")).length,
          weiter: !!w.querySelector('[data-aktion="weiter"]'),
          abschnitte: sicht(w.querySelector(".anm-abschnitte")),
          fuss: sicht(w.querySelector(".anm-fuss")),
          leiste: sicht(document.querySelector("[data-anm-sprachleiste]")),
          rahmen: sicht(document.querySelector(".begleit-kopf")),
          apphinweis: !!document.querySelector("[data-anm-apphinweis], [data-anm-browserlink], [data-app-hinweis]"),
          querScroll: document.documentElement.scrollWidth > window.innerWidth,
        };
      });
      ok(N + "?app=1 (" + zugangName + "): nur die Übergabe („uebergabe“), kein Feld, kein Weiter, keine Abschnitte, keine Fußzeile; die Sprachwahl oben bleibt", d.schritt === "uebergabe" && d.appKlasse && d.felder === 0 && !d.weiter && !d.abschnitte && !d.fuss && d.leiste && !d.rahmen, JSON.stringify(d));
      ok(N + "?app=1 (" + zugangName + "): Titel „Bitte öffnen Sie die Anmeldung im Browser.“ und der Knopf „Im Browser öffnen“", d.titel === "Bitte öffnen Sie die Anmeldung im Browser." && d.linkText === "Im Browser öffnen" && d.linkSichtbar, JSON.stringify([d.titel, d.linkText]));
      const soll = "ext://" + c.browserBasis;
      ok(N + "?app=1 (" + zugangName + "): die Adresse des Knopfes ist ext:// + dieselbe Seite ohne app=1 (" + soll + "), ohne target", d.href === soll && !/app=1/.test(d.href) && d.target === null && d.href.startsWith(c.uebergabePraefix || "ext://http"), String(d.href));
      ok(N + "?app=1 (" + zugangName + "): die früheren Hinweise für die App (Start-Hinweis, Link im Seitenkopf) gibt es nicht mehr; kein Querscrollen", !d.apphinweis && !d.querScroll);
      if (zugangName === "mit Prüfwert") {
        await c.axe(page, N + "Übergabe (390)");
        if (c.foto) await c.foto(page, "app-uebergabe-390-de.png", { fullPage: false });
      }
      await page.close();
    }
    // mit code in der Adresse: der Code bleibt im Link zum Browser; ohne app=1
    c.setzeZugang([c.testPruefwert]);
    {
      const page = await c.oeffne(MOBIL, "uebergabe-mit-code", { abfrage: "?app=1&code=" + encodeURIComponent(code) });
      const href = await page.$eval('a[data-aktion="im-browser-oeffnen"]', (a) => a.getAttribute("href"));
      ok(N + "?app=1&code=…: die Adresse des Knopfes behält code, lässt app=1 weg (ext://…?code=" + codeNorm.slice(0, 4) + "…)", href === "ext://" + c.browserBasis + "?code=" + encodeURIComponent(code), href);
      const schritt = (await zustand(page)).schritt;
      ok(N + "?app=1&code=…: auch mit gültigem Code läuft der Assistent in der App nicht (nur die Übergabe)", schritt === "uebergabe", schritt);
      await page.close();
      const p2 = await c.oeffne(MOBIL, "uebergabe-andere-parameter", { abfrage: "?foo=1&app=1" });
      const href2 = await p2.$eval('a[data-aktion="im-browser-oeffnen"]', (a) => a.getAttribute("href"));
      ok(N + "?foo=1&app=1: andere Angaben bleiben im Link zum Browser, app=1 fällt weg", href2 === "ext://" + c.browserBasis + "?foo=1", href2);
      await p2.close();
    }
    // Sprache wählen auf der Übergabe
    {
      const page = await c.oeffne(MOBIL, "uebergabe-sprache", { abfrage: "?app=1" });
      await page.click('[data-anm-sprachleiste] [data-sprache="tr"]');
      await page.waitForFunction(() => document.getElementById("anmeldung").getAttribute("data-sprache") === "tr", { timeout: 6000 });
      const tr = await page.evaluate(() => ({ titel: document.querySelector(".anm-titel").textContent, knopf: document.querySelector('a[data-aktion="im-browser-oeffnen"]').textContent.trim(), schritt: document.getElementById("anmeldung").dataset.schritt }));
      ok(N + "Übergabe: die Sprachwahl oben wirkt (Türkisch: „Lütfen kayıt sayfasını tarayıcıda açın.“ und „Tarayıcıda aç“)", tr.schritt === "uebergabe" && tr.titel === "Lütfen kayıt sayfasını tarayıcıda açın." && tr.knopf === "Tarayıcıda aç", JSON.stringify(tr));
      await page.close();
    }
  } finally {
    c.setzeZugang([]);
  }
}

// ---------- Hinweis zur Umgebung (Rahmen, Browser anderer Apps) ----------

const ohneSteuer = (s) => String(s).replace(/[⁠⁦-⁩‎‏‪-‮]/g, "").replace(/ /g, " ").replace(/\s+/g, " ").trim();

// Der Hinweiskasten oben auf dem ersten Bildschirm: seite ist eine Seite oder ein Frame (beide haben evaluate).
async function hinweisZustand(seite) {
  return seite.evaluate(() => {
    const ohne = (s) => s.replace(/[⁠⁦-⁩‎‏‪-‮]/g, "").replace(/ /g, " ").replace(/\s+/g, " ").trim();
    const w = document.getElementById("anmeldung");
    const k = document.querySelector("[data-anm-umgebungshinweis]");
    const link = k && k.querySelector('a[data-aktion="neues-fenster"]');
    const titel = w.querySelector(".anm-titel");
    const r = (e) => e.getBoundingClientRect();
    return {
      schritt: w.dataset.schritt,
      vorhanden: !!k,
      sichtbar: !!k && k.checkVisibility(),
      art: k ? k.getAttribute("data-art") : null,
      absaetze: k ? Array.from(k.querySelectorAll("p")).map((p) => ohne(p.textContent)) : [],
      lang: k ? k.getAttribute("lang") : null,
      dir: k ? k.getAttribute("dir") : null,
      rolle: k ? k.getAttribute("role") : null,
      link: link ? { href: link.getAttribute("href"), target: link.getAttribute("target"), rel: link.getAttribute("rel"), text: ohne(link.textContent) } : null,
      kastenOben: k && k.checkVisibility() ? Math.round(r(k).top) : null,
      kastenUnten: k && k.checkVisibility() ? Math.round(r(k).bottom) : null,
      titelOben: titel ? Math.round(r(titel).top) : null,
      hoehe: window.innerHeight,
      querScroll: document.documentElement.scrollWidth > window.innerWidth,
      eingabeDa: !!w.querySelector('[data-pfad="zugang.code"]'),
    };
  });
}

export async function pruefeUmgebungshinweisImBrowser(c) {
  const ok = c.ok;
  const N = c.name + ": ";
  console.log("\n=== P1 Zusätze: Hinweis oben auf dem ersten Bildschirm (Rahmen, Browser anderer Apps) – " + c.name + " ===");
  const code = c.testCode;
  const codeNorm = code.replace(/[\s-]/g, "").toUpperCase();
  const T = (await c.woerterbuch("de")).umgebung;
  const inAppSoll = [ohneSteuer(T.inApp), ohneSteuer(T.inAppSo)];
  const rahmenSoll = ohneSteuer(T.rahmen + " " + T.rahmenLink);
  const ersterSchritt = { an: "code", aus: "start" };
  try {
    // ---- A. Oben, normaler Browser: kein Hinweis (mit und ohne Code-Abfrage) ----
    for (const [zugang, art] of [[[c.testPruefwert], "an"], [[], "aus"]]) {
      c.setzeZugang(zugang);
      const page = await c.oeffne(MOBIL, "umgebung-oben");
      const z = await hinweisZustand(page);
      ok(N + "oben (kein Rahmen, normaler Browser), Code-Abfrage " + art + ": erster Bildschirm „" + ersterSchritt[art] + "“, der Hinweiskasten ist verborgen und leer", z.schritt === ersterSchritt[art] && z.vorhanden && !z.sichtbar && z.absaetze.length === 0 && z.art === null, JSON.stringify({ schritt: z.schritt, sichtbar: z.sichtbar, art: z.art }));
      await page.close();
    }

    // ---- B. Im fremden Rahmen (andere Herkunft, ohne allow-Angaben wie die Hülle der Website) ----
    c.setzeZugang([c.testPruefwert]);
    {
      const h = await c.huelle(MOBIL, "umgebung-rahmen");
      const z = await hinweisZustand(h.rahmen);
      ok(N + "im Rahmen, Code-Abfrage an: erster Bildschirm „code“, der Hinweiskasten steht sichtbar oben (Art „rahmen“)", z.schritt === "code" && z.sichtbar && z.art === "rahmen" && z.rolle === "note", JSON.stringify({ schritt: z.schritt, sichtbar: z.sichtbar, art: z.art }));
      ok(N + "im Rahmen: Text „Hier klappt das Speichern vielleicht nicht.“ und der Link „In neuem Fenster öffnen“", z.absaetze.length === 1 && z.absaetze[0] === rahmenSoll && !!z.link && z.link.text === ohneSteuer(T.rahmenLink), JSON.stringify(z.absaetze));
      ok(N + "im Rahmen: der Link öffnet ein neues Fenster (target=_blank, rel=noopener) auf dieselbe Adresse (" + c.browserBasis + ")", !!z.link && z.link.target === "_blank" && /noopener/.test(z.link.rel || "") && z.link.href === c.browserBasis, JSON.stringify(z.link));
      ok(N + "im Rahmen: der Kasten liegt über dem Titel und im ersten Bildschirm (390 x 844), kein Querscrollen; die Code-Seite bleibt bedienbar (Feld da)", z.kastenOben !== null && z.kastenOben < z.titelOben && z.kastenUnten <= z.hoehe && !z.querScroll && z.eingabeDa, JSON.stringify({ kastenOben: z.kastenOben, kastenUnten: z.kastenUnten, titelOben: z.titelOben }));
      if (c.foto) await c.foto(h.aussen, "rahmen-hinweis-390-de.png", { fullPage: false });
      await c.axe(h.rahmen, N + "Code-Seite im Rahmen mit Hinweis (390)");
      if (c.neuesFensterOeffnen) {
        // Der Klick öffnet wirklich ein neues Fenster mit der Seite des Assistenten; dort, oben, gibt es den Hinweis nicht
        const neu = new Promise((fertig) => h.aussen.once("popup", fertig));
        await h.rahmen.click('a[data-aktion="neues-fenster"]');
        const popup = await Promise.race([neu, warte(8000).then(() => null)]);
        ok(N + "im Rahmen: der Klick auf „In neuem Fenster öffnen“ öffnet ein neues Fenster (die Seite im Rahmen bleibt offen)", !!popup && (await h.rahmen.evaluate(() => document.getElementById("anmeldung").dataset.schritt)) === "code");
        if (popup) {
          await popup.waitForSelector("#anmeldung[data-bereit]", { timeout: 10000 }).catch(() => {});
          const pz = await hinweisZustand(popup).catch(() => null);
          ok(N + "im neuen Fenster läuft der Assistent oben (kein Rahmen): erster Bildschirm „code“, kein Hinweiskasten", !!pz && pz.schritt === "code" && !pz.sichtbar && pz.absaetze.length === 0 && popup.url() === c.browserBasis, popup.url());
          await popup.close();
        }
      }
      // Sprache im Rahmen wechseln: der Hinweis folgt
      await h.rahmen.click('[data-anm-sprachleiste] [data-sprache="tr"]');
      await h.rahmen.waitForFunction(() => document.getElementById("anmeldung").getAttribute("data-sprache") === "tr", { timeout: 6000 });
      const tr = await hinweisZustand(h.rahmen);
      const Ttr = (await c.woerterbuch("tr")).umgebung;
      ok(N + "im Rahmen: nach dem Wechsel auf Türkisch steht der Hinweis auf Türkisch („" + ohneSteuer(Ttr.rahmenLink) + "“)", tr.absaetze[0] === ohneSteuer(Ttr.rahmen + " " + Ttr.rahmenLink) && tr.lang === "tr", JSON.stringify(tr.absaetze));
      await h.rahmen.click('[data-anm-sprachleiste] [data-sprache="de"]');
      await h.rahmen.waitForFunction(() => document.getElementById("anmeldung").getAttribute("data-sprache") === "de", { timeout: 6000 });
      // Code im Rahmen eingeben: der Startschritt zeigt den Hinweis weiter, der Link trägt jetzt den Code; auf den Fragen ist er weg
      await h.rahmen.focus('[data-pfad="zugang.code"]');
      await h.aussen.keyboard.type(code);
      await h.rahmen.click('#anmeldung [data-aktion="weiter"]');
      await h.rahmen.waitForFunction(() => document.getElementById("anmeldung").dataset.schritt === "start", { timeout: 8000 });
      const start = await hinweisZustand(h.rahmen);
      ok(N + "im Rahmen: nach dem richtigen Code zeigt der Startschritt den Hinweis weiter, der Link trägt jetzt den Code (…?code=" + codeNorm.slice(0, 4) + "…)", start.schritt === "start" && start.sichtbar && start.art === "rahmen" && !!start.link && start.link.href === c.browserBasis + "?code=" + codeNorm && start.link.target === "_blank", JSON.stringify(start.link));
      await h.rahmen.click('#anmeldung [data-aktion="weiter"]');
      await h.rahmen.waitForFunction(() => document.getElementById("anmeldung").dataset.schritt === "wer", { timeout: 6000 });
      const wer = await hinweisZustand(h.rahmen);
      ok(N + "im Rahmen: auf den Fragen („wer“) steht kein Hinweis mehr; der Assistent lief im Rahmen weiter", wer.schritt === "wer" && !wer.sichtbar && wer.absaetze.length === 0);
      await h.schliessen();
    }
    // Link mit gültigem Code im Rahmen: erster Bildschirm „start“, der Link trägt den Code aus der Adresse
    {
      const h = await c.huelle(MOBIL, "umgebung-rahmen-link", { abfrage: "?code=" + encodeURIComponent(code) });
      const z = await hinweisZustand(h.rahmen);
      ok(N + "im Rahmen, Link mit gültigem ?code=: Startschritt mit Hinweis, der Link zum neuen Fenster behält ?code= (wie in der Adresse)", z.schritt === "start" && z.sichtbar && z.art === "rahmen" && !!z.link && z.link.href === c.browserBasis + "?code=" + encodeURIComponent(code), JSON.stringify(z.link));
      await h.schliessen();
    }
    // Ohne Code-Abfrage: der Startschritt im Rahmen zeigt den Hinweis
    c.setzeZugang([]);
    {
      const h = await c.huelle(MOBIL, "umgebung-rahmen-start");
      const z = await hinweisZustand(h.rahmen);
      ok(N + "im Rahmen, Code-Abfrage aus: der Startschritt zeigt den Hinweis (oben, über dem Titel)", z.schritt === "start" && z.sichtbar && z.art === "rahmen" && z.kastenOben < z.titelOben, JSON.stringify({ schritt: z.schritt, art: z.art }));
      await h.schliessen();
    }
    // Rahmen und Browser einer anderen App zugleich: der Hinweis zur App gewinnt
    {
      const h = await c.huelle(MOBIL, "umgebung-rahmen-inapp", { vorLaden: async (p) => p.setUserAgent(uaVon("Facebook (iPhone)")) });
      const z = await hinweisZustand(h.rahmen);
      ok(N + "Rahmen und Browser einer anderen App zugleich: der Hinweis zur App gewinnt (Art „inapp“, kein Link zum neuen Fenster)", z.sichtbar && z.art === "inapp" && z.link === null, JSON.stringify({ art: z.art, link: z.link }));
      await h.schliessen();
    }

    // ---- C. Browser anderer Apps (User-Agent) ----
    for (const [zugang, art] of [[[c.testPruefwert], "an"], [[], "aus"]]) {
      c.setzeZugang(zugang);
      for (const name of ["Facebook (iPhone)", "Instagram (Android, WebView)", "Android-WebView einer beliebigen App", "Snapchat (iPhone)"]) {
        const page = await c.oeffne(MOBIL, "umgebung-inapp", { vorLaden: async (p) => p.setUserAgent(uaVon(name)) });
        const z = await hinweisZustand(page);
        ok(N + name + ", Code-Abfrage " + art + ": erster Bildschirm „" + ersterSchritt[art] + "“, oben der Hinweis zum Browser (Art „inapp“) mit der Bitte und der Anleitung, ohne Link",
          z.schritt === ersterSchritt[art] && z.sichtbar && z.art === "inapp" && JSON.stringify(z.absaetze) === JSON.stringify(inAppSoll) && z.link === null, JSON.stringify({ schritt: z.schritt, art: z.art, absaetze: z.absaetze.length }));
        if (name === "Facebook (iPhone)" && art === "an") {
          ok(N + "In-App-Browser: der Kasten liegt über dem Titel und im ersten Bildschirm (390 x 844), kein Querscrollen; Feld und Knopf der Code-Seite sind da", z.kastenOben < z.titelOben && z.kastenUnten <= z.hoehe && !z.querScroll && z.eingabeDa, JSON.stringify({ kastenOben: z.kastenOben, kastenUnten: z.kastenUnten, titelOben: z.titelOben }));
          if (c.foto) await c.foto(page, "inapp-hinweis-390-de.png", { fullPage: false });
          await c.axe(page, N + "Code-Seite im Browser einer anderen App mit Hinweis (390)");
          // Der Assistent bleibt bedienbar: Code eintippen, weiter, Startschritt mit Hinweis, weiter zu den Fragen (Hinweis weg)
          await page.focus('[data-pfad="zugang.code"]');
          await page.keyboard.type(code);
          await page.click('#anmeldung [data-aktion="weiter"]');
          await page.waitForFunction(() => document.getElementById("anmeldung").dataset.schritt === "start", { timeout: 8000 });
          const start = await hinweisZustand(page);
          ok(N + "In-App-Browser: der Assistent bleibt bedienbar – nach dem Code erscheint der Startschritt, der Hinweis bleibt dort stehen", start.schritt === "start" && start.sichtbar && start.art === "inapp");
          await page.click('#anmeldung [data-aktion="weiter"]');
          await page.waitForFunction(() => document.getElementById("anmeldung").dataset.schritt === "wer", { timeout: 6000 });
          const wer = await hinweisZustand(page);
          ok(N + "In-App-Browser: auf den Fragen („wer“) steht der Hinweis nicht mehr", wer.schritt === "wer" && !wer.sichtbar && wer.absaetze.length === 0);
        }
        await page.close();
      }
    }
    // Normale Browser: kein Hinweis
    c.setzeZugang([c.testPruefwert]);
    for (const name of ["Safari (iPhone)", "Chrome (Android; so melden sich auch Chrome Custom Tabs, ohne „wv“)", "Firefox (Android)", "Edge (Android)", "Samsung Internet"]) {
      const page = await c.oeffne(MOBIL, "umgebung-normal", { vorLaden: async (p) => p.setUserAgent(uaVon(name)) });
      const z = await hinweisZustand(page);
      ok(N + name + ": normaler Browser, kein Hinweis", z.schritt === "code" && !z.sichtbar && z.absaetze.length === 0 && z.art === null);
      await page.close();
    }
    // Die App-Weiche hat Vorrang: In der App steht nur die Übergabe, nie der Hinweis (auch nicht mit der Kennung einer WebView)
    {
      const page = await c.oeffne(MOBIL, "umgebung-app", { abfrage: "?app=1", vorLaden: async (p) => p.setUserAgent(uaVon("Android-WebView einer beliebigen App")) });
      const z = await hinweisZustand(page);
      ok(N + "?app=1 mit der Kennung einer Android-WebView: nur die Übergabe („uebergabe“), der Hinweiskasten bleibt verborgen und leer", z.schritt === "uebergabe" && !z.sichtbar && z.absaetze.length === 0 && z.art === null, JSON.stringify({ schritt: z.schritt, sichtbar: z.sichtbar }));
      await page.close();
      const h = await c.huelle(MOBIL, "umgebung-app-rahmen", { abfrage: "?app=1" });
      const zr = await hinweisZustand(h.rahmen);
      ok(N + "?app=1 im Rahmen: nur die Übergabe, kein Hinweiskasten", zr.schritt === "uebergabe" && !zr.sichtbar && zr.absaetze.length === 0);
      await h.schliessen();
    }
  } finally {
    c.setzeZugang([]);
  }
}

// Die Hinweise in allen Sprachen der Seite: Text aus dem Wörterbuch der Sprache, Schreibrichtung (Arabisch von rechts nach links), Fotos.
export async function pruefeUmgebungshinweisSprachen(c) {
  const ok = c.ok;
  const N = c.name + ": ";
  console.log("\n=== P1 Zusätze: Hinweis zur Umgebung in jeder Sprache – " + c.name + " ===");
  c.setzeZugang([c.testPruefwert]);
  try {
    for (const code of c.sprachen) {
      const rtl = code === "ar";
      const T = (await c.woerterbuch(code)).umgebung;
      const kennung = N + "Sprache " + code + ": ";
      const wechsle = async (seite) => {
        if (code === "de") return;
        await seite.click('[data-anm-sprachleiste] [data-sprache="' + code + '"]');
        await seite.waitForFunction((x) => document.getElementById("anmeldung").getAttribute("data-sprache") === x, { timeout: 8000 }, code);
      };
      // Browser einer anderen App
      const page = await c.oeffne(MOBIL, "umgebung-inapp-" + code, { vorLaden: async (p) => p.setUserAgent(uaVon("Instagram (iPhone)")) });
      await wechsle(page);
      const z = await hinweisZustand(page);
      ok(kennung + "Browser einer anderen App: Bitte und Anleitung stehen in der Sprache (Texte aus dem Wörterbuch), Schreibrichtung " + (rtl ? "rtl" : "ltr"), z.sichtbar && z.art === "inapp" && JSON.stringify(z.absaetze) === JSON.stringify([ohneSteuer(T.inApp), ohneSteuer(T.inAppSo)]) && z.lang === code && z.dir === (rtl ? "rtl" : "ltr") && !z.querScroll, JSON.stringify(z.absaetze));
      if (code !== "de") ok(kennung + "die Texte sind übersetzt (nicht der deutsche Wortlaut)", !/Bitte öffnen Sie|Tippen Sie oben/.test(z.absaetze.join(" ")));
      if (c.foto) await c.foto(page, "inapp-hinweis-390-" + code + ".png", { fullPage: false });
      await page.close();
      // Rahmen
      const h = await c.huelle(MOBIL, "umgebung-rahmen-" + code);
      await wechsle(h.rahmen);
      const zr = await hinweisZustand(h.rahmen);
      ok(kennung + "Rahmen: Text und Link „" + ohneSteuer(T.rahmenLink) + "“ stehen in der Sprache, Schreibrichtung " + (rtl ? "rtl" : "ltr"), zr.sichtbar && zr.art === "rahmen" && zr.absaetze[0] === ohneSteuer(T.rahmen + " " + T.rahmenLink) && !!zr.link && zr.link.text === ohneSteuer(T.rahmenLink) && zr.lang === code && zr.dir === (rtl ? "rtl" : "ltr") && zr.link.target === "_blank", JSON.stringify(zr.absaetze));
      if (c.foto) await c.foto(h.aussen, "rahmen-hinweis-390-" + code + ".png", { fullPage: false });
      await h.schliessen();
    }
  } finally {
    c.setzeZugang([]);
  }
}
