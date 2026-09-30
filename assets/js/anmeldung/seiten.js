/*
  Alle Seiten des Assistenten nach Schritt-Kennung (SCHNITTSTELLEN Abschnitt 4,
  27 Schritte) und die Zuordnung der Schritte zu den sieben Abschnitten, die
  oben auf der Seite stehen.

  REIHENFOLGE ist die feste Ordnung der Kennungen. Welche Schritte für eine
  Anmeldung gelten und in welcher Reihenfolge sie kommen, bestimmt allein
  regeln.schritte(); REIHENFOLGE dient nur als Ersatz, wenn ein Schritt durch
  geänderte Antworten aus der Liste fällt und der Assistent den nächsten
  passenden suchen muss.
*/

import { start, wer, name, geburt, pass, ausland, wohnen, sorge } from "./seiten-person.js";
import { abteilung, mannschaft, spielen, spielerpass, alter_verein, abmeldung, besonderes, karneval } from "./seiten-fussball.js";
import { kontakt, beitrag, leistungen, zahlung, einwilligungen, notfall } from "./seiten-verein.js";
import { spielerfoto, nachweise, unterschriften } from "./seiten-unterlagen.js";
import { pruefen, fertig } from "./seiten-ende.js";

export const SEITEN = {
  start, wer, name, geburt, abteilung, mannschaft, spielen, spielerpass, alter_verein, abmeldung, pass, ausland,
  wohnen, sorge, besonderes, karneval, kontakt, beitrag, leistungen, zahlung, einwilligungen, notfall, spielerfoto,
  nachweise, unterschriften, pruefen, fertig,
};

export const REIHENFOLGE = [
  "start", "wer", "name", "geburt", "abteilung", "mannschaft", "spielen", "spielerpass", "alter_verein", "abmeldung",
  "pass", "ausland", "wohnen", "sorge", "besonderes", "karneval", "kontakt", "beitrag", "leistungen", "zahlung",
  "einwilligungen", "notfall", "spielerfoto", "nachweise", "unterschriften", "pruefen", "fertig",
];

// Abschnitte in der Reihenfolge, in der sie oben angezeigt werden.
export const ABSCHNITTE = ["person", "fussballKarneval", "kontakt", "beitrag", "unterlagen", "unterschrift", "fertig"];

export const ABSCHNITT_VON = {
  start: "person", wer: "person", name: "person", geburt: "person",
  abteilung: "fussballKarneval", mannschaft: "fussballKarneval", spielen: "fussballKarneval", spielerpass: "fussballKarneval",
  alter_verein: "fussballKarneval", abmeldung: "fussballKarneval", pass: "fussballKarneval", ausland: "fussballKarneval",
  wohnen: "fussballKarneval", sorge: "fussballKarneval", besonderes: "fussballKarneval", karneval: "fussballKarneval",
  kontakt: "kontakt",
  beitrag: "beitrag", leistungen: "beitrag", zahlung: "beitrag",
  einwilligungen: "unterlagen", notfall: "unterlagen", spielerfoto: "unterlagen", nachweise: "unterlagen",
  unterschriften: "unterschrift",
  pruefen: "fertig", fertig: "fertig",
};
