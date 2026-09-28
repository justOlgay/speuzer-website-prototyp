# Aufnahmeantrag-Annahme (Vereins-Webspace)

Stand 28.09.2026. Fertig gebaut und lokal geprüft, **noch nicht eingerichtet**.
Die Website läuft bis dahin im Weg „manuell“ (PDF herunterladen bzw. teilen und
selbst per E-Mail senden).

## Wozu

appack nimmt Formulare nur aus der App an. Website-Besucher ohne App-Sitzung
bekommen 403 („request not allowed“). Die Website erzeugt das unterschriebene
Vereins-PDF deshalb selbst (`src/seiten/aufnahmeantrag.mjs`,
`assets/js/antrag/aufnahmeantrag.js`). Diese kleine PHP-Annahme auf dem
Vereins-Webspace bei IONOS schickt es per E-Mail an die Geschäftsstelle. Das
ist der Weg a) aus der Mail an die 1. Vorsitzende. Weg b) wäre ein
öffentlicher Formularweg bei vmapit.

## Ablauf

1. Die Seite „Aufnahmeantrag online“ (cdn.appack.de) schickt nach
   „An die Geschäftsstelle senden“ einen POST an `annahme.php`
   (multipart/form-data: Datei `antrag`, Felder `email`, `name`).
2. `annahme.php` prüft in dieser Reihenfolge:
   - Einstellungen vollständig (Passwort eingetragen)
   - Herkunft (`Origin` in `erlaubte_herkunft`, sonst 403 ohne CORS-Freigabe)
   - Größe (≤ 10 MB, sonst 413)
   - Datei: `%PDF-`, `%%EOF`, MIME `application/pdf`, **/ID der Vereinsvorlage**
     (`VORLAGE_ID`, pdf-lib übernimmt sie beim Ausfüllen), **genau 4 Seiten**
     und **keine aktiven Inhalte** (`/JavaScript`, `/JS`, `/OpenAction`,
     `/AA`, `/Launch`, `/URI`, eingebettete Dateien, `/SubmitForm`, `/XFA`
     u. a., auch mit `#xx` verschleiert), sonst 400. Geprüft werden der
     Aufbau ohne Stream-Inhalte und die entpackten Objekt-Streams (höchstens
     20, je 1 MB, zusammen 4 MB, nur FlateDecode).
   - Die /ID ist öffentlich (Vorlage in der Mediathek), und die Herkunft
     lässt sich per Skript fälschen. Die Prüfungen belegen also nicht die
     Echtheit. Sie begrenzen, was ankommen kann: ein PDF nach Art des
     Vereinsantrags ohne aktive Inhalte, nur an die Geschäftsstelle, in
     begrenzter Zahl.
   - Mengengrenze: je Anschluss 5 pro Stunde (sonst 429 `zu-viele`),
     gesamt 50 pro Tag (sonst 429 `zu-viele-heute`, die Seite verweist dann
     auf den E-Mail-Weg). Gemerkt wird nur ein gekürzter Prüfwert (HMAC,
     20 Bit) der IP-Adresse, bei IPv6 des /64-Netzes. Der Schlüssel wechselt
     täglich und wird aus dem Postfach-Passwort abgeleitet, steht also nicht
     in `daten/`. Aufgeräumt wird bei jeder Anfrage.
3. Versand mit PHPMailer 7.1.1 (`lib/PHPMailer`, LGPL-2.1, vom offiziellen
   Repo, Tag v7.1.1, Commit 1bc1716a) über SMTP (smtp.ionos.de:587,
   STARTTLS) vom Postfach `formular@sportfreunde04.de`:
   - an die Geschäftsstelle: PDF als Anhang, Reply-To = angegebene E-Mail,
     Betreff „Aufnahmeantrag online – Name“
   - an den Antragsteller: Eingangsbestätigung mit **festem Text, ohne Anhang
     und ohne Namen**. Bei einem Tippfehler in der Adresse landet so keine
     IBAN bei Fremden, und niemand kann über die Annahme Text an beliebige
     Adressen schicken.
   - Ersatzweg `versandweg: "php-mail"` (PHP `mail()` des Webspace, ohne
     Passwort) nur, falls SMTP nicht geht.
4. Antwort JSON `{"ok": true, "bestaetigung": true|false|null}` (null =
   Bestätigung abgeschaltet), Fehler
   `{"ok": false, "fehler": "herkunft|kein-pdf|falsche-vorlage|zu-gross|zu-viele|zu-viele-heute|versand|speicher|einstellungen"}`.
   Gespeichert wird nichts. Das Fehlerprotokoll schreibt keine E-Mail-Adressen.
5. `?pruefen` (GET) zeigt Einstellungen (auch Tippfehler in
   `einstellungen.php` mit Zeilennummer), ob PHP neu genug ist, Schreibrecht
   in `daten/`, fehlende Schutzdateien und meldet sich einmal am Postfach an,
   ohne zu senden (höchstens 10 Anmeldungen pro Stunde).

