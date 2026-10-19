// User-Agent-Zeilen für die Tests der Umgebung (Paket P1, Zusätze vom 12.10.2026): In-App-Browser und Android-WebView, bei denen das Speichern der PDF-Datei
// oft nicht klappt (Treffer), und normale Browser (kein Treffer). Gebraucht von zugang-test.mjs (Erkennung ohne Browser) und zugang-browser.mjs
// (der Hinweis auf der Seite mit gesetztem User-Agent). Die Zeilen sind Beispiele aus dem Netz, wie sie die Programme senden (Stand Mitte 2024);
// die Versionsnummern spielen für die Erkennung keine Rolle.
//
// inApp: true = die Erkennung muss treffen. kennung: die Kennung, an der sie treffen soll (assets/js/anmeldung/umgebung.js › IN_APP_KENNUNGEN).

export const UA_ZEILEN = [
  // ----- Treffer: Browser anderer Apps und Android-WebView -----
  {
    name: "Facebook (iPhone)",
    kennung: "FBAN",
    inApp: true,
    ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/467.0.0.40.109;FBBV/615230912;FBDV/iPhone14,5;FBMD/iPhone;FBSN/iOS;FBSV/17.5.1;FBSS/3;FBID/phone;FBLC/de_DE;FBOP/5;FBRV/0]",
  },
  {
    name: "Facebook (Android, WebView)",
    kennung: "FB_IAB",
    inApp: true,
    ua: "Mozilla/5.0 (Linux; Android 13; SM-S908B Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/125.0.6422.165 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/466.0.0.46.105;]",
  },
  {
    name: "Instagram (iPhone)",
    kennung: "Instagram",
    inApp: true,
    ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/21F90 Instagram 335.0.2.36.113 (iPhone15,2; iOS 17_5_1; de_DE; de-DE; scale=3.00; 1170x2532; 592986301)",
  },
  {
    name: "Instagram (Android, WebView)",
    kennung: "Instagram",
    inApp: true,
    ua: "Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/UD1A.231105.004; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/126.0.6478.71 Mobile Safari/537.36 Instagram 337.0.0.35.105 Android (34/14; 420dpi; 1080x2400; Google/google; Pixel 8; shiba; shiba; de_DE; 600084592)",
  },
  {
    name: "LinkedIn (iPhone)",
    kennung: "LinkedInApp",
    inApp: true,
    ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 LinkedInApp/9.30.1523",
  },
  {
    name: "LINE (iPhone)",
    kennung: "Line/",
    inApp: true,
    ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Safari Line/14.9.0",
  },
  {
    name: "WeChat (Android, WebView)",
    kennung: "MicroMessenger",
    inApp: true,
    ua: "Mozilla/5.0 (Linux; Android 12; M2102K1G Build/SKQ1.211006.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/116.0.0.0 Mobile Safari/537.36 XWEB/1160065 MMWEBSDK/20231201 MMWEBID/9012 MicroMessenger/8.0.44.2502(0x28002C3B) WeChat/arm64 Weixin NetType/WIFI Language/de ABI/arm64",
  },
  {
    name: "TikTok (iPhone, musical_ly)",
    kennung: "musical_ly",
    inApp: true,
    ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 musical_ly_34.1.0 JsSdk/2.0 NetType/WIFI Channel/App Store ByteLocale/de Region/DE RevealType/DIALOG isDarkMode/0 WKWebView/1",
  },
  {
    name: "TikTok (iPhone, Bytedance)",
    kennung: "Bytedance",
    inApp: true,
    ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 BytedanceWebview/d8a21c6",
  },
  {
    name: "Snapchat (iPhone)",
    kennung: "Snapchat",
    inApp: true,
    ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Snapchat/12.99.0.40 (like Safari/8618.2.12.0.9, panda)",
  },
  {
    name: "Android-WebView einer beliebigen App",
    kennung: "; wv)",
    inApp: true,
    ua: "Mozilla/5.0 (Linux; Android 11; SM-A515F Build/RP1A.200720.012; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/124.0.6367.82 Mobile Safari/537.36",
  },
  {
    name: "Facebook (Android, nur FBAV)",
    kennung: "FBAV",
    inApp: true,
    ua: "Mozilla/5.0 (Linux; Android 10; ONEPLUS A6003) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.6422.165 Mobile Safari/537.36 [FBAV/466.0.0.46.105;]",
  },

  // ----- Kein Treffer: normale Browser -----
  {
    name: "Safari (iPhone)",
    inApp: false,
    ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5.1 Mobile/15E148 Safari/604.1",
  },
  {
    name: "Safari (iPad)",
    inApp: false,
    ua: "Mozilla/5.0 (iPad; CPU OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5.1 Mobile/15E148 Safari/604.1",
  },
  {
    name: "Safari (Mac)",
    inApp: false,
    ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
  },
  {
    name: "Chrome (Android; so melden sich auch Chrome Custom Tabs, ohne „wv“)",
    inApp: false,
    ua: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.6478.71 Mobile Safari/537.36",
  },
  {
    name: "Chrome (Android, Samsung-Gerät)",
    inApp: false,
    ua: "Mozilla/5.0 (Linux; Android 13; SM-S908B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.6422.165 Mobile Safari/537.36",
  },
  {
    name: "Chrome (iPhone)",
    inApp: false,
    ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0.6478.54 Mobile/15E148 Safari/604.1",
  },
  {
    name: "Firefox (Android)",
    inApp: false,
    ua: "Mozilla/5.0 (Android 14; Mobile; rv:127.0) Gecko/127.0 Firefox/127.0",
  },
  {
    name: "Firefox (iPhone)",
    inApp: false,
    ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/127.0 Mobile/15E148 Safari/605.1.15",
  },
  {
    name: "Edge (Android)",
    inApp: false,
    ua: "Mozilla/5.0 (Linux; Android 10; HD1913) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36 EdgA/126.0.2592.80",
  },
  {
    name: "Edge (iPhone)",
    inApp: false,
    ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 EdgiOS/126.2592.80 Mobile/15E148 Safari/605.1.15",
  },
  {
    name: "Samsung Internet",
    inApp: false,
    ua: "Mozilla/5.0 (Linux; Android 14; SAMSUNG SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36",
  },
  {
    name: "Opera (Android)",
    inApp: false,
    ua: "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36 OPR/80.4.4244.78731",
  },
  {
    name: "Chrome (Windows)",
    inApp: false,
    ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  },
  {
    name: "Firefox (Windows)",
    inApp: false,
    ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0",
  },
  {
    name: "Edge (Windows)",
    inApp: false,
    ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.2592.81",
  },
  {
    name: "Headless Chrome (so melden sich die Tests)",
    inApp: false,
    ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/126.0.0.0 Safari/537.36",
  },
];

// Kurzer Zugriff für die Browser-Tests (Name wie oben).
export const uaVon = (name) => {
  const zeile = UA_ZEILEN.find((z) => z.name === name);
  if (!zeile) throw new Error("user-agents.mjs: unbekannter Name " + name);
  return zeile.ua;
};
