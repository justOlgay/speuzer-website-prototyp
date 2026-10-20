/*
  Texte der Oberfläche des Anmelde-Assistenten - Türkisch (Türkçe).
  Übersetzungshilfe: Verbindlich ist der deutsche Text (de-oberflaeche.js), das PDF bleibt deutsch.
  Stand 12.10.2026. Dieselbe Schlüsselstruktur wie de-oberflaeche.js, aber ohne "sprachen" und
  ohne "demo" (die Vorführung bleibt deutsch). Fehlt hier ein Eintrag, gilt der deutsche.
  Prüfung: node tools/anmeldung-test/uebersetzung-pruefen.mjs
  Unabhängige Sprachprüfung (M12, 12.10.2026): Befunde und Änderungen in
  tools/cache/orchestrierung-anmeldung/pruefung/m12-tr/BERICHT.md
  Neu übersetzt nach den Kürzungen des deutschen Textes (P3 Teil b, Paket P4, 12.10.2026): 35 umformulierte und 3 neue
  Schlüssel, Tabelle mit Rückübersetzung in tools/cache/orchestrierung-anmeldung/pruefung/p4-tr/BERICHT.md
  Runde 2 (12.10.2026, Aufträge des Orchestrators): "küçük" statt "genç" für die jüngere Altersklasse (auch in tr-regeln.js),
  abmeldung.status.hinweis grenzt die Abmeldung als Spieler vom Austritt ab, drei geänderte deutsche Texte nachgezogen.

  Stil: einfach und kurz wie das Deutsche - ein Gedanke pro Satz, kurze Wörter, aktiv, höfliches "siz"
  (Bitte-Form: Lütfen ... yazın). Zahlen als westliche Ziffern 0-9. Platzhalter wie {name}, {datum},
  {jahr} bleiben unverändert; die Varianten kind/selbst und die Zeilenumbrüche \n stehen wie im
  Deutschen. Türkische Endungen hängen nie an einem Platzhalter (der Wert ist ein Name, ein Datum
  oder ein deutscher Text): darum stehen Wendungen wie "{name} için", "{datum} tarihinde" oder
  "Kaldır: {datei}".
  Deutsche Dokumentnamen stehen in Klammern hinter der Übersetzung, damit die Familie bei einer
  deutschen Stelle danach fragen kann, zum Beispiel: doğum belgesi (Geburtsurkunde).
  Den Verband nennen wir beim ersten Vorkommen auf einer Seite so: Hessen Futbol Federasyonu
  (Hessischer Fußball-Verband, HFV). Danach steht kurz: federasyon.
  Altersklassen (D-Jugend, Herren ...) und Gruppennamen des Karnevals sind Eigennamen und bleiben deutsch.
  Herren steht als "Herren (yetişkin erkek) takımı": Die Erklärung in der Klammer endet ohne "takımı", damit "takım"
  nur einmal vorkommt und die Endung daran hängt ("Herren (yetişkin erkek) takımında").
  "Ausland" heißt im Türkischen immer "Almanya dışı" (außerhalb Deutschlands), nie "yurt dışı": Für Familien aus der
  Türkei ist "yurt dışı" Deutschland, die Türkei dagegen nicht.

  Begriffsliste (Deutsch = Türkçe) - gilt für Oberfläche und Regeltexte:
  Verein = kulüp
  alter Verein = eski kulüp
  neuer Verein = yeni kulüp
  Verband (Hessischer Fußball-Verband, HFV) = federasyon (Hessen Futbol Federasyonu)
  Mannschaft = takım
  Abteilung = bölüm
  Training = antrenman
  Spiel = maç
  Pflichtspiel (Liga oder Pokal) = lig veya kupa maçı
  Freundschaftsspiel = hazırlık maçı
  Wartezeit = bekleme süresi
  Spielrecht, Spielberechtigung = oynama izni
  Spielerpass = oyuncu lisansı
  Freigabe = serbest bırakma
  Sperre = oynama yasağı
  Abmeldung = kayıt silme
  Kündigung = üyelikten çıkma
  Mitgliedschaft = üyelik
  Mitglied = üye
  passives Mitglied = pasif üye
  Beitrag = aidat
  Aufnahmegebühr = kayıt ücreti
  Lastschrift = otomatik çekim
  Rechnung = fatura
  Kontoinhaber = hesap sahibi
  Sorgerecht = velayet hakkı
  Sorgeberechtigte = velayet hakkı olan kişi
  Elternteil = ebeveyn
  Vormund = vasi
  Unterschrift = imza
  mit Stift unterschreiben = kalemle imzalamak
  am Bildschirm unterschreiben = ekranda imzalamak
  Unterlagen = evrak
  Nachweis = belge
  Kopie = kopya
  Foto machen = Fotoğraf çek
  Datei wählen = Dosya seç
  Habe ich = Bende var
  Fehlt noch = Henüz yok
  Hilfe = Yardım
  Zurück = Geri
  Weiter = İleri
  Prüfen = kontrol
  Ändern = Değiştir
  PDF-Datei = PDF dosyası
  Ausdrucken = yazdırmak
  Vereinsheim = kulüp binası
  Geschäftsstelle = kulüp ofisi
  Jugendleitung = gençlik birimi
  Karnevalabteilung = karnaval bölümü
  Einschreiben = taahhütlü mektup
  Vollmacht = vekâletname
  Attest = sağlık raporu
  Geburtsurkunde = doğum belgesi
  Meldebescheinigung = ikametgâh belgesi
  Reisepass = pasaport
  Personalausweis = kimlik kartı
  Aufenthaltstitel = oturma izni
  Bürgeramt = vatandaş bürosu
  Jobcenter = iş merkezi
  Sozialamt = sosyal yardım dairesi
  Bildung und Teilhabe = Eğitim ve Katılım desteği
  Jugendamt = gençlik dairesi
  Aufnahmeantrag = üyelik başvurusu
  Datenschutz = veri koruma
  Erlaubnis = izin
  Einverständnis, Einwilligung = onay
  Staatsangehörigkeit = vatandaşlık
  Notfallkontakt = acil durum kişisi
  Gesundheitsbogen = sağlık formu
  Erlaubnis für Fotos = fotoğraflar için izin
  Erlaubnis für die Lastschrift = otomatik çekim için izin
  Satzung = tüzük
  Heimweg = eve dönüş
  Ausland (außerhalb Deutschlands) = Almanya dışı
  Fahrten (Mitfahrt zu Spielen) = yolculuk
  Amt (Behörde allgemein) = resmî kurum
  Teil A, B, C (der Datei) = A, B, C bölümü
  Herren-Mannschaft = Herren (yetişkin erkek) takımı
  Senator (Karneval) = Senatör (Senator)
  Mehr erfahren = Daha fazla bilgi
  Aushilfe (bei den Herren) = gerektiğinde oynamak
  Mädchen in einer Jungen-Mannschaft = erkek takımında oynayan kız
  Bescheinigung (des Vereins) = belge (Bescheinigung)
  jüngere Altersklasse = daha küçük yaş grubu
  Abmeldung als Spieler (nicht Austritt aus dem Verein) = oyuncu kaydının silinmesi (üyelikten çıkma değil)
*/

