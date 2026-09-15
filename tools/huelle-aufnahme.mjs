#!/usr/bin/env node
// Speuzer Website Prototyp – Hilfslogik für Screenshots aus der appack-Hülle
// (P18, Schritt 2, aus tools/vergleich.mjs ausgelagert). Kapselt den festen
// Ablauf, mit dem eine Besucherin über die Hülle (docs/index.html) zu einem
// bestimmten Zustand gelangt: "/index.html" im gesetzten Viewport laden,
// warten bis #pageLoader entfernt ist, plus 1,6s (Textüberlagerung
// eingeblendet, siehe huelle.js/pruefeHuelle() in tools/pruefen.mjs), dann
// wahlweise den Burger öffnen, einen Menüpunkt anklicken (Leisten-Menü ab
// 1024px, sonst aufgeklapptes Burger-Menü) und/oder einen Link innerhalb des
// Inhaltsrahmens (#showFrame) anklicken. Nach jedem Rahmenwechsel (Menüpunkt
// oder Link im Rahmen) 2s warten. Screenshot und Seiten-/Browser-Lebenszyklus
// bleiben Sache der aufrufenden Skripte (tools/vergleich.mjs,
// tools/vorstand-pdf/bauen.mjs) – dieses Modul setzt nur den Viewport und
// navigiert/klickt.

const PORT = 4173;
const BASIS = `http://localhost:${PORT}`;

function warte(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function warteBisLoaderWeg(page) {
  await page
    .waitForFunction(() => !document.getElementById("pageLoader"), { timeout: 4000 })
    .catch(() => {});
}

// Leisten-Menü (ab 1024px sichtbar, .barMenu) – ein Klick lenkt #showFrame auf
// eine neue Seite um (Rahmenwechsel).
async function klickBarMenu(page, text) {
  const gefunden = await page.evaluate((text) => {
    const el = Array.from(document.querySelectorAll(".barMenu .menuBarElement")).find(
      (e) => e.textContent.trim() === text
    );
    if (!el) return false;
    el.click();
    return true;
  }, text);
  if (!gefunden) throw new Error(`.barMenu .menuBarElement mit Text "${text}" nicht gefunden`);
}

// Burger öffnen (unter 1024px, .burger) – kein Rahmenwechsel, nur das
// Menü-Panel wird eingeblendet.
async function klickBurgerOeffnen(page) {
  const gefunden = await page.evaluate(() => {
    const el = document.querySelector(".burger");
    if (!el) return false;
    el.click();
    return true;
  });
  if (!gefunden) throw new Error(".burger nicht gefunden");
  await warte(400); // Öffnen-Animation abwarten (wie screenshotHuelle() in tools/screenshots.mjs)
}

// Aufgeklapptes Burger-Menü (.burgerMenu .menuElement) – Klick lenkt
// #showFrame um (Rahmenwechsel) und schließt das Menü nach 150ms selbst
// (siehe huelle.js).
async function klickBurgerMenu(page, text) {
  const gefunden = await page.evaluate((text) => {
    const el = Array.from(document.querySelectorAll(".burgerMenu .menuElement")).find(
      (e) => e.textContent.trim() === text
    );
    if (!el) return false;
    el.click();
    return true;
  }, text);
  if (!gefunden) throw new Error(`.burgerMenu .menuElement mit Text "${text}" nicht gefunden`);
}

// Link innerhalb des Inhaltsrahmens (#showFrame, Frame-URL enthält "/ws/")
// anklicken – Rahmenwechsel auf eine andere Workspace-Seite. Präfix-Selektor
// (href^=), nicht exakt: manche Workspace-Seiten verlinken dieselbe Datei
// mehrfach mit Anker (z. B. "tabellen.html#herren", "tabellen.html#d1", …,
// siehe docs/ws/spielplan.html) – dann zählt der erste Treffer in
// Dokumentreihenfolge.
async function klickImRahmen(page, datei) {
  let frame = null;
  for (let versuch = 0; versuch < 30 && !frame; versuch++) {
    frame = page.frames().find((f) => f.url().includes("/ws/"));
    if (!frame) await warte(100);
  }
  if (!frame) throw new Error(`Kein Rahmen mit URL ".../ws/..." gefunden (Ziel: ${datei})`);

  const selektor = `a[href^="${datei}"]`;
  await frame.waitForSelector(selektor, { timeout: 5000 });
  const gefunden = await frame.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return false;
    el.click();
    return true;
  }, selektor);
  if (!gefunden) throw new Error(`Link '${selektor}' im Rahmen nicht gefunden`);
}

// ---------- Zusammengesetzter Ablauf ----------
//
// aufnahmeAusHuelle(page, { breite, hoehe, menue, imRahmen, burger })
//   breite, hoehe: Viewport in Pixeln (Pflicht). Bei breite === 390 wird
//     deviceScaleFactor 2 gesetzt (wie die vorher-*-handy-Bilder), sonst 1
//     (wie die vorher-*-desktop-Bilder) – siehe ursprünglicher Kommentar in
//     tools/vergleich.mjs.
//   burger: true öffnet zuerst den Burger (nötig unter 1024px, bevor ein
//     Menüpunkt oder nur das offene Menü selbst gezeigt werden soll).
//   menue: Text des Menüpunkts. Ohne burger wird er im Leisten-Menü
//     (.barMenu, ab 1024px) angeklickt, mit burger im aufgeklappten
//     Burger-Menü (.burgerMenu).
//   imRahmen: Dateiname eines Links innerhalb des Inhaltsrahmens (z. B.
//     "kontakt.html"), nach einem Menüpunkt-Klick anklickbar.
// Lässt die Seite im erreichten Zustand zurück; Screenshot und page.close()
// bleiben Sache der Aufrufenden.
export async function aufnahmeAusHuelle(page, { breite, hoehe, menue, imRahmen, burger } = {}) {
  const dpr = breite === 390 ? 2 : 1; // siehe Kommentar oben
  await page.setViewport({ width: breite, height: hoehe, deviceScaleFactor: dpr });
  await page.goto(BASIS + "/index.html", { waitUntil: "domcontentloaded", timeout: 30000 });
  await warteBisLoaderWeg(page);
  await warte(1600);

  if (burger) {
    await klickBurgerOeffnen(page); // kein Rahmenwechsel, wartet selbst
  }

  if (menue) {
    if (burger) {
      await klickBurgerMenu(page, menue);
    } else {
      await klickBarMenu(page, menue);
    }
    await warte(2000); // Rahmenwechsel
  }

  if (imRahmen) {
    await klickImRahmen(page, imRahmen);
    await warte(2000); // Rahmenwechsel
  }
}