Zugriffsschutz: `.htaccess` (nur Zugriffsregeln, keine `Options`, damit kein
Fehler 500) sperrt `einstellungen*` (auch Kopien wie `.bak`, `~`, `.save`),
`*.md/txt/json/bak/old/orig/save/swp/tmp/aus/zip`. `lib/.htaccess` und
`daten/.htaccess` sperren alles. Zusätzlich gibt `einstellungen.php` ohne die
Konstante `ANNAHME` nur 404 aus.

## Dateien

| Datei | Zweck |
|---|---|
| `annahme.php` | die Annahme |
| `einstellungen.beispiel.php` | Vorlage, im Paket als `einstellungen.php` (Passwort-Platzhalter) |
| `.htaccess`, `lib/.htaccess`, `daten/.htaccess` | Zugriffsschutz |
| `index.html` | Hinweisseite statt Ordneransicht |
| `lib/PHPMailer/` | PHPMailer 7.1.1 (3 Dateien + LICENSE) |
| `ANLEITUNG.md` | Einrichtung Schritt für Schritt für die Person mit IONOS-Zugang |
| `test/annahme_test.py` | lokaler Test (Apache + PHP-FPM + SMTP-Falle) |
| `test/smtp_falle.py` | SMTP-Server, der nur mitschreibt |

## Befehle

```
npm run annahme-test     # 76 Prüfungen, nur lokal, nur Testdaten
npm run annahme-paket    # prüft VORLAGE_ID gegen die Vorlage, baut dist/aufnahmeantrag-annahme.zip
```

Browser-Durchlauf mit echter Annahme (Formular ausfüllen, senden, E-Mail mit
PDF in der Falle):

```
python3 server/aufnahmeantrag-annahme/test/annahme_test.py --bereitstellen &
ANTRAG_VERSAND_URL=https://annahme.test/aufnahmeantrag npm run build
ANNAHME_LOKAL=$(cat tools/cache/annahme-test/adresse.txt) node tools/cache/antrag-pdf/test/aufnahmeantrag-test.mjs endpunkt endpunkt-handy endpunkt-fehler endpunkt-papier
npm run build            # danach unbedingt wieder normal bauen
```

Stand 28.09.2026: alle 4 Endpunkt-Fälle ohne Befund (Anhang Byte für Byte
gleich dem PDF der Seite), die 4 bisherigen Fälle im Weg „manuell“ mit dem
neuen Skript ebenfalls. Alle 55 bisher erzeugten Test-PDFs besteht die
Datei-Prüfung.

Unabhängige Sicherheitsprüfung am 28.09.2026: kein Muss-Befund. Die
Soll-Befunde sind behoben: aktive Inhalte, Grenzen beim Entpacken,
Prüfwert statt Hash mit gespeichertem Salz, IPv6-/64, Tagesgrenze mit
eigener Meldung, Sperre für Kopien der Einstellungen, Hinweis zum
Ausbildungsnachweis. Von den Kann-Befunden ebenfalls umgesetzt:
Tippfehler-Meldung, keine Versionsnummer in `?pruefen`, Senden gegen
Wettlauf mit einem neuen PDF gesichert, 120 s Wartezeit. Offen bleibt:
`?pruefen` bleibt öffentlich (nur Ja/Nein-Angaben, begrenzt).

## Umschalten (wenn `?pruefen` `"bereit": true` meldet)

1. `src/vorlagen/hilfen.mjs`: in `AUFNAHMEANTRAG_VERSAND` `art: "endpunkt"`
   setzen, `ANNAHME_URL` prüfen (Vorgabe `https://formular.sportfreunde04.de/annahme.php`).
2. `data/datenschutz.json`: § 14 nutzt dann automatisch `absaetze_endpunkt`
   (IONOS als Auftragsverarbeiter, Host der Annahme). `stand` und `quelle`
   auf das Datum der Umstellung setzen.
3. `npm run build`, dann ins CMS: `aufnahmeantrag.html`, `aufnahmeantrag.js`,
   `mitglied-werden.html`, `verein-downloads.html`, `datenschutz.html`.
4. Live-Test mit einem als TEST markierten Antrag (Testdaten, keine echte
   IBAN): Ankunft bei der Geschäftsstelle und die Bestätigung prüfen, danach
   löschen lassen.
5. Übernahme-Doku und Mail-Entwurf nachziehen.

## Pflege

- **Neue Vereinsvorlage** (PDF im CMS ersetzt): Die Website sperrt das
  Online-Formular dann von selbst (SHA-256). Nach dem Neuvermessen
  `npm run annahme-paket` ausführen: Es meldet die neue /ID. Diese in
  `VORLAGE_ID` eintragen und `annahme.php` neu hochladen.
- **PHPMailer aktualisieren:** die drei Dateien aus einem neuen Release-Tag
  übernehmen und `npm run annahme-test` laufen lassen.
