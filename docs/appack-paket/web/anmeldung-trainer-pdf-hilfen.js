import { WAPPEN } from "./anmeldung-trainer-pdf-wappen.js";

export const A4 = [595.28, 841.89];
export const RAND = 51;
export const FUSS_Y = 30;
export const MIN_SCHRIFT = 9;

export const UNTERSCHRIFT_PT_JE_PX = 0.55 / 4;
const TOLERANZ = 0.75;

const rgbHex = (hex) => [parseInt(hex.slice(1, 3), 16) / 255, parseInt(hex.slice(3, 5), 16) / 255, parseInt(hex.slice(5, 7), 16) / 255];

export const FARBE = {
  blau: rgbHex("#191793"),
  tinte: rgbHex("#12142B"),
  tinte3: rgbHex("#5B6079"),
  linie: rgbHex("#D8DBEA"),
  hell: rgbHex("#E4E7FA"),
  flaeche: rgbHex("#F3F5FC"),
  wappen: rgbHex(WAPPEN.farbe),
  weiss: [1, 1, 1],
};

export class TrainerPdfFehler extends Error {
  constructor(art, detail) {
    super(art + (detail ? ": " + detail : ""));
    this.name = "TrainerPdfFehler";
    this.art = art;
  }
}

export function istPng(bytes) {
  return !!bytes && bytes.length > 24 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
}

