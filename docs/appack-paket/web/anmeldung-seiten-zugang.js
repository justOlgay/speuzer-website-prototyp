import { h, absaetze } from "./anmeldung-bausteine.js";
import { normalisiereCode, pruefeCode } from "./anmeldung-zugang.js";
import { mailtoCode } from "./anmeldung-hilfen.js";

function mitLink(text, link) {
  const teile = String(text).split("{link}");
  return teile.length === 2 ? [teile[0], link, teile[1]] : [text, " ", link];
}

export const code = {
  id: "code",
  teile: () => ["haupt"],
  render(k) {
    const z = k.zugang;
    const id = k.nextId("f");
    const fehlerId = id + "-f";

    const eingabe = h("input", {
      id,
      name: "zugang",
      type: "text",
      "data-pfad": "zugang.code",
      autocomplete: "off",
      autocapitalize: "characters",
      autocorrect: "off",
      spellcheck: "false",
      enterkeyhint: "go",
      maxlength: 64,
      dir: "ltr",
      lang: "en",
      "aria-required": "true",
      klasse: "anm-eingabe anm-eingabe--code",
    });
    eingabe.value = z.eingabe;
    eingabe.addEventListener("input", () => {

      z.eingabe = eingabe.value;
      z.geprueft = "";
      z.gueltig = false;
      k.fehlerLoeschen();
    });
    const feld = h("div", { klasse: "anm-feld", "data-feld": "code" },
      h("label", { klasse: "anm-label", for: id }, k.t("code.label")),
      h("p", { klasse: "anm-fehler", id: fehlerId, hidden: true }),
      eingabe);

    const hilfen = [];
    const seiten = (k.konfig && k.konfig.seiten) || {};
    if (seiten.probetraining) {
      hilfen.push(h("p", { klasse: "anm-hinweis" }, mitLink(k.t("code.kein"), h("a", { href: seiten.probetraining, "data-aktion": "probetraining" }, k.t("code.keinLink")))));
    }
    const adresse = k.konfig && k.konfig.verein && k.konfig.verein.mail;
    if (adresse) {
      hilfen.push(h("p", { klasse: "anm-hinweis" }, mitLink(k.t("code.passiv"), h("a", { href: mailtoCode(adresse), "data-aktion": "code-anfragen" }, k.t("code.passivLink")))));
    }
    return {
      titel: k.t("code.titel"),
      inhalt: [...absaetze(k.t("code.einleitung")), feld],
      nach: hilfen.length ? h("div", { klasse: "anm-block anm-code-hilfen" }, hilfen) : null,
    };
  },

  async vorPruefung(k) {
    const z = k.zugang;
    const r = await pruefeCode(z.eingabe, z.pruefwerte);
    z.geprueft = r.code;
    z.gueltig = r.gueltig;
  },

  pruefe(k) {
    const z = k.zugang;
    const norm = normalisiereCode(z.eingabe);
    if (!norm) return [{ feld: "code", meldung: k.t("code.fehlerLeer") }];
    if (z.gueltig && z.geprueft === norm) return [];
    return [{ feld: "code", meldung: k.t("code.fehlerFalsch") }];
  },
  beimVerlassen(k) {
    const z = k.zugang;
    if (z.gueltig && z.geprueft === normalisiereCode(z.eingabe)) k.zugangFreigeben(z.geprueft);
  },
};

export const uebergabe = {
  id: "uebergabe",
  teile: () => ["haupt"],
  ohneWeiter: true,
  render(k) {

    const link = h("a", { klasse: "knopf anm-browserlink", href: "ext://" + k.browserUrl(), "data-aktion": "im-browser-oeffnen" }, k.t("app.browser"));
    return { titel: k.t("app.uebergabe"), inhalt: [h("p", {}, link)] };
  },
  pruefe: () => [],
};
