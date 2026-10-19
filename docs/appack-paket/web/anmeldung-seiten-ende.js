import { h, absaetze, knopf, hinweisKasten, vereinsKasten } from "./anmeldung-bausteine.js";
import { landName } from "./anmeldung-laender.js";
import { sauber, gruppiereIban, kbText, zerlegeIso, mailtoAnVerein } from "./anmeldung-hilfen.js";
import { unterschriftenPlan, unterschriftTitel } from "./anmeldung-seiten-unterlagen.js";
import { erstelleAnmeldungPdf, LadeFehler } from "./anmeldung-pdf-lader.js";

const ART_STIL = { warnung: "warnung", info: "info", frist: "info", offen: "offen" };

const HINWEIS_ORT = {
  abmeldung_formlos: "abmeldung/status", abmeldung_nach_letztem_spiel: "abmeldung/status", abmeldung_vor_letztem_spiel: "abmeldung/status",
  nie_zwei_vereine: "abmeldung/status", abmeldung_unklar: "abmeldung/status",
  vollmacht_eingabe_zeitnah: "abmeldung/weg", vollmacht_ohne_kurze_frist: "abmeldung/weg", vollmacht_anderer_verband: "abmeldung/weg",
  kuendigung_extra: "abmeldung/mitgliedschaft",
  sperre_laeuft: "abmeldung/sperre", sperre_unklar: "abmeldung/sperre", freigabe_unklar: "abmeldung/freigabe",
  wiederholter_wechsel: "abmeldung/wechsel",
  ohne_spielrecht_kein_spiel: "spielerpass", spielerpass_unklar: "spielerpass",
  wohnen_nicht_gemeinsam: "wohnen/ort", austausch_ein_jahr: "wohnen/grund", f17_wahrscheinlich_nicht: "wohnen/dauer", f17_moeglich_5_jahre: "wohnen/dauer",
  getrennt_einverstanden: "sorge/recht",
  sorge_allein_nachweis: "sorge/recht", vormund_hinweis: "sorge/recht", pflege_hinweis: "sorge/recht",
  maedchen_jungenteam: "besonderes", herren_aushilfe: "besonderes", frau_herren: "besonderes", sonderspielrecht: "besonderes",
  keine_frauenmannschaft: "besonderes", vertrauensperson: "geburt/geschlecht",
  karneval_kein_attest: "abteilung",
  bildung_teilhabe: "leistungen", beitragserlass: "leistungen",
  kontoinhaber_andere: "zahlung/inhaber", iban_ausland_pruefen: "zahlung/iban",
  spielerfoto_hinweis: "spielerfoto", attest_kosten: "nachweise", unterlagen_kein_whatsapp: "nachweise",
  medikamente_absprache: "notfall/gesundheit",
};

function hinweisOrt(x) {
  return x.schritt || HINWEIS_ORT[x.key] || null;
}

const MAX_OFFEN_JE_SEITE = 1;

const FRIST_OHNE_DATUM = ["frist_kein_spiel", "frist_ohne_zusage"];

function kasten(k, stil, art, key, label, text) {
  const el = hinweisKasten(stil, label, absaetze(text));
  el.setAttribute("data-hinweis-art", art);
  if (key) el.setAttribute("data-hinweis-key", key);
  return el;
}

function weitereHinweise(k, ort, info, verein, ebene) {
  const anzahl = info.length + verein.length;
  const gemerkt = k.weitereOffen || (k.weitereOffen = new Map());
  const schluessel = ort || "ende";
  const details = h("details", { klasse: "anm-einzelheiten anm-weitere", "data-weitere": "", "data-anzahl": anzahl },
    h("summary", {}, k.t("pruefen.weitereHinweise", { anzahl })),
    h("div", { klasse: "anm-weitere__inhalt" },
      ...info,
      verein.length ? h("div", { klasse: "anm-weitere__gruppe" }, h("h" + ebene, { klasse: "anm-zwischentitel" }, k.t("pruefen.klaertVerein")), ...verein) : null));

  details.open = gemerkt.get(schluessel) === true;
  details.addEventListener("toggle", () => gemerkt.set(schluessel, details.open));
  return details;
}

