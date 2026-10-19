/*
  Umgebung, in der die Seite läuft (Paket P1, Zusätze vom 12.10.2026). Ohne DOM, in Node importierbar
  (Test: tools/anmeldung-test/zugang-test.mjs).

  Am Ende speichert der Assistent die Datei, teilt sie oder öffnet das Mail-Programm. Das klappt nicht überall:
    - In einem Rahmen einer anderen Seite. Auf der Website zeigt die Hülle der Vereinsseite die Workspace-Seiten in einem
      <iframe> ohne allow-Angaben (zum Beispiel allow="web-share", allow="clipboard-write"): Teilen, Kopieren und Herunterladen
      sind dort nicht verlässlich. Darum öffnen die Links auf die Anmeldung in einem neuen Fenster (target="_blank").
    - In den Browsern anderer Apps (Facebook, Instagram und andere) und in der Android-WebView. Sie speichern oder teilen die
      PDF-Datei oft nicht; dann wären am Ende alle Angaben verloren.
  Läuft die Seite trotzdem so, zeigt der erste Bildschirm oben einen Hinweis (assistent.js, Texte unter "umgebung").
  Der Assistent bleibt dabei bedienbar.

  In-App-Browser erkennt die Funktion nur an bekannten Kennungen im User-Agent (unten). Ein normaler Safari, Chrome (auch Chrome
  Custom Tabs ohne "wv"), Firefox, Edge oder Samsung Internet trägt keine davon. In der Vereins-App (?app=1) hat die App-Weiche
  Vorrang: Dort zeigt der Assistent nur die Übergabe in den Browser, nie diesen Hinweis.
*/

// Kennungen im User-Agent. "; wv)" ist die Android-WebView, FBAN, FBAV und FB_IAB gehören zu Facebook, dazu Instagram, LinkedIn,
// LINE, WeChat (MicroMessenger), TikTok (musical_ly, Bytedance) und Snapchat.
export const IN_APP_KENNUNGEN = ["; wv)", "FBAN", "FBAV", "FB_IAB", "Instagram", "LinkedInApp", "Line/", "MicroMessenger", "musical_ly", "Bytedance", "Snapchat"];

// Die erste Kennung, die im User-Agent steht, sonst null.
export function erkenneInAppBrowser(userAgent) {
  const ua = typeof userAgent === "string" ? userAgent : "";
  return IN_APP_KENNUNGEN.find((kennung) => ua.includes(kennung)) || null;
}

// Läuft die Seite in einem Rahmen? Das Fenster oben ist ein anderes als dieses. Der Zugriff kann scheitern (Browser mit
// Einschränkungen); dann gilt die Seite als eingerahmt. Ohne Fenster (zum Beispiel in Node): nein.
export function imRahmen(fenster) {
  if (!fenster) return false;
  try {
    return fenster.top !== fenster.self;
  } catch (fehler) {
    return true;
  }
}

// Welcher Hinweis gehört zur Umgebung? "inapp" (Vorrang: Auch außerhalb eines Rahmens klappt das Speichern dort oft nicht),
// "rahmen" oder null.
export function umgebungshinweis(userAgent, fenster) {
  if (erkenneInAppBrowser(userAgent)) return "inapp";
  if (imRahmen(fenster)) return "rahmen";
  return null;
}
