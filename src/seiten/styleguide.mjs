// Gestaltungssystem „Speuzer Blau-Weiß“ – interner Anhang für das Übernahmepaket.
// Zeigt alle Tokens aus assets/css/tokens.css: Farben mit Hex und gemessenem
// Kontrast (Werte aus dem Plan, Abschnitt 2.1), Schriftskala, Abstände, Radien,
// Schatten, Knöpfe, Fokuszustand, Wappen in drei Varianten auf hell/dunkel.

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function liesWappen(datei) {
  return readFileSync(path.join(ROOT, "assets", "logo", datei), "utf8");
}

const FARBEN = [
  { token: "--blau-950", hex: "#0B0E4A", verwendung: "Fußbereich, dunkle Flächen", kontrast: "Weiß darauf 17,2:1", textHell: true },
  { token: "--blau-900", hex: "#151A7A", verwendung: "Kopfleiste, Überschriften auf Weiß", kontrast: "auf Weiß 14,4:1", textHell: true },
  { token: "--blau-800", hex: "#191793", verwendung: "Primärflächen (App-Hauptfarbe)", kontrast: "Weiß darauf 13,3:1", textHell: true },
  { token: "--blau-700", hex: "#1F2DBE", verwendung: "Primärknopf, Links", kontrast: "auf Weiß 9,7:1, auf --bg 8,9:1", textHell: true },
  { token: "--blau-600", hex: "#2A3BDD", verwendung: "Hover Knopf/Link", kontrast: "auf Weiß 7,6:1", textHell: true },
  { token: "--blau-500", hex: "#3D4FEA", verwendung: "Fokusrahmen, Akzentlinien", kontrast: "auf Weiß 6,0:1 (nur Rahmen/Grafik, nicht Fließtext)", textHell: true },
  { token: "--blau-100", hex: "#E4E7FA", verwendung: "helle Kacheln, Tags", kontrast: "Tinte darauf 14,7:1", textHell: false },
  { token: "--blau-50", hex: "#F3F5FC", verwendung: "Sektionshintergrund", kontrast: "–", textHell: false },
  { token: "--ink", hex: "#12142B", verwendung: "Fließtext", kontrast: "auf Weiß 18,1:1", textHell: true },
  { token: "--ink-2", hex: "#3F4360", verwendung: "Nebentext", kontrast: "auf Weiß 9,6:1", textHell: true },
  { token: "--ink-3", hex: "#5B6079", verwendung: "Meta (Datum, Quelle)", kontrast: "auf Weiß 6,2:1, auf --bg 5,7:1", textHell: true },
  { token: "--line", hex: "#D8DBEA", verwendung: "Trennlinien, Tabellenlinien", kontrast: "–", textHell: false },
  { token: "--bg", hex: "#F5F6FB", verwendung: "Seitenhintergrund", kontrast: "–", textHell: false },
  { token: "--surface / --weiss", hex: "#FFFFFF", verwendung: "Karten / Text auf Blau", kontrast: "–", textHell: false },
  { token: "--ok", hex: "#1E6B3A", verwendung: "Heimspiel-Tag (nur Text)", kontrast: "auf Weiß 6,5:1", textHell: true },
  { token: "--warn", hex: "#8A4B00", verwendung: "offene Angabe (nur Text)", kontrast: "auf Weiß 6,9:1", textHell: true },
  { token: "--wappen", hex: "#0300FD", verwendung: "nur im Logo selbst", kontrast: "–", textHell: true },
];

const SCHRIFTGROESSEN = [
  { token: "--fs-xs", wert: ".8rem" },
  { token: "--fs-sm", wert: ".9rem" },
  { token: "--fs-md", wert: "1rem" },
  { token: "--fs-lg", wert: "1.25rem" },
  { token: "--fs-xl", wert: "1.5625rem" },
  { token: "--fs-2xl", wert: "1.953rem" },
  { token: "--fs-3xl", wert: "2.441rem" },
  { token: "--fs-4xl", wert: "clamp(2.4rem, 5vw, 3.6rem)" },
];