export function regelHinweise(k, e, ort, optionen) {
  if (!e) return [];
  const ebene = (optionen && optionen.ebene) || 3;
  const hinweise = Array.isArray(e.hinweise) ? e.hinweise : [];
  const gehoert = (x) => {
    const ziel = hinweisOrt(x);
    return !!ziel && (ziel === ort || ort.startsWith(ziel + "/"));
  };

  const gezeigt = k.gezeigteHinweise || (k.gezeigteHinweise = new Set());
  const gewaehlt = hinweise.filter((x) => (ort ? gehoert(x) : !gezeigt.has(x.key)));
  const rang = { warnung: 0, frist: 1, info: 2, offen: 3 };
  gewaehlt.sort((x, y) => (rang[x.art] ?? 9) - (rang[y.art] ?? 9));
  const grenze = ort ? MAX_OFFEN_JE_SEITE : Infinity;
  const offen = [];
  const info = [];
  const verein = [];
  for (const x of gewaehlt) {
    const text = k.rt("hinweise", x.key, x.werte || {});
    if (!text) continue;
    const art = x.art in ART_STIL ? x.art : "info";
    const stil = ART_STIL[art];
    const label = k.t("pruefen.hinweisArt." + art);
    const warnungOderFrist = art === "warnung" || art === "frist";
    if (warnungOderFrist && offen.length < grenze) {
      offen.push(kasten(k, stil, art, x.key, label, text));
      if (ort) gezeigt.add(x.key);
    } else if (art === "offen") {
      verein.push(kasten(k, stil, art, x.key, null, text));
      if (ort) gezeigt.add(x.key);
    } else {
      info.push(kasten(k, stil, art, x.key, label, text));

      if (ort && !warnungOderFrist) gezeigt.add(x.key);
    }
  }

  if (!ort && e.frist && e.frist.key && !FRIST_OHNE_DATUM.includes(e.frist.key)) {
    const werte = {
      ...(e.frist.werte || {}),
      pflichtspieleAb: e.frist.pflichtspieleAb ? k.formatDatum(e.frist.pflichtspieleAb) : "",
      freundschaftsspieleAb: e.frist.freundschaftsspieleAb ? k.formatDatum(e.frist.freundschaftsspieleAb) : "",
    };
    const text = k.rt("frist", e.frist.key, werte);
    if (text) {
      const el = hinweisKasten("info", k.t("pruefen.hinweisArt.frist"), [...absaetze(text), e.frist.unsicher ? h("p", { klasse: "anm-text" }, k.t("pruefen.fristUnsicher")) : null]);
      el.setAttribute("data-hinweis-art", "frist");
      el.setAttribute("data-frist-regel", "");
      offen.push(el);
    }
  }
  const knoten = [...offen];
  if (info.length || verein.length) knoten.push(weitereHinweise(k, ort, info, verein, ebene));
  return knoten;
}

function weiterleitungen(k, e) {
  const liste = e && Array.isArray(e.weiterleitung) ? e.weiterleitung : [];
  const zeilen = [];
  for (const w of liste) {
    const text = k.rt("weiterleitung", w.key, {});
    if (!text) continue;
    zeilen.push(h("li", {}, h("strong", {}, k.t("pruefen.weiterleitungAn." + w.an) + ": "), text));
  }
  if (!zeilen.length) return null;

  return h("details", { klasse: "anm-einzelheiten anm-block", "data-weiterleitung": "" },
    h("summary", {}, String(k.t("pruefen.weiterleitungTitel")).replace(/\s*[:\uff1a]\s*$/, "")),
    h("ul", { klasse: "anm-liste-punkte" }, zeilen));
}

