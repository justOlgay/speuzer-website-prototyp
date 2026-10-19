const CODES = ("AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ " +
  "CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR " +
  "GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP " +
  "KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT " +
  "MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW " +
  "SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG " +
  "UM US UY UZ VA VC VE VG VI VN VU WF WS XK YE YT ZA ZM ZW").split(" ");

export const LAENDER_CODES = CODES;

const HAEUFIGE = [
  "DE", "TR", "SY", "AF", "UA", "RO", "BG", "PL", "HR", "RS", "BA", "XK", "AL", "MK", "IT", "ES", "PT", "GR",
  "MA", "TN", "DZ", "EG", "ER", "ET", "SO", "NG", "GH", "IR", "IQ", "PK", "IN", "LK", "RU", "GE", "AM", "US", "BR", "CN", "VN",
];

const namenCache = new Map();
const sortiererCache = new Map();

function namenFuer(sprache) {
  if (!namenCache.has(sprache)) {
    let dn = null;
    try {
      dn = new Intl.DisplayNames([sprache], { type: "region", fallback: "code" });
    } catch (e) {
      dn = null;
    }
    namenCache.set(sprache, dn);
  }
  return namenCache.get(sprache);
}

function sortiererFuer(sprache) {
  if (!sortiererCache.has(sprache)) {
    let c;
    try {
      c = new Intl.Collator(sprache);
    } catch (e) {
      c = new Intl.Collator("de");
    }
    sortiererCache.set(sprache, c);
  }
  return sortiererCache.get(sprache);
}

export function landName(code, sprache) {
  if (!code) return "";
  const dn = namenFuer(sprache || "de");
  if (!dn || !/^[A-Z]{2}$/.test(code)) return String(code);
  try {
    return dn.of(code) || code;
  } catch (e) {
    return code;
  }
}

export function laenderListe(sprache) {
  const sortierer = sortiererFuer(sprache || "de");
  const mitName = (code) => ({ code, name: landName(code, sprache) });
  const sortiert = (liste) => liste.map(mitName).sort((x, y) => sortierer.compare(x.name, y.name));
  const haeufig = sortiert(HAEUFIGE.filter((c) => CODES.includes(c)));
  const alle = sortiert(CODES.filter((c) => !HAEUFIGE.includes(c)));
  return { haeufig, alle };
}
