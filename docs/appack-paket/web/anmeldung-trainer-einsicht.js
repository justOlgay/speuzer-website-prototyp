const RUECKFALL = "dem Vorstand";

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

export function einsichtAnzahl(konfig) {
  return personenAus(konfig).length;
}