function vereinsUebersicht(k, e) {
  if (!e) return null;
  const zeilen = [];
  if (e.version) zeilen.push(h("li", {}, k.t("demo.version") + ": " + e.version));
  if (Array.isArray(e.faelle) && e.faelle.length) {
    zeilen.push(h("li", {}, k.t("demo.faelle") + ": " + e.faelle.map((id) => id + (k.rt("faelle", id, {}) ? " (" + k.rt("faelle", id, {}) + ")" : "")).join("; ")));
  }
  if (e.status) zeilen.push(h("li", {}, k.t("demo.status") + ": " + e.status + (e.international ? " · " + k.t("demo.international") : "")));
  if (e.frist && e.frist.regel) {
    zeilen.push(h("li", {}, k.t("demo.regel") + ": " + e.frist.regel + " · " + (k.quelleFuer("fristen", e.frist.regel) || k.t("demo.keineQuelle"))));
  }
  return zeilen.length ? vereinsKasten(k, h("ul", {}, zeilen)) : null;
}

function jaNein(k, wert) {
  return wert === true || wert === "ja" ? k.t("pruefen.werte.ja") : wert === false || wert === "nein" ? k.t("pruefen.werte.nein") : wert === "weiss_nicht" ? k.t("pruefen.werte.weissNicht") : "";
}

