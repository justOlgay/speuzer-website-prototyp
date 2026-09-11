// Bild-Baustein (P1) – erzeugt ein <picture> aus den von tools/bilder.py
// erzeugten Varianten (AVIF/WebP/JPEG, Breiten 480/960/1440, siehe
// data/bilder.json). name = Dateiname ohne Endung aus assets/bilder/quelle/.

export function bild({ pfad, daten, name, alt, sizes = "100vw", klasse = "", eager = false }) {
  const eintrag = daten.bilder?.[name];
  if (!eintrag) {
    throw new Error(`bild(): kein Eintrag für "${name}" in data/bilder.json – tools/bilder.py ausgeführt?`);
  }

  const breiten = Object.keys(eintrag.varianten)
    .map(Number)
    .sort((a, b) => a - b);
  const basis = `${pfad}assets/bilder/erzeugt/`;

  const srcset = (endung) =>
    breiten.map((b) => `${basis}${eintrag.varianten[String(b)][endung]} ${b}w`).join(", ");

  const fallbackBreite = eintrag.varianten["960"] ? "960" : String(breiten[breiten.length - 1]);
  const hauptbild = `${basis}${eintrag.varianten[fallbackBreite].jpg}`;
  const klasseAttr = klasse ? ` class="${klasse}"` : "";

  return `<picture${klasseAttr}>
  <source type="image/avif" srcset="${srcset("avif")}" sizes="${sizes}">
  <source type="image/webp" srcset="${srcset("webp")}" sizes="${sizes}">
  <img src="${hauptbild}" srcset="${srcset("jpg")}" sizes="${sizes}" width="${eintrag.breite}" height="${eintrag.hoehe}" alt="${alt ?? ""}" loading="${eager ? "eager" : "lazy"}" decoding="async">
</picture>`;
}
