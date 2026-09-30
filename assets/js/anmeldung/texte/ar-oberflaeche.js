/*
  Texte der Oberfläche des Anmelde-Assistenten - Arabisch (العربية, Hocharabisch, einfach).
  Übersetzungshilfe: Verbindlich ist der deutsche Text (de-oberflaeche.js), das PDF bleibt deutsch.
  Stand 29.09.2026. Dieselbe Schlüsselstruktur wie de-oberflaeche.js, aber ohne "sprachen" und
  ohne "demo" (die Vorführung bleibt deutsch). Fehlt hier ein Eintrag, gilt der deutsche.
  Prüfung: node tools/anmeldung-test/uebersetzung-pruefen.mjs

  Stil: einfach und kurz wie das Deutsche - ein Gedanke pro Satz, kurze Wörter, aktiv, höflich
  (Bitte-Form "يرجى ..."; Anrede in der Grundform). Zahlen als westliche Ziffern 0-9. Platzhalter wie
  {name}, {datum}, {jahr} bleiben unverändert; die Varianten kind/selbst und die Zeilenumbrüche \n
  stehen wie im Deutschen. Satzzeichen: Arabisches Komma und Fragezeichen (، ؟).
  Sätze über ein Kind nennen das Kind ("الطفل {name}"), wenn ein Verb das Geschlecht verlangt.
  Schreibrichtung: Deutsche Namen (Dokumentnamen, Herren, D-Jugend ...) und die Rufnummer stehen in
  Unicode-Isolaten (LRI/PDI, Hilfsfunktion D unten), damit Klammern, Bindestriche und Ziffern in der
  Schrift von rechts nach links richtig stehen.
  Deutsche Dokumentnamen stehen in Klammern hinter der Übersetzung, damit die Familie bei einer
  deutschen Stelle danach fragen kann, zum Beispiel: شهادة الميلاد (Geburtsurkunde).
  Den Verband nennen wir beim ersten Vorkommen auf einer Seite so: الاتحاد الهيسي لكرة القدم
  (Hessischer Fußball-Verband, HFV). Danach steht kurz: الاتحاد.
  Altersklassen (D-Jugend, Herren ...) und Gruppennamen des Karnevals sind Eigennamen und bleiben deutsch.

  Begriffsliste (Deutsch = العربية) - gilt für Oberfläche und Regeltexte:
  Verein = النادي
  alter Verein = النادي القديم
  neuer Verein = النادي الجديد
  Verband (Hessischer Fußball-Verband, HFV) = الاتحاد (الاتحاد الهيسي لكرة القدم)
  Mannschaft = الفريق
  Abteilung = القسم
  Training = التدريب
  Spiel = المباراة
  Pflichtspiel (Liga oder Pokal) = مباراة في الدوري أو الكأس
  Freundschaftsspiel = مباراة ودية
  Wartezeit = فترة الانتظار
  Spielrecht, Spielberechtigung = إذن اللعب
  Spielerpass = بطاقة اللاعب
  Freigabe = إخلاء الطرف
  Sperre = الإيقاف
  Abmeldung = إلغاء التسجيل
  Kündigung = إنهاء العضوية
  Mitgliedschaft = العضوية
  Mitglied = عضو
  passives Mitglied = عضو داعم
  Beitrag = رسوم العضوية
  Aufnahmegebühr = رسوم القبول
  Lastschrift = الخصم المباشر
  Rechnung = فاتورة
  Kontoinhaber = صاحب الحساب
  Sorgerecht = حق الحضانة
  Sorgeberechtigte = صاحب حق الحضانة
  Elternteil = أحد الوالدين
  Vormund = الوصي القانوني
  Unterschrift = التوقيع
  mit Stift unterschreiben = التوقيع بالقلم
  am Bildschirm unterschreiben = التوقيع على الشاشة
  Unterlagen = المستندات
  Nachweis = مستند إثبات
  Kopie = نسخة
  Foto machen = التقاط صورة
  Datei wählen = اختيار ملف
  Habe ich = لديّ
  Fehlt noch = ما زال ناقصًا
  Hilfe = مساعدة
  Zurück = رجوع
  Weiter = التالي
  Prüfen = المراجعة
  Ändern = تعديل
  PDF-Datei = ملف PDF
  Ausdrucken = الطباعة
  Vereinsheim = مقر النادي
  Geschäftsstelle = مكتب النادي
  Jugendleitung = إدارة الشباب
  Karnevalabteilung = قسم الكرنفال
  Einschreiben = رسالة مسجلة
  Vollmacht = توكيل
  Attest = شهادة طبية
  Geburtsurkunde = شهادة الميلاد
  Meldebescheinigung = شهادة تسجيل السكن
  Reisepass = جواز السفر
  Personalausweis = بطاقة الهوية
  Aufenthaltstitel = تصريح الإقامة
  Bürgeramt = مكتب شؤون المواطنين
  Jobcenter = مركز العمل
  Sozialamt = مكتب الشؤون الاجتماعية
  Bildung und Teilhabe = التعليم والمشاركة
  Jugendamt = مكتب رعاية الشباب
  Aufnahmeantrag = طلب الانضمام
  Datenschutz = حماية البيانات
  Erlaubnis = إذن
  Einverständnis, Einwilligung = موافقة
  Staatsangehörigkeit = الجنسية
  Notfallkontakt = جهة الاتصال في الطوارئ
  Gesundheitsbogen = استمارة صحية
  Erlaubnis für Fotos = إذن لاستخدام الصور
  Erlaubnis für die Lastschrift = إذن الخصم المباشر
  Satzung = النظام الأساسي
*/

// Deutsche Namen und Rufnummern im arabischen Text: Isolat für die Schreibrichtung von links nach rechts.
// Leerzeichen im Namen sind geschützt (U+00A0) und nach dem Bindestrich steht ein Wortverbinder (U+2060),
// damit der Name nicht über zwei Zeilen läuft (sonst stehen die Klammern getrennt an den Zeilenrändern).
const D = (text) => "\u2066" + text.replace(/ /g, "\u00A0").replace(/-/g, "-\u2060") + "\u2069";
const TEL = D("069 736868");