function pruefBereiche(k) {
  const a = k.a;
  const e = k.ergebnis() || {};
  const liste = k.schrittListe();
  const gilt = (id) => liste.includes(id);
  const W = (pfad, ...ersatz) => k.t("pruefen.werte." + pfad, ...ersatz);
  const bereiche = [];
  const bereich = (id) => {
    const b = { id, zeilen: [] };
    bereiche.push(b);
    return (label, wert, schritt, teil) => {
      if (wert === "" || wert === null || wert === undefined || (Array.isArray(wert) && !wert.length)) return;
      b.zeilen.push({ label, wert, schritt, teil });
    };
  };
  const Z = (schluessel) => k.t("pruefen.zeilen." + schluessel);
  const datum = (iso) => (iso ? k.formatDatum(iso) : "");

  const D = (x) => {
    const t = x === null || x === undefined ? "" : sauber(String(x));
    return t ? h("bdi", {}, t) : "";
  };

  const LISTE = (teile) => {
    const aus = [];
    teile.filter((x) => x !== "" && x !== null && x !== undefined).forEach((t, i) => aus.push(...(i ? [k.t("liste.trenner")] : []), t));
    return aus;
  };

  let z = bereich("person");
  z(Z("name"), D([a.vorname, a.nachname].filter(Boolean).join(" ")), "name");

  z(Z("geboren"), datum(a.geburtsdatum) + (typeof e.alter === "number" ? " (" + k.t("allgemein.alterJahre", { n: e.alter }) + ")" : ""), "geburt", "datum");
  z(Z("geburtsort"), LISTE([D(a.geburtsort), landName(a.geburtsland, k.sprache)]), "geburt", "datum");
  z(Z("geschlecht"), a.geschlecht ? W("geschlecht." + a.geschlecht) : "", "geburt", "geschlecht");

  z = bereich("abteilung");
  z(Z("abteilung"), a.abteilung ? W("abteilung." + a.abteilung) : "", "abteilung");
  if (gilt("mannschaft") && e.mannschaft && e.mannschaft.namen && e.mannschaft.namen.length) z(Z("mannschaft"), LISTE(e.mannschaft.namen.map(D)), null);
  if (gilt("alter_verein") && a.alterVerein) {
    z(Z("alterVerein"), LISTE([D(a.alterVerein.name), D(a.alterVerein.ort), a.alterVerein.region === "ausland" ? landName(a.alterVerein.land, k.sprache) : ""]), "alter_verein");
  }
  if (gilt("abmeldung") && a.abmeldung && a.abmeldung.status) {
    const ab = a.abmeldung;

    const text = ab.status === "einschreiben" ? W("abmeldung.einschreiben", { datum: datum(ab.datum) }) : k.liste([W("abmeldung." + ab.status), ab.weg === "vollmacht" ? W("abmeldung.vollmacht") : ""]);
    z(Z("abmeldung"), text, "abmeldung", "status");
  }
  if (gilt("abmeldung") && a.alterVerein && a.alterVerein.mitgliedschaft) {
    z(Z("alteMitgliedschaft"), W("mitgliedschaft." + a.alterVerein.mitgliedschaft), "abmeldung", "mitgliedschaft");
  }
  if (gilt("pass")) {
    const staaten = k.liste((a.staaten || []).map((c) => landName(c, k.sprache)));
    z(Z("staaten"), staaten || (a.deutsch ? jaNein(k, a.deutsch) : ""), "pass", "staaten");
  }
  if (gilt("ausland")) z(Z("ausland"), a.auslandGewohnt === "ja" ? LISTE([D(a.auslandStadt), landName(a.auslandLand, k.sprache)]) : jaNein(k, a.auslandGewohnt), "ausland");
  if (gilt("wohnen") && a.wohnen) z(Z("wohnen"), W("wohnen." + a.wohnen), "wohnen", "ort");
  if (gilt("sorge") && a.sorge) {
    z(Z("sorge"), W("sorge." + a.sorge), "sorge", "recht");
    z(Z("sorgePersonen"), LISTE((a.sorgeberechtigte || []).map((p) => D([p.vorname, p.nachname].filter(Boolean).join(" ")))), "sorge", "personen");
  }

  z = bereich("kontakt");
  z(Z("anschrift"), a.anschrift ? D(a.anschrift.strasse + ", " + a.anschrift.plz + " " + a.anschrift.ort) : "", "kontakt", "anschrift");
  z(Z("email"), D(a.email), "kontakt", "erreichen");
  z(Z("telefon"), LISTE([D(a.mobil), D(a.telefon)]), "kontakt", "erreichen");

  z = bereich("beitrag");
  const gruppeText = e.beitrag && Array.isArray(e.beitrag.gruppen) && e.beitrag.gruppen.length ? k.liste(e.beitrag.gruppen.map((g) => k.beitragsText(g))) : e.beitrag && e.beitrag.gruppe ? k.beitragsText(e.beitrag.gruppe) : "";
  z(Z("beitrag"), gruppeText, "beitrag", "gruppe");
  if (gilt("leistungen")) z(Z("leistungen"), jaNein(k, a.leistungen), "leistungen");
  if (a.zahlung) {
    z(Z("zahlung"), a.zahlung.art ? W("zahlung." + a.zahlung.art) : "", "zahlung", "art");
    if (a.zahlung.art === "sepa") {
      z(Z("kontoinhaber"), a.zahlung.kontoinhaber === "andere" ? D([a.zahlung.kiVorname, a.zahlung.kiNachname].join(" ")) : W("kontoinhaber." + a.zahlung.kontoinhaber), "zahlung", "inhaber");
      z(Z("iban"), D(gruppiereIban(a.zahlung.iban)), "zahlung", "iban");
    }
  }

  z = bereich("einwilligungen");
  if (a.einwilligungen) {
    const ein = a.einwilligungen;
    z(Z("fotos"), jaNein(k, ein.fotos), "einwilligungen", "fotos");
    if (gilt("einwilligungen") && ["fussball", "beides"].includes(a.abteilung)) {
      z(Z("hfv"), [ein.hfvName ? k.t("einwilligungen.hfv.name") : "", ein.hfvFoto ? k.t("einwilligungen.hfv.foto") : ""].filter(Boolean).join(" ") || k.t("pruefen.werte.nein"), "einwilligungen", "hfv");
    }
    if (k.minderjaehrig()) {
      z(Z("fahrten"), jaNein(k, ein.fahrten === true), "einwilligungen", "fahrten");
      z(Z("messenger"), jaNein(k, ein.messenger === true), "einwilligungen", "fahrten");
    }
  }

  if (gilt("heimweg")) z(Z("heimweg"), a.heimweg === "allein" || a.heimweg === "abholen" ? W("heimweg." + a.heimweg) : "", "heimweg");

  if (gilt("notfall") && a.notfall) {
    z = bereich("notfall");
    z(Z("notfall"), LISTE([D(a.notfall.name), D(a.notfall.telefon)]), "notfall", "kontakt");
    z(Z("gesundheitsbogen"), jaNein(k, a.gesundheitsbogen === true), "notfall", "bogen");
  }

  if (gilt("spielerfoto") && a.spielerfoto && a.spielerfoto.weg) {
    z = bereich("foto");
    const foto = k.bilder.spielerfoto;
    if (a.spielerfoto.weg === "verein") z(Z("spielerfoto"), W("vereinMacht"), "spielerfoto");
    else if (foto) {
      z(Z("spielerfoto"), h("img", { klasse: "anm-vorschau-foto anm-vorschau-foto--klein", src: k.vorschauUrl("spielerfoto", foto.bytes, foto.typ), alt: k.t("spielerfoto.vorschau") }), "spielerfoto");
    } else z(Z("spielerfoto"), W("fehlt"), "spielerfoto");
  }

  if (gilt("nachweise")) {
    z = bereich("unterlagen");
    for (const u of (e.unterlagen || []).filter((x) => x.nachweis)) {
      const name = k.unterlage(u).name;
      const n = (k.bilder.nachweise[u.id] || []).length;
      const status = a.nachweise && a.nachweise[u.id] === "habe" ? W("habe") + (n ? " (" + (n === 1 ? Z("dateiEins") : Z("dateiMehr").replace("{anzahl}", n)) + ")" : "") : W("fehlt");
      z(name, status, "nachweise");
    }
  }

  z = bereich("unterschriften");
  const plan = unterschriftenPlan(k);

  z(Z("unterschriftWeg"), a.unterschriftWeg ? W("unterschriftWeg." + (a.unterschriftWeg === "bildschirm" && plan.hfvBildschirm ? "bildschirmAlles" : a.unterschriftWeg)) : "", "unterschriften");
  z(Z("satzung"), a.satzung === true ? W("ja") : W("satzungVonHand"), "unterschriften");
  if (a.unterschriftWeg === "bildschirm") {
    for (const p of plan.liste) {
      const u = k.bilder.unterschriften[p.schluessel];
      const name = unterschriftTitel(k, p.schluessel);

      const leer = p.schluessel === "spieler" ? "nichtUnterschriebenFreiwillig" : p.freiwillig ? "mitStift" : "nichtUnterschrieben";
      z(name, u ? h("img", { klasse: "anm-vorschau-unterschrift", src: k.vorschauUrl("unterschrift-" + p.schluessel, u.bytes, "image/png"), alt: k.t("unterschriften.standOk") + ": " + name }) : W(leer), "unterschriften");
    }
  }
  if (plan.stift.length) z(Z("hfvUnterschrift"), a.hfvUnterschrift ? W("hfvUnterschrift." + a.hfvUnterschrift) : "", "unterschriften");
  return bereiche.filter((b) => b.zeilen.length);
}

