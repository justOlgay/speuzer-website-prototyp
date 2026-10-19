export const IN_APP_KENNUNGEN = ["; wv)", "FBAN", "FBAV", "FB_IAB", "Instagram", "LinkedInApp", "Line/", "MicroMessenger", "musical_ly", "Bytedance", "Snapchat"];

export function erkenneInAppBrowser(userAgent) {
  const ua = typeof userAgent === "string" ? userAgent : "";
  return IN_APP_KENNUNGEN.find((kennung) => ua.includes(kennung)) || null;
}

export function imRahmen(fenster) {
  if (!fenster) return false;
  try {
    return fenster.top !== fenster.self;
  } catch (fehler) {
    return true;
  }
}

export function umgebungshinweis(userAgent, fenster) {
  if (erkenneInAppBrowser(userAgent)) return "inapp";
  if (imRahmen(fenster)) return "rahmen";
  return null;
}
