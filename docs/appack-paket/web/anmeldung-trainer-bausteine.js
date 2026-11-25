import { h } from "./anmeldung-bausteine.js";
import { hole, setze, sauber } from "./anmeldung-hilfen.js";

export function karte(k, titel, ...inhalt) {
  const id = k.nextId("k");
  return h("section", { klasse: "anm-nachweis", "aria-labelledby": id }, h("h3", { klasse: "anm-zwischentitel", id }, titel), ...inhalt);
}

export function punktListe(liste) {
  return h("ul", { klasse: "anm-liste-punkte" }, liste.map((x) => h("li", {}, x)));
}

export function nummerierteListe(liste) {
  return h("ol", { klasse: "anm-naechste" }, liste.map((x) => h("li", {}, x)));
}

export function mitLink(text, link) {
  const teile = String(text).split("{link}");
  return teile.length === 2 ? [teile[0], link, teile[1]] : [text, " ", link];
}

export function nurVorlesen(text) {
  return h("span", { klasse: "tr-nur-vorlesen" }, text);
}

export function sichereUrl(adresse) {
  const a = sauber(adresse);
  if (!a) return "";
  if (/^https?:\/\//i.test(a)) return a;
  return /^[a-z][a-z0-9+.\-]*:/i.test(a) ? "" : a;
}

export function blattSinnbildUrl() {
  const zeilen = [70, 138, 150, 132, 150, 144, 100, 150, 126, 150, 140, 88]
    .map((breite, i) => `<rect x="30" y="${88 + i * 11}" width="${breite}" height="3.6" rx="1.8" fill="#C9CEE6"/>`)
    .join("");
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 210 297" aria-hidden="true">` +
    `<rect x=".75" y=".75" width="208.5" height="295.5" rx="5" fill="#FFFFFF" stroke="#D8DBEA" stroke-width="1.5"/>` +
    `<circle cx="42" cy="38" r="12" fill="#E4E7FA" stroke="#191793" stroke-width="2"/>` +
    `<rect x="126" y="30" width="54" height="4" rx="2" fill="#C9CEE6"/>` +
    `<rect x="30" y="66" width="150" height="5" rx="2.5" fill="#191793"/>` +
    zeilen +
    `<rect x="30" y="250" width="70" height="3" rx="1.5" fill="#5B6079"/>` +
    `<rect x="116" y="250" width="64" height="3" rx="1.5" fill="#5B6079"/>` +
    `</svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

export function auswahlFeld(k, { pfad, label, optionen }) {
  const id = k.nextId("r");
  const eintraege = optionen.map((o) => (typeof o === "string" ? { wert: o, label: o } : o));
  const auswahl = h("select", { id, name: pfad, "data-pfad": pfad, klasse: "anm-eingabe anm-eingabe--auswahl", "aria-required": "true" },
    h("option", { value: "" }, k.text("allgemein.bitteWaehlen")),
    eintraege.map((o) => h("option", { value: o.wert }, o.label)));
  auswahl.value = hole(k.a, pfad) || "";
  auswahl.addEventListener("change", () => {
    setze(k.a, pfad, auswahl.value);
    k.aenderung();
  });
  return h("div", { klasse: "anm-feld", "data-feld": pfad },
    h("label", { klasse: "anm-label", for: id }, label),
    h("p", { klasse: "anm-fehler", id: id + "-f", hidden: true }),
    auswahl);
}

export function dateiKnopf(k, { text, accept, aufnehmen, beiDatei, aktion }) {
  const id = k.nextId("u");
  const eingabe = h("input", {
    type: "file",
    id,
    accept: accept || "image/*",
    capture: aufnehmen ? "environment" : null,
    klasse: "anm-datei__eingabe",
    "data-aktion": aktion,
    "aria-label": text,
  });
  eingabe.addEventListener("change", () => {
    const datei = eingabe.files && eingabe.files[0];
    eingabe.value = "";
    if (datei) beiDatei(datei);
  });
  return h("label", { klasse: "knopf knopf--sekundaer anm-datei", for: id }, eingabe, h("span", { "aria-hidden": "true" }, text));
}

export function pflichtKaestchen(k, { pfad, label }) {
  const id = k.nextId("c");
  const eingabe = h("input", { type: "checkbox", id, name: pfad, "data-pfad": pfad, "aria-required": "true", klasse: "anm-karte__eingabe anm-karte__eingabe--kasten" });
  eingabe.checked = hole(k.a, pfad) === true;
  eingabe.addEventListener("change", () => {
    setze(k.a, pfad, eingabe.checked);
    k.aenderung();
  });
  return h("div", { klasse: "anm-feld", "data-feld": pfad },
    h("p", { klasse: "anm-fehler", id: id + "-f", hidden: true }),
    h("label", { klasse: "anm-karte anm-karte--kasten", for: id },
      eingabe,
      h("span", { klasse: "anm-karte__text" }, h("span", { klasse: "anm-karte__titel" }, label))));
}

export function speichern(bytes, typ, name) {
  const url = URL.createObjectURL(new Blob([bytes], { type: typ }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.rel = "noopener";
  a.hidden = true;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30000);
}

export function teilenMoeglich(dateien) {
  if (!dateien.length || dateien.some((d) => !d) || typeof navigator.share !== "function" || typeof navigator.canShare !== "function") return false;
  try {
    return navigator.canShare({ files: dateien });
  } catch (fehler) {
    return false;
  }
}

export async function kopiereAdresse(element, text) {
  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (fehler) {

  }
  try {
    const auswahl = window.getSelection();
    const bereich = document.createRange();
    bereich.selectNodeContents(element);
    auswahl.removeAllRanges();
    auswahl.addRange(bereich);
    return typeof document.execCommand === "function" && document.execCommand("copy") === true;
  } catch (fehler) {
    return false;
  }
}

export function kopiereBeimTeilen(adresse) {
  try {
    if (adresse && navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      const schreiben = Promise.resolve(navigator.clipboard.writeText(adresse)).then(() => true, () => false);
      const frist = new Promise((fertig) => window.setTimeout(() => fertig(false), 2000));
      return Promise.race([schreiben, frist]);
    }
  } catch (fehler) {

  }
  return Promise.resolve(false);
}

export function oeffneFensterSofort() {
  try {
    return window.open("", "_blank");
  } catch (fehler) {
    return null;
  }
}

export function zeigeInFenster(fenster, bytes, typ, dateiname) {
  const url = URL.createObjectURL(new Blob([bytes], { type: typ }));
  try {
    if (fenster && !fenster.closed) fenster.location.href = url;
    else speichern(bytes, typ, dateiname);
  } catch (fehler) {
    speichern(bytes, typ, dateiname);
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
}