export default {
  // ---------- Rahmen der Seite (Bauzeit) ----------

  seite: {
    h1: "FFV Sportfreunde 04 için kayıt",
    titel: "Kayıt (taslak)",
    beschreibung:
      "FFV Sportfreunde 04 için kayıt asistanının taslağı. Adım adım kayıt olursunuz. Sonunda bir PDF dosyası alırsınız.",
    lead: "Adım adım soruyoruz.",
    assistentTitel: "Kayıt asistanı",
    laedt: "Asistan yükleniyor. Bir şey olmazsa bizi arayın: 069 736868.",
    ohneSkript: "Asistanın çalışması için JavaScript gerekir. Lütfen etkinleştirin. Ya da bizi arayın: 069 736868.",
    ladefehler: "Asistan yüklenemiyor. Lütfen bizi arayın: 069 736868.",
  },

  band: {
    text: "Sadece göz atmak için taslak. Lütfen gerçek bilgi girmeyin. Hiçbir şey gönderilmez.",
    kurz: "Taslak – lütfen gerçek bilgi girmeyin.",
  },

  // ---------- Allgemeines ----------

  allgemein: {
    freiwillig: "(isteğe bağlı)",
    tag: "Gün",
    monat: "Ay",
    jahr: "Yıl",
    datumHinweis: "Örnek: 27 3 2015",
    datumHinweisMonat: "Örnek: 3 2019",
    bitteWaehlen: "Lütfen seçin",
    haeufigeLaender: "Sık kullanılan ülkeler",
    alleLaender: "Tüm ülkeler",
    ja: "Evet",
    nein: "Hayır",
    weissNicht: "Bilmiyorum",
    mehrErfahren: "Daha fazla bilgi",
    dasKind: "çocuk",
    diePerson: "kişi",
    entfernen: "Kaldır",
    schliessen: "Kapat",
    aendern: "Değiştir",
    moment: "Lütfen bir dakika bekleyin …",
    datei: "Dosya",
    keineAngabe: "belirtilmemiş",
    alterJahre: "{n} yaşında",
  },

  kopf: {
    zurueck: "Geri",
    zurueckLang: "Bir adım geri",
    hilfe: "Yardım",
    sprache: "Dil",
    abschnitte: "Bölümler",
    hierSindSie: "Buradasınız:",
  },

  // Trenner zwischen den Teilen einer Aufzählung (Arabisch: "، ").
  liste: {
    trenner: ", ",
  },

  abschnitte: {
    person: "Kişi",
    fussballKarneval: "Futbol / karnaval",
    kontakt: "İletişim",
    beitrag: "Aidat",
    unterlagen: "Evrak",
    unterschrift: "İmza",
    fertig: "Bitti",
  },

  nav: {
    weiter: "İleri",
    zurPruefung: "Kaydet ve kontrole dön",
  },

  fuss: {
    privat: "Her şey cihazınızda kalır. Hiçbir şey göndermeyiz.",
    loeschen: "Tüm bilgileri sil",
  },

  loeschen: {
    titel: "Tüm bilgiler silinsin mi?",
    text: "Tüm bilgiler ve fotoğraflar silinir. Bu işlem geri alınamaz.",
    ja: "Evet, hepsini sil",
    nein: "Hayır, kalsın",
    fertig: "Tüm bilgiler silindi.",
  },

  sprache: {
    fehlt: "Bu dil henüz mevcut değil. Almanca kalır.",
    teilweise: "Bir kısmı henüz çevrilmedi. Orada Almanca kalır.",
    uebersetzungshilfe: "Çeviri yardımı. Geçerli olan Almanca metindir.",
  },

  hilfe: {
    titel: "Yardım",
    einleitung: "Size memnuniyetle yardım ederiz. Bizi arayın ya da yazın.",
    uebersetzen: "Çeviri için yanınızda birini getirebilirsiniz.",
    kontakte: [
      { schluessel: "geschaeftsstelle", tel: "069 736868", mail: "geschaeftsstelle@sportfreunde04.de" },
      { schluessel: "jugendleitung", mail: "jugendleitung@sportfreunde04.de" },
      { schluessel: "karneval", mail: "karnevalabteilung@sportfreunde04.de" },
    ],
    geschaeftsstelle: "Kulüp ofisi (Geschäftsstelle)",
    geschaeftsstelleWofuer: "Kayıtla ilgili tüm sorular",
    jugendleitung: "Gençlik birimi (Jugendleitung)",
    jugendleitungWofuer: "Futbol ve takımlar hakkında sorular",
    karneval: "Karnaval bölümü (Karnevalabteilung)",
    karnevalWofuer: "Dans hakkında sorular",
    anrufen: "Ara",
    schreiben: "E-posta yaz",
  },

  // ---------- Zugang und App ----------
  // Code-Seite: {link} steht für den Link, dessen Text im Schlüssel mit "Link" am Ende steht (keine Endung am Platzhalter).
  // In der Vereins-App läuft der Assistent nie: Es steht nur die Übergabe in den Browser da.

  code: {
    titel: "Deneme antrenmanından sonra kayıt",
    einleitung: "Lütfen kodu girin.\nKodu deneme antrenmanında alırsınız.",
    label: "Kod",
    fehlerLeer: "Lütfen kodu girin.",
    fehlerFalsch: "Kod doğru değil. Lütfen kontrol edin.",
    kein: "Henüz deneme antrenmanına katılmadınız mı? {link}",
    keinLink: "Deneme antrenmanı için randevu alın",
    passiv: "Pasif üye misiniz? Kodu {link} verir.",
    passivLink: "kulüp ofisi",
    zurueck: "Üyelik sayfasına dönün (Mitglied werden)",
  },

  app: {
    uebergabe: "Lütfen kayıt sayfasını tarayıcıda açın.",
    browser: "Tarayıcıda aç",
  },

  umgebung: {
    rahmen: "Burada kaydetme çalışmayabilir.",
    rahmenLink: "Yeni pencerede aç",
    inApp: "Lütfen kayıt sayfasını Safari veya Chrome gibi bir tarayıcıda açın. Burada kaydetme çalışmayabilir.",
    inAppSo: "Üstteki ⋯ simgesine, sonra “Tarayıcıda aç” seçeneğine dokunun.",
  },

  // ---------- Fehlermeldungen ----------

  fehler: {
    seite: "Bu sayfa gösterilemiyor. Lütfen bizi arayın: 069 736868.",
    titelEins: "Lütfen şu bilgiyi kontrol edin:",
    titelMehr: "Lütfen şu {anzahl} bilgiyi kontrol edin:",
    wahl: "Lütfen bir cevap seçin.",
    text: "Lütfen bu alanı doldurun.",
    wer: "Lütfen kimin üye olmak istediğini seçin.",
    vorname: "Lütfen adı yazın.",
    nachname: "Lütfen soyadını yazın.",
    lateinisch: "Lütfen adı pasaporttaki gibi Latin harfleriyle yazın.",
    lateinischOrt: "Lütfen yer adını pasaporttaki gibi Latin harfleriyle yazın.",
    lateinischAnschrift: "Lütfen adresi Latin harfleriyle yazın.",
    lateinischVerein: "Lütfen kulüple ilgili bilgileri Latin harfleriyle yazın.",
    lateinischText: "Lütfen Latin harfleriyle yazın.",
    lateinischNummer: "Lütfen numarayı 0’dan 9’a kadar olan rakamlarla yazın.",
    satzung: "Lütfen kulüp tüzüğünü (Satzung) okuyun ve kutucuğu işaretleyin.",
    datumLeer: "Lütfen tarihi yazın.",
    datumUnvollstaendig: "Lütfen gün, ay ve yılı yazın.",
    datumUnvollstaendigMonat: "Lütfen ay ve yılı yazın.",
    datumUngueltig: "Böyle bir tarih yok. Lütfen kontrol edin.",
    datumZukunft: "Tarih gelecekte. Lütfen kontrol edin.",
    datumZuAlt: "Yıl çok eski. Lütfen kontrol edin.",
    geburtsort: "Lütfen doğum yerini yazın.",
    geburtsland: "Lütfen doğum ülkesini seçin.",
    geschlecht: "Lütfen cinsiyeti seçin.",
    spielrechtFuer: "Lütfen takımları seçin.",
    abteilung: "Lütfen bir bölüm seçin.",
    spielerpass: "Lütfen bir cevap seçin.",
    region: "Lütfen kulübün nerede olduğunu seçin.",
    vereinsname: "Lütfen kulübün adını yazın.",
    vereinsort: "Lütfen kulübün bulunduğu yeri yazın.",
    vereinsland: "Lütfen ülkeyi seçin.",
    abmeldung: "Lütfen bir cevap seçin.",
    abmeldeweg: "Lütfen kaydı nasıl sildireceğinizi seçin.",
    mitgliedschaft: "Lütfen bir cevap seçin.",
    sperre: "Lütfen bir cevap seçin.",
    freigabe: "Lütfen bir cevap seçin.",
    wechsel: "Lütfen bir cevap seçin.",
    deutsch: "Lütfen bir cevap seçin.",
    staaten: "Lütfen en az bir vatandaşlık seçin.",
    staatLeer: "Lütfen bir ülke seçin ya da satırı kaldırın.",
    staatenNichtDeutsch: "Almanya, “Alman pasaportu yok” cevabıyla uyuşmuyor. Lütfen kontrol edin.",
    staatenDeutsch: "Alman pasaportu olduğunu belirttiniz. Lütfen Almanya’yı seçin.",
    ausland: "Lütfen bir cevap seçin.",
    auslandLand: "Lütfen ülkeyi seçin.",
    auslandStadt: "Lütfen şehri yazın.",
    wohnen: "Lütfen bir cevap seçin.",
    ohneElternGrund: "Lütfen nedeni seçin.",
    geborenInDe: "Lütfen bir cevap seçin.",
    jahreInDe: "Lütfen 0 ile 18 arasında bir sayı yazın.",
    sorge: "Lütfen bir cevap seçin.",
    rolle: "Lütfen bu kişinin kim olduğunu seçin.",
    strasse: "Lütfen sokak ve kapı numarasını yazın.",
    plz: "Posta kodu 5 haneden oluşur.",
    ort: "Lütfen şehri yazın.",
    email: "Lütfen geçerli bir e-posta adresi yazın.",
    telefon: "Lütfen en az bir telefon numarası yazın.",
    beitragGruppe: "Lütfen bir aidat grubu seçin.",
    familie: "Lütfen en az bir aile üyesi yazın.",
    senator: "Lütfen bir cevap seçin.",
    leistungen: "Lütfen bir cevap seçin.",
    zahlungArt: "Lütfen nasıl ödeyeceğinizi seçin.",
    kontoinhaber: "Lütfen bir cevap seçin.",
    kiVorname: "Lütfen hesap sahibinin adını yazın.",
    kiNachname: "Lütfen hesap sahibinin soyadını yazın.",
    ibanLeer: "Lütfen IBAN’ı yazın.",
    ibanFormat: "IBAN biçimi yanlış. Lütfen kontrol edin.",
    ibanLand: "Otomatik çekim (Lastschrift) için Avrupa’da bir hesap gerekir. Aksi halde “Fatura”yı seçin.",
    ibanLaenge: "IBAN’da çok az ya da çok fazla karakter var. Lütfen kontrol edin.",
    ibanPruefziffer: "IBAN doğru değil. Lütfen rakamları kontrol edin.",
    fotos: "Lütfen bir cevap seçin.",
    medien: "Lütfen en az bir seçenek seçin.",
    notfallName: "Lütfen adı ve soyadını yazın.",
    notfallTelefon: "Lütfen telefon numarasını yazın.",
    gesundheitsbogen: "Lütfen bir cevap seçin.",
    spielerfoto: "Lütfen fotoğrafı nasıl alacağımızı seçin.",
    spielerfotoBild: "Lütfen bir fotoğraf ekleyin. Ya da “Fotoğrafı kulüp çeker” seçeneğini seçin.",
    nachweisDatei: "Lütfen bir fotoğraf ya da dosya ekleyin. Ya da “Henüz yok” seçeneğini seçin.",
    unterschriftWeg: "Lütfen nasıl imzalayacağınızı seçin.",
    unterschrift: "Lütfen kutuya imzanızı atın. Ya da yukarıdan “Her şeyi kâğıt üzerinde imzalıyorum” seçeneğini seçin.",
    hfvUnterschrift: "Lütfen sayfaları ne zaman imzalayacağınızı seçin.",
    bild: {
      typ: "Bu dosya ne fotoğraf ne de PDF.",
      heic: "Tarayıcı bu görüntü biçimini okuyamıyor. Lütfen fotoğrafı yeniden çekin.",
      nichtLesbar: "Görüntü açılamıyor. Lütfen başka bir tane seçin.",
      zuGross: "Dosya çok büyük. Lütfen daha küçük bir dosya seçin.",
      zuKlein: "Görüntü çok küçük. Lütfen daha büyük bir fotoğraf çekin.",
      leer: "Dosya boş. Lütfen başka bir tane seçin.",
    },
  },

  // ---------- Schritte ----------

  start: {
    titel: "Hoş geldiniz",
    einleitung: "Burada kendinizi ya da çocuğunuzu kaydedersiniz.",
    ergebnis: "Sonunda bize e-postayla bir dosya gönderirsiniz.",
    brauchenTitel: "Şunlara ihtiyacınız var:",
    brauchen: [
      "Ad, soyad ve doğum tarihi",
      "Adres, e-posta adresi ve telefon numarası",
      "Otomatik çekim (Lastschrift) için IBAN (banka hesap numarası)",
      "Evrakın fotoğrafını çekmek için kameralı bir telefon",
    ],
    dauer: "Bu yaklaşık 15 dakika sürer.",
    spracheTitel: "Dil seçin",
    los: "Başlayalım",
  },

  wer: {
    titel: "Kim üye olmak istiyor?",
    kind: "Çocuğum",
    selbst: "Kendim",
  },

  name: {
    titel: { kind: "Çocuğunuzun adı nedir?", selbst: "Adınız nedir?" },
    hinweis: "Adı pasaporttaki gibi yazın.\nLatin harfleri kullanın.",
    vorname: "Ad",
    nachname: "Soyad",
  },

  geburt: {
    datum: {
      titel: { kind: "Çocuğunuz ne zaman ve nerede doğdu?", selbst: "Ne zaman ve nerede doğdunuz?" },
      legende: "Doğum tarihi",
      ort: "Doğum yeri",
      land: "Doğum ülkesi",
    },
    geschlecht: {
      titel: { kind: "Çocuğunuzun cinsiyeti nedir?", selbst: "Cinsiyetiniz nedir?" },
      hinweis: "Pasaporttaki ya da kimlik kartındaki kayıt geçerlidir.",
      m: "Erkek",
      w: "Kadın",
      d: "Divers (diğer)",
      ohne_angabe: "Belirtilmemiş",
      spielrechtTitel: "Oyuncu hangi takımlar için oynasın?",
      spielrechtHinweis: "Bunu kişinin kendisi belirler. Çocuklarda ebeveynler de karar verir.",
      spielrechtM: "Erkek çocuklar ve erkekler",
      spielrechtW: "Kız çocukları ve kadınlar",
    },
  },

  abteilung: {
    titel: { kind: "Çocuğunuz hangi bölüme katılsın?", selbst: "Hangi bölüme katılmak istersiniz?" },
    fussball: "Futbol",
    karneval: "Karnaval",
    karnevalHinweis: "Schnauzer ekibiyle dans",
    beides: "Futbol ve karnaval",
    passiv: "Sadece destek olmak",
    passivHinweis: { kind: "Çocuğunuz üyedir. Spor yapmıyor.", selbst: "Üyesiniz. Spor yapmıyorsunuz." },
  },

  mannschaft: {
    titel: { kind: "Çocuğunuza hangi takım uyuyor?", selbst: "Size hangi takım uyuyor?" },
    mannschaften: "Kulüpteki takımlar: {namen}.",
    keine: "Kulübün bu doğum yılı için kendi takımı yok.",
    keineFolge: "Gençlik birimi sizinle iletişime geçecek.",
    unbekannt: "Takımı henüz belirleyemiyoruz.",
  },

  spielerpass: {
    titel: { kind: "Çocuğunuzun daha önce oyuncu lisansı (Spielerpass) oldu mu?", selbst: "Daha önce oyuncu lisansınız (Spielerpass) oldu mu?" },
    erklaerung: "Oyuncu lisansı (Spielerpass), bir kulüpte maç oynamak için gereken kimlik kartıdır.",
    // Neu am 12.10.2026 (Entscheidung der 1. Vorsitzenden): Der Verein beantragt das Spielrecht immer; die frühere Frage zu den Spielen entfällt.
    spielrecht: "Futbol oynayan kişinin Hessen Futbol Federasyonu’ndan (Hessischer Fußball-Verband, HFV) oynama izni (Spielrecht) alması gerekir.\nBu izni sizin için kulüp ister.\nBu bazen birkaç hafta sürer.",
    jaHinweis: "Almanya dışından bir oyuncu lisansı (Spielerpass) da sayılır.",
    weissNichtHinweis: "Kulüp bunu sizin için kontrol eder.",
  },

  alterVerein: {
    titel: "Bu hangi kulüpteydi?",
    region: "Kulüp nerede?",
    hessen: "Hessen’de",
    bundesland: "Almanya’nın başka bir eyaletinde",
    ausland: "Başka bir ülkede",
    name: "Kulübün adı",
    ort: "Kulübün bulunduğu yer",
    land: "Kulübün ülkesi",
    verband: "Oradaki futbol federasyonu",
  },

  abmeldung: {
    status: {
      titel: { kind: "Çocuğunuzun eski kulüpteki kaydı silindi mi?", selbst: "Eski kulüpteki kaydınız silindi mi?" },
      hinweis: "Burada oyuncu kaydının silinmesi kastediliyor, üyelikten çıkma değil.",
      einschreiben: "Evet, taahhütlü mektupla (Einschreiben)",
      einschreibenHinweis: "Postanın makbuzu sizde.",
      formlos: "Evet, ama sadece e-posta ya da mesajla",
      formlosHinweis: "Bu yolla kayıt silinmiş sayılmaz.",
      noch_nicht: "Hayır, henüz değil",
      weiss_nicht: "Bilmiyorum",
    },
    datum: {
      titel: "Kaydı ne zaman sildirdiniz?",
      legende: "Kayıt silme tarihi",
      hinweis: "Makbuzdaki tarih geçerlidir.",
    },
    weg: {
      titel: "Kaydı nasıl sildiriyorsunuz?",
      vollmacht: "Vekâletname (Vollmacht) ile",
      vollmachtHinweis: "Vekâletnameyi (Vollmacht) imzalarsınız. Kayıt silme işlemini yeni kulüp yapar.",
      einschreiben: "Taahhütlü mektupla (Einschreiben)",
      einschreibenHinweis: "Mektubu eski kulübe kendiniz gönderirsiniz.",
    },
    mitgliedschaft: {
      titel: { kind: "Çocuğunuz eski kulübün üyesi olarak kalıyor mu?", selbst: "Eski kulübün üyesi olarak kalıyor musunuz?" },
      kuendigen: "Hayır, üyelikten çıkıyorum",
      passiv: "Evet, pasif üye olarak",
      passivHinweis: { kind: "Orada artık oynamıyor. Üye olarak kalıyor.", selbst: "Orada artık oynamıyorsunuz. Üye olarak kalıyorsunuz." },
      weiss_nicht: "Bilmiyorum",
    },
    anschrift: {
      titel: "Taahhütlü mektup (Einschreiben) eski kulübün hangi adresine gönderilecek?",
      hinweis: "Adresi kayıt silme formuna (Abmeldung) yazarız.",
      empfaenger: "Alıcının adı",
      empfaengerHinweis: "Örnek: kulübün yönetim kurulu",
      strasse: "Sokak ve kapı numarası",
      plzOrt: "Posta kodu ve şehir",
    },
    spiele: {
      titel: "Son maç ne zamandı?",
      letztes: "Son maç",
      pflicht: "Son lig veya kupa maçı",
      pflichtHinweis: "Hazırlık maçları burada sayılmaz.",
    },
    sperre: {
      titel: "Oynama yasağı var mı?",
      hinweis: "Oynama yasağında kişi bazı maçlarda oynayamaz.",
      bis: "Oynama yasağı ne zamana kadar sürüyor?",
      bisHinweis: "Bilmiyorsanız alanı boş bırakın.",
    },
    freigabe: {
      titel: { kind: "Eski kulüp çocuğunuzu serbest bırakıyor mu?", selbst: "Eski kulüp sizi serbest bırakıyor mu?" },
      hinweis: "Serbest bırakma (Freigabe) şu demek: Eski kulüp geçişe razı.",
    },
    wechsel: {
      titel: { kind: "Çocuğunuz bundan önce de kulüp değiştirdi mi?", selbst: "Bundan önce de kulüp değiştirdiniz mi?" },
      hinweis: "Burada son 6 ay içindeki önceki bir geçiş kastediliyor, bu geçiş değil.",
    },
  },

  pass: {
    deutsch: {
      titel: { kind: "Çocuğunuzun Alman pasaportu ya da kimlik kartı var mı?", selbst: "Alman pasaportunuz ya da kimlik kartınız var mı?" },
      hinweis: "Alman çocuk pasaportu (Kinderreisepass) da sayılır.",
    },
    staaten: {
      titel: { kind: "{name} hangi vatandaşlıklara sahip?", selbst: "Hangi vatandaşlıklara sahipsiniz?" },
      hinweis: "Hepsini yazın. Pasaportta yazıyor.",
      label: "Vatandaşlık {nummer}",
      hinzu: "Başka bir vatandaşlık ekle",
      entfernen: "Kaldır: vatandaşlık {nummer}",
    },
  },

  ausland: {
    titel: { kind: "Çocuğunuz daha önce Almanya dışında yaşadı mı?", selbst: "Daha önce Almanya dışında yaşadınız mı?" },
    land: "Ülke",
    landHinweis: "Almanya’dan önce en son yaşanan yer.",
    stadt: "Şehir",
  },

  wohnen: {
    ort: {
      titel: { kind: "Çocuğunuz nerede yaşıyor?", selbst: "Nerede yaşıyorsunuz?" },
      gemeinsam: { kind: "Benimle aynı adreste", selbst: "Ebeveynlerimle birlikte" },
      gemeinsamHinweis: { kind: "Resmî olarak aynı adreste kayıtlıyız.", selbst: "Resmî olarak aynı adreste kayıtlıyız." },
      nicht_gemeinsam: { kind: "Başka bir adreste", selbst: "Ebeveynlerimden ayrı" },
      nicht_gemeinsamHinweis: { kind: "Resmî olarak farklı adreslerde kayıtlıyız.", selbst: "Resmî olarak farklı adreslerde kayıtlıyız." },
      verwandte: "Almanya’da akrabaların yanında",
      ohne_eltern: "Almanya’da ebeveynler olmadan",
    },
    seit: {
      titel: { kind: "{name} ile birlikte Almanya’da ne zamandan beri yaşıyorsunuz?", selbst: "Ebeveynlerinizle birlikte Almanya’da ne zamandan beri yaşıyorsunuz?" },
      legende: "Ne zamandan beri",
    },
    grund: {
      titel: { kind: "{name} neden ebeveynleri olmadan Almanya’da yaşıyor?", selbst: "Neden ebeveynleriniz olmadan Almanya’da yaşıyorsunuz?" },
      gefluechtet: "Ülkeden kaçış nedeniyle",
      austausch: "Okul değişim programı için",
      verwandte: "Akrabaların yanında",
      pflege: "Bir koruyucu ailede",
    },
    dauer: {
      titel: { kind: "{name} Almanya’da ne zamandır yaşıyor?", selbst: "Almanya’da ne zamandır yaşıyorsunuz?" },
      geboren: { kind: "{name} Almanya’da mı doğdu?", selbst: "Almanya’da mı doğdunuz?" },
      jahre: "Kaç yıldır kesintisiz?",
      jahreHinweis: "Bir sayı, örnek: 5",
    },
  },

  sorge: {
    recht: {
      titel: { kind: "{name} için velayet hakkı kimde?", selbst: "Sizin için velayet hakkı kimde?" },
      hinweis: "Velayet hakkı (Sorgerecht) şu demek: Çocuk için kimin karar verebileceği.",
      beide: "İki ebeveyn de",
      getrennt_bei_mir: "Ebeveynler ayrı yaşıyor",
      getrennt_bei_mirHinweis: "Çocuk benimle yaşıyor.",
      allein: "Velayet hakkı yalnızca bende",
      vormund: "Bir vasi (Vormund)",
      vormundHinweis: "Vasiyi (Vormund) bir mahkeme atadı.",
      pflege: "Koruyucu aile ya da bakım sorumlusu",
      einverstanden: "Diğer ebeveyn razı.",
      einverstandenHinweis: "Lütfen önceden ona sorun.",
    },
    zweiterMitStift: "Diğer ebeveyn onay verdi mi? O zaman kutucuğu işaretleyin.\nOnay vermediyse, üyelik başvurusunu (Aufnahmeantrag) o da imzalar.\nBu yalnızca kalemle mümkündür. PDF’de ilgili yer işaretlidir.",
    zweiterAmBildschirm: "Diğer ebeveyn onay verdi mi? O zaman kutucuğu işaretleyin.\nOnay vermediyse, üyelik başvurusunu (Aufnahmeantrag) o da imzalar.\nBu ekranda yapılabilir. Ya da çıktıda kalemle.",
    personen: {
      titel: { kind: "{name} için kim karar veriyor?", selbst: "Sizin için kim karar veriyor?" },
      erste: { kind: "Sizin bilgileriniz", selbst: "Birinci kişi" },
      zweite: "İkinci kişi",
      rolle: "Bu kişi kim?",
      mutter: "Anne",
      vater: "Baba",
      vormund: "Vasi (Vormund)",
      pflege: "Koruyucu aile ya da bakım sorumlusu",
      andere: "Başka biri",
      vorname: "Ad",
      nachname: "Soyad",
    },
  },

  besonderes: {
    titel: "Özel bir durum var mı?",
    hinweis: "Hiçbiri uymuyorsa devam edin.",
    legende: "Hangisi geçerli?",
    maedchen: "Erkek takımında oynayan kız",
    maedchenHinweis: "C-Jugend ve B-Jugend’de ebeveynlerin onayı gerekir.",
    herrenAushilfe: "Herren (yetişkin erkek) takımında gerektiğinde oynamak",
    herrenAushilfeHinweis: "Ebeveynlerin onayı ve sağlık raporu (Attest) gerekir.",
    sonderspielrecht: "Daha küçük bir yaş grubunda oynamak",
    sonderspielrechtHinweis: "Örneğin engellilik durumunda. Başvuru gerekir.",
    frauHerren: "Herren (yetişkin erkek) takımında oynayan kadın",
    frauHerrenHinweis: "Bunun için federasyona başvuru gerekir.",
  },

  kontakt: {
    anschrift: {
      titel: { kind: "{name} nerede oturuyor?", selbst: "Nerede oturuyorsunuz?" },
      strasse: "Sokak ve kapı numarası",
      plz: "Posta kodu",
      ort: "Şehir",
    },
    erreichen: {
      titel: "Size nasıl ulaşabiliriz?",
      hinweisKind: "Lütfen burada ebeveyn olarak kendi bilgilerinizi yazın.",
      email: "E-posta",
      mobil: "Cep telefonu numarası",
      telefon: "Sabit hat numarası",
      telefonHinweis: "Lütfen en az bir telefon numarası yazın.",
    },
  },

  beitrag: {
    gruppe: {
      titel: { kind: "{name} için hangi aidatı ödüyorsunuz?", selbst: "Hangi aidatı ödüyorsunuz?" },
      vorschlag: "Bunun bedeli yılda {jahr} Euro.\nBu, ayda {monat} Euro eder.",
      vorschlagOhneMonat: "Bunun bedeli yılda {jahr} Euro.",
      aufnahme: "Buna bir kez {betrag} Euro kayıt ücreti eklenir.",
      legende: "Aidat grubu",
      andereGruppe: "Başka bir aidat grubu",
      proJahr: "Yılda {jahr} Euro",
      doppel: "Hem futbolda hem karnavalda mısınız?\nAyrı bir aidat hakkında bilgi isteyin.",
      vorgeschlagen: "Öneri",
    },
    familie: {
      titel: "Ailede başka kimler var?",
      hinweis: "Aile aidatındaki diğer üyeleri yazın.\n6 kişiye kadar yazabilirsiniz.",
      person: "Aile üyesi {nummer}",
      vorname: "Ad",
      nachname: "Soyad",
      geburtsdatum: "Doğum tarihi",
      hinzu: "Başka bir aile üyesi ekle",
      entfernen: "Kaldır: aile üyesi {nummer}",
      voll: "6 kişiden fazlası listeye sığmaz. Lütfen bizi arayın.",
      fehlerVorname: "Lütfen adı yazın.",
      fehlerNachname: "Lütfen soyadını yazın.",
    },
    senator: {
      titel: "Senatör (Senator) olmak ister misiniz?",
      hinweis: "Senatörler karnaval bölümünü destekler.\nBaşvuruya yönetim kurulu karar verir.",
      ja: "Evet, başvuruyorum",
      nein: "Hayır",
    },
  },

  leistungen: {
    titel: { kind: "Ailenize resmî bir kurumdan para yardımı geliyor mu?", selbst: "Resmî bir kurumdan para yardımı alıyor musunuz?" },
    hinweis: "Örneğin temel gelir desteği (Grundsicherungsgeld), sosyal yardım (Sozialhilfe), konut yardımı (Wohngeld), çocuk zammı (Kinderzuschlag) ya da sığınmacı yardımları (Asylbewerberleistungen).\nO zaman aidatı çoğu zaman kurum öder.\nBuna Eğitim ve Katılım desteği (Bildung und Teilhabe) denir.",
    ja: "Evet",
    nein: "Hayır",
    jaHinweis: "Size bir belge (Bescheinigung) düzenleriz.",
    wenigGeld: "Paranız az mı? Bizimle konuşun.",
  },

  zahlung: {
    art: {
      titel: "Nasıl ödemek istersiniz?",
      sepa: "Otomatik çekim (Lastschrift), önerilen",
      sepaHinweis: "Aidatı kulüp yılda bir kez hesaptan çeker.",
      rechnung: "Fatura",
      rechnungHinweis: "Aidatı kendiniz havale edersiniz.",
    },
    inhaber: {
      titel: "Hesap kimin?",
      ich: "Benim",
      andere: "Başka bir kişinin",
      person: "Hesap sahibi",
      vorname: "Ad",
      nachname: "Soyad",
      anschriftGleich: "Aynı adreste oturuyor",
      strasse: "Sokak ve kapı numarası",
      plz: "Posta kodu",
      ort: "Şehir",
    },
    iban: {
      titel: "IBAN numaranız nedir?",
      iban: "IBAN",
      ibanHinweis: "IBAN, banka kartınızın üzerinde yazılıdır.",
      bank: "Bankanın adı",
    },
  },

  einwilligungen: {
    fotos: {
      titel: { kind: "Çocuğunuzun fotoğraflarını gösterebilir miyiz?", selbst: "Fotoğraflarınızı gösterebilir miyiz?" },
      hinweis: "Özgürce karar verirsiniz. Bunu sonra değiştirebilirsiniz.",
      ja: "Evet",
      nein: "Hayır",
      medienLegende: "Fotoğrafları nerede gösterebiliriz?",
      intern: "Kulüpte: ilan panoları ve bültenler",
      web: "İnternette: web sitesi, sosyal medya ve kulüp uygulaması",
      presse: "Gazetede: kulüple ilgili haberler",
      dokumentation: "Yıldönümü kitapçıklarında ve kulüp tarihçelerinde",
    },
    hfv: {
      titel: "Hessen Futbol Federasyonu (Hessischer Fußball-Verband, HFV) neleri yayımlayabilir?",
      hinweis: "İkisi de isteğe bağlıdır. Bunu sonra değiştirebilirsiniz.",
      name: "İsim, FUSSBALL.DE sitesinde görünebilir.",
      nameHinweis: "Bu, 16 yaşından küçük çocuklar için geçerlidir.",
      foto: "Fotoğraf internette görünebilir.",
      fotoHinweis: "Örneğin FUSSBALL.DE sitesinde.",
      ab16: "16 yaşından itibaren federasyon ismi onay almadan gösterebilir. İtiraz edebilirsiniz.",
    },
    fahrten: {
      titel: "Yolculuklar ve mesajlar",
      hinweis: "İkisi de isteğe bağlıdır. Bunu sonra değiştirebilirsiniz.",
      fahrten: "{name} maçlara ve turnuvalara araçla götürülebilir.",
      fahrtenKarneval: "{name} kulüp etkinliklerine araçla götürülebilir.",
      fahrtenHinweis: "Örneğin diğer ebeveynlerin arabalarıyla.",
      messenger: "{name} takımın mesajlaşma grubuna katılabilir.",
      messengerKarneval: "{name} grubun mesajlaşma grubuna katılabilir.",
      messengerHinweis: "Orada tarihler ve anlaşmalar yer alır.",
    },
  },

  // Aufsichtspflicht: Minderjährige, die trainieren oder tanzen (Schritt "heimweg").
  heimweg: {
    titel: "Çocuğunuz eve tek başına gidebilir mi?",
    hinweis: "Antrenman sırasında kulüp çocuğunuza göz kulak olur.",
    allein: "Eve tek başına",
    abholen: "Biri gelip alır",
  },

  notfall: {
    kontakt: {
      titel: "Acil durumda kimi arayalım?",
      hinweis: "Hemen ulaşabileceğimiz bir kişi yazın.",
      name: "Ad soyad",
      telefon: "Telefon numarası",
      beziehung: "Bu kişi kim?",
      beziehungHinweis: "Örnek: büyükanne ya da komşu",
    },
    bogen: {
      titel: "Bir sağlık formu (Gesundheitsbogen) doldurmak ister misiniz?",
      hinweis: "İsteğe bağlıdır.\nAlerji ve hastalık durumunda yardımcı olur.\nSadece antrenörler ve takım sorumluları görür.",
      ja: "Evet, dolduruyorum",
      nein: "Hayır",
    },
    gesundheit: {
      titel: "{name} için sağlık bilgileri",
      hinweis: "Tüm alanlar isteğe bağlıdır.\nBilgiler dosyada ayrı, kendi bölümünde durur.",
      allergien: "Alerjiler",
      erkrankungen: "Hastalıklar",
      medikamente: "İlaçlar",
      medikamenteHinweis: "Örneğin astım spreyi ya da adrenalin kalemi (Adrenalin-Pen). Antrenörle konuşun.",
      sonstiges: "Diğer",
    },
  },

  spielerfoto: {
    titel: "Oyuncu lisansı (Spielerpass) için fotoğrafı nasıl alalım?",
    hinweis: "Hessen Futbol Federasyonu (Hessischer Fußball-Verband, HFV) baş ve omuzların göründüğü bir fotoğraf ister.\nYüz iyi görünmelidir.",
    foto: "Şimdi fotoğraf çekiyorum",
    datei: "Bir fotoğraf seçiyorum",
    verein: "Fotoğrafı kulüp çeker",
    vereinHinweis: "İlk antrenmanda.",
    machen: "Fotoğraf çek",
    waehlen: "Fotoğraf seç",
    anderes: "Başka fotoğraf",
    vorschau: "Fotoğrafın önizlemesi",
    zugeschnitten: "Fotoğrafı uygun şekilde kırpıyoruz.",
    hinzugefuegt: "Fotoğraf eklendi.",
  },

  nachweise: {
    titel: "Hangi evraklar şimdiden elinizde?",
    hinweis: "Elinizdeki her evrakın fotoğrafını çekin.\nEksik olanları sonra gönderin.",
    habe: "Bende var",
    fehlt: "Henüz yok",
    foto: "Fotoğraf çek",
    datei: "Dosya seç",
    entfernen: "Kaldır",
    entfernenLang: "Kaldır: {datei}",
    hinzugefuegt: "Dosya eklendi.",
    entfernt: "Dosya kaldırıldı.",
    vorschau: "Önizleme: {datei}",
    pdf: "PDF dosyası",
    wie: "Nasıl edinirsiniz:",
    wo: "Nerede?",
    dateien: "Dosyalarınız:",
    art: {
      verein: "Kulüp bunu istiyor.",
      freiwillig: "Bu isteğe bağlıdır.",
      nur_wenn: "Sizin için geçerliyse gereklidir.",
      offen: "Belki gerekli. Kulüp size haber verir.",
    },
    leer: "Hiçbir evrak gerekmiyor.",
  },

  unterschriften: {
    titel: "Nasıl imzalamak istersiniz?",
    weg: {
      bildschirm: "Ekranda, izin verilen yerlerde",
      bildschirmHinweis: "Burada parmağınızla imzalarsınız.",
      bildschirmAlles: "Ekranda",
      bildschirmAllesHinweis: "Federasyon formlarını da parmağınızla imzalarsınız.",
      papier: "Her şeyi kâğıt üzerinde imzalıyorum",
      papierHinweis: "Yazdırırsınız ve kalemle imzalarsınız.",
    },
    satzung: {
      erklaerung: "Tüzük (Satzung), kulübün kurallarıdır.",
      link: "Tüzüğü (Satzung) okuyun",
      linkZusatz: "PDF, yeni sekmede açılır",
      ohneLink: "Tüzüğü (Satzung) kulübün internet sitesinde bulabilirsiniz.",
      label: "Tüzüğü (Satzung) okudum.",
      freiwillig: "İsteğe bağlı. Kutucuğu işaretlemezseniz, çıktıda elle işaretlersiniz.",
    },
    hierHinweis: "Parmağınızla, kalemle ya da fareyle çizin.",
    giltFuer: "Bu imza şunlar için geçerlidir:",
    giltFuerBlaetter: "Bu imza {n} sayfa için geçerlidir",
    person: {
      mitglied: { kind: "İmza: {name}", selbst: "İmzanız" },
      sorgeberechtigte: "İmza: {person}",
      ersteEltern: "İmza: anne ya da baba",
      kontoinhaber: "Hesap sahibinin imzası: {person}",
      spieler: { kind: "İmza: {name}", selbst: "İmzanız" },
      spielerHinweis: {
        kind: "Çocuğunuz yazı yazabiliyor mu? O zaman kendisi imzalar.",
        selbst: "18 yaşından küçük müsünüz? O zaman siz de imzalayın.",
      },
      zweiteEltern: "İmza: diğer ebeveyn",
      zweiteHinweis: "Diğer ebeveyn burada kendisi imzalar.\nYa da daha sonra çıktıyı kalemle imzalar.",
      ersteSorge: "İmzanız",
    },
    stand0: "Henüz imzalanmadı",
    standOk: "İmzalandı",
    standZuKurz: "Çok kısa. Lütfen imzanızı tam atın.",
    loeschen: "Sil",
    loeschenLang: "İmzayı sil: {person}",
    ariaLabel: "İmza alanı. Parmağınızla, kalemle ya da fareyle çizin.",
    stiftTitel: "Bu sayfaları kalemle imzalıyorsunuz",
    stiftHinweis: "Hessen Futbol Federasyonu (Hessischer Fußball-Verband, HFV) kendi formları için kalemle imza ister.",
    stiftHinweisPapier: "Tüm sayfaları kalemle imzalıyorsunuz.",
    stiftListe: "Bu sayfalar şunlardır:",
    hfvTitel: "Bu sayfaları ne zaman imzalıyorsunuz?",
    training: "İlk antrenmanda – sayfaları biz getiriyoruz",
    selbst_drucken: "Kendim yazdırıyorum",
    selbst_druckenHinweis: "Sayfaları yazdırır ve imzalarsınız.",
    nichts: "Kaydınız için imza gerekmiyor.",
  },

  pruefen: {
    titel: "Her şey doğru mu?",
    hinweis: "Bir şeyi düzeltmek için “Değiştir”i kullanın.",
    weiter: "Her şey doğru – dosyayı oluştur",
    aendern: "Değiştir",
    aendernLang: "Değiştir: {bereich}",
    bereiche: {
      person: "Kişi",
      abteilung: "Futbol ve karnaval",
      pass: "Pasaport ve oturulan yer",
      sorge: "Velayet hakkı",
      kontakt: "İletişim",
      beitrag: "Aidat ve ödeme",
      einwilligungen: "Onaylar",
      notfall: "Acil durum",
      foto: "Fotoğraf",
      unterlagen: "Evrak",
      unterschriften: "İmzalar",
    },
    zeilen: {
      name: "Ad soyad",
      geboren: "Doğum tarihi",
      geburtsort: "Doğum yeri",
      geschlecht: "Cinsiyet",
      abteilung: "Bölüm",
      mannschaft: "Takım",
      alterVerein: "Önceki kulüp",
      alteMitgliedschaft: "Eski kulüpteki üyelik",
      abmeldung: "Kayıt silme",
      staaten: "Vatandaşlık",
      ausland: "Almanya dışında son yaşanan yer",
      wohnen: "Oturulan yer",
      sorge: "Velayet hakkı",
      sorgePersonen: "Kişiler",
      anschrift: "Adres",
      email: "E-posta",
      telefon: "Telefon",
      beitrag: "Aidat",
      leistungen: "Resmî kurumdan yardım",
      zahlung: "Ödeme",
      kontoinhaber: "Hesap sahibi",
      iban: "IBAN",
      fotos: "Fotoğraflar",
      hfv: "Hessen Futbol Federasyonu (HFV)",
      fahrten: "Yolculuklar",
      messenger: "Mesajlaşma grubu",
      heimweg: "Eve dönüş",
      notfall: "Acil durum kişisi",
      gesundheitsbogen: "Sağlık formu",
      spielerfoto: "Oyuncu fotoğrafı",
      unterschriftWeg: "İmza",
      satzung: "Tüzük (Satzung) okundu",
      hfvUnterschrift: "Federasyon için sayfalar",
      dateiEins: "1 dosya",
      dateiMehr: "{anzahl} dosya",
    },
    werte: {
      ja: "Evet",
      nein: "Hayır",
      weissNicht: "Bilmiyorum",
      satzungVonHand: "Hayır – elle işaretlersiniz",
      heimweg: { allein: "Eve tek başına", abholen: "Biri gelip alır" },
      geschlecht: { m: "Erkek", w: "Kadın", d: "Divers (diğer)", ohne_angabe: "Belirtilmemiş" },
      abteilung: { fussball: "Futbol", karneval: "Karnaval", beides: "Futbol ve karnaval", passiv: "Sadece destek olmak" },
      abmeldung: {
        einschreiben: "{datum} tarihinde taahhütlü mektupla (Einschreiben)",
        formlos: "Sadece e-posta ya da mesajla",
        noch_nicht: "Henüz değil",
        weiss_nicht: "Bilmiyorum",
        vollmacht: "vekâletnameyle (Vollmacht)",
        weg: "Yöntem: {weg}",
      },
      mitgliedschaft: { kuendigen: "Üyelikten çıkıyorum", passiv: "Pasif üye olarak kalıyor", weiss_nicht: "Bilmiyorum" },
      sorge: {
        beide: "İki ebeveyn de",
        getrennt_bei_mir: "Ebeveynler ayrı, çocuk benimle yaşıyor",
        allein: "Velayet hakkı yalnızca bende",
        vormund: "Vasi (Vormund)",
        pflege: "Koruyucu aile ya da bakım sorumlusu",
      },
      wohnen: {
        gemeinsam: "Ebeveynlerle birlikte Almanya’da",
        nicht_gemeinsam: "Ebeveynlerle, aynı adreste kayıtlı değil",
        verwandte: "Akrabaların yanında",
        ohne_eltern: "Ebeveynler olmadan",
      },
      zahlung: { sepa: "Otomatik çekim (Lastschrift)", rechnung: "Fatura" },
      kontoinhaber: { mitglied: "Ben kendim", sorgeberechtigt: "Ben kendim", andere: "Başka bir kişi" },
      unterschriftWeg: { bildschirm: "Ekranda, izin verilen yerlerde", bildschirmAlles: "Ekranda", papier: "Hepsi kâğıt üzerinde" },
      hfvUnterschrift: { training: "İlk antrenmanda", selbst_drucken: "Kendim yazdırıyorum" },
      habe: "Bende var",
      fehlt: "Henüz yok",
      vereinMacht: "Fotoğrafı kulüp çeker",
      fotoDa: "Fotoğraf var",
      unterschrieben: "İmzalandı",
      nichtUnterschrieben: "Henüz imzalanmadı",
      nichtUnterschriebenFreiwillig: "İmzalanmadı (isteğe bağlı)",
      mitStift: "Ekranda değil – çıktıda kalemle",
      betragJahr: "{gruppe}, yılda {jahr} Euro",
    },
    weitereHinweise: "Diğer notlar ({anzahl})",
    klaertVerein: "Bunu kulüp netleştirir",
    fristUnsicher: "Bu bir tahmindir. Kulüp bunu ayrıntılı kontrol eder.",
    weiterleitungTitel: "Bu birimler sizinle iletişime geçer:",
    weiterleitungAn: {
      jugendleitung: "Gençlik birimi (Jugendleitung)",
      passwesen: "Lisans birimi (Passwesen; oyuncu lisanslarıyla ilgilenir; kulüp ofisi üzerinden ulaşılabilir)",
      geschaeftsstelle: "Kulüp ofisi (Geschäftsstelle)",
      karneval: "Karnaval bölümü (Karnevalabteilung)",
      spielausschuss: "Herren (yetişkin erkek) takımı maç komitesi (Spielausschuss; geçişleri ve süreleri kontrol eder; kulüp ofisi üzerinden ulaşılabilir)",
    },
    hinweisArt: {
      warnung: "Dikkat",
      info: "Bilgi için",
      frist: "Süre",
      offen: "Bunu kulüp netleştirir",
    },
  },

  fertig: {
    titelArbeit: "Dosyanız hazırlanıyor",
    titelFertig: "Dosyanız hazır",
    titelFehler: "İşlem başarısız oldu",
    arbeitet: "Lütfen bir dakika bekleyin. Dosya oluşturuluyor.",
    nochmal: "Yeniden dene",
    datei: "Dosya: {name}",
    info: "{seiten} sayfa, {groesse}",
    // Titel der Teile des PDF (SCHNITTSTELLEN Abschnitt 9)
    teilTitel: {
      A: "A bölümü – Sizin için",
      B: "B bölümü – Kulüp için",
      C: "C bölümü – Gizli",
    },
    herunterladen: "Dosyayı indir",
    teilen: "Dosyayı paylaş",
    ansehen: "Dosyayı görüntüle",
    fotoSpeichern: "Oyuncu fotoğrafını resim olarak kaydet",
    gespeichert: "Dosya kaydediliyor. Genellikle “İndirilenler” klasöründe bulunur.",
    geteilt: "Paylaşıldı.",
    teilenFehler: "Burada paylaşma çalışmıyor. Bunun yerine dosya kaydedildi.",
    fehler: {
      bibliothek: "Programın bir parçası yüklenemiyor. Lütfen internet bağlantınızı kontrol edin.",
      vorlageNetz: "Bir şablon yüklenemiyor. Lütfen internet bağlantınızı kontrol edin.",
      vorlageGeaendert: "Kulübün bir şablonu değişti. Lütfen kulüp ofisini (Geschäftsstelle) arayın.",
      modul: "Dosya henüz oluşturulamıyor. Lütfen kulüp ofisini (Geschäftsstelle) arayın.",
      pdf: "Dosya oluşturulamadı. Lütfen yeniden deneyin.",
    },
    // Dosyayı e-posta ile gönderme (M10); {knopf} düğmenin yazısıdır. E-postanın konusu ve metni Almanca kalır (hilfen.js).
    senden: {
      titel: "Dosyayı kulübe nasıl gönderirsiniz",
      handy1: "Aşağıdaki “{knopf}” düğmesine dokunun.",
      handy2: "Yukarıdaki “{knopf}” düğmesine dokunun. E-posta uygulamanızı seçin. Dosya zaten ekli.",
      handy3: "Adresi “Kime” alanına yapıştırın. E-postayı gönderin.",
      computer1: "Yukarıdaki “{knopf}” düğmesine tıklayın.",
      computer2: "Yeni bir e-posta yazın. Dosyayı ekleyin.",
      computer3: "E-postayı aşağıdaki adrese gönderin.",
      adresseTitel: "Kulüp ofisinin e-posta adresi:",
      kopieren: "Adresi kopyala",
      kopiert: "Adres kopyalandı.",
      kopierenFehler: "Burada kopyalama çalışmıyor. Adres seçili. Adresi kendiniz kopyalayın.",
      oeffnen: "Kulüp ofisine yeni e-posta aç",
      anhang: "“{knopf}” düğmesini kullanırsanız dosyayı kendiniz ekleyin.",
    },
    naechsteTitel: "Sonraki adımlar",
    unterschriftTraining: "Hessen Futbol Federasyonu (Hessischer Fußball-Verband, HFV) sayfalarını ilk antrenmanda kalemle imzalarsınız.",
    unterschriftDrucken: "Dosyayı yazdırın. Tüm mavi işaretlerde kalemle imza atın.",
    abgebenAusgedruckt: "İmzalı sayfaların fotoğrafını çekin veya tarayın. Bunları e-posta ile kulüp ofisine (Geschäftsstelle) gönderin. Ya da kulüpte teslim edin.",
    unterschriftDruckenTeil: "Hessen Futbol Federasyonu (Hessischer Fußball-Verband, HFV) sayfalarını yazdırın. Mavi işaretlerde kalemle imza atın.",
    unterschriftTrainingAlle: "Tüm sayfaları ilk antrenmanda kalemle imzalarsınız. Kulüp bunları yazdırır.",
    unterschriftFertig: "Her şeyi ekranda imzaladınız. Neleri yazdırmanız gerektiği dosyanın A bölümünde yazıyor.",
    unterschriftRest: "Bazı imzalar hâlâ eksik. Bunlar PDF’deki mavi işaretlerdir.\nOralara kalemle imza atın. Neleri yazdırmanız gerektiği dosyanın A bölümünde yazıyor.",
    unterschriftFoto: "İmzalı sayfaların fotoğrafını çekin veya tarayın. Bunları aynı e-postayla gönderin.",
    fehltTitel: "Bu evraklar hâlâ eksik:",
    fehltHinweis: "Elinize geçer geçmez e-posta ile sonradan gönderin.",
    nichtWhatsapp: "Lütfen dosyayı WhatsApp ile göndermeyin. Özel bilgiler içeriyor.",
    teilC: "C bölümü (Teil C) sağlık bilgileri içerir. Kulüp bunu ayrı saklar.",
    danach: "Ardından kulüp kaydınızı kontrol eder.",
    weiterePerson: "Başka bir kişiyi kaydet",
    weiterePersonHinweis: "Adres, iletişim, ebeveyn ve ödeme bilgileri aynen aktarılır.",
    neuePerson: "Şimdi bir sonraki kişiyi kaydediyorsunuz.",
  },
};
