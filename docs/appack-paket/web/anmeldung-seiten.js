import { start, wer, name, geburt, pass, ausland, wohnen, sorge } from "./anmeldung-seiten-person.js";
import { abteilung, mannschaft, spielerpass, alter_verein, abmeldung, besonderes } from "./anmeldung-seiten-fussball.js";
import { kontakt, beitrag, leistungen, zahlung, einwilligungen, heimweg, notfall } from "./anmeldung-seiten-verein.js";
import { spielerfoto, nachweise, unterschriften } from "./anmeldung-seiten-unterlagen.js";
import { pruefen, fertig } from "./anmeldung-seiten-ende.js";
import { code, uebergabe } from "./anmeldung-seiten-zugang.js";

export const SEITEN = {
  start, wer, name, geburt, abteilung, mannschaft, spielerpass, alter_verein, abmeldung, pass, ausland,
  wohnen, sorge, besonderes, kontakt, beitrag, leistungen, zahlung, einwilligungen, heimweg, notfall, spielerfoto,
  nachweise, unterschriften, pruefen, fertig,
};

export const VORSEITEN = { code, uebergabe };

export const REIHENFOLGE = [
  "start", "wer", "name", "geburt", "abteilung", "mannschaft", "spielerpass", "alter_verein", "abmeldung",
  "pass", "ausland", "wohnen", "sorge", "besonderes", "kontakt", "beitrag", "leistungen", "zahlung",
  "einwilligungen", "heimweg", "notfall", "spielerfoto", "nachweise", "unterschriften", "pruefen", "fertig",
];

export const ABSCHNITTE = ["person", "fussballKarneval", "kontakt", "beitrag", "unterlagen", "unterschrift", "fertig"];

export const ABSCHNITT_VON = {
  start: "person", wer: "person", name: "person", geburt: "person",
  abteilung: "fussballKarneval", mannschaft: "fussballKarneval", spielerpass: "fussballKarneval",
  alter_verein: "fussballKarneval", abmeldung: "fussballKarneval", pass: "fussballKarneval", ausland: "fussballKarneval",
  wohnen: "fussballKarneval", sorge: "fussballKarneval", besonderes: "fussballKarneval",
  kontakt: "kontakt",
  beitrag: "beitrag", leistungen: "beitrag", zahlung: "beitrag",
  einwilligungen: "unterlagen", heimweg: "unterlagen", notfall: "unterlagen", spielerfoto: "unterlagen", nachweise: "unterlagen",
  unterschriften: "unterschrift",
  pruefen: "fertig", fertig: "fertig",
};
