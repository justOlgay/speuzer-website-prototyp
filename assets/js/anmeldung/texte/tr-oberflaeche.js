/*
  Texte der Oberfläche des Anmelde-Assistenten - Türkisch (Türkçe).
  Übersetzungshilfe: Verbindlich ist der deutsche Text (de-oberflaeche.js), das PDF bleibt deutsch.
  Stand 29.09.2026. Dieselbe Schlüsselstruktur wie de-oberflaeche.js, aber ohne "sprachen" und
  ohne "demo" (die Vorführung bleibt deutsch). Fehlt hier ein Eintrag, gilt der deutsche.
  Prüfung: node tools/anmeldung-test/uebersetzung-pruefen.mjs

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
*/

export default {
  // ---------- Rahmen der Seite (Bauzeit) ----------

  seite: {
    h1: "FFV Sportfreunde 04 için kayıt",
    titel: "Kayıt (taslak)",
    beschreibung:
      "FFV Sportfreunde 04 için kayıt asistanının taslağı. Adım adım kayıt olursunuz. Sonunda bir PDF dosyası alırsınız.",
    lead: "Adım adım soruyoruz. Sonunda tüm evrakın bulunduğu bir dosya alırsınız.",
    assistentTitel: "Kayıt asistanı",
    laedt: "Asistan yükleniyor. Bir şey olmazsa bizi arayın: 069 736868.",
    ohneSkript: "Asistanın çalışması için JavaScript gerekir. Lütfen açın. Ya da bizi arayın: 069 736868.",
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
    dasKind: "çocuk",
    diePerson: "kişi",
    entfernen: "Kaldır",
    schliessen: "Kapat",
    aendern: "Değiştir",
    moment: "Lütfen bir dakika bekleyin …",
    datei: "Dosya",
    keineAngabe: "belirtilmemiş",
    jahre: "yaş",
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

  // ---------- Fehlermeldungen ----------

  fehler: {
    seite: "Bu sayfa gösterilemiyor. Lütfen bizi arayın: 069 736868.",
    titelEins: "Lütfen şu bilgiyi kontrol edin:",
    titelMehr: "Lütfen şu {anzahl} bilgiyi kontrol edin:",
    wahl: "Lütfen bir cevap seçin.",
    text: "Lütfen bu alanı doldurun.",
    wer: "Lütfen kimin üye olmak istediğini seçin.",
    vorname: "Lütfen adı yazın.",
    nachname: "Lütfen soyadı yazın.",
    lateinisch: "Lütfen adı pasaporttaki gibi Latin harfleriyle yazın.",
    lateinischOrt: "Lütfen yer adını pasaporttaki gibi Latin harfleriyle yazın.",
    lateinischAnschrift: "Lütfen adresi Latin harfleriyle yazın.",
    lateinischVerein: "Lütfen kulüple ilgili bilgileri Latin harfleriyle yazın.",
    lateinischText: "Lütfen Latin harfleriyle yazın.",
    lateinischNummer: "Lütfen numarayı 0’dan 9’a kadar olan rakamlarla yazın.",
    satzung: "Lütfen kulüp tüzüğünü (Satzung) okuyun ve kutucuğu işaretleyin.",
    uhrzeit: "Lütfen saati şöyle yazın: 21:30.",
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
    spielen: "Lütfen bir cevap seçin.",
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
    ort: "Lütfen yerleşim yerini yazın.",
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
    notfallName: "Lütfen adı yazın.",
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
    einleitung: "Burada kendinizi ya da çocuğunuzu kulübe kaydedersiniz.\nAdım adım soruyoruz.",
    ergebnis: "Sonunda bir PDF dosyası alırsınız.\nBu dosya, görüntülemek ve yazdırmak içindir.\nİçinde kulüp için gereken tüm evrak vardır.",
    brauchenTitel: "Şunlara ihtiyacınız var:",
    brauchen: [
      "Ad ve doğum tarihi",
      "Adresiniz, e-posta adresiniz ve telefon numaranız",
      "Otomatik çekim (Lastschrift) için IBAN (banka hesap numarası)",
      "Belgelerin fotoğrafını çekmek için kameralı bir telefon",
    ],
    dauer: "Yaklaşık 15 dakikaya ihtiyacınız var.",
    datenschutz: "Bilgileriniz cihazınızda kalır.\nHiçbir şey göndermeyiz.",
    hilfe: "Yardım mı lazım? Yukarıdaki “Yardım”a dokunun.",
    spracheTitel: "Dil seçin",
    los: "Başlayalım",
  },

  wer: {
    titel: "Kim üye olmak istiyor?",
    kind: "Çocuğum",
    kindHinweis: "Her şeyi çocuğunuz için doldurursunuz.",
    selbst: "Kendim",
    selbstHinweis: "Kendinizi kaydedersiniz.",
    mehrere: "Birden fazla kişiyi mi kaydetmek istiyorsunuz?\nSonunda bir sonraki kişiyi kaydedebilirsiniz.\nAdresiniz ve ödeme bilgileriniz o zaman kendiliğinden aktarılır.",
  },

  name: {
    titel: { kind: "Çocuğunuzun adı nedir?", selbst: "Adınız nedir?" },
    hinweis: "Adı pasaporttaki gibi yazın.\nLatin harfleri kullanın.",
    vorname: "Ad",
    vornameHinweis: "Tüm adlar, pasaporttaki gibi.",
    nachname: "Soyad",
  },

  geburt: {
    datum: {
      titel: { kind: "Çocuğunuz ne zaman ve nerede doğdu?", selbst: "Ne zaman ve nerede doğdunuz?" },
      legende: "Doğum tarihi",
      ort: "Doğum yeri",
      ortHinweis: "Şehir ya da yer.",
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
      spielrechtHinweis: "Bunu kişi kendisi belirler. Çocuklarda ebeveynler de karar verir.",
      spielrechtM: "Erkek çocuklar ve erkekler",
      spielrechtW: "Kız çocukları ve kadınlar",
    },
  },

  abteilung: {
    titel: { kind: "Çocuğunuz nerede yer alsın?", selbst: "Nerede yer almak istersiniz?" },
    fussball: "Futbol",
    fussballHinweis: "Antrenman ve maçlar",
    karneval: "Karnaval",
    karnevalHinweis: "Schnauzer ekibiyle dans",
    beides: "Futbol ve karnaval",
    beidesHinweis: "İkisi de tek kulüpte",
    passiv: "Sadece destek",
    passivHinweis: "Üyesiniz. Spor yapmıyorsunuz.",
  },

  mannschaft: {
    titel: { kind: "Çocuğunuza hangi takım uyuyor?", selbst: "Size hangi takım uyuyor?" },
    alter: "{name} {alter} yaşında. Doğum yılı grubu: {jahrgang}.",
    klasse: "Bu, {klasse}-Jugend (gençlik takımı) için uygun.",
    klasseHerren: "Bu, Herren (yetişkin erkek takımı) için uygun.",
    mannschaften: "Kulüpteki takımlar: {namen}.",
    keine: "Kulübün bu doğum yılı için kendi takımı yok.",
    keineFolge: "Gençlik birimi sizinle iletişime geçecek.",
    unbekannt: "Takımı henüz belirleyemiyoruz.",
  },

  spielen: {
    titel: { kind: "Çocuğunuz maçlara katılsın mı?", selbst: "Maçlara katılmak ister misiniz?" },
    erklaerung: "Maç oynamak isteyen kişinin Hessen Futbol Federasyonu’ndan (Hessischer Fußball-Verband, HFV) oynama izni (Spielrecht) alması gerekir.\nBu izni sizin için kulüp ister.\nBu bazen birkaç hafta sürer.",
    ja: { kind: "Evet, maçlarda ve futbol şenliklerinde (Spielfeste)", selbst: "Evet, maçlarda" },
    jaHinweis: "Oynama iznini (Spielrecht) kulüp ister.",
    nein: "Hayır, sadece antrenman",
    neinHinweis: "Bunu sonra değiştirebilirsiniz.",
  },

  spielerpass: {
    titel: { kind: "Çocuğunuzun daha önce oyuncu lisansı (Spielerpass) oldu mu?", selbst: "Daha önce oyuncu lisansınız (Spielerpass) oldu mu?" },
    hinweis: { kind: "Sadece antrenman yapmış olsa bile. Yurt dışında olsa bile.", selbst: "Sadece antrenman yapmış olsanız bile. Yurt dışında olsa bile." },
    erklaerung: "Oyuncu lisansı (Spielerpass), bir kulüpte maç oynamak için gereken kimlik kartıdır.",
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
    verbandHinweis: "Sadece biliyorsanız.",
  },

  abmeldung: {
    status: {
      titel: { kind: "Çocuğunuzun eski kulüpteki kaydı silindi mi?", selbst: "Eski kulüpteki kaydınız silindi mi?" },
      hinweis: "Eski kulübe e-posta göndermek yetmez.\nHessen Futbol Federasyonu (Hessischer Fußball-Verband, HFV) taahhütlü mektup (Einschreiben) ister.\nYa da kayıt silme için vekâletnameyi (Vollmacht für die Abmeldung) imzalarsınız.",
      einschreiben: "Evet, taahhütlü mektupla (Einschreiben)",
      einschreibenHinweis: "Postanın makbuzu sizde.",
      formlos: "Evet, ama sadece e-posta ya da mesajla",
      formlosHinweis: "Bu, kayıt silme sayılmaz.",
      noch_nicht: "Hayır, henüz değil",
      weiss_nicht: "Bilmiyorum",
    },
    datum: {
      titel: "Kaydı ne zaman sildirdiniz?",
      legende: "Kayıt silme tarihi",
      hinweis: "Taahhütlü mektupta (Einschreiben) makbuzdaki tarih geçerlidir.",
    },
    weg: {
      titel: "Kaydı nasıl sildiriyorsunuz?",
      vollmacht: "Vekâletname (Vollmacht) ile",
      vollmachtHinweis: "Kayıt silme için vekâletnameyi (Vollmacht für die Abmeldung) imzalarsınız. Sonra kayıt silme işlemini kulüp yapar.",
      einschreiben: "Taahhütlü mektupla (Einschreiben)",
      einschreibenHinweis: "Taahhütlü mektubu (Einschreiben) eski kulübe kendiniz gönderirsiniz.",
    },
    mitgliedschaft: {
      titel: { kind: "Çocuğunuz eski kulübün üyesi olarak kalıyor mu?", selbst: "Eski kulübün üyesi olarak kalıyor musunuz?" },
      hinweis: "Üyelik kendiliğinden bitmez.\nOyuncu olarak kaydı sildirmek de üyeliği bitirmez.",
      kuendigen: "Hayır, üyelikten çıkıyorum",
      kuendigenHinweis: "Eski kulüpteki üyelikten çıkarsınız (Kündigung).",
      passiv: "Evet, pasif üye olarak",
      passivHinweis: { kind: "Çocuğunuz orada artık oynamıyor. Üye olarak kalıyor.", selbst: "Orada artık oynamıyorsunuz. Üye olarak kalıyorsunuz." },
      weiss_nicht: "Bilmiyorum",
    },
    anschrift: {
      titel: "Eski kulübe giden taahhütlü mektup (Einschreiben) nereye gidiyor?",
      hinweis: "Bir şey yazmak zorunda değilsiniz. Kulüp size yardım eder.\nAdresi eski kulüpteki kayıt silme formuna (Abmeldung) biz yazarız.",
      empfaenger: "Alıcının adı",
      empfaengerHinweis: "Örnek: kulübün yönetim kurulu",
      strasse: "Sokak ve kapı numarası",
      plzOrt: "Posta kodu ve yer",
    },
    spiele: {
      titel: "Son maç ne zamandı?",
      hinweis: "Bir tarihi bilmiyorsanız alanı boş bırakın.",
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
      jaHinweis: "Eski kulüp onay verdi.",
    },
    wechsel: {
      titel: { kind: "Çocuğunuz son 6 ayda kulüp değiştirdi mi?", selbst: "Son 6 ayda kulüp değiştirdiniz mi?" },
      hinweis: "Bir kulüpten başka bir kulübe geçiş kastediliyor.",
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
    titel: { kind: "Çocuğunuz daha önce yurt dışında yaşadı mı?", selbst: "Daha önce yurt dışında yaşadınız mı?" },
    hinweis: "Yurt dışı demek: Almanya’da değil.",
    land: "Ülke",
    landHinweis: "Almanya’dan önceki son yaşam yeri.",
    stadt: "Şehir",
  },

  wohnen: {
    ort: {
      titel: { kind: "Çocuğunuz nerede yaşıyor?", selbst: "Nerede yaşıyorsunuz?" },
      gemeinsam: { kind: "Benimle birlikte Almanya’da", selbst: "Ebeveynlerimle birlikte Almanya’da" },
      gemeinsamHinweis: { kind: "Aynı adreste kayıtlıyız.", selbst: "Aynı adreste kayıtlıyız." },
      nicht_gemeinsam: { kind: "Benimle birlikte Almanya’da", selbst: "Ebeveynlerimle birlikte Almanya’da" },
      nicht_gemeinsamHinweis: { kind: "Aynı adreste kayıtlı değiliz.", selbst: "Aynı adreste kayıtlı değiliz." },
      verwandte: "Almanya’da akrabaların yanında",
      ohne_eltern: "Almanya’da ebeveynler olmadan",
    },
    seit: {
      titel: { kind: "{name} ile birlikte Almanya’da ne zamandan beri yaşıyorsunuz?", selbst: "Ebeveynlerinizle birlikte Almanya’da ne zamandan beri yaşıyorsunuz?" },
      legende: "Ne zamandan beri",
    },
    grund: {
      titel: { kind: "{name} neden ebeveynleri olmadan Almanya’da yaşıyor?", selbst: "Neden ebeveynleriniz olmadan Almanya’da yaşıyorsunuz?" },
      gefluechtet: "Ülkesinden kaçış nedeniyle",
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
      allein: "Velayet hakkı tek başıma bende",
      vormund: "Bir vasi (Vormund)",
      vormundHinweis: "Vasiyi (Vormund) bir mahkeme belirledi.",
      pflege: "Koruyucu aile ya da bakım sorumlusu",
      einverstanden: "Diğer ebeveyn razı.",
      einverstandenHinweis: "Lütfen önceden ona sorun.",
    },
    zweiterMitStift: "Diğer ebeveyne sorun.\nRazı değilse, üyelik başvurusunu (Aufnahmeantrag) o da imzalar.\nBu yalnızca kalemle mümkündür. PDF’de ilgili yer işaretlidir.",
    personen: {
      titel: { kind: "{name} için kim karar veriyor?", selbst: "Sizin için kim karar veriyor?" },
      hinweis: "Telefon numarasını sonra soracağız.",
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
    hinweis: "Uygun olanı işaretleyin. Hiçbiri uymuyorsa devam edin.",
    legende: "Hangisi geçerli?",
    maedchen: "Bir kız çocuğu erkek takımında oynayacak.",
    maedchenHinweis: "Bu, C-Jugend ve B-Jugend’de mümkün. Ebeveynlerin onay vermesi gerekir.",
    herrenAushilfe: "Genç, gerektiğinde Herren (yetişkin erkek takımı) takımında da oynayacak.",
    herrenAushilfeHinweis: "Bunun için ebeveynlerin onayı ve sağlık raporu (Attest) gerekir.",
    sonderspielrecht: "Daha genç bir yaş grubunda oynanacak.",
    sonderspielrechtHinweis: "Bu, örneğin engellilik durumunda mümkün. Bunun için başvuru gerekir.",
    frauHerren: "Bir kadın Herren (yetişkin erkek takımı) takımında oynamak istiyor.",
    frauHerrenHinweis: "Bunun için federasyona başvuru gerekir.",
  },

  karneval: {
    gruppe: {
      titel: { kind: "{name} hangi grupta dans etmek istiyor?", selbst: "Hangi grupta dans etmek istersiniz?" },
      weissNicht: "Bilmiyorum",
      weissNichtHinweis: "Kulüp size söyler.",
      uebung: "Prova zamanı: {zeit}",
      passt: "Yaşa uygun",
    },
    woanders: {
      titel: { kind: "{name} başka bir kulüpte de dans ediyor mu?", selbst: "Başka bir kulüpte de dans ediyor musunuz?" },
    },
    turnier: {
      titel: { kind: "{name} turnuvalara katılsın mı?", selbst: "Turnuvalara katılmak ister misiniz?" },
      hinweis: "Turnuvalarda gruplar birbirine karşı dans eder.",
    },
    abend: {
      titel: { kind: "{name} akşamları ebeveynler olmadan sahne alabilir mi?", selbst: "Akşamları sahne alabilir misiniz?" },
      hinweis: "Akşamları partilerde ve karnaval gösterilerinde sahne alınır.\nAkşam gösterileri için ayrı bir form var.",
    },
    abholung: {
      titel: { kind: "Çocuğunuzu kim alacak?", selbst: "Sizi kim alacak?" },
      hinweis: "Bu soru isteğe bağlıdır.\nBöylece kulüp, gösteriden sonra kimin alacağını bilir.",
      name: "Almaya gelecek kişinin adı",
      nameHinweis: "Birden fazla kişi varsa tüm adları yazın.",
    },
    allein: {
      titel: { kind: "Çocuğunuz eve tek başına gidebilir mi?", selbst: "Eve tek başınıza gidebilir misiniz?" },
      hinweis: "Bu soru isteğe bağlıdır.\nYanıt daha sonra akşam gösterileri için izin belgesinde yer alır.",
      ab: "Saat kaçtan itibaren?",
      abHinweis: "Saati şöyle yazın: 21:30.",
    },
  },

  kontakt: {
    anschrift: {
      titel: { kind: "{name} nerede oturuyor?", selbst: "Nerede oturuyorsunuz?" },
      strasse: "Sokak ve kapı numarası",
      plz: "Posta kodu",
      ort: "Yerleşim yeri",
    },
    erreichen: {
      titel: "Size nasıl ulaşabiliriz?",
      hinweisKind: "Lütfen burada ebeveyn olarak kendi bilgilerinizi yazın.",
      email: "E-posta",
      emailHinweis: "Önemli mesajları oraya göndeririz.",
      mobil: "Cep telefonu numarası",
      telefon: "Sabit hat numarası",
      telefonHinweis: "Lütfen en az bir telefon numarası yazın.",
    },
  },

  beitrag: {
    gruppe: {
      titel: { kind: "{name} için hangi aidatı ödüyorsunuz?", selbst: "Hangi aidatı ödüyorsunuz?" },
      vorschlagKopf: "Önerimiz: {gruppe}.",
      vorschlag: "Bunun bedeli yılda {jahr} Euro.\nBu, ayda {monat} Euro eder.",
      vorschlagOhneMonat: "Bunun bedeli yılda {jahr} Euro.",
      aufnahme: "Buna bir defaya mahsus {betrag} Euro kayıt ücreti eklenir.",
      andere: "Başka bir grup seçebilirsiniz.",
      legende: "Aidat grubu",
      proJahr: "Yılda {jahr} Euro",
      doppel: "Futbol ve karnavaldasınız.\nBunun için ayrı bir aidat geçerli olabilir.\nKulüp size haber verir.",
      vorgeschlagen: "Öneri",
    },
    familie: {
      titel: "Aileden başka kim var?",
      hinweis: "Aile aidatındaki diğer üyeleri yazın.\n6 kişiye kadar yazabilirsiniz.",
      person: "Aile üyesi {nummer}",
      vorname: "Ad",
      nachname: "Soyad",
      geburtsdatum: "Doğum tarihi",
      hinzu: "Başka bir aile üyesi ekle",
      entfernen: "Kaldır: aile üyesi {nummer}",
      voll: "6 kişiden fazlası listeye sığmaz. Lütfen bizi arayın.",
      fehlerVorname: "Lütfen adı yazın.",
      fehlerNachname: "Lütfen soyadı yazın.",
    },
    senator: {
      titel: "Senatör olmak ister misiniz?",
      hinweis: "Senatörler karnaval bölümünü destekler.\nÖzel bir aidat öderler.\nBaşvuruya yönetim kurulu karar verir.",
      ja: "Evet, başvuruyorum",
      nein: "Hayır",
    },
  },

  leistungen: {
    titel: { kind: "Ailenize resmi bir daireden para yardımı geliyor mu?", selbst: "Resmi bir daireden para yardımı alıyor musunuz?" },
    hinweis: "Örneğin temel gelir desteği (Grundsicherungsgeld), sosyal yardım (Sozialhilfe), konut yardımı (Wohngeld), çocuk zammı (Kinderzuschlag) ya da sığınmacı yardımları (Asylbewerberleistungen).\nO zaman aidatı çoğu zaman daire öder.\nBuna Eğitim ve Katılım desteği (Bildung und Teilhabe) denir.",
    ja: "Evet",
    nein: "Hayır",
    jaHinweis: "Bizimle konuşun. Bir belge düzenleriz.",
    wenigGeld: "Paranız az mı? Bizimle konuşun.",
  },

  zahlung: {
    art: {
      titel: "Nasıl ödemek istersiniz?",
      sepa: "Otomatik çekim (Lastschrift), önerilen",
      sepaHinweis: "Kulüp aidatı yılda bir kez hesabınızdan çeker.",
      rechnung: "Fatura",
      rechnungHinweis: "Aidatı kendiniz havale edersiniz.",
      zuschlag: "Bunun için yılda {zuschlag} Euro ek ücret alınabilir.",
    },
    inhaber: {
      titel: "Hesap kimin?",
      ich: "Benim",
      andere: "Başka bir kişinin",
      person: "Hesap sahibi",
      vorname: "Ad",
      nachname: "Soyad",
      anschriftGleich: "Kişi aynı adreste oturuyor.",
      strasse: "Sokak ve kapı numarası",
      plz: "Posta kodu",
      ort: "Yerleşim yeri",
    },
    iban: {
      titel: "IBAN nedir?",
      iban: "IBAN",
      ibanHinweis: "IBAN, banka kartınızın üzerinde yazar.\nBoşlukların önemi yok.",
      bic: "BIC",
      bank: "Bankanın adı",
    },
  },

  einwilligungen: {
    fotos: {
      titel: { kind: "Çocuğunuzun fotoğraflarını gösterebilir miyiz?", selbst: "Fotoğraflarınızı gösterebilir miyiz?" },
      hinweis: "Özgürce karar verirsiniz. Bunu sonra değiştirebilirsiniz.",
      ja: "Evet",
      jaHinweis: "Nerede olacağını hemen seçersiniz.",
      nein: "Hayır",
      medienLegende: "Fotoğrafları nerede gösterebiliriz?",
      medienHinweis: "En az bir seçenek seçin.",
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
      titel: "Geziler ve mesajlar",
      hinweis: "İkisi de isteğe bağlıdır. Bunu sonra değiştirebilirsiniz.",
      fahrten: "{name} maçlara ve turnuvalara gidebilir.",
      fahrtenHinweis: "Örneğin diğer ebeveynlerin arabalarıyla.",
      messenger: "{name} takımın mesajlaşma grubuna katılabilir.",
      messengerHinweis: "Orada tarihler ve anlaşmalar yer alır.",
    },
  },

  notfall: {
    kontakt: {
      titel: "Acil durumda kimi arayalım?",
      hinweis: "Hızlı ulaşılabilen bir kişi yazın.",
      name: "Ad",
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
      medikamenteHinweis: "Astım spreyi ya da acil durum kalemi varsa lütfen yazılı bir anlaşma yapın.",
      sonstiges: "Diğer",
    },
  },

  spielerfoto: {
    titel: "Oyuncu lisansı (Spielerpass) için fotoğrafı nasıl alalım?",
    hinweis: "Hessen Futbol Federasyonu (Hessischer Fußball-Verband, HFV) baş ve omuzların fotoğrafını ister.\nYüz iyi görünmelidir.",
    foto: "Şimdi fotoğraf çekiyorum",
    fotoHinweis: "Telefonun kamerasıyla.",
    datei: "Cihazımdan bir fotoğraf seçiyorum",
    dateiHinweis: "Zaten elinizde olan bir fotoğraf.",
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
    hinweis: "Elinizdeki her evrakın fotoğrafını çekin.\nEksik olanları sonra teslim edebilirsiniz.\nFotoğraf cihazınızda kalır.",
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
    warum: "Neden?",
    wie: "Nasıl edinirsiniz:",
    wo: "Nerede?",
    dateien: "Dosyalarınız:",
    art: {
      pflicht: "Bu gereklidir.",
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
      bildschirmHinweis: "Kulüp evrakını burada parmağınızla imzalarsınız.",
      papier: "Her şeyi kâğıt üzerinde imzalıyorum",
      papierHinweis: "Dosyayı yazdırırsınız ve kalemle imzalarsınız.",
    },
    satzung: {
      titel: "Kulübün tüzüğü (Satzung)",
      erklaerung: "Tüzük (Satzung), kulübün kurallarıdır.",
      link: "Tüzüğü (Satzung) okuyun",
      linkZusatz: "PDF, yeni sekmede açılır",
      ohneLink: "Tüzüğü (Satzung) kulübün internet sitesinde bulabilirsiniz.",
      label: "Tüzüğü (Satzung) okudum.",
      pflicht: "Kutucuk işaretlenmeden ekranda imzalayamazsınız.",
      freiwillig: "İsteğe bağlı. Kutucuğu işaretlemezseniz, çıktıda elle işaretlersiniz.",
    },
    hierTitel: "Bunları burada imzalıyorsunuz",
    hierHinweis: "Parmağınızla, kalemle ya da fareyle çizin.",
    gilt: "Geçerli olduğu yerler: {formulare}",
    person: {
      mitglied: { kind: "İmza: {name}", selbst: "İmzanız" },
      sorgeberechtigte: "İmza: {person}",
      ersteEltern: "İmza: anne ya da baba",
      zweiteEltern: "İmza: ikinci ebeveyn",
      zweiteHinweis: "Bu imza isteğe bağlıdır.\nFederasyon için bir imza yeterlidir.\nÖnerimiz: İki ebeveyn de imzalasın.",
      kontoinhaber: "Hesap sahibinin imzası: {person}",
      spieler: "Oyuncunun imzası",
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
    hinweis: "Bilgilerinizi kontrol edin.\nBir şeyi düzeltmek için “Değiştir”i kullanın.",
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
      spielen: "Maçlar",
      spielenJa: "Evet, oynama izniyle (Spielrecht)",
      spielenNein: "Sadece antrenman",
      alterVerein: "Önceki kulüp",
      alteMitgliedschaft: "Eski kulüpteki üyelik",
      abmeldung: "Kayıt silme",
      karneval: "Karnaval grubu",
      abendauftritte: "Akşam gösterileri",
      abholung: "Alacak kişi",
      alleinNachHause: "Eve tek başına",
      staaten: "Vatandaşlık",
      ausland: "Yurt dışında son yaşanan yer",
      wohnen: "Oturulan yer",
      sorge: "Velayet hakkı",
      sorgePersonen: "Kişiler",
      anschrift: "Adres",
      email: "E-posta",
      telefon: "Telefon",
      beitrag: "Aidat",
      leistungen: "Daireden yardım",
      zahlung: "Ödeme",
      kontoinhaber: "Hesap sahibi",
      iban: "IBAN",
      fotos: "Fotoğraflar",
      hfv: "Hessen Futbol Federasyonu (HFV)",
      fahrten: "Geziler",
      messenger: "Mesajlaşma grubu",
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
      alleinAb: "Evet, {zeit} saatinden itibaren",
      geschlecht: { m: "Erkek", w: "Kadın", d: "Divers (diğer)", ohne_angabe: "Belirtilmemiş" },
      abteilung: { fussball: "Futbol", karneval: "Karnaval", beides: "Futbol ve karnaval", passiv: "Sadece destek" },
      abmeldung: {
        einschreiben: "{datum} tarihinde taahhütlü mektupla (Einschreiben)",
        formlos: "Sadece e-posta ya da mesajla",
        noch_nicht: "Henüz değil",
        weiss_nicht: "Bilmiyorum",
        vollmacht: "Vekâletnameyle (Vollmacht)",
        weg: "Yöntem: {weg}",
      },
      mitgliedschaft: { kuendigen: "Üyelikten çıkıyorum", passiv: "Pasif üye olarak kalıyor", weiss_nicht: "Bilmiyorum" },
      sorge: {
        beide: "İki ebeveyn de",
        getrennt_bei_mir: "Ebeveynler ayrı, çocuk benimle yaşıyor",
        allein: "Tek başına velayet hakkı",
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
      unterschriftWeg: { bildschirm: "Ekranda, izin verilen yerlerde", papier: "Hepsi kâğıt üzerinde" },
      hfvUnterschrift: { training: "İlk antrenmanda", selbst_drucken: "Kendim yazdırıyorum" },
      habe: "Bende var",
      fehlt: "Henüz yok",
      vereinMacht: "Fotoğrafı kulüp çeker",
      fotoDa: "Fotoğraf var",
      unterschrieben: "İmzalandı",
      nichtUnterschrieben: "Henüz imzalanmadı",
      betragJahr: "{gruppe}, yılda {jahr} Euro",
    },
    hinweiseTitel: "Bilmeniz gerekenler",
    weitereHinweise: "Diğer notlar ({anzahl})",
    klaertVerein: "Bunu kulüp açıklığa kavuşturur",
    fristUnsicher: "Bu bir tahmindir. Kulüp bunu ayrıntılı kontrol eder.",
    weiterleitungTitel: "Bu birimler sizinle iletişime geçer:",
    weiterleitungAn: {
      jugendleitung: "Gençlik birimi (Jugendleitung)",
      passwesen: "Kulübün lisans birimi (Passwesen)",
      geschaeftsstelle: "Kulüp ofisi (Geschäftsstelle)",
      karneval: "Karnaval bölümü (Karnevalabteilung)",
      spielausschuss: "Maç komitesi (Spielausschuss)",
    },
    hinweisArt: {
      warnung: "Dikkat",
      info: "Bilgi için",
      frist: "Süre",
      offen: "Bunu kulüp açıklığa kavuşturur",
    },
  },

  fertig: {
    titelArbeit: "Dosyanız hazırlanıyor",
    titelFertig: "Dosyanız hazır",
    titelFehler: "Olmadı",
    arbeitet: "Lütfen bir dakika bekleyin. Dosya oluşturuluyor.",
    nochmal: "Yeniden dene",
    datei: "Dosya: {name}",
    info: "{seiten} sayfa, {groesse}",
    teileTitel: "Dosyanın içinde şunlar var:",
    teil: "{titel} (sayfa {von} ile {bis} arası)",
    // Titel der Teile des PDF (SCHNITTSTELLEN Abschnitt 9)
    teilTitel: {
      A: "A bölümü – Sizin için",
      B: "B bölümü – Kulüp için",
      C: "C bölümü – Gizli, ayrı teslim edilir",
    },
    herunterladen: "Dosyayı indir",
    teilen: "Dosyayı paylaş",
    ansehen: "Dosyayı görüntüle",
    fotoSpeichern: "Oyuncu fotoğrafını resim olarak kaydet",
    gespeichert: "Dosya kaydediliyor. Genellikle “İndirilenler” klasöründe olur.",
    geteilt: "Paylaşıldı.",
    teilenFehler: "Burada paylaşma çalışmıyor. Bunun yerine dosya kaydedildi.",
    fehler: {
      bibliothek: "Programın bir parçası yüklenemiyor. Lütfen internet bağlantınızı kontrol edin.",
      vorlageNetz: "Bir şablon yüklenemiyor. Lütfen internet bağlantınızı kontrol edin.",
      vorlageGeaendert: "Kulübün bir şablonu değişti. Lütfen kulüp ofisini (Geschäftsstelle) arayın.",
      modul: "Dosya henüz oluşturulamıyor. Lütfen kulüp ofisini (Geschäftsstelle) arayın.",
      pdf: "Dosya oluşturulamadı. Lütfen yeniden deneyin.",
    },
    naechsteTitel: "Sonraki adımlar",
    unterschriftTraining: "Hessen Futbol Federasyonu (Hessischer Fußball-Verband, HFV) sayfalarını ilk antrenmanda kalemle imzalarsınız.",
    unterschriftDrucken: "Dosyayı yazdırın. Tüm mavi işaretlerde kalemle imza atın.",
    unterschriftDruckenTeil: "Hessen Futbol Federasyonu (Hessischer Fußball-Verband, HFV) sayfalarını yazdırın. Mavi işaretlerde kalemle imza atın.",
    unterschriftTrainingAlle: "Tüm sayfaları ilk antrenmanda kalemle imzalarsınız. Kulüp bunları yazdırır.",
    unterschriftFertig: "Her şeyi ekranda imzaladınız. Hiçbir şey yazdırmanız gerekmiyor.",
    fehltTitel: "Bu evraklar hâlâ eksik:",
    fehltHinweis: "Elinize geçer geçmez getirin.",
    abgeben: "Evrakı kulüpte teslim edin.\nDosyayı telefonunuzla getirin. Ya da yazdırıp teslim edin.",
    nichtWhatsapp: "Lütfen dosyayı WhatsApp ile göndermeyin. Özel bilgiler içeriyor.",
    teilC: "C bölümü (Teil C) sağlık bilgileri içerir. Bunu ayrı teslim edin.",
    weiterePerson: "Başka bir kişiyi kaydet",
    weiterePersonHinweis: "Adres, iletişim, ebeveyn ve ödeme bilgileri aynen aktarılır.",
    neuePerson: "Şimdi bir sonraki kişiyi kaydediyorsunuz.",
  },
};