export const pruefen = {
  id: "pruefen",
  teile: () => ["haupt"],
  render(k) {
    const e = k.ergebnis();
    const teile = pruefBereiche(k).map((b) => {
      const zeilen = b.zeilen.map((r) => {
        const aktion = r.schritt
          ? knopf(k.t("pruefen.aendern"), {
              sekundaer: true,
              aktion: "aendern",
              ariaLabel: k.t("pruefen.aendernLang", { bereich: r.label }),
              beiKlick: () => k.geheZuAendern(r.schritt, r.teil),
            })
          : null;
        return h("div", { klasse: "anm-pruefzeile" }, h("dt", {}, r.label), h("dd", { klasse: "anm-pruefzeile__wert", dir: k.richtung() }, r.wert), h("dd", { klasse: "anm-pruefzeile__aktion" }, aktion));
      });
      const titelId = k.nextId("bt");
      return h("section", { klasse: "anm-bereich", "aria-labelledby": titelId },
        h("h3", { klasse: "anm-zwischentitel", id: titelId }, k.t("pruefen.bereiche." + b.id)),
        h("dl", { klasse: "anm-pruefliste" }, zeilen));
    });

    return {
      titel: k.t("pruefen.titel"),
      weiterText: k.t("pruefen.weiter"),
      inhalt: [
        ...absaetze(k.t("pruefen.hinweis"), "anm-hinweis"),
        ...teile,
        vereinsUebersicht(k, e),
      ],
    };
  },
  pruefe: () => [],
};

