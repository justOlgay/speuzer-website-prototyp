/*
  Unterschriftsfeld für den Anmelde-Assistenten (29.09.2026): eine Fläche, auf
  der man mit Finger, Stift oder Maus unterschreibt. Das Ergebnis ist ein
  transparentes PNG, zugeschnitten auf die Striche – der PDF-Baustein setzt es
  an den erlaubten Stellen ein (SCHNITTSTELLEN Abschnitt 6).

  Die Striche liegen in einem Speicher (`speicher`), den die Seite behält. So
  übersteht eine Unterschrift einen Sprachwechsel und ein neues Zeichnen der
  Seite. Punkte sind in Einheiten der Feldbreite gespeichert; das Feld hat ein
  festes Seitenverhältnis (CSS), deshalb bleibt die Form beim Drehen des
  Handys erhalten.

  Bedienung nur mit Zeiger: Wer nicht zeichnen kann, wählt im Schritt "alles
  auf Papier". Neu geschrieben für den Assistenten; das Muster (Pointer
  Events, Striche als Punktlisten) stammt aus assets/js/antrag/aufnahmeantrag.js.
*/

import { h } from "./bausteine.js";

// Tinte: Vereinsblau (--blau-800), wirkt im PDF wie ein Kugelschreiber.
const TINTE = "#191793";
// Strichstärke am Bildschirm in CSS-Pixeln.
const LINIE_PX = 2.4;
// Mindestlänge und -breite, ab der es als Unterschrift gilt (kein bloßes Antippen).
const MIN_LAENGE_PX = 60;
const MIN_BREITE_PX = 24;

export function neuerSpeicher() {
  return { striche: [] };
}