const ABSTAENDE = [
  ["--sp-1", "4px"], ["--sp-2", "8px"], ["--sp-3", "12px"], ["--sp-4", "16px"],
  ["--sp-5", "24px"], ["--sp-6", "32px"], ["--sp-7", "48px"], ["--sp-8", "64px"], ["--sp-9", "96px"],
];

const RADIEN = [
  ["--r-sm", "6px"], ["--r-md", "12px"], ["--r-lg", "20px"], ["--r-pill", "999px"],
];

function seiteFarben() {
  return `<h2>Farben</h2>
<p class="inhalt">Ein Blauklang aus dem Wappen (Hue 240) plus neutrale Tinte. Kein Rot, kein Gelb, kein dekoratives Grau. Kontrastwerte nach WCAG-Formel, siehe Plan Abschnitt 2.1.</p>
<div class="sg-farbraster" role="list">
${FARBEN.map((f) => `  <div class="sg-farbe" role="listitem" style="background:${f.hex};color:${f.textHell ? "#FFFFFF" : "#12142B"}">
    <strong>${f.token}</strong>
    <span>${f.hex}</span>
    <span class="sg-klein">${f.verwendung}</span>
    <span class="sg-klein">${f.kontrast}</span>
  </div>`).join("\n")}
</div>`;
}

function seiteSchrift() {
  return `<h2>Schrift</h2>
<p class="inhalt">Überschriften, Zahlen und Ergebnisse in Barlow Condensed (600/700), Fließtext und Bedienung in Inter (400/600). Beide Schriften selbst gehostet als woff2.</p>
<div class="sg-schriftskala">
${SCHRIFTGROESSEN.map((s) => `  <p style="font-size:var(${s.token});font-family:var(--font-head);line-height:var(--lh-head);margin:0;">${s.token} — ${s.wert}</p>`).join("\n")}
</div>
<p style="font-family:var(--font-text);font-size:var(--fs-md);max-width:var(--measure);">Fließtext-Beispiel in Inter: Zeilenlänge maximal 65 Zeichen (--measure), Zeilenhöhe 1,55 für gute Lesbarkeit auf allen Bildschirmgrößen.</p>`;
}

function seiteAbstaendeRadienSchatten() {
  return `<h2>Abstände, Radien, Schatten</h2>
<div class="sg-abstaende">
${ABSTAENDE.map(([tok, wert]) => `  <div class="sg-abstand"><div class="sg-abstand__balken" style="width:var(${tok})"></div><span>${tok} (${wert})</span></div>`).join("\n")}
</div>
<div class="sg-radien">
${RADIEN.map(([tok, wert]) => `  <div class="sg-radius" style="border-radius:var(${tok})"><span>${tok} ${wert}</span></div>`).join("\n")}
</div>
<div class="sg-schatten">
  <div class="sg-schatten__box" style="box-shadow:var(--sh-1)"><span>--sh-1</span></div>
  <div class="sg-schatten__box" style="box-shadow:var(--sh-2)"><span>--sh-2</span></div>
</div>`;
}

function seiteKnoepfeFokus() {
  return `<h2>Knöpfe und Fokuszustand</h2>
<p class="inhalt">Mindesthöhe 44 px. Mit der Tabulatortaste erreichbar; der sichtbare Fokusrahmen (3 px, --blau-500) erscheint beim Draufspringen.</p>
<p>
  <a class="knopf" href="#inhalt">Primärknopf</a>
  <a class="knopf knopf--sekundaer" href="#inhalt">Sekundärknopf</a>
</p>
<p>Zum Testen des Fokusrahmens mit der Tabulatortaste zu diesem Link springen: <a href="#inhalt">Beispiellink</a></p>`;
}

