// Namensteil für die Einsichtnehmenden der Seite „Neu im Trainerteam“.
//
// Quelle: konfig.einsicht, eine Liste von { name, funktion } (Standardfall: genau ein Eintrag, die 1. Vorsitzende; die Liste
// bleibt erweiterbar, zum Beispiel um eine Vertretung, ohne dass Code geändert wird). Gemeinsame Quelle für die Bildschirme
// (trainer.js) und die PDF-Dateien (trainer-pdf.js), damit beide dasselbe sagen. Kein Name steht fest im Code.
//
// Die Sätze der Seite sind pronomenfrei („Das Zeugnis wird nur angeschaut …“): Hier wird nur der Namensteil gebildet, der für
// eine oder mehrere Personen gleich eingesetzt wird.
//   form "lang":  „A (Funktion)“ · „A (Funktion) oder B (Funktion)“ · „A (Funktion), B (Funktion) oder C (Funktion)“
//   form "kurz":  ohne Funktion: „A“ · „A oder B“ · „A, B oder C“
// Ohne Einträge (leere oder fehlende Liste) steht „dem Vorstand“; der Bau (tools/build.mjs) verlangt mindestens einen Eintrag,
// der Rückfall schützt nur die Anzeige.

const RUECKFALL = "dem Vorstand";

// Nur Einträge mit Namen; Leerraum entfernen.
function personenAus(konfig) {
  const liste = Array.isArray(konfig && konfig.einsicht) ? konfig.einsicht : [];
  return liste
    .map((p) => ({ name: String((p && p.name) ?? "").trim(), funktion: String((p && p.funktion) ?? "").trim() }))
    .filter((p) => p.name);
}

export function einsichtNamen(konfig, form = "lang") {
  const personen = personenAus(konfig);
  if (!personen.length) return RUECKFALL;
  const teile = personen.map((p) => (form === "lang" && p.funktion ? `${p.name} (${p.funktion})` : p.name));
  if (teile.length === 1) return teile[0];
  return teile.slice(0, -1).join(", ") + " oder " + teile[teile.length - 1];
}

// Wie viele Personen die Konfiguration nennt (für Tests und für Texte, die davon abhängen).
export function einsichtAnzahl(konfig) {
  return personenAus(konfig).length;
}