function zeichneStrich(ctx, punkte, breite) {
  ctx.lineWidth = breite;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = TINTE;
  ctx.fillStyle = TINTE;
  if (punkte.length === 1) {
    ctx.beginPath();
    ctx.arc(punkte[0].x, punkte[0].y, breite / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  ctx.beginPath();
  ctx.moveTo(punkte[0].x, punkte[0].y);
  for (let i = 1; i < punkte.length - 1; i++) {
    const mx = (punkte[i].x + punkte[i + 1].x) / 2;
    const my = (punkte[i].y + punkte[i + 1].y) / 2;
    ctx.quadraticCurveTo(punkte[i].x, punkte[i].y, mx, my);
  }
  const letzter = punkte[punkte.length - 1];
  ctx.lineTo(letzter.x, letzter.y);
  ctx.stroke();
}

// o: { speicher, id, titel, hinweis, hinweisListe, zusatz, texte: { ariaLabel, stand0, standOk,
// standZuKurz, loeschen }, beiAenderung() }
// hinweis: ein Satz; hinweisListe: { titel, punkte: [Text, …] } – "Diese Unterschrift gilt für:" mit einer Zeile je Blatt
export function unterschriftFeld(o) {
  const speicher = o.speicher;
  const leinwand = h("canvas", { klasse: "anm-unterschrift__leinwand", role: "img", "aria-label": o.texte.ariaLabel });
  const stand = h("p", { klasse: "anm-unterschrift__stand", id: o.id + "-stand", "aria-live": "polite" }, o.texte.stand0);
  const loeschen = h("button", { type: "button", klasse: "knopf knopf--sekundaer anm-unterschrift__loeschen", "aria-label": o.texte.loeschenLang || o.texte.loeschen }, o.texte.loeschen);
  const huelle = h("div", { klasse: "anm-unterschrift", role: "group", tabindex: "-1", "aria-labelledby": o.id + "-titel", "aria-describedby": o.id + "-hinweis " + (o.zusatz ? o.id + "-zusatz " : "") + o.id + "-stand", "data-feld": o.feld, "data-unterschrift": o.wer },
    h("p", { klasse: "anm-unterschrift__titel", id: o.id + "-titel" }, o.titel),
    o.hinweisListe && o.hinweisListe.punkte.length
      ? h("div", { klasse: "anm-hinweis anm-unterschrift__gilt", id: o.id + "-hinweis" }, h("p", {}, o.hinweisListe.titel), h("ul", { klasse: "anm-liste-punkte" }, o.hinweisListe.punkte.map((x) => h("li", {}, x))))
      : o.hinweis ? h("p", { klasse: "anm-hinweis", id: o.id + "-hinweis" }, o.hinweis) : null,
    o.zusatz ? h("p", { klasse: "anm-hinweis", id: o.id + "-zusatz" }, o.zusatz) : null,
    h("p", { klasse: "anm-fehler", id: o.id + "-f", hidden: true }),
    h("div", { klasse: "anm-unterschrift__flaeche" }, leinwand, h("span", { klasse: "anm-unterschrift__linie", "aria-hidden": "true" })),
    h("div", { klasse: "anm-unterschrift__leiste" }, stand, loeschen));

  const ctx = leinwand.getContext("2d");
  let breite = 0;
  let dpr = 1;
  let aktiv = null;
  let rahmen = null;
  let geplant = false;

  function zeichneAlles() {
    geplant = false;
    if (!breite) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, leinwand.width, leinwand.height);
    const s = breite * dpr;
    ctx.setTransform(s, 0, 0, s, 0, 0);
    speicher.striche.forEach((p) => zeichneStrich(ctx, p, LINIE_PX / breite));
  }

  function plane() {
    if (geplant) return;
    geplant = true;
    window.requestAnimationFrame(zeichneAlles);
  }

  function groesse() {
    const r = leinwand.getBoundingClientRect();
    if (!r.width || !r.height) return;
    breite = r.width;
    dpr = Math.min(3, Math.max(1, window.devicePixelRatio || 1));
    leinwand.width = Math.round(r.width * dpr);
    leinwand.height = Math.round(r.height * dpr);
    zeichneAlles();
  }

  function punkt(e) {
    return { x: (e.clientX - rahmen.left) / rahmen.width, y: (e.clientY - rahmen.top) / rahmen.width };
  }

  function istUnterschrieben() {
    if (!speicher.striche.length || !breite) return false;
    let laenge = 0;
    let minX = Infinity;
    let maxX = -Infinity;
    for (const p of speicher.striche) {
      p.forEach((q, i) => {
        minX = Math.min(minX, q.x);
        maxX = Math.max(maxX, q.x);
        if (i) laenge += Math.hypot(q.x - p[i - 1].x, q.y - p[i - 1].y);
      });
    }
    return laenge * breite >= MIN_LAENGE_PX && (maxX - minX) * breite >= MIN_BREITE_PX;
  }

  function melden() {
    const ok = istUnterschrieben();
    stand.textContent = ok ? o.texte.standOk : speicher.striche.length ? o.texte.standZuKurz : o.texte.stand0;
    huelle.classList.toggle("anm-unterschrift--fertig", ok);
    if (o.beiAenderung) o.beiAenderung();
  }

  leinwand.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault();
    if (!breite) groesse();
    rahmen = leinwand.getBoundingClientRect();
    try {
      leinwand.setPointerCapture(e.pointerId);
    } catch (fehler) {
      /* ältere Browser */
    }
    aktiv = { id: e.pointerId, punkte: [punkt(e)] };
    speicher.striche.push(aktiv.punkte);
    plane();
  });

  leinwand.addEventListener("pointermove", (e) => {
    if (!aktiv || e.pointerId !== aktiv.id) return;
    e.preventDefault();
    const liste = typeof e.getCoalescedEvents === "function" ? e.getCoalescedEvents() : [];
    (liste.length ? liste : [e]).forEach((ev) => {
      const p = punkt(ev);
      const vorher = aktiv.punkte[aktiv.punkte.length - 1];
      if (Math.abs(p.x - vorher.x) + Math.abs(p.y - vorher.y) > 0.0015) aktiv.punkte.push(p);
    });
    plane();
  });

  function ende(e) {
    if (!aktiv || e.pointerId !== aktiv.id) return;
    aktiv = null;
    melden();
  }
  leinwand.addEventListener("pointerup", ende);
  leinwand.addEventListener("pointercancel", ende);
  leinwand.addEventListener("lostpointercapture", ende);

  function leeren() {
    speicher.striche.length = 0;
    zeichneAlles();
    melden();
  }
  loeschen.addEventListener("click", leeren);

  if (typeof ResizeObserver === "function") new ResizeObserver(groesse).observe(leinwand);
  else window.addEventListener("resize", groesse);

  // Bild der Tinte: auf die Striche zugeschnitten, transparenter Grund, neu
  // aus den Punkten gezeichnet (in hoher Auflösung). breitePx/hoehePx sind
  // die Maße in CSS-Pixeln – der PDF-Baustein braucht sie für den Maßstab.
  function holePng() {
    if (!istUnterschrieben()) return Promise.resolve(null);
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const p of speicher.striche) {
      for (const q of p) {
        minX = Math.min(minX, q.x);
        maxX = Math.max(maxX, q.x);
        minY = Math.min(minY, q.y);
        maxY = Math.max(maxY, q.y);
      }
    }
    const lw = LINIE_PX / breite;
    minX -= lw;
    minY -= lw;
    maxX += lw;
    maxY += lw;
    const breitePx = (maxX - minX) * breite;
    const hoehePx = (maxY - minY) * breite;
    const faktor = Math.min(4, 2400 / breitePx, 1200 / hoehePx);
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.ceil(breitePx * faktor));
    c.height = Math.max(1, Math.ceil(hoehePx * faktor));
    const x = c.getContext("2d");
    const s = breite * faktor;
    x.setTransform(s, 0, 0, s, -minX * s, -minY * s);
    speicher.striche.forEach((p) => zeichneStrich(x, p, lw));
    return new Promise((ok, fehler) => {
      c.toBlob((blob) => {
        if (!blob) {
          fehler(new Error("Unterschrift ließ sich nicht umwandeln"));
          return;
        }
        blob.arrayBuffer().then((b) => ok({ bytes: new Uint8Array(b), breitePx, hoehePx }), fehler);
      }, "image/png");
    });
  }

  // Feld wurde neu eingefügt: Größe bestimmen und die gespeicherten Striche zeichnen.
  function nachEinfuegen() {
    groesse();
    melden();
  }

  return { element: huelle, istUnterschrieben, holePng, leeren, nachEinfuegen };
}
