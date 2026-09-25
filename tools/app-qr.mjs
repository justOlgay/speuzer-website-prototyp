#!/usr/bin/env node
// Speuzer: QR-Codes für den App-Hinweis der Website (25.09.2026).
// Je Store ein Code (App Store, Google Play) als SVG in Vereinsblau; der
// appack-Kurzlink qrcode.appack.de/sportfreunde04 leitet iPhones derzeit
// nicht weiter (Befund 25.09.2026), deshalb die direkten Store-Adressen.
// Aufruf: node tools/app-qr.mjs  →  assets/huelle/qr-app-store.svg, qr-google-play.svg
import QRCode from "qrcode";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ZIELE = [
  ["qr-app-store.svg", "https://apps.apple.com/app/ffv-sportfreunde-04/id6805418783"],
  ["qr-google-play.svg", "https://play.google.com/store/apps/details?id=de.appack.project.sportfreunde04"],
];
for (const [datei, url] of ZIELE) {
  const svg = await QRCode.toString(url, { type: "svg", errorCorrectionLevel: "M", margin: 1, color: { dark: "#191793", light: "#FFFFFF" } });
  writeFileSync(path.join(ROOT, "assets", "huelle", datei), svg);
  console.log(datei, svg.length, "Zeichen →", url);
}