export default {
  // ---------- Rahmen der Seite (Bauzeit) ----------

  seite: {
    h1: `التسجيل في نادي ${D("FFV Sportfreunde 04")}`,
    titel: "التسجيل (مسودة)",
    beschreibung:
      `مسودة مساعد التسجيل في نادي ${D("FFV Sportfreunde 04")}. تسجّل خطوة بخطوة. وفي النهاية تحصل على ملف PDF.`,
    lead: "نسألك خطوة بخطوة. وفي النهاية تحصل على ملف يضم كل المستندات.",
    assistentTitel: "مساعد التسجيل",
    laedt: `جارٍ تحميل المساعد. إذا لم يحدث شيء، فاتصل بنا على الرقم: ${TEL}.`,
    ohneSkript: `يحتاج المساعد إلى ${D("JavaScript")}. يرجى تشغيله. أو اتصل بنا على الرقم: ${TEL}.`,
    ladefehler: `تعذّر تحميل المساعد. يرجى الاتصال بنا على الرقم: ${TEL}.`,
  },

  band: {
    text: "مسودة للاطلاع فقط. يرجى عدم إدخال بيانات حقيقية. لا يتم إرسال أي شيء.",
    kurz: "مسودة – يرجى عدم إدخال بيانات حقيقية.",
  },

  // ---------- Allgemeines ----------

  allgemein: {
    freiwillig: "(اختياري)",
    tag: "اليوم",
    monat: "الشهر",
    jahr: "السنة",
    datumHinweis: "مثال: 27 3 2015",
    datumHinweisMonat: "مثال: 3 2019",
    bitteWaehlen: "يرجى الاختيار",
    haeufigeLaender: "الدول الشائعة",
    alleLaender: "كل الدول",
    ja: "نعم",
    nein: "لا",
    weissNicht: "لا أعرف",
    dasKind: "الطفل",
    diePerson: "الشخص",
    entfernen: "إزالة",
    schliessen: "إغلاق",
    aendern: "تعديل",
    moment: "لحظة من فضلك …",
    datei: "ملف",
    keineAngabe: "غير محدد",
    jahre: "سنة",
  },

  kopf: {
    zurueck: "رجوع",
    zurueckLang: "الرجوع خطوة واحدة",
    hilfe: "مساعدة",
    sprache: "اللغة",
    abschnitte: "الأقسام",
    hierSindSie: "أنت هنا:",
  },

  // Trenner zwischen den Teilen einer Aufzählung (Arabisch: "، ").
  liste: {
    trenner: "، ",
  },

  abschnitte: {
    person: "الشخص",
    fussballKarneval: "كرة القدم / الكرنفال",
    kontakt: "الاتصال",
    beitrag: "الرسوم",
    unterlagen: "المستندات",
    unterschrift: "التوقيع",
    fertig: "تم",
  },

  nav: {
    weiter: "التالي",
    zurPruefung: "حفظ والعودة إلى المراجعة",
  },

  fuss: {
    privat: "كل شيء يبقى على جهازك. لا نرسل أي شيء.",
    loeschen: "حذف كل البيانات",
  },

  loeschen: {
    titel: "حذف كل البيانات؟",
    text: "عندها تختفي كل البيانات والصور. لا يمكن التراجع عن ذلك.",
    ja: "نعم، احذف كل شيء",
    nein: "لا، أبقِها",
    fertig: "تم حذف كل البيانات.",
  },

  sprache: {
    fehlt: "هذه اللغة غير متوفرة بعد. تبقى اللغة الألمانية.",
    teilweise: "جزء من النص غير مترجم بعد. يبقى هناك بالألمانية.",
    uebersetzungshilfe: "مساعدة في الترجمة. النص الألماني هو الملزم.",
  },

  hilfe: {
    titel: "مساعدة",
    einleitung: "يسعدنا مساعدتك. اتصل بنا أو راسلنا.",
    uebersetzen: "يمكنك إحضار شخص للترجمة.",
    kontakte: [
      { schluessel: "geschaeftsstelle", tel: "069 736868", mail: "geschaeftsstelle@sportfreunde04.de" },
      { schluessel: "jugendleitung", mail: "jugendleitung@sportfreunde04.de" },
      { schluessel: "karneval", mail: "karnevalabteilung@sportfreunde04.de" },
    ],
    geschaeftsstelle: `مكتب النادي (${D("Geschäftsstelle")})`,
    geschaeftsstelleWofuer: "كل الأسئلة حول التسجيل",
    jugendleitung: `إدارة الشباب (${D("Jugendleitung")})`,
    jugendleitungWofuer: "أسئلة حول كرة القدم والفرق",
    karneval: `قسم الكرنفال (${D("Karnevalabteilung")})`,
    karnevalWofuer: "أسئلة حول الرقص",
    anrufen: "اتصال",
    schreiben: "كتابة بريد إلكتروني",
  },

  // ---------- Fehlermeldungen ----------

  fehler: {
    seite: `تعذّر عرض هذه الصفحة. يرجى الاتصال بنا على الرقم: ${TEL}.`,
    titelEins: "يرجى التحقق من هذا الإدخال:",
    titelMehr: "يرجى التحقق من الإدخالات التالية ({anzahl}):",
    wahl: "يرجى اختيار إجابة.",
    text: "يرجى ملء هذا الحقل.",
    wer: "يرجى اختيار من يريد أن يصبح عضوًا.",
    vorname: "يرجى إدخال الاسم الأول.",
    nachname: "يرجى إدخال اسم العائلة.",
    lateinisch: "يرجى كتابة الاسم بأحرف لاتينية كما في جواز السفر.",
    lateinischOrt: "يرجى كتابة اسم المكان بأحرف لاتينية كما في جواز السفر.",
    lateinischAnschrift: "يرجى كتابة العنوان بأحرف لاتينية.",
    lateinischVerein: "يرجى كتابة بيانات النادي بأحرف لاتينية.",
    lateinischText: "يرجى الكتابة بأحرف لاتينية.",
    lateinischNummer: "يرجى كتابة الرقم بالأرقام من 0 إلى 9.",
    satzung: `يرجى قراءة النظام الأساسي (${D("Satzung")}) ووضع علامة في المربع.`,
    uhrzeit: "يرجى كتابة الوقت هكذا: 21:30.",
    datumLeer: "يرجى إدخال التاريخ.",
    datumUnvollstaendig: "يرجى إدخال اليوم والشهر والسنة.",
    datumUnvollstaendigMonat: "يرجى إدخال الشهر والسنة.",
    datumUngueltig: "هذا التاريخ غير موجود. يرجى التحقق منه.",
    datumZukunft: "التاريخ في المستقبل. يرجى التحقق منه.",
    datumZuAlt: "السنة قديمة جدًا. يرجى التحقق منها.",
    geburtsort: "يرجى إدخال مكان الميلاد.",
    geburtsland: "يرجى اختيار بلد الميلاد.",
    geschlecht: "يرجى اختيار الجنس.",
    spielrechtFuer: "يرجى اختيار الفرق.",
    abteilung: "يرجى اختيار قسم.",
    spielen: "يرجى اختيار إجابة.",
    spielerpass: "يرجى اختيار إجابة.",
    region: "يرجى اختيار مكان النادي.",
    vereinsname: "يرجى إدخال اسم النادي.",
    vereinsort: "يرجى إدخال مدينة النادي.",
    vereinsland: "يرجى اختيار الدولة.",
    abmeldung: "يرجى اختيار إجابة.",
    abmeldeweg: "يرجى اختيار طريقة إلغاء التسجيل.",
    mitgliedschaft: "يرجى اختيار إجابة.",
    sperre: "يرجى اختيار إجابة.",
    freigabe: "يرجى اختيار إجابة.",
    wechsel: "يرجى اختيار إجابة.",
    deutsch: "يرجى اختيار إجابة.",
    staaten: "يرجى اختيار جنسية واحدة على الأقل.",
    staatLeer: "يرجى اختيار دولة أو إزالة السطر.",
    staatenNichtDeutsch: "ألمانيا لا تناسب الإجابة «لا يوجد جواز سفر ألماني». يرجى التحقق من ذلك.",
    staatenDeutsch: "لقد ذكرت أن لديك جواز سفر ألمانيًا. يرجى اختيار ألمانيا.",
    ausland: "يرجى اختيار إجابة.",
    auslandLand: "يرجى اختيار الدولة.",
    auslandStadt: "يرجى إدخال المدينة.",
    wohnen: "يرجى اختيار إجابة.",
    ohneElternGrund: "يرجى اختيار السبب.",
    geborenInDe: "يرجى اختيار إجابة.",
    jahreInDe: "يرجى إدخال رقم من 0 إلى 18.",
    sorge: "يرجى اختيار إجابة.",
    rolle: "يرجى اختيار من يكون هذا الشخص.",
    strasse: "يرجى إدخال الشارع ورقم المنزل.",
    plz: "الرمز البريدي مكوّن من 5 أرقام.",
    ort: "يرجى إدخال المدينة أو البلدة.",
    email: "يرجى إدخال عنوان بريد إلكتروني صالح.",
    telefon: "يرجى إدخال رقم هاتف واحد على الأقل.",
    beitragGruppe: "يرجى اختيار فئة الرسوم.",
    familie: "يرجى إدخال فرد واحد على الأقل من العائلة.",
    senator: "يرجى اختيار إجابة.",
    leistungen: "يرجى اختيار إجابة.",
    zahlungArt: "يرجى اختيار طريقة الدفع.",
    kontoinhaber: "يرجى اختيار إجابة.",
    kiVorname: "يرجى إدخال الاسم الأول لصاحب الحساب.",
    kiNachname: "يرجى إدخال اسم العائلة لصاحب الحساب.",
    ibanLeer: `يرجى إدخال رقم ${D("IBAN")}.`,
    ibanFormat: `صيغة رقم ${D("IBAN")} غير صحيحة. يرجى التحقق منه.`,
    ibanLand: `للخصم المباشر (${D("Lastschrift")}) نحتاج إلى حساب في أوروبا. وإلا فاختر «فاتورة».`,
    ibanLaenge: `عدد رموز رقم ${D("IBAN")} قليل جدًا أو كثير جدًا. يرجى التحقق منه.`,
    ibanPruefziffer: `رقم ${D("IBAN")} غير صحيح. يرجى التحقق من الأرقام.`,
    fotos: "يرجى اختيار إجابة.",
    medien: "يرجى اختيار خيار واحد على الأقل.",
    notfallName: "يرجى إدخال الاسم.",
    notfallTelefon: "يرجى إدخال رقم الهاتف.",
    gesundheitsbogen: "يرجى اختيار إجابة.",
    spielerfoto: "يرجى اختيار كيفية الحصول على الصورة.",
    spielerfotoBild: "يرجى إضافة صورة. أو اختر «النادي يلتقط الصورة».",
    nachweisDatei: "يرجى إضافة صورة أو ملف. أو اختر «ما زال ناقصًا».",
    unterschriftWeg: "يرجى اختيار طريقة التوقيع.",
    unterschrift: "يرجى التوقيع داخل المربع. أو اختر في الأعلى «أوقّع كل شيء على الورق».",
    hfvUnterschrift: "يرجى اختيار موعد توقيع الصفحات.",
    bild: {
      typ: "هذا الملف ليس صورة وليس ملف PDF.",
      heic: "لا يستطيع المتصفح قراءة صيغة هذه الصورة. يرجى التقاط الصورة من جديد.",
      nichtLesbar: "تعذّر فتح الصورة. يرجى اختيار صورة أخرى.",
      zuGross: "الملف كبير جدًا. يرجى اختيار ملف أصغر.",
      zuKlein: "الصورة صغيرة جدًا. يرجى التقاط صورة أكبر.",
      leer: "الملف فارغ. يرجى اختيار ملف آخر.",
    },
  },

  // ---------- Schritte ----------

  start: {
    titel: "مرحبًا",
    einleitung: "هنا تسجّل نفسك أو طفلك في النادي.\nنسألك خطوة بخطوة.",
    ergebnis: "في النهاية تحصل على ملف PDF.\nهذا ملف للعرض والطباعة.\nيحتوي على كل المستندات الخاصة بالنادي.",
    brauchenTitel: "ما تحتاج إليه:",
    brauchen: [
      "الاسم وتاريخ الميلاد",
      "عنوانك وبريدك الإلكتروني ورقم هاتفك",
      `للخصم المباشر (${D("Lastschrift")}): رقم ${D("IBAN")} (رقم الحساب المصرفي)`,
      "هاتف بكاميرا لالتقاط صور للمستندات",
    ],
    dauer: "تحتاج إلى نحو 15 دقيقة.",
    datenschutz: "بياناتك تبقى على جهازك.\nلا نرسل أي شيء.",
    hilfe: "هل تحتاج إلى مساعدة؟ اضغط في الأعلى على «مساعدة».",
    spracheTitel: "اختر اللغة",
    los: "لنبدأ",
  },

  wer: {
    titel: "من يريد أن يصبح عضوًا؟",
    kind: "طفلي",
    kindHinweis: "تملأ كل شيء من أجل طفلك.",
    selbst: "أنا",
    selbstHinweis: "تسجّل نفسك.",
    mehrere: "هل تريد تسجيل عدة أشخاص؟\nفي النهاية يمكنك تسجيل الشخص التالي.\nعندها ننقل عنوانك وبيانات الدفع.",
  },

  name: {
    titel: { kind: "ما اسم طفلك؟", selbst: "ما اسمك؟" },
    hinweis: "اكتب الاسم كما هو في جواز السفر.\nاستخدم الأحرف اللاتينية.",
    vorname: "الاسم الأول",
    vornameHinweis: "كل الأسماء الأولى كما في جواز السفر.",
    nachname: "اسم العائلة",
  },

  geburt: {
    datum: {
      titel: { kind: "متى وأين وُلد طفلك؟", selbst: "متى وأين وُلدت؟" },
      legende: "تاريخ الميلاد",
      ort: "مكان الميلاد",
      ortHinweis: "المدينة أو البلدة.",
      land: "بلد الميلاد",
    },
    geschlecht: {
      titel: { kind: "ما جنس طفلك؟", selbst: "ما جنسك؟" },
      hinweis: "المعتمد هو ما هو مكتوب في جواز السفر أو بطاقة الهوية.",
      m: "ذكر",
      w: "أنثى",
      d: `متنوع (${D("divers")})`,
      ohne_angabe: "غير محدد",
      spielrechtTitel: "لأي فرق يلعب اللاعب؟",
      spielrechtHinweis: "يقرر الشخص ذلك بنفسه. وعند الأطفال يقرر الوالدان معه.",
      spielrechtM: "الفتيان والرجال",
      spielrechtW: "الفتيات والنساء",
    },
  },

  abteilung: {
    titel: { kind: "أين يشارك طفلك؟", selbst: "أين تريد أن تشارك؟" },
    fussball: "كرة القدم",
    fussballHinweis: "التدريب والمباريات",
    karneval: "الكرنفال",
    karnevalHinweis: `الرقص مع ${D("Schnauzer")}`,
    beides: "كرة القدم والكرنفال",
    beidesHinweis: "الاثنان في نادٍ واحد",
    passiv: "الدعم فقط",
    passivHinweis: "أنت عضو. لا تمارس أي رياضة.",
  },

  mannschaft: {
    titel: { kind: "أي فريق يناسب طفلك؟", selbst: "أي فريق يناسبك؟" },
    alter: "عمر {name}: {alter}. الفئة: مواليد {jahrgang}.",
    klasse: `هذا يناسب فريق ${D("{klasse}-Jugend")} (فريق الشباب).`,
    klasseHerren: `هذا يناسب فريق ${D("Herren")} (فريق الرجال).`,
    mannschaften: "الفرق في النادي: {namen}.",
    keine: "ليس لدى النادي فريق خاص بهذه الفئة.",
    keineFolge: "ستتواصل معك إدارة الشباب.",
    unbekannt: "لا يمكننا تحديد الفريق بعد.",
  },

  spielen: {
    titel: { kind: "هل يشارك طفلك في المباريات؟", selbst: "هل تريد المشاركة في المباريات؟" },
    erklaerung: `من يريد اللعب يحتاج إلى إذن اللعب (${D("Spielrecht")}) من الاتحاد الهيسي لكرة القدم (${D("Hessischer Fußball-Verband, HFV")}).\nيطلب النادي هذا الإذن من أجلك.\nيستغرق ذلك أحيانًا عدة أسابيع.`,
    ja: { kind: `نعم، في المباريات والمهرجانات الكروية (${D("Spielfeste")})`, selbst: "نعم، في المباريات" },
    jaHinweis: `يطلب النادي إذن اللعب (${D("Spielrecht")}).`,
    nein: "لا، التدريب فقط",
    neinHinweis: "يمكنك تغيير ذلك لاحقًا.",
  },

  spielerpass: {
    titel: { kind: `هل كانت لدى طفلك بطاقة لاعب (${D("Spielerpass")}) من قبل؟`, selbst: `هل كانت لديك بطاقة لاعب (${D("Spielerpass")}) من قبل؟` },
    hinweis: { kind: "حتى لو كان يتدرب فقط. وحتى في الخارج.", selbst: "حتى لو كنت تتدرب فقط. وحتى في الخارج." },
    erklaerung: `بطاقة اللاعب (${D("Spielerpass")}) هي بطاقة الهوية للمباريات في النادي.`,
    weissNichtHinweis: "يتحقق النادي من ذلك من أجلك.",
  },

  alterVerein: {
    titel: "في أي نادٍ كان ذلك؟",
    region: "أين يقع النادي؟",
    hessen: "في ولاية هيسن",
    bundesland: "في ولاية ألمانية أخرى",
    ausland: "في بلد آخر",
    name: "اسم النادي",
    ort: "مدينة النادي",
    land: "بلد النادي",
    verband: "الاتحاد الكروي هناك",
    verbandHinweis: "فقط إذا كنت تعرفه.",
  },

  abmeldung: {
    status: {
      titel: { kind: "هل تم إلغاء تسجيل طفلك في النادي القديم؟", selbst: "هل تم إلغاء تسجيلك في النادي القديم؟" },
      hinweis: `رسالة بريد إلكتروني إلى النادي القديم لا تكفي.\nيحتاج الاتحاد الهيسي لكرة القدم (${D("Hessischer Fußball-Verband, HFV")}) إلى رسالة مسجلة (${D("Einschreiben")}).\nأو توقّع على توكيل لإلغاء التسجيل (${D("Vollmacht für die Abmeldung")}).`,
      einschreiben: `نعم، برسالة مسجلة (${D("Einschreiben")})`,
      einschreibenHinweis: "لديك إيصال البريد.",
      formlos: "نعم، لكن بالبريد الإلكتروني أو برسالة فقط",
      formlosHinweis: "هذا لا يُعتبر إلغاء التسجيل.",
      noch_nicht: "لا، ليس بعد",
      weiss_nicht: "لا أعرف",
    },
    datum: {
      titel: "متى ألغيت التسجيل؟",
      legende: "تاريخ إلغاء التسجيل",
      hinweis: `في الرسالة المسجلة (${D("Einschreiben")}) يُعتمد التاريخ المكتوب على الإيصال.`,
    },
    weg: {
      titel: "كيف تلغي التسجيل؟",
      vollmacht: `بتوكيل (${D("Vollmacht")})`,
      vollmachtHinweis: `توقّع على توكيل لإلغاء التسجيل (${D("Vollmacht für die Abmeldung")}). ثم يلغي النادي التسجيل.`,
      einschreiben: `برسالة مسجلة (${D("Einschreiben")})`,
      einschreibenHinweis: `ترسل الرسالة المسجلة (${D("Einschreiben")}) إلى النادي القديم بنفسك.`,
    },
    mitgliedschaft: {
      titel: { kind: "هل يبقى طفلك عضوًا في النادي القديم؟", selbst: "هل تبقى عضوًا في النادي القديم؟" },
      hinweis: "العضوية لا تنتهي من تلقاء نفسها.\nوهي لا تنتهي أيضًا بإلغاء التسجيل كلاعب.",
      kuendigen: "لا، سأنهي العضوية",
      kuendigenHinweis: `تنهي العضوية في النادي القديم (${D("Kündigung")}).`,
      passiv: "نعم، كعضو داعم",
      passivHinweis: { kind: "طفلك لا يلعب هناك بعد الآن. يبقى عضوًا.", selbst: "أنت لا تلعب هناك بعد الآن. تبقى عضوًا." },
      weiss_nicht: "لا أعرف",
    },
    anschrift: {
      titel: `إلى أين تذهب الرسالة المسجلة (${D("Einschreiben")}) إلى النادي القديم؟`,
      hinweis: `لا يجب أن تكتب شيئًا. النادي يساعدك.\nنكتب العنوان في استمارة إلغاء التسجيل من النادي القديم (${D("Abmeldung")}).`,
      empfaenger: "اسم المستلم",
      empfaengerHinweis: "مثال: مجلس إدارة النادي",
      strasse: "الشارع ورقم المنزل",
      plzOrt: "الرمز البريدي والمدينة",
    },
    spiele: {
      titel: "متى كانت آخر مباراة؟",
      hinweis: "إذا كنت لا تعرف التاريخ، فاترك الحقل فارغًا.",
      letztes: "آخر مباراة",
      pflicht: "آخر مباراة في الدوري أو الكأس",
      pflichtHinweis: "المباريات الودية لا تُحتسب هنا.",
    },
    sperre: {
      titel: "هل هناك إيقاف؟",
      hinweis: "عند الإيقاف لا يستطيع الشخص لعب بعض المباريات.",
      bis: "حتى متى يستمر الإيقاف؟",
      bisHinweis: "إذا كنت لا تعرف، فاترك الحقل فارغًا.",
    },
    freigabe: {
      titel: { kind: "هل يمنح النادي القديم طفلك إخلاء الطرف؟", selbst: "هل يمنحك النادي القديم إخلاء الطرف؟" },
      hinweis: `إخلاء الطرف (${D("Freigabe")}) يعني: النادي القديم موافق على الانتقال.`,
      jaHinweis: "النادي القديم وافق.",
    },
    wechsel: {
      titel: { kind: "هل غيّر طفلك النادي خلال آخر 6 أشهر؟", selbst: "هل غيّرت النادي خلال آخر 6 أشهر؟" },
      hinweis: "المقصود هو الانتقال من نادٍ إلى نادٍ آخر.",
    },
  },

  pass: {
    deutsch: {
      titel: { kind: "هل لدى طفلك جواز سفر ألماني أو بطاقة هوية ألمانية؟", selbst: "هل لديك جواز سفر ألماني أو بطاقة هوية ألمانية؟" },
      hinweis: `جواز السفر الألماني للأطفال (${D("Kinderreisepass")}) يُحتسب أيضًا.`,
    },
    staaten: {
      titel: { kind: "ما هي جنسيات {name}؟", selbst: "ما هي جنسياتك؟" },
      hinweis: "اذكرها كلها. فهي مكتوبة في جواز السفر.",
      label: "الجنسية {nummer}",
      hinzu: "إضافة جنسية أخرى",
      entfernen: "إزالة الجنسية {nummer}",
    },
  },

  ausland: {
    titel: { kind: "هل عاش طفلك في الخارج من قبل؟", selbst: "هل عشت في الخارج من قبل؟" },
    hinweis: "الخارج يعني: ليس في ألمانيا.",
    land: "الدولة",
    landHinweis: "آخر مكان إقامة قبل ألمانيا.",
    stadt: "المدينة",
  },

  wohnen: {
    ort: {
      titel: { kind: "أين يعيش طفلك؟", selbst: "أين تعيش؟" },
      gemeinsam: { kind: "معي في ألمانيا", selbst: "مع والديّ في ألمانيا" },
      gemeinsamHinweis: { kind: "نحن مسجلون معًا على العنوان نفسه.", selbst: "نحن مسجلون معًا على العنوان نفسه." },
      nicht_gemeinsam: { kind: "معي في ألمانيا", selbst: "مع والديّ في ألمانيا" },
      nicht_gemeinsamHinweis: { kind: "لسنا مسجلين معًا على العنوان نفسه.", selbst: "لسنا مسجلين معًا على العنوان نفسه." },
      verwandte: "عند أقارب في ألمانيا",
      ohne_eltern: "في ألمانيا بدون الوالدين",
    },
    seit: {
      titel: { kind: "منذ متى تعيش مع {name} في ألمانيا؟", selbst: "منذ متى تعيش مع والديك في ألمانيا؟" },
      legende: "منذ متى",
    },
    grund: {
      titel: { kind: "ما سبب إقامة الطفل {name} في ألمانيا بدون الوالدين؟", selbst: "لماذا تعيش في ألمانيا بدون والديك؟" },
      gefluechtet: "بسبب اللجوء",
      austausch: "بسبب برنامج تبادل مدرسي",
      verwandte: "عند أقارب",
      pflege: "في أسرة حاضنة",
    },
    dauer: {
      titel: { kind: "كم مضى على إقامة الطفل {name} في ألمانيا؟", selbst: "منذ متى تعيش في ألمانيا؟" },
      geboren: { kind: "هل وُلد الطفل {name} في ألمانيا؟", selbst: "هل وُلدت في ألمانيا؟" },
      jahre: "كم سنة دون انقطاع؟",
      jahreHinweis: "رقم، مثال: 5",
    },
  },

  sorge: {
    recht: {
      titel: { kind: "من لديه حق الحضانة على {name}؟", selbst: "من لديه حق الحضانة عليك؟" },
      hinweis: `حق الحضانة (${D("Sorgerecht")}) يعني: من يحق له اتخاذ القرارات عن الطفل.`,
      beide: "الوالدان معًا",
      getrennt_bei_mir: "الوالدان يعيشان منفصلين",
      getrennt_bei_mirHinweis: "الطفل يعيش معي.",
      allein: "حق الحضانة لي وحدي",
      vormund: `وصي قانوني (${D("Vormund")})`,
      vormundHinweis: `المحكمة هي التي عيّنت الوصي (${D("Vormund")}).`,
      pflege: "أسرة حاضنة أو مشرفو الرعاية",
      einverstanden: "الطرف الآخر من الوالدين موافق.",
      einverstandenHinweis: "يرجى سؤاله أولًا.",
    },
    zweiterMitStift: `اسأل الطرف الآخر من الوالدين.\nإذا لم يكن موافقًا فإنه يوقّع طلب الانضمام (${D("Aufnahmeantrag")}) أيضًا.\nيتم ذلك بالقلم فقط. المكان مُعلَّم في ملف PDF.`,
    personen: {
      titel: { kind: "من يقرر من أجل {name}؟", selbst: "من يقرر من أجلك؟" },
      hinweis: "نسأل عن رقم الهاتف لاحقًا.",
      erste: { kind: "بياناتك", selbst: "الشخص الأول" },
      zweite: "الشخص الثاني",
      rolle: "من هذا الشخص؟",
      mutter: "الأم",
      vater: "الأب",
      vormund: `وصي قانوني (${D("Vormund")})`,
      pflege: "أسرة حاضنة أو مشرفو الرعاية",
      andere: "شخص آخر",
      vorname: "الاسم الأول",
      nachname: "اسم العائلة",
    },
  },

  besonderes: {
    titel: "هل هناك شيء خاص؟",
    hinweis: "ضع علامة على ما ينطبق. وإذا لم ينطبق شيء، فتابع.",
    legende: "ما الذي ينطبق؟",
    maedchen: "فتاة ستلعب في فريق للفتيان.",
    maedchenHinweis: `هذا ممكن في فئتي ${D("C-Jugend")} و ${D("B-Jugend")}. يجب أن يوافق الوالدان.`,
    herrenAushilfe: `سيلعب الشاب أيضًا عند الحاجة في فريق ${D("Herren")} (فريق الرجال).`,
    herrenAushilfeHinweis: `يتطلب ذلك موافقة الوالدين وشهادة طبية (${D("Attest")}).`,
    sonderspielrecht: "اللعب سيكون في فئة عمرية أصغر.",
    sonderspielrechtHinweis: "هذا ممكن مثلًا عند وجود إعاقة. ويتطلب ذلك طلبًا.",
    frauHerren: `امرأة تريد اللعب في فريق ${D("Herren")} (فريق الرجال).`,
    frauHerrenHinweis: "يتطلب ذلك طلبًا إلى الاتحاد.",
  },

  karneval: {
    gruppe: {
      titel: { kind: "في أي مجموعة يرغب الطفل {name} في الرقص؟", selbst: "في أي مجموعة تريد أن ترقص؟" },
      weissNicht: "لا أعرف",
      weissNichtHinweis: "سيخبرك النادي.",
      uebung: "وقت التمرين: {zeit}",
      passt: "يناسب العمر",
    },
    woanders: {
      titel: { kind: "هل يرقص الطفل {name} في نادٍ آخر أيضًا؟", selbst: "هل ترقص في نادٍ آخر أيضًا؟" },
    },
    turnier: {
      titel: { kind: "هل يشارك الطفل {name} في البطولات؟", selbst: "هل تريد المشاركة في البطولات؟" },
      hinweis: "في البطولات تتنافس المجموعات في الرقص.",
    },
    abend: {
      titel: { kind: "هل يجوز أن يقدّم الطفل {name} عروضًا مسائية بدون الوالدين؟", selbst: "هل يجوز أن تقدّم عروضًا مسائية؟" },
      hinweis: "في المساء تُقام عروض في الحفلات والعروض الكرنفالية.\nتوجد استمارة إضافية للعروض المسائية.",
    },
    abholung: {
      titel: { kind: "من سيصطحب طفلك؟", selbst: "من سيصطحبك؟" },
      hinweis: "هذا السؤال اختياري.\nعندها يعرف النادي بعد العرض من سيتولى الاصطحاب.",
      name: "اسم الشخص الذي سيتولى الاصطحاب",
      nameHinweis: "إذا كان هناك عدة أشخاص فاكتب جميع الأسماء.",
    },
    allein: {
      titel: { kind: "هل يجوز لطفلك العودة إلى البيت دون مرافق؟", selbst: "هل يجوز لك العودة إلى البيت وحدك؟" },
      hinweis: "هذا السؤال اختياري.\nتظهر الإجابة لاحقًا في «إذن للعروض المسائية».",
      ab: "ابتداءً من أي ساعة؟",
      abHinweis: "اكتب الوقت هكذا: 21:30.",
    },
  },

  kontakt: {
    anschrift: {
      titel: { kind: "ما عنوان سكن {name}؟", selbst: "أين تسكن؟" },
      strasse: "الشارع ورقم المنزل",
      plz: "الرمز البريدي",
      ort: "المدينة أو البلدة",
    },
    erreichen: {
      titel: "كيف يمكننا الوصول إليك؟",
      hinweisKind: "يرجى إدخال بياناتك هنا بصفتك أحد الوالدين.",
      email: "البريد الإلكتروني",
      emailHinweis: "نرسل إليه الرسائل المهمة.",
      mobil: "رقم الهاتف المحمول",
      telefon: "رقم الهاتف الثابت",
      telefonHinweis: "يرجى ذكر رقم هاتف واحد على الأقل.",
    },
  },

  beitrag: {
    gruppe: {
      titel: { kind: "ما رسوم العضوية التي تدفعها من أجل {name}؟", selbst: "ما رسوم العضوية التي تدفعها؟" },
      vorschlagKopf: "نقترح: {gruppe}.",
      vorschlag: "تبلغ التكلفة {jahr} يورو في السنة.\nأي {monat} يورو في الشهر.",
      vorschlagOhneMonat: "تبلغ التكلفة {jahr} يورو في السنة.",
      aufnahme: "يضاف إلى ذلك رسوم قبول لمرة واحدة قدرها {betrag} يورو.",
      andere: "يمكنك اختيار فئة أخرى.",
      legende: "فئة الرسوم",
      proJahr: "{jahr} يورو في السنة",
      doppel: "أنت في كرة القدم والكرنفال.\nقد تسري رسوم خاصة على ذلك.\nسيخبرك النادي.",
      vorgeschlagen: "اقتراح",
    },
    familie: {
      titel: "من ينتمي أيضًا إلى العائلة؟",
      hinweis: "اذكر الأعضاء الآخرين في رسوم عضوية العائلة.\nيمكنك إدخال ما يصل إلى 6 أشخاص.",
      person: "فرد العائلة {nummer}",
      vorname: "الاسم الأول",
      nachname: "اسم العائلة",
      geburtsdatum: "تاريخ الميلاد",
      hinzu: "إضافة فرد آخر من العائلة",
      entfernen: "إزالة فرد العائلة {nummer}",
      voll: "لا تتسع القائمة لأكثر من 6 أشخاص. يرجى الاتصال بنا.",
      fehlerVorname: "يرجى إدخال الاسم الأول.",
      fehlerNachname: "يرجى إدخال اسم العائلة.",
    },
    senator: {
      titel: `هل تريد أن تصبح سيناتورًا (${D("Senator")})؟`,
      hinweis: "يدعم السيناتورات قسم الكرنفال.\nيدفعون رسومًا خاصة.\nيقرر مجلس الإدارة بشأن الطلب.",
      ja: "نعم، أقدّم الطلب",
      nein: "لا",
    },
  },

  leistungen: {
    titel: { kind: "هل تحصل عائلتك على مساعدات مالية من جهة حكومية؟", selbst: "هل تحصل على مساعدات مالية من جهة حكومية؟" },
    hinweis: `مثل دعم الدخل الأساسي (${D("Grundsicherungsgeld")}) أو المساعدة الاجتماعية (${D("Sozialhilfe")}) أو إعانة السكن (${D("Wohngeld")}) أو علاوة الأطفال (${D("Kinderzuschlag")}) أو مساعدات طالبي اللجوء (${D("Asylbewerberleistungen")}).\nعندها تدفع الجهة الحكومية رسوم العضوية في الغالب.\nيُسمّى هذا التعليم والمشاركة (${D("Bildung und Teilhabe")}).`,
    ja: "نعم",
    nein: "لا",
    jaHinweis: "تحدّث إلينا. نصدر لك شهادة.",
    wenigGeld: "هل دخلك قليل؟ تحدّث إلينا.",
  },

  zahlung: {
    art: {
      titel: "كيف تريد أن تدفع؟",
      sepa: `الخصم المباشر (${D("Lastschrift")}) – موصى به`,
      sepaHinweis: "يسحب النادي رسوم العضوية مرة واحدة في السنة.",
      rechnung: "فاتورة",
      rechnungHinweis: "تحوّل رسوم العضوية بنفسك.",
      zuschlag: "قد تُضاف رسوم إضافية قدرها {zuschlag} يورو في السنة.",
    },
    inhaber: {
      titel: "لمن يعود الحساب؟",
      ich: "لي",
      andere: "لشخص آخر",
      person: "صاحب الحساب",
      vorname: "الاسم الأول",
      nachname: "اسم العائلة",
      anschriftGleich: "يسكن الشخص على العنوان نفسه.",
      strasse: "الشارع ورقم المنزل",
      plz: "الرمز البريدي",
      ort: "المدينة أو البلدة",
    },
    iban: {
      titel: `ما هو رقم ${D("IBAN")}؟`,
      iban: "IBAN",
      ibanHinweis: `رقم ${D("IBAN")} مكتوب على بطاقتك المصرفية.\nالمسافات غير مهمة.`,
      bic: "BIC",
      bank: "اسم البنك",
    },
  },

  einwilligungen: {
    fotos: {
      titel: { kind: "هل يجوز لنا عرض صور طفلك؟", selbst: "هل يجوز لنا عرض صورك؟" },
      hinweis: "تقرر بحرية. ويمكنك تغيير ذلك لاحقًا.",
      ja: "نعم",
      jaHinweis: "تختار بعد قليل أين.",
      nein: "لا",
      medienLegende: "أين يجوز لنا عرض الصور؟",
      medienHinweis: "اختر خيارًا واحدًا على الأقل.",
      intern: "داخل النادي: لوحات الإعلانات والنشرات",
      web: "على الإنترنت: الموقع الإلكتروني ووسائل التواصل وتطبيق النادي",
      presse: "في الصحف: تقارير عن النادي",
      dokumentation: "في الكتب التذكارية وسجلات النادي",
    },
    hfv: {
      titel: `ماذا يجوز أن ينشر الاتحاد الهيسي لكرة القدم (${D("Hessischer Fußball-Verband, HFV")})؟`,
      hinweis: "الاثنان اختياريان. ويمكنك تغيير ذلك لاحقًا.",
      name: `يجوز ظهور الاسم على موقع ${D("FUSSBALL.DE")}.`,
      nameHinweis: "ينطبق هذا على الأطفال دون 16 عامًا.",
      foto: "يجوز ظهور الصورة على الإنترنت.",
      fotoHinweis: `مثلًا على موقع ${D("FUSSBALL.DE")}.`,
      ab16: "بعد بلوغ 16 عامًا يجوز للاتحاد عرض الاسم دون موافقة. ويمكنك الاعتراض.",
    },
    fahrten: {
      titel: "الرحلات والرسائل",
      hinweis: "الاثنان اختياريان. ويمكنك تغيير ذلك لاحقًا.",
      fahrten: "يجوز للطفل {name} السفر إلى المباريات والبطولات.",
      fahrtenHinweis: "مثلًا في سيارات أولياء أمور آخرين.",
      messenger: "يجوز للطفل {name} الانضمام إلى مجموعة المراسلة الخاصة بالفريق.",
      messengerHinweis: "تُنشر هناك المواعيد والاتفاقات.",
    },
  },

  notfall: {
    kontakt: {
      titel: "بمن نتصل في حالة الطوارئ؟",
      hinweis: "اذكر شخصًا يمكن الوصول إليه بسرعة.",
      name: "الاسم",
      telefon: "رقم الهاتف",
      beziehung: "من هذا الشخص؟",
      beziehungHinweis: "مثال: الجدة أو الجارة",
    },
    bogen: {
      titel: `هل تريد ملء استمارة صحية (${D("Gesundheitsbogen")})؟`,
      hinweis: "هي اختيارية.\nتساعد في حالات الحساسية والأمراض.\nلا يراها إلا المدربون والمشرفون.",
      ja: "نعم، سأملؤها",
      nein: "لا",
    },
    gesundheit: {
      titel: "الصحة: {name}",
      hinweis: "كل الحقول اختيارية.\nتُحفظ البيانات منفصلة في قسم خاص من الملف.",
      allergien: "الحساسية",
      erkrankungen: "الأمراض",
      medikamente: "الأدوية",
      medikamenteHinweis: "عند استخدام بخاخ الربو أو قلم الطوارئ، يرجى الاتفاق كتابيًا.",
      sonstiges: "أخرى",
    },
  },

  spielerfoto: {
    titel: `كيف نحصل على صورة بطاقة اللاعب (${D("Spielerpass")})؟`,
    hinweis: `يحتاج الاتحاد الهيسي لكرة القدم (${D("Hessischer Fußball-Verband, HFV")}) إلى صورة للرأس والكتفين.\nيجب أن يكون الوجه واضحًا.`,
    foto: "ألتقط صورة الآن",
    fotoHinweis: "بكاميرا الهاتف.",
    datei: "أختار صورة من جهازي",
    dateiHinweis: "صورة لديك بالفعل.",
    verein: "النادي يلتقط الصورة",
    vereinHinweis: "في أول تدريب.",
    machen: "التقاط صورة",
    waehlen: "اختيار صورة",
    anderes: "صورة أخرى",
    vorschau: "معاينة الصورة",
    zugeschnitten: "نقصّ الصورة لتناسب الحجم.",
    hinzugefuegt: "تمت إضافة الصورة.",
  },

  nachweise: {
    titel: "ما المستندات التي لديك بالفعل؟",
    hinweis: "صوّر كل مستند لديك.\nيمكنك تسليم الناقص لاحقًا.\nالصورة تبقى على جهازك.",
    habe: "لديّ",
    fehlt: "ما زال ناقصًا",
    foto: "التقاط صورة",
    datei: "اختيار ملف",
    entfernen: "إزالة",
    entfernenLang: "إزالة {datei}",
    hinzugefuegt: "تمت إضافة الملف.",
    entfernt: "تمت إزالة الملف.",
    vorschau: "معاينة: {datei}",
    pdf: "ملف PDF",
    warum: "لماذا؟",
    wie: "كيف تحصل عليه:",
    wo: "أين؟",
    dateien: "ملفاتك:",
    art: {
      pflicht: "هذا مطلوب.",
      verein: "يريد النادي هذا.",
      freiwillig: "هذا اختياري.",
      nur_wenn: "مطلوب إذا كان ينطبق عليك.",
      offen: "قد يكون مطلوبًا. سيخبرك النادي.",
    },
    leer: "لا حاجة إلى أي مستندات.",
  },

  unterschriften: {
    titel: "كيف تريد أن توقّع؟",
    weg: {
      bildschirm: "على الشاشة حيث يُسمح بذلك",
      bildschirmHinweis: "توقّع مستندات النادي هنا بإصبعك.",
      papier: "أوقّع كل شيء على الورق",
      papierHinweis: "تطبع الملف وتوقّع بالقلم.",
    },
    satzung: {
      titel: `النظام الأساسي للنادي (${D("Satzung")})`,
      erklaerung: `النظام الأساسي (${D("Satzung")}) هو قواعد النادي.`,
      link: `قراءة النظام الأساسي (${D("Satzung")})`,
      linkZusatz: "ملف PDF، يُفتح في علامة تبويب جديدة",
      ohneLink: `تجد النظام الأساسي (${D("Satzung")}) على موقع النادي على الإنترنت.`,
      label: `لقد قرأت النظام الأساسي (${D("Satzung")}).`,
      pflicht: "بدون علامة في المربع لا يمكنك التوقيع على الشاشة.",
      freiwillig: "اختياري. بدون علامة هنا تضع العلامة بخط اليد على النسخة المطبوعة.",
    },
    hierTitel: "توقّع هذه المستندات هنا",
    hierHinweis: "ارسم بإصبعك أو بالقلم أو بالفأرة.",
    gilt: "يسري على: {formulare}",
    person: {
      mitglied: { kind: "توقيع {name}", selbst: "توقيعك" },
      sorgeberechtigte: "توقيع {person}",
      ersteEltern: "التوقيع: الأم أو الأب",
      zweiteEltern: "التوقيع: الوالد الثاني",
      zweiteHinweis: "هذا التوقيع اختياري.\nيكفي توقيع واحد بالنسبة إلى الاتحاد.\nنوصي بأن يوقّع الوالدان معًا.",
      kontoinhaber: "توقيع صاحب الحساب: {person}",
      spieler: "توقيع اللاعب",
      ersteSorge: "توقيعك",
    },
    stand0: "لم يتم التوقيع بعد",
    standOk: "تم التوقيع",
    standZuKurz: "قصير جدًا. يرجى إكمال التوقيع.",
    loeschen: "حذف",
    loeschenLang: "حذف التوقيع: {person}",
    ariaLabel: "حقل التوقيع. ارسم بإصبعك أو بالقلم أو بالفأرة.",
    stiftTitel: "توقّع هذه الصفحات بالقلم",
    stiftHinweis: `يشترط الاتحاد الهيسي لكرة القدم (${D("Hessischer Fußball-Verband, HFV")}) التوقيع بالقلم على استماراته.`,
    stiftHinweisPapier: "توقّع كل الصفحات بالقلم.",
    stiftListe: "هذه هي الصفحات:",
    hfvTitel: "متى توقّع هذه الصفحات؟",
    training: "في أول تدريب – نحضر الصفحات",
    selbst_drucken: "أطبعها بنفسي",
    selbst_druckenHinweis: "تطبع الصفحات وتوقّعها.",
    nichts: "لا يحتاج تسجيلك إلى أي توقيع.",
  },

  pruefen: {
    titel: "هل كل شيء صحيح؟",
    hinweis: "راجع بياناتك.\nاستخدم «تعديل» لتصحيح أي شيء.",
    weiter: "كل شيء صحيح – إنشاء الملف",
    aendern: "تعديل",
    aendernLang: "تعديل {bereich}",
    bereiche: {
      person: "الشخص",
      abteilung: "كرة القدم والكرنفال",
      pass: "جواز السفر ومكان الإقامة",
      sorge: "حق الحضانة",
      kontakt: "الاتصال",
      beitrag: "الرسوم والدفع",
      einwilligungen: "الموافقات",
      notfall: "الطوارئ",
      foto: "الصورة",
      unterlagen: "المستندات",
      unterschriften: "التوقيعات",
    },
    zeilen: {
      name: "الاسم",
      geboren: "تاريخ الميلاد",
      geburtsort: "مكان الميلاد",
      geschlecht: "الجنس",
      abteilung: "القسم",
      mannschaft: "الفريق",
      spielen: "المباريات",
      spielenJa: `نعم، مع إذن اللعب (${D("Spielrecht")})`,
      spielenNein: "التدريب فقط",
      alterVerein: "النادي السابق",
      alteMitgliedschaft: "العضوية في النادي القديم",
      abmeldung: "إلغاء التسجيل",
      karneval: "مجموعة الكرنفال",
      abendauftritte: "العروض المسائية",
      abholung: "من سيصطحب",
      alleinNachHause: "العودة إلى البيت دون مرافق",
      staaten: "الجنسية",
      ausland: "آخر إقامة في الخارج",
      wohnen: "مكان الإقامة",
      sorge: "حق الحضانة",
      sorgePersonen: "الأشخاص",
      anschrift: "العنوان",
      email: "البريد الإلكتروني",
      telefon: "الهاتف",
      beitrag: "رسوم العضوية",
      leistungen: "مساعدات من جهة حكومية",
      zahlung: "الدفع",
      kontoinhaber: "صاحب الحساب",
      iban: "IBAN",
      fotos: "الصور",
      hfv: `الاتحاد الهيسي لكرة القدم (${D("HFV")})`,
      fahrten: "الرحلات",
      messenger: "مجموعة المراسلة",
      notfall: "جهة الاتصال في الطوارئ",
      gesundheitsbogen: "الاستمارة الصحية",
      spielerfoto: "صورة اللاعب",
      unterschriftWeg: "التوقيع",
      satzung: `قراءة النظام الأساسي (${D("Satzung")})`,
      hfvUnterschrift: "صفحات الاتحاد",
      dateiEins: "ملف واحد",
      dateiMehr: "{anzahl} ملفات",
    },
    werte: {
      ja: "نعم",
      nein: "لا",
      weissNicht: "لا أعرف",
      satzungVonHand: "لا – ستضع العلامة بخط اليد",
      alleinAb: "نعم، اعتبارًا من الساعة {zeit}",
      geschlecht: { m: "ذكر", w: "أنثى", d: `متنوع (${D("divers")})`, ohne_angabe: "غير محدد" },
      abteilung: { fussball: "كرة القدم", karneval: "الكرنفال", beides: "كرة القدم والكرنفال", passiv: "الدعم فقط" },
      abmeldung: {
        einschreiben: `برسالة مسجلة (${D("Einschreiben")}) بتاريخ {datum}`,
        formlos: "بالبريد الإلكتروني أو برسالة فقط",
        noch_nicht: "ليس بعد",
        weiss_nicht: "لا أعرف",
        vollmacht: `بتوكيل (${D("Vollmacht")})`,
        weg: "الطريقة: {weg}",
      },
      mitgliedschaft: { kuendigen: "سأنهي العضوية", passiv: "يبقى كعضو داعم", weiss_nicht: "لا أعرف" },
      sorge: {
        beide: "الوالدان معًا",
        getrennt_bei_mir: "الوالدان منفصلان، والطفل يعيش معي",
        allein: "حق الحضانة لي وحدي",
        vormund: `وصي قانوني (${D("Vormund")})`,
        pflege: "أسرة حاضنة أو مشرفو الرعاية",
      },
      wohnen: {
        gemeinsam: "مع الوالدين في ألمانيا",
        nicht_gemeinsam: "مع الوالدين، غير مسجلين معًا",
        verwandte: "عند أقارب",
        ohne_eltern: "بدون الوالدين",
      },
      zahlung: { sepa: `الخصم المباشر (${D("Lastschrift")})`, rechnung: "فاتورة" },
      kontoinhaber: { mitglied: "أنا", sorgeberechtigt: "أنا", andere: "شخص آخر" },
      unterschriftWeg: { bildschirm: "على الشاشة حيث يُسمح بذلك", papier: "كله على الورق" },
      hfvUnterschrift: { training: "في أول تدريب", selbst_drucken: "أطبعها بنفسي" },
      habe: "لديّ",
      fehlt: "ما زال ناقصًا",
      vereinMacht: "النادي يلتقط الصورة",
      fotoDa: "الصورة موجودة",
      unterschrieben: "تم التوقيع",
      nichtUnterschrieben: "لم يتم التوقيع بعد",
      betragJahr: "{gruppe}، {jahr} يورو في السنة",
    },
    hinweiseTitel: "ما يجب أن تعرفه",
    weitereHinweise: "ملاحظات أخرى ({anzahl})",
    klaertVerein: "يوضح النادي ذلك",
    fristUnsicher: "هذا تقدير. يتحقق النادي منه بدقة.",
    weiterleitungTitel: "ستتواصل معك هذه الجهات:",
    weiterleitungAn: {
      jugendleitung: `إدارة الشباب (${D("Jugendleitung")})`,
      passwesen: `مكتب بطاقات اللاعبين في النادي (${D("Passwesen")})`,
      geschaeftsstelle: `مكتب النادي (${D("Geschäftsstelle")})`,
      karneval: `قسم الكرنفال (${D("Karnevalabteilung")})`,
      spielausschuss: `لجنة المباريات (${D("Spielausschuss")})`,
    },
    hinweisArt: {
      warnung: "تنبيه",
      info: "للعلم",
      frist: "المهلة",
      offen: "يوضح النادي ذلك",
    },
  },

  fertig: {
    titelArbeit: "نُعدّ ملفك",
    titelFertig: "ملفك جاهز",
    titelFehler: "لم ينجح ذلك",
    arbeitet: "لحظة من فضلك. جارٍ إنشاء الملف.",
    nochmal: "حاول مرة أخرى",
    datei: "الملف: {name}",
    info: `عدد الصفحات: {seiten}، الحجم: ${D("{groesse}")}`,
    teileTitel: "محتويات الملف:",
    teil: `{titel} (${"من الصفحة {von} إلى الصفحة {bis}".replace(/ /g, "\u00A0")})`,
    // Titel der Teile des PDF (SCHNITTSTELLEN Abschnitt 9); der Buchstabe steht im Isolat
    teilTitel: {
      A: `الجزء ${D("A")} – لك`,
      B: `الجزء ${D("B")} – للنادي`,
      C: `الجزء ${D("C")} – سري، يُسلَّم بشكل منفصل`,
    },
    herunterladen: "تنزيل الملف",
    teilen: "مشاركة الملف",
    ansehen: "عرض الملف",
    fotoSpeichern: "حفظ صورة اللاعب كصورة",
    gespeichert: `يجري حفظ الملف. يوجد غالبًا في مجلد «التنزيلات» (${D("Downloads")}).`,
    geteilt: "تمت المشاركة.",
    teilenFehler: "المشاركة غير ممكنة هنا. تم حفظ الملف بدلًا من ذلك.",
    fehler: {
      bibliothek: "تعذّر تحميل جزء من البرنامج. يرجى التحقق من اتصال الإنترنت.",
      vorlageNetz: "تعذّر تحميل أحد النماذج. يرجى التحقق من اتصال الإنترنت.",
      vorlageGeaendert: `تم تغيير أحد نماذج النادي. يرجى الاتصال بمكتب النادي (${D("Geschäftsstelle")}).`,
      modul: `لا يمكن إنشاء الملف بعد. يرجى الاتصال بمكتب النادي (${D("Geschäftsstelle")}).`,
      pdf: "تعذّر إنشاء الملف. يرجى المحاولة مرة أخرى.",
    },
    naechsteTitel: "الخطوات التالية",
    unterschriftTraining: `توقّع صفحات الاتحاد الهيسي لكرة القدم (${D("Hessischer Fußball-Verband, HFV")}) بالقلم في أول تدريب.`,
    unterschriftDrucken: "اطبع الملف. ووقّع بالقلم عند كل العلامات الزرقاء.",
    unterschriftDruckenTeil: `اطبع صفحات الاتحاد الهيسي لكرة القدم (${D("Hessischer Fußball-Verband, HFV")}). ووقّع بالقلم عند العلامات الزرقاء.`,
    unterschriftTrainingAlle: "توقّع كل الصفحات بالقلم في أول تدريب. ويطبعها النادي.",
    unterschriftFertig: "لقد وقّعت كل شيء على الشاشة. لا حاجة إلى الطباعة.",
    fehltTitel: "ما زالت هذه المستندات ناقصة:",
    fehltHinweis: "أحضرها بمجرد أن تحصل عليها.",
    abgeben: "سلّم المستندات في النادي.\nأحضر الملف على هاتفك. أو سلّمه مطبوعًا.",
    nichtWhatsapp: `يرجى عدم إرسال الملف عبر ${D("WhatsApp")}. فهو يحتوي على بيانات خاصة.`,
    teilC: `الجزء ${D("C")} (${D("Teil C")}) يحتوي على بيانات صحية. سلّمه بشكل منفصل.`,
    weiterePerson: "تسجيل شخص آخر",
    weiterePersonHinweis: "ننقل العنوان وبيانات الاتصال وبيانات الوالدين وبيانات الدفع.",
    neuePerson: "أنت الآن تسجّل الشخص التالي.",
  },
};