export function istJpeg(bytes) {
  return !!bytes && bytes.length > 4 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

export class Dokument {
  constructor(L, doc, font) {
    this.L = L;
    this.doc = doc;
    this.font = font;
    this.zeichen = new Set(font.getCharacterSet());
    this.seiten = [];
    this.probleme = [];
    this.ersetzt = [];
  }

  static async neu(werkzeuge) {
    const { PDFLib, fontkit, schrift } = werkzeuge || {};
    if (!PDFLib || !PDFLib.PDFDocument) throw new TrainerPdfFehler("intern", "PDFLib fehlt");
    if (!fontkit) throw new TrainerPdfFehler("intern", "fontkit fehlt");
    if (!schrift || !schrift.length) throw new TrainerPdfFehler("intern", "Schrift fehlt");
    const doc = await PDFLib.PDFDocument.create({ updateMetadata: false });
    doc.registerFontkit(fontkit);
    const font = await doc.embedFont(schrift, { subset: true });
    return new Dokument(PDFLib, doc, font);
  }

  farbe(f) {
    return this.L.rgb(f[0], f[1], f[2]);
  }

  sicher(x, nutzer) {
    const s = String(x === undefined || x === null ? "" : x);
    let aus = "";
    let ersetzt = false;
    for (const ch of s.normalize("NFC")) {
      const c = ch.codePointAt(0);
      if (c === 9 || c === 10 || c === 13 || c === 0xa0) {
        aus += " ";
      } else if (c < 32 || (c >= 0x200b && c <= 0x200f) || (c >= 0x202a && c <= 0x202e) || c === 0xfeff || c === 0xad) {

      } else if (this.zeichen.has(c)) {
        aus += ch;
      } else {
        aus += "?";
        ersetzt = true;
      }
    }
    if (ersetzt) this.ersetzt.push({ art: nutzer ? "angabe" : "text", text: s.slice(0, 60) });
    return aus;
  }

  breite(s, size, abstand) {
    return this.font.widthOfTextAtSize(s, size) + (abstand ? abstand * Array.from(s).length : 0);
  }

  neueSeite() {
    const seite = new Seite(this, this.doc.addPage(A4));
    this.seiten.push(seite);
    return seite;
  }

  async bettePng(bytes) {
    if (!istPng(bytes)) throw new TrainerPdfFehler("unterschrift-format", "kein PNG");
    let img;
    try {
      img = await this.doc.embedPng(bytes);
    } catch (e) {
      throw new TrainerPdfFehler("unterschrift-format", e && e.message);
    }
    return { img: img, breite: img.width, hoehe: img.height };
  }

  setzeMetadaten(m) {
    const doc = this.doc;
    doc.setTitle(m.titel, { showInWindowTitleBar: true });
    doc.setSubject(m.betreff || "");
    doc.setKeywords([]);
    doc.setCreator(m.ersteller);
    doc.setProducer(m.ersteller + " (pdf-lib)");
    doc.setLanguage("de-DE");
    const t = /^(\d{4})-(\d{2})-(\d{2})$/.exec(m.heute || "");
    const d = t ? new Date(Date.UTC(Number(t[1]), Number(t[2]) - 1, Number(t[3]), 12, 0, 0)) : new Date(0);
    doc.setCreationDate(d);
    doc.setModificationDate(d);
  }

  async speichern() {
    return await this.doc.save({ updateFieldAppearances: false });
  }
}

export class Seite {
  constructor(dok, page) {
    this.dok = dok;
    this.page = page;
  }

  text(roh, x, y, size, o) {
    const opt = o || {};
    const dok = this.dok;
    const s = dok.sicher(roh, opt.nutzer);
    if (!s) return 0;
    if (size < MIN_SCHRIFT && !opt.fuss) dok.probleme.push("Schrift unter 9 pt: " + s.slice(0, 40));
    const breite = dok.breite(s, size, opt.abstand);
    if (!opt.frei && (x < RAND - TOLERANZ || x + breite > A4[0] - RAND + TOLERANZ)) dok.probleme.push("Text über dem Rand: " + s.slice(0, 40));
    const L = dok.L;
    const f = dok.farbe(opt.farbe || FARBE.tinte);
    this.page.setFont(dok.font);
    const [, fontKey] = this.page.getFont();
    const ops = [L.pushGraphicsState(), L.setFillingColor(f), L.beginText(), L.setFontAndSize(fontKey, size)];
    if (opt.fett) ops.push(L.setStrokingColor(f), L.setLineWidth(size * 0.028), L.setTextRenderingMode(L.TextRenderingMode.FillAndOutline));
    if (opt.abstand) ops.push(L.setCharacterSpacing(opt.abstand));
    ops.push(L.setTextMatrix(1, 0, 0, 1, x, y), L.showText(dok.font.encodeText(s)), L.endText(), L.popGraphicsState());
    this.page.pushOperators(...ops);
    return breite;
  }

  textRechts(roh, xRechts, y, size, o) {
    const opt = o || {};
    const s = this.dok.sicher(roh, opt.nutzer);
    return this.text(s, xRechts - this.dok.breite(s, size, opt.abstand), y, size, Object.assign({}, opt, { nutzer: false }));
  }

  linie(x0, y0, x1, y1, staerke, farbe) {
    this.page.drawLine({ start: { x: x0, y: y0 }, end: { x: x1, y: y1 }, thickness: staerke || 0.6, color: this.dok.farbe(farbe || FARBE.tinte3) });
  }

  rechteck(x, y, b, h, o) {
    const opt = o || {};
    const L = this.dok.L;
    const radien = Array.isArray(opt.radius) ? opt.radius : [opt.radius || 0, opt.radius || 0, opt.radius || 0, opt.radius || 0];
    const [tl, tr, br, bl] = radien;
    const K = 0.5523;
    const ops = [L.pushGraphicsState()];
    if (opt.fuellung) ops.push(L.setFillingColor(this.dok.farbe(opt.fuellung)));
    if (opt.rand) ops.push(L.setStrokingColor(this.dok.farbe(opt.rand)), L.setLineWidth(opt.randBreite || 0.6));
    ops.push(L.moveTo(x + bl, y));
    ops.push(L.lineTo(x + b - br, y));
    if (br) ops.push(L.appendBezierCurve(x + b - br + br * K, y, x + b, y + br - br * K, x + b, y + br));
    ops.push(L.lineTo(x + b, y + h - tr));
    if (tr) ops.push(L.appendBezierCurve(x + b, y + h - tr + tr * K, x + b - tr + tr * K, y + h, x + b - tr, y + h));
    ops.push(L.lineTo(x + tl, y + h));
    if (tl) ops.push(L.appendBezierCurve(x + tl - tl * K, y + h, x, y + h - tl + tl * K, x, y + h - tl));
    ops.push(L.lineTo(x, y + bl));
    if (bl) ops.push(L.appendBezierCurve(x, y + bl - bl * K, x + bl - bl * K, y, x + bl, y));
    ops.push(L.closePath());
    ops.push(opt.fuellung && opt.rand ? L.fillAndStroke() : opt.fuellung ? L.fill() : L.stroke());
    ops.push(L.popGraphicsState());
    this.page.pushOperators(...ops);
  }

  kreis(mx, my, r, o) {
    const opt = o || {};
    const a = { x: mx, y: my, size: r };
    if (opt.fuellung) a.color = this.dok.farbe(opt.fuellung);
    if (opt.rand) {
      a.borderColor = this.dok.farbe(opt.rand);
      a.borderWidth = opt.randBreite || 1;
    }
    this.page.drawCircle(a);
  }

  haken(mx, my, d, farbe, staerke) {
    const L = this.dok.L;
    const c = this.dok.farbe(farbe || FARBE.weiss);
    const w = staerke || d * 0.14;
    const a = { x: mx - d * 0.27, y: my - d * 0.02 };
    const b = { x: mx - d * 0.07, y: my - d * 0.24 };
    const e = { x: mx + d * 0.29, y: my + d * 0.24 };
    this.page.drawLine({ start: a, end: b, thickness: w, color: c, lineCap: L.LineCapStyle.Round });
    this.page.drawLine({ start: b, end: e, thickness: w, color: c, lineCap: L.LineCapStyle.Round });
  }

  kaestchen(x, y, seite, gesetzt) {
    if (gesetzt) this.rechteck(x, y, seite, seite, { fuellung: FARBE.blau, rand: FARBE.blau, randBreite: 0.9, radius: seite * 0.16 });
    else this.rechteck(x, y, seite, seite, { fuellung: FARBE.weiss, rand: FARBE.tinte, randBreite: 0.9, radius: seite * 0.16 });
    if (gesetzt) this.haken(x + seite / 2, y + seite / 2, seite, FARBE.weiss);
  }

  wappen(x, yOben, b) {
    const [vx, vy, vb] = WAPPEN.viewBox;
    const s = b / vb;
    const farbe = this.dok.farbe(FARBE.wappen);
    for (const d of WAPPEN.pfade) this.page.drawSvgPath(d, { x: x - vx * s, y: yOben + vy * s, scale: s, color: farbe });
    return (WAPPEN.viewBox[3] / vb) * b;
  }

  unterschrift(sig, x, y, b, h) {
    const m = Math.min(b / sig.breite, h / sig.hoehe, UNTERSCHRIFT_PT_JE_PX);
    this.page.drawImage(sig.img, { x: x, y: y, width: sig.breite * m, height: sig.hoehe * m });
  }
}

export class Schreiber {

  constructor(dok, opt) {
    this.dok = dok;
    this.kopf = opt.kopf;
    this.unten = opt.unten === undefined ? 64 : opt.unten;
    this.x = opt.x === undefined ? RAND : opt.x;
    this.breite = opt.breite === undefined ? A4[0] - 2 * RAND : opt.breite;
    this.seite = null;
    this.y = 0;
    this.seitenAnzahl = 0;
    this.letzteBasis = 0;
  }

  neueSeite() {
    this.seite = this.dok.neueSeite();
    this.seitenAnzahl += 1;
    this.y = this.kopf(this.seite, this.seitenAnzahl > 1);
    return this.seite;
  }

  platz(h) {
    if (!this.seite || this.y - h < this.unten) this.neueSeite();
  }

  woerter(inhalt, o) {
    const laeufe = typeof inhalt === "string" ? [{ t: inhalt }] : inhalt;
    const worte = [];
    for (const lauf of laeufe) {
      const roh = this.dok.sicher(lauf.t, !!lauf.nutzer);
      const teile = roh.split(/ +/).filter(Boolean);
      teile.forEach((w) => {
        worte.push({ t: w, fett: !!(lauf.fett || (o && o.fett)), farbe: lauf.farbe || (o && o.farbe) });
      });
    }
    return worte;
  }

  umbruch(inhalt, breite, size, o) {
    const opt = o || {};
    const worte = this.woerter(inhalt, opt);
    const leer = this.dok.breite(" ", size, opt.abstand);
    const zeilen = [];
    let zeile = [];
    let w0 = 0;
    const abschliessen = () => {
      if (zeile.length) zeilen.push(zeile);
      zeile = [];
      w0 = 0;
    };
    for (const w of worte) {
      const b = this.dok.breite(w.t, size, opt.abstand);
      if (b > breite) {
        abschliessen();
        let rest = w.t;
        while (rest.length) {
          let n = rest.length;
          while (n > 1 && this.dok.breite(rest.slice(0, n), size, opt.abstand) > breite) n -= 1;
          zeilen.push([{ t: rest.slice(0, n), fett: w.fett, farbe: w.farbe, breite: this.dok.breite(rest.slice(0, n), size, opt.abstand), vorLuecke: 0 }]);
          rest = rest.slice(n);
        }
        continue;
      }
      if (zeile.length && w0 + leer + b > breite) abschliessen();
      const vor = zeile.length ? leer : 0;
      zeile.push({ t: w.t, fett: w.fett, farbe: w.farbe, breite: b, vorLuecke: vor });
      w0 += vor + b;
    }
    abschliessen();
    return zeilen.length ? zeilen : [[]];
  }

  zeichneZeile(zeile, x, yBasis, size, o) {
    const opt = o || {};
    const seite = this.seite;
    let extra = 0;
    if (opt.blocksatz && zeile.length > 1) {
      const summe = zeile.reduce((s, w) => s + w.breite, 0);
      const normal = this.dok.breite(" ", size, opt.abstand);
      const luecke = (opt.zeilenBreite - summe) / (zeile.length - 1);
      if (luecke > normal * 0.7 && luecke < normal * (opt.dehnung || 3.2)) extra = luecke;
    }
    const stil = (w) => (w.fett ? "f" : "n") + (w.farbe ? w.farbe.join(",") : "");
    let cx = x;
    let i = 0;
    while (i < zeile.length) {
      let s = zeile[i].t;
      let breite = zeile[i].breite;
      let j = i;
      if (!extra) {
        while (j + 1 < zeile.length && stil(zeile[j + 1]) === stil(zeile[i])) {
          const nachbar = zeile[j + 1];
          const luecke = nachbar.vorLuecke ? " " : "";
          s += luecke + nachbar.t;
          breite += nachbar.vorLuecke + nachbar.breite;
          j += 1;
        }
      }
      cx += extra ? (i > 0 ? extra : 0) : zeile[i].vorLuecke || 0;
      seite.text(s, cx, yBasis, size, { farbe: zeile[i].farbe || opt.farbe, fett: zeile[i].fett, abstand: opt.abstand });
      cx += breite;
      i = j + 1;
    }
  }

  absatz(inhalt, o) {
    const opt = Object.assign({ size: 10.5, zeilenhoehe: 1.34, einzug: 0, nach: 5 }, o || {});
    const x = (opt.x === undefined ? this.x : opt.x) + opt.einzug;
    const breite = (opt.breite === undefined ? this.breite : opt.breite) - opt.einzug;
    const zeilen = this.umbruch(inhalt, breite, opt.size, opt);
    const zh = opt.size * opt.zeilenhoehe;
    this.platz(Math.min(zeilen.length, 2) * zh);
    zeilen.forEach((z, i) => {
      if (this.y - zh < this.unten) this.neueSeite();
      this.letzteBasis = this.y - opt.size * 0.92;
      this.zeichneZeile(z, x, this.letzteBasis, opt.size, Object.assign({}, opt, { blocksatz: opt.blocksatz && i < zeilen.length - 1, zeilenBreite: breite }));
      this.y -= zh;
    });
    this.y -= opt.nach;
  }

  ueberschrift(text, stufe) {
    const groessen = { 2: 13, 3: 10.5, 4: 11 };
    const size = groessen[stufe || 2];
    const vor = stufe === 3 ? 7 : stufe === 4 ? 7 : 12;
    const zeilen = this.umbruch(text, this.breite, size, { fett: true });
    const hoehe = zeilen.length * size * 1.25;
    this.platz(vor + hoehe + 30);
    this.y -= vor;
    for (const z of zeilen) {
      this.zeichneZeile(z, this.x, this.y - size * 0.92, size, { farbe: FARBE.blau });
      this.y -= size * 1.25;
    }
    if (stufe !== 3) this.seite.linie(this.x, this.y - 1, this.x + this.breite, this.y - 1, 0.6, FARBE.linie);
    this.y -= stufe === 3 ? 3 : 7;
  }

  liste(items, o) {
    const opt = Object.assign({ size: 10, marker: "•", nach: 3, einzug: 0, zeilenhoehe: 1.34 }, o || {});
    const abstandMarker = opt.marker === "nummer" ? 17 : 11;
    const zh = opt.size * opt.zeilenhoehe;
    items.forEach((item, i) => {
      const zeilen = this.umbruch(item, this.breite - opt.einzug - abstandMarker, opt.size, opt);
      this.platz(Math.min(2, zeilen.length) * zh);
      const marker = opt.marker === "nummer" ? String(i + 1) + "." : opt.marker;
      this.seite.text(marker, this.x + opt.einzug, this.y - opt.size * 0.92, opt.size, { farbe: FARBE.blau, fett: opt.marker === "nummer" });
      zeilen.forEach((z, k) => {
        if (k > 0 && this.y - zh < this.unten) this.neueSeite();
        this.zeichneZeile(z, this.x + opt.einzug + abstandMarker, this.y - opt.size * 0.92, opt.size, opt);
        this.y -= zh;
      });
      this.y -= opt.nach;
    });
    this.y -= 2;
  }

  tabelle(spalten, zeilen, o) {
    const opt = Object.assign({ size: 9, polster: 3.5 }, o || {});
    const summe = spalten.reduce((s, c) => s + c.w, 0);
    const breiten = spalten.map((c) => (c.w / summe) * this.breite);
    const xs = [];
    let cx = this.x;
    for (const b of breiten) {
      xs.push(cx);
      cx += b;
    }
    const zh = opt.size * 1.3;
    const messe = (zellen, fett) => {
      const umb = zellen.map((z, i) => this.umbruch(z, breiten[i] - 2 * opt.polster, opt.size, { fett: fett }));
      const n = Math.max(1, ...umb.map((u) => u.length));
      return { umb: umb, hoehe: n * zh + 2 * opt.polster - 1 };
    };
    const kopf = () => {
      const m = messe(spalten.map((c) => c.titel || ""), true);
      this.platz(m.hoehe + 2 * zh);
      this.seite.rechteck(this.x, this.y - m.hoehe, this.breite, m.hoehe, { fuellung: FARBE.hell });
      m.umb.forEach((u, i) => u.forEach((z, k) => this.zeichneZeile(z, xs[i] + opt.polster, this.y - opt.polster - opt.size * 0.92 - k * zh + 0.5, opt.size, { farbe: FARBE.blau })));
      this.y -= m.hoehe;
    };
    kopf();
    zeilen.forEach((zellen) => {
      const m = messe(zellen, false);
      if (this.y - m.hoehe < this.unten) {
        this.neueSeite();
        kopf();
      }
      this.seite.linie(this.x, this.y - m.hoehe, this.x + this.breite, this.y - m.hoehe, 0.4, FARBE.linie);
      m.umb.forEach((u, i) => u.forEach((z, k) => this.zeichneZeile(z, xs[i] + opt.polster, this.y - opt.polster - opt.size * 0.92 - k * zh + 0.5, opt.size, {})));
      this.y -= m.hoehe;
    });
    this.y -= 6;
  }

  kaestchenZeile(gesetzt, inhalt, o) {
    const opt = Object.assign({ size: 10.5, seite: 10.5, nach: 6, zeilenhoehe: 1.34 }, o || {});
    const zeilen = this.umbruch(inhalt, this.breite - 21, opt.size, opt);
    const zh = opt.size * opt.zeilenhoehe;
    this.platz(zeilen.length * zh + 4);
    this.seite.kaestchen(this.x + 1, this.y - opt.seite - 0.8, opt.seite, gesetzt);
    zeilen.forEach((z) => {
      this.zeichneZeile(z, this.x + 21, this.y - opt.size * 0.92, opt.size, opt);
      this.y -= zh;
    });
    this.y -= opt.nach;
  }

  hinweisKasten(inhalt, o) {
    const opt = Object.assign({ size: 11, polster: 12, balken: 3.4, nach: 8 }, o || {});
    const innen = this.breite - opt.balken - 2 * opt.polster;
    const zeilen = this.umbruch(inhalt, innen, opt.size, opt);
    const zh = opt.size * 1.42;
    const h = zeilen.length * zh + 2 * opt.polster - (zh - opt.size);
    this.platz(h + opt.nach);
    this.seite.rechteck(this.x, this.y - h, this.breite, h, { fuellung: opt.fuellung || FARBE.hell, radius: [0, 5.7, 5.7, 0] });
    this.seite.rechteck(this.x, this.y - h, opt.balken, h, { fuellung: FARBE.blau });
    zeilen.forEach((z, i) => this.zeichneZeile(z, this.x + opt.balken + opt.polster, this.y - opt.polster - opt.size * 0.92 - i * zh, opt.size, opt));
    this.y -= h + opt.nach;
  }

  raster(zellen, o) {
    const opt = Object.assign({ wertGroesse: 10.5, labelGroesse: 9, luecke: 14.17, nach: 6, leer: "–" }, o || {});
    const spaltenB = (this.breite - 5 * opt.luecke) / 6;
    const zh = opt.wertGroesse * 1.3;
    const pad = 2.8;
    const messe = zellen.map((z) => {
      const b = z.s * spaltenB + (z.s - 1) * opt.luecke;
      const wert = z.wert === undefined || z.wert === null || String(z.wert).trim() === "" ? opt.leer : String(z.wert);
      const zeilen = this.umbruch([{ t: wert, nutzer: z.nutzer !== false }], b - 2 * pad, opt.wertGroesse, {});
      const min = z.kasten ? 28 : 18.4;
      const h = Math.max(min, zeilen.length * zh + 2 * pad + (z.kasten ? 3 : 0));
      return { b: b, zeilen: zeilen, h: h };
    });
    const labelH = opt.labelGroesse * 1.22;
    const reihenH = labelH + 1.5 + Math.max(...messe.map((m) => m.h));
    this.platz(reihenH + opt.nach);
    let col = 0;
    zellen.forEach((z, i) => {
      const m = messe[i];
      const x = this.x + col * (spaltenB + opt.luecke);
      col += z.s;
      if (z.label) this.seite.text(z.label, x, this.y - opt.labelGroesse * 0.92, opt.labelGroesse, { farbe: FARBE.tinte3 });
      const oben = this.y - labelH - 1.5;
      if (z.kasten) this.seite.rechteck(x, oben - m.h, m.b, m.h, { fuellung: FARBE.flaeche, rand: FARBE.linie, randBreite: 0.8, radius: 2.8 });
      else this.seite.linie(x, oben - m.h, x + m.b, oben - m.h, 0.9, FARBE.tinte);
      const vorn = z.kasten ? 5 : pad;
      const unten = z.kasten ? 5 : pad;
      m.zeilen.forEach((zeile, k) => {
        const yb = z.kasten ? oben - unten - opt.wertGroesse * 0.92 - k * zh : oben - m.h + unten + (m.zeilen.length - 1 - k) * zh + opt.wertGroesse * 0.25;
        this.zeichneZeile(zeile, x + vorn, yb, opt.wertGroesse, { farbe: z.wert === undefined || z.wert === null || String(z.wert).trim() === "" ? FARBE.tinte3 : FARBE.tinte });
      });
    });
    this.y -= reihenH + opt.nach;
  }

  unterschriftBlock(o) {
    const opt = Object.assign({ hoehe: 50, linksB: 178, luecke: 28, labelGroesse: 9, wertGroesse: 10.5 }, o || {});
    const h = opt.hoehe + 4 + opt.labelGroesse * 1.3 + 4;
    this.platz(h + 6);
    const yLinie = this.y - opt.hoehe - 4;
    const xR = this.x + opt.linksB + opt.luecke;
    const bR = this.breite - opt.linksB - opt.luecke;
    this.seite.linie(this.x, yLinie, this.x + opt.linksB, yLinie, 0.9, FARBE.tinte);
    this.seite.text(opt.ortDatum, this.x + 2, yLinie + 4, opt.wertGroesse, { nutzer: false });
    this.seite.text(opt.labelLinks || "Ort, Datum", this.x, yLinie - opt.labelGroesse * 1.05, opt.labelGroesse, { farbe: FARBE.tinte3 });
    this.seite.linie(xR, yLinie, xR + bR, yLinie, 0.9, FARBE.tinte);
    this.seite.unterschrift(opt.sig, xR + 6, yLinie + 2, bR - 12, opt.hoehe - 2);
    this.seite.text(opt.labelRechts || "Unterschrift", xR, yLinie - opt.labelGroesse * 1.05, opt.labelGroesse, { farbe: FARBE.tinte3 });
    this.y -= h;
  }
}