function dateiTeilen(k, datei, titel) {
  if (!datei || typeof navigator.share !== "function" || typeof navigator.canShare !== "function") return false;
  try {
    return navigator.canShare({ files: [datei] });
  } catch (e) {
    return false;
  }
}

function speichern(bytes, typ, name) {
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

function ansehen(bytes) {
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
  window.open(url, "_blank", "noopener");
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
}

function naechsteSchritte(k, pdf) {
  const e = k.ergebnis() || {};
  const plan = unterschriftenPlan(k);
  const schritte = [];
  if (plan.stift.length) {
    if (k.a.unterschriftWeg === "papier") {
      schritte.push(k.a.hfvUnterschrift === "training" ? k.t("fertig.unterschriftTrainingAlle") : k.t("fertig.unterschriftDrucken"));

      if (k.a.hfvUnterschrift === "selbst_drucken") schritte.push(k.t("fertig.abgebenAusgedruckt"));
    } else if (k.a.hfvUnterschrift === "training") schritte.push(k.t("fertig.unterschriftTraining"));
    else schritte.push(k.t("fertig.unterschriftDruckenTeil"));
  } else if (plan.liste.some((p) => p.stiftBeiLeer && !k.bilder.unterschriften[p.schluessel])) {

    const foto = plan.liste.some((p) => p.stiftBeiLeerBlatt && !k.bilder.unterschriften[p.schluessel]);
    schritte.push(k.t("fertig.unterschriftRest") + (foto ? "\n" + k.t("fertig.unterschriftFoto") : ""));
  } else schritte.push(k.t("fertig.unterschriftFertig"));
  const fehlend = Array.isArray(e.fehlend) ? e.fehlend : [];
  const eintraege = [];
  if (fehlend.length) {
    const namen = fehlend.map((id) => k.unterlage({ id }).name);
    eintraege.push(h("li", {}, h("p", {}, h("strong", {}, k.t("fertig.fehltTitel"))), h("ul", {}, namen.map((n) => h("li", {}, n))), h("p", {}, k.t("fertig.fehltHinweis"))));
  }
  const liste = schritte.map((s) => h("li", {}, absaetze(s)));
  liste.push(...eintraege);

  if (pdf && (pdf.teile || []).some((t) => t.teil === "C")) liste.push(h("li", {}, h("p", {}, k.t("fertig.teilC"))));

  liste.push(h("li", {}, h("p", {}, k.t("fertig.danach"))));
  return h("ol", { klasse: "anm-naechste" }, liste);
}

function geschaeftsstellenMail(k) {
  const verein = k.konfig.verein || {};
  const kontakte = (k.konfig.anmeldung && k.konfig.anmeldung.kontakte) || {};
  const adresse = sauber(verein.mail || (kontakte.geschaeftsstelle && kontakte.geschaeftsstelle.mail) || "");
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adresse) ? adresse : "";
}