function seiteWappen() {
  const wappenCurrentColor = liesWappen("wappen.svg");
  const wappenBlau = liesWappen("wappen-blau.svg");
  const wappenWeiss = liesWappen("wappen-weiss.svg");
  return `<h2>Wappen</h2>
<p class="inhalt">Aus der Vektorquelle (CorelDRAW-EPS) neu aufgerichtet: die Raute steht mit der Spitze nach oben, der Schriftzug „F.F.V. SPORTFREUNDE E.V. 1904“ ist waagerecht lesbar. Drei Varianten: einfärbbar (currentColor), fest Blau, fest Weiß.</p>
<div class="sg-wappen-raster">
  <div class="sg-wappen-zelle sg-wappen-zelle--hell" style="color:#0300FD">
    ${wappenCurrentColor}
    <span>wappen.svg (currentColor) auf hell</span>
  </div>
  <div class="sg-wappen-zelle sg-wappen-zelle--dunkel" style="color:#FFFFFF">
    ${wappenCurrentColor}
    <span>wappen.svg (currentColor) auf dunkel</span>
  </div>
  <div class="sg-wappen-zelle sg-wappen-zelle--hell">
    ${wappenBlau}
    <span>wappen-blau.svg</span>
  </div>
  <div class="sg-wappen-zelle sg-wappen-zelle--dunkel">
    ${wappenWeiss}
    <span>wappen-weiss.svg</span>
  </div>
</div>`;
}

export function seite(daten) {
  const inhalt = `
<section class="container sg">
  <h1>Gestaltungssystem „Speuzer Blau-Weiß“</h1>
  <p class="inhalt">Interner Anhang für das Übernahmepaket: alle Tokens aus assets/css/tokens.css, sichtbar gemacht. Stand des Builds: ${daten.stand}.</p>
  ${seiteFarben()}
  ${seiteSchrift()}
  ${seiteAbstaendeRadienSchatten()}
  ${seiteKnoepfeFokus()}
  ${seiteWappen()}
</section>
<style>
  .sg-farbraster { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: var(--sp-3); margin-block: var(--sp-4); }
  .sg-farbe { padding: var(--sp-4); border-radius: var(--r-md); display: flex; flex-direction: column; gap: var(--sp-1); }
  .sg-klein { font-size: var(--fs-xs); opacity: .9; }
  .sg-schriftskala { display: flex; flex-direction: column; gap: var(--sp-3); margin-block: var(--sp-4); }
  .sg-abstaende { display: flex; flex-direction: column; gap: var(--sp-2); margin-block: var(--sp-4); }
  .sg-abstand { display: flex; align-items: center; gap: var(--sp-3); }
  .sg-abstand__balken { height: var(--sp-3); background: var(--blau-500); }
  .sg-radien { display: flex; flex-wrap: wrap; gap: var(--sp-4); margin-block: var(--sp-4); }
  .sg-radius { width: 96px; height: 64px; background: var(--blau-100); display: flex; align-items: center; justify-content: center; text-align: center; font-size: var(--fs-xs); }
  .sg-schatten { display: flex; gap: var(--sp-6); margin-block: var(--sp-4); }
  .sg-schatten__box { width: 140px; height: 90px; background: var(--surface); display: flex; align-items: center; justify-content: center; border-radius: var(--r-md); }
  .sg-wappen-raster { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: var(--sp-4); margin-block: var(--sp-4); }
  .sg-wappen-zelle { padding: var(--sp-4); border-radius: var(--r-md); display: flex; flex-direction: column; align-items: center; gap: var(--sp-2); text-align: center; font-size: var(--fs-xs); }
  .sg-wappen-zelle svg { width: 96px; height: auto; }
  .sg-wappen-zelle--hell { background: var(--surface); border: 1px solid var(--line); color: var(--ink); }
  .sg-wappen-zelle--dunkel { background: var(--blau-900); color: var(--weiss); }
</style>
`;

  return {
    url: "/styleguide/",
    title: "Gestaltungssystem",
    description:
      "Interner Anhang: alle Gestaltungs-Tokens des Prototyps – Farben, Schrift, Abstände, Radien, Schatten, Knöpfe, Fokuszustand und Wappen.",
    inhalt,
  };
}