async function kopiereAdresse(element, text) {
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

function sendenAbschnitt(k, optionen) {
  const adresse = geschaeftsstellenMail(k);

  const weg = (art, knoepfe) =>
    h("div", { klasse: "anm-senden__weg", "data-weg": art },
      h("ol", { klasse: "anm-senden__schritte" },
        [1, 2, 3].map((i) => h("li", {}, k.t("fertig.senden." + art + i, { knopf: knoepfe[i - 1] || "" })))));

  const handyWeg = !!(optionen.teilen && optionen.handy);
  const wege = handyWeg ? weg("handy", [k.t("fertig.senden.kopieren"), k.t("fertig.teilen")]) : weg("computer", [k.t("fertig.herunterladen")]);

  let adressBlock = null;
  if (adresse) {
    const [lokal, domain] = adresse.split("@");

    const adresseText = h("span", { klasse: "anm-senden__adresse-text", dir: "ltr", "data-mail-adresse": "" }, lokal, h("wbr"), "@" + domain);
    const status = h("p", { klasse: "anm-status", role: "status", "data-mail-status": "" });
    adressBlock = h("div", { klasse: "anm-senden__adressblock", "data-adressblock": "" },
      h("p", { klasse: "anm-senden__label" }, k.t("fertig.senden.adresseTitel")),
      h("p", { klasse: "anm-senden__adresse" }, adresseText),

      h("div", { klasse: "anm-knoepfe" },
        knopf(k.t("fertig.senden.kopieren"), {
          sekundaer: true,
          aktion: "adresse-kopieren",
          beiKlick: async () => {
            const geklappt = await kopiereAdresse(adresseText, adresse);
            status.textContent = k.t(geklappt ? "fertig.senden.kopiert" : "fertig.senden.kopierenFehler");
          },
        }),
        h("a", { klasse: "knopf knopf--sekundaer", href: mailtoAnVerein(adresse, k.a.vorname, k.a.nachname), "data-aktion": "mail-oeffnen" }, k.t("fertig.senden.oeffnen"))),
      status,

      handyWeg ? h("p", { klasse: "anm-hinweis" }, k.t("fertig.senden.anhang", { knopf: k.t("fertig.senden.oeffnen") })) : null);
  }
  return h("div", { klasse: "anm-senden", "data-senden": "" },
    h("h3", { klasse: "anm-zwischentitel" }, k.t("fertig.senden.titel")),
    h("div", { klasse: "anm-senden__wege" }, wege),
    adressBlock,
    h("p", { klasse: "anm-hinweis anm-hinweis--achtung" }, k.t("fertig.nichtWhatsapp")));
}

function ergebnisAnsicht(k, pdf) {
  const datei = pdf.datei;
  const status = h("p", { klasse: "anm-status", role: "status" });
  const knoepfe = [];
  const zeigeStatus = (text) => {
    status.textContent = text;
  };

  const speichereMitMeldung = (bytes, typ, name, erfolg) => {
    speichern(bytes, typ, name);
    zeigeStatus(erfolg);
    return true;
  };
  const laden = knopf(k.t("fertig.herunterladen"), {
    aktion: "herunterladen",
    beiKlick: () => {
      if (speichereMitMeldung(pdf.ergebnis.bytes, "application/pdf", pdf.ergebnis.dateiname, k.t("fertig.gespeichert"))) k.gesichert = true;
    },
  });
  const teilen = knopf(k.t("fertig.teilen"), {
    sekundaer: true,
    aktion: "teilen",
    beiKlick: () => {
      let versprechen;
      try {
        versprechen = Promise.resolve(navigator.share({ files: [datei], title: pdf.ergebnis.dateiname }));
      } catch (fehler) {
        versprechen = Promise.reject(fehler);
      }
      versprechen
        .then(() => {
          k.gesichert = true;
          zeigeStatus(k.t("fertig.geteilt"));
        })
        .catch((fehler) => {
          if (fehler && fehler.name === "AbortError") return;

          if (speichereMitMeldung(pdf.ergebnis.bytes, "application/pdf", pdf.ergebnis.dateiname, k.t("fertig.teilenFehler"))) k.gesichert = true;
        });
    },
  });
  teilen.hidden = !dateiTeilen(k, datei);

  const handy = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
  if (!teilen.hidden && handy) {
    teilen.classList.remove("knopf--sekundaer");
    laden.classList.add("knopf--sekundaer");
    knoepfe.push(teilen, laden);
  } else knoepfe.push(laden, teilen);
  knoepfe.push(knopf(k.t("fertig.ansehen"), { sekundaer: true, aktion: "ansehen", beiKlick: () => ansehen(pdf.ergebnis.bytes) }));
  const foto = k.bilder.spielerfoto;
  if (foto && k.a.spielerfoto && k.a.spielerfoto.weg !== "verein") {
    knoepfe.push(knopf(k.t("fertig.fotoSpeichern"), {
      sekundaer: true,
      aktion: "foto-speichern",
      beiKlick: () => {
        speichereMitMeldung(foto.bytes, "image/jpeg", k.fotoDateiname(), k.t("fertig.gespeichert"));
      },
    }));
  }
  return h("div", { klasse: "anm-ergebnis", "data-status": "fertig" },
    h("p", { klasse: "anm-text anm-datei-zeile", "data-datei": "" }, k.t("fertig.datei", { name: pdf.ergebnis.dateiname })),
    h("p", { klasse: "anm-hinweis" }, k.t("fertig.info", { seiten: pdf.ergebnis.seiten, groesse: kbText(pdf.ergebnis.bytes.byteLength) })),
    h("div", { klasse: "anm-knoepfe" }, knoepfe),
    status,

    sendenAbschnitt(k, { teilen: !teilen.hidden, handy: !!handy }),
    h("h3", { klasse: "anm-zwischentitel" }, k.t("fertig.naechsteTitel")),
    naechsteSchritte(k, pdf.ergebnis),
    h("div", { klasse: "anm-block" },
      h("div", { klasse: "anm-knoepfe" },
        knopf(k.t("fertig.weiterePerson"), { aktion: "weitere-person", beiKlick: () => k.weiterePerson() })),
      h("p", { klasse: "anm-hinweis" }, k.t("fertig.weiterePersonHinweis"))));
}

function fehlerAnsicht(k, pdf) {
  const schluessel = { bibliothek: "bibliothek", "vorlage-netz": "vorlageNetz", "vorlage-fehlt": "vorlageNetz", "vorlage-geaendert": "vorlageGeaendert", modul: "modul", pdf: "pdf" }[pdf.fehlerArt] || "pdf";
  return h("div", { klasse: "anm-ergebnis anm-ergebnis--fehler", "data-status": "fehler" },
    hinweisKasten("offen", k.t("pruefen.hinweisArt.warnung"), h("p", {}, k.t("fertig.fehler." + schluessel))),
    h("div", { klasse: "anm-knoepfe" }, knopf(k.t("fertig.nochmal"), { aktion: "nochmal", beiKlick: () => k.starteErstellen(true) }), knopf(k.t("kopf.hilfe"), { sekundaer: true, beiKlick: () => k.zeigeHilfe() })));
}

export const fertig = {
  id: "fertig",
  teile: () => ["haupt"],
  ohneWeiter: true,
  render(k) {
    const pdf = k.pdf;
    const e = k.ergebnis();

    if (pdf.zustand === "leer" || (pdf.zustand === "fertig" && pdf.veraltet)) k.starteErstellen(false);
    let titel;
    let inhalt;
    if (pdf.zustand === "fertig" && !pdf.veraltet) {
      titel = k.t("fertig.titelFertig");
      inhalt = [
        ergebnisAnsicht(k, pdf),
        h("div", { klasse: "anm-block" }, ...regelHinweise(k, e)),
        weiterleitungen(k, e),
        vereinsUebersicht(k, e),
      ];
    } else if (pdf.zustand === "fehler") {
      titel = k.t("fertig.titelFehler");
      inhalt = [fehlerAnsicht(k, pdf)];
    } else {
      titel = k.t("fertig.titelArbeit");
      inhalt = [h("p", { klasse: "anm-text anm-text--gross", role: "status", "data-status": "arbeit" }, k.t("fertig.arbeitet"))];
    }
    return { titel, inhalt };
  },
  pruefe: () => [],
};

export async function erstelleDatei(k) {
  const pdf = k.pdf;
  pdf.zustand = "arbeit";
  pdf.veraltet = false;
  const version = k.version;
  try {
    const ergebnis = await erstelleAnmeldungPdf({ konfig: k.konfig, a: k.a, e: k.ergebnis(), bilder: k.bilder, heute: k.heute });
    if (version !== k.version) {

      pdf.zustand = "leer";
      return;
    }
    let datei = null;
    try {
      datei = new File([ergebnis.bytes], ergebnis.dateiname, { type: "application/pdf", lastModified: Date.now() });
    } catch (e) {
      datei = null;
    }
    pdf.ergebnis = ergebnis;
    pdf.datei = datei;
    pdf.zustand = "fertig";
    pdf.fehlerArt = null;
  } catch (fehler) {
    pdf.zustand = "fehler";
    pdf.fehlerArt = fehler instanceof LadeFehler ? fehler.art : "pdf";
    console.error("Anmeldung: Datei nicht erstellt", fehler);
  }
}
