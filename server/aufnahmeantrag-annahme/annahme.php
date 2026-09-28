<?php
/*
 * Aufnahmeantrag online – Annahme über die Vereinsdomain
 * FFV Sportfreunde 04 (Stand 28.09.2026)
 *
 * Die Seite „Aufnahmeantrag online“ (Website, cdn.appack.de) erzeugt das
 * unterschriebene Vereins-PDF im Browser. Mit „An die Geschäftsstelle
 * senden“ schickt sie es per POST hierher (multipart/form-data: Datei
 * "antrag", dazu "email" und "name"). Dieses Skript
 *   1. prüft Herkunft, Menge und Datei (nur PDFs aus der Vereinsvorlage, mit
 *      4 Seiten und ohne aktive Inhalte wie JavaScript, Links oder
 *      eingebettete Dateien),
 *   2. schickt das PDF als Anhang an die Geschäftsstelle (Antwort-Adresse:
 *      die angegebene E-Mail) und
 *   3. schickt der angegebenen Adresse eine Eingangsbestätigung – mit festem
 *      Text, ohne Anhang und ohne Angaben aus dem Antrag (das PDF enthält
 *      ggf. die IBAN; bei einem Tippfehler in der Adresse landet so nichts
 *      bei Fremden, und niemand kann hierüber Text an beliebige Adressen
 *      senden).
 * Gespeichert wird nichts: Das PDF liegt nur während der Anfrage im
 * Arbeitsspeicher bzw. in PHPs temporärer Upload-Datei, die PHP am Ende der
 * Anfrage löscht. Für die Mengengrenze merkt sich das Skript kurzzeitig einen
 * gekürzten Prüfwert der IP-Adresse (HMAC mit täglich wechselndem Schlüssel,
 * 20 Bit – daraus lässt sich die Adresse nicht zurückrechnen; Ordner daten/).
 *
 * Wichtig: Die Prüfungen belegen nicht, dass eine Anfrage wirklich von der
 * Website kommt (Herkunft und Vorlage lassen sich nachbauen). Sie sorgen
 * dafür, dass nur ein PDF nach Art des Vereinsantrags ohne aktive Inhalte,
 * in begrenzter Zahl und nur an die Geschäftsstelle geht.
 *
 * Einrichtung: siehe ANLEITUNG.md. Einstellungen (Postfach, Passwort,
 * Empfänger) stehen in einstellungen.php, nicht hier.
 *
 * Prüfung nach der Einrichtung: https://<adresse>/annahme.php?pruefen
 * zeigt, ob Einstellungen, Passwort und Ordner daten/ passen und ob die
 * Anmeldung am Postfach klappt – ohne eine E-Mail zu senden.
 */

declare(strict_types=1);

const ANNAHME = true;
const ANNAHME_VERSION = '1.1 (28.09.2026)';

// Kennung (/ID) der Vereinsvorlage „Vereinsanmeldung allgemein_NEU_9-2026“
// (data/aufnahmeantrag-felder.json im Website-Repo, SHA-256 ce9c37c0…).
// pdf-lib übernimmt sie beim Ausfüllen unverändert – ein PDF mit anderer
// Kennung stammt nicht aus dem Online-Antrag. Ändert der Verein die
// Vorlage, muss die Website ohnehin neu vermessen werden; dann auch hier die
// neue Kennung eintragen (npm run annahme-paket prüft das).
const VORLAGE_ID = '5F7DA90716DA214E8AA5F50A1137C202';
const VORLAGE_SEITEN = 4;

ini_set('display_errors', '0');
error_reporting(E_ALL);
date_default_timezone_set('Europe/Berlin');

header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');
header('Referrer-Policy: no-referrer');

// Fehler beim Laden (z. B. Tippfehler in einstellungen.php) – für ?pruefen.
$GLOBALS['EINSTELLUNGEN_FEHLER'] = '';
$E = lade_einstellungen();
$herkunftErlaubt = setze_cors($E);
$methode = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($methode === 'OPTIONS') {
    if (!$herkunftErlaubt) antworte(403, ['ok' => false, 'fehler' => 'herkunft']);
    header('Access-Control-Allow-Methods: POST');
    header('Access-Control-Allow-Headers: Content-Type');
    header('Access-Control-Max-Age: 600');
    http_response_code(204);
    exit;
}

if ($methode === 'GET' && isset($_GET['pruefen'])) {
    if ($E !== null) grenzen_aufraeumen(true);
    pruefen($E);
}

if ($methode !== 'POST') {
    header('Allow: POST, OPTIONS');
    antworte(405, ['ok' => false, 'fehler' => 'methode']);
}

if ($E === null || einstellungen_fehlen($E)) antworte(500, ['ok' => false, 'fehler' => 'einstellungen']);
if (!$herkunftErlaubt) antworte(403, ['ok' => false, 'fehler' => 'herkunft']);

// Größer als post_max_size: PHP verwirft dann den ganzen Inhalt.
$laenge = (int)($_SERVER['CONTENT_LENGTH'] ?? 0);
if ($laenge > $E['grenzen']['max_bytes'] + 65536 || (empty($_FILES) && $laenge > 0 && empty($_POST))) {
    antworte(413, ['ok' => false, 'fehler' => 'zu-gross']);
}

grenzen_aufraeumen();
$pdf = lies_pdf($E);
$email = saubere_email($_POST['email'] ?? '');
$name = sauberer_name($_POST['name'] ?? '');
$dateiname = sauberer_dateiname($_FILES['antrag']['name'] ?? '');

// Erst nach allen Prüfungen zählen – nur was wirklich versendet würde.
$grenze = zaehle_versand($E);
if ($grenze !== '') antworte(429, ['ok' => false, 'fehler' => $grenze]);

require_once __DIR__ . '/lib/PHPMailer/Exception.php';
require_once __DIR__ . '/lib/PHPMailer/PHPMailer.php';
require_once __DIR__ . '/lib/PHPMailer/SMTP.php';

try {
    $m = neuer_mailer($E);
    $m->addAddress($E['empfaenger']);
    if ($email !== '') $m->addReplyTo($email);
    $m->Subject = 'Aufnahmeantrag online – ' . ($name !== '' ? $name : 'ohne Namen');
    $m->Body = text_geschaeftsstelle($E, $email);
    $m->addStringAttachment($pdf, $dateiname, 'base64', 'application/pdf');
    $m->send();
} catch (Throwable $f) {
    protokolliere('Versand an die Geschäftsstelle fehlgeschlagen', $f, $m ?? null);
    antworte(502, ['ok' => false, 'fehler' => 'versand']);
}

$bestaetigt = false;
if ($email !== '' && $E['bestaetigung']) {
    try {
        $b = neuer_mailer($E);
        $b->addAddress($email);
        $b->addReplyTo($E['empfaenger']);
        $b->Subject = 'Ihr Aufnahmeantrag beim ' . $E['verein'];
        $b->Body = text_bestaetigung($E);
        $b->send();
        $bestaetigt = true;
    } catch (Throwable $f) {
        protokolliere('Eingangsbestätigung fehlgeschlagen', $f, $b ?? null);
    }
}

// bestaetigung: true = verschickt, false = sollte, ging aber nicht (oder
// Adresse ungültig), null = in den Einstellungen abgeschaltet.
antworte(200, ['ok' => true, 'bestaetigung' => $E['bestaetigung'] ? $bestaetigt : null]);


// ---------- Einstellungen ----------

function lade_einstellungen(): ?array
{
    $datei = __DIR__ . '/einstellungen.php';
    if (!is_file($datei)) return null;
    try {
        $e = require $datei;
    } catch (Throwable $f) {
        $GLOBALS['EINSTELLUNGEN_FEHLER'] = 'einstellungen.php hat einen Fehler in Zeile ' . $f->getLine()
            . ' – dort nur das Passwort ändern, die Zeile PASSWORT, darunter muss ganz links stehen';
        return null;
    }
    if (!is_array($e)) return null;
    $vorgabe = [
        'verein' => 'FFV Sportfreunde 04',
        'empfaenger' => '',
        'absender' => '',
        'absender_name' => 'Website FFV Sportfreunde 04',
        'versandweg' => 'smtp',
        'smtp' => [],
        'erlaubte_herkunft' => [],
        'bestaetigung' => true,
        'grenzen' => [],
    ];
    $e = array_replace($vorgabe, $e);
    $e['smtp'] = array_replace(
        ['host' => 'smtp.ionos.de', 'port' => 587, 'sicherheit' => 'tls', 'benutzer' => '', 'passwort' => ''],
        is_array($e['smtp']) ? $e['smtp'] : []
    );
    $e['smtp']['passwort'] = trim((string)$e['smtp']['passwort']);
    $e['grenzen'] = array_replace(
        ['je_stunde_und_adresse' => 5, 'je_tag_gesamt' => 50, 'max_bytes' => 10 * 1024 * 1024],
        is_array($e['grenzen']) ? $e['grenzen'] : []
    );
    if ($e['smtp']['benutzer'] === '') $e['smtp']['benutzer'] = $e['absender'];
    $e['erlaubte_herkunft'] = array_values(array_filter((array)$e['erlaubte_herkunft'], 'is_string'));
    if (!filter_var($e['empfaenger'], FILTER_VALIDATE_EMAIL) || !filter_var($e['absender'], FILTER_VALIDATE_EMAIL)) return null;
    return $e;
}

function einstellungen_fehlen(?array $E): array
{
    $fehlt = [];
    if ($E === null) return [($GLOBALS['EINSTELLUNGEN_FEHLER'] ?? '') ?: 'einstellungen.php fehlt oder Empfänger/Absender ungültig'];
    if ($E['versandweg'] === 'smtp' && ($E['smtp']['passwort'] === '' || $E['smtp']['passwort'] === 'HIER-DAS-PASSWORT-EINTRAGEN')) {
        $fehlt[] = 'Passwort des Postfachs fehlt';
    }
    if (!in_array($E['versandweg'], ['smtp', 'php-mail'], true)) $fehlt[] = 'versandweg muss "smtp" oder "php-mail" sein';
    if (!$E['erlaubte_herkunft']) $fehlt[] = 'erlaubte_herkunft ist leer';
    return $fehlt;
}


// ---------- Antworten, Herkunft ----------

function antworte(int $status, array $daten): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($daten, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

// Nur Seiten der Vereinswebsite dürfen senden (der Browser schickt bei
// fremden Adressen immer die Herkunft mit). Das hält fremde Seiten im
// Browser ab. Skripte können die Kopfzeile fälschen – dagegen helfen nur die
// Datei-Prüfung (Vorlage, keine aktiven Inhalte) und die Mengengrenze; der
// Empfänger ist ohnehin fest die Geschäftsstelle.
function setze_cors(?array $E): bool
{
    $herkunft = (string)($_SERVER['HTTP_ORIGIN'] ?? '');
    header('Vary: Origin');
    if ($E === null || $herkunft === '') return false;
    if (!in_array($herkunft, $E['erlaubte_herkunft'], true)) return false;
    header('Access-Control-Allow-Origin: ' . $herkunft);
    return true;
}


// ---------- Datei prüfen ----------

function lies_pdf(array $E): string
{
    $f = $_FILES['antrag'] ?? null;
    if (!is_array($f) || is_array($f['error'] ?? null)) antworte(400, ['ok' => false, 'fehler' => 'kein-pdf']);
    $fehler = (int)$f['error'];
    if ($fehler === UPLOAD_ERR_INI_SIZE || $fehler === UPLOAD_ERR_FORM_SIZE) antworte(413, ['ok' => false, 'fehler' => 'zu-gross']);
    if ($fehler !== UPLOAD_ERR_OK || !is_uploaded_file($f['tmp_name'])) antworte(400, ['ok' => false, 'fehler' => 'kein-pdf']);
    $groesse = (int)$f['size'];
    if ($groesse > $E['grenzen']['max_bytes']) antworte(413, ['ok' => false, 'fehler' => 'zu-gross']);
    if ($groesse < 20000) antworte(400, ['ok' => false, 'fehler' => 'kein-pdf']);

    $pdf = (string)file_get_contents($f['tmp_name']);
    if (strncmp($pdf, '%PDF-', 5) !== 0 || strpos(substr($pdf, -2048), '%%EOF') === false) {
        antworte(400, ['ok' => false, 'fehler' => 'kein-pdf']);
    }
    if (function_exists('finfo_open')) {
        $fi = finfo_open(FILEINFO_MIME_TYPE);
        $typ = $fi ? (string)finfo_buffer($fi, substr($pdf, 0, 4096)) : 'application/pdf';
        if ($typ !== 'application/pdf') antworte(400, ['ok' => false, 'fehler' => 'kein-pdf']);
    }
    // Kennung der Vorlage: die letzte /ID im Dokument (Trailer bzw.
    // Querverweis-Stream, beide unkomprimiert). Die Kennung ist öffentlich
    // (Vorlage in der Mediathek) – sie sortiert nur fremde Dokumente aus.
    if (!preg_match_all('#/ID\s*\[\s*<([0-9A-Fa-f]{32})>#', $pdf, $treffer) ||
        strtoupper(end($treffer[1])) !== VORLAGE_ID) {
        antworte(400, ['ok' => false, 'fehler' => 'falsche-vorlage']);
    }
    $teile = zerlege_pdf($pdf);
    if ($teile === null) antworte(400, ['ok' => false, 'fehler' => 'kein-pdf']);
    $text = pdf_namen_entschluesseln($teile);
    if (preg_match_all('#/Type\s*/Page(?![A-Za-z0-9])#', $text) !== VORLAGE_SEITEN) {
        antworte(400, ['ok' => false, 'fehler' => 'falsche-vorlage']);
    }
    // Aktive Inhalte: Der Online-Antrag erzeugt nie Skripte, Aktionen, Links
    // oder Anhänge im PDF (geprüft an allen Test-PDFs; /Annots kommt vor,
    // ist aber harmlos). Ein PDF damit stammt nicht aus dem Formular.
    if (preg_match('#/(JavaScript|JS|OpenAction|AA|Launch|URI|EmbeddedFiles?|FileAttachment|SubmitForm|ImportData|GoToR|GoToE|RichMedia|XFA|Rendition|Sound|Movie)(?![A-Za-z0-9])#', $text)) {
        antworte(400, ['ok' => false, 'fehler' => 'falsche-vorlage']);
    }
    return $pdf;
}

// Zerlegt das PDF in den Aufbau (alles außer Stream-Inhalten) und die
// entpackten Objekt-Streams (/Type /ObjStm – dort legt pdf-lib Seiten und
// Wörterbücher ab). Andere Streams (Bilder, Seiteninhalte) werden
// übersprungen, damit Binärdaten nie als Schlüsselwort gelesen werden.
// Grenzen: höchstens 20 Objekt-Streams (der Antrag hat 5), je 1 MB und
// zusammen 4 MB entpackt (der Antrag: wenige KB). Ein Objekt-Stream, der
// nicht FlateDecode ist oder sich nicht entpacken lässt, macht die Datei
// ungültig (null).
function zerlege_pdf(string $pdf): ?array
{
    $aufbau = '';
    $objstm = [];
    $budget = 4 * 1024 * 1024;
    $pos = 0;
    while (preg_match('/>>\s*stream(\r\n|\n|\r)/', $pdf, $m, PREG_OFFSET_CAPTURE, $pos)) {
        $dictEnde = $m[0][1] + 2;
        $start = $m[0][1] + strlen($m[0][0]);
        $ende = strpos($pdf, 'endstream', $start);
        if ($ende === false) return null;
        $aufbau .= substr($pdf, $pos, $start - $pos);
        // Kopf des Objekts: ab dem letzten „N G obj“ vor dem Stream.
        $kopf = substr($pdf, max(0, $dictEnde - 600), min(600, $dictEnde));
        if (preg_match_all('/\d+\s+\d+\s+obj\b/', $kopf, $obj, PREG_OFFSET_CAPTURE)) {
            $dict = substr($kopf, end($obj[0])[1]);
            if (preg_match('#/Type\s*/ObjStm(?![A-Za-z0-9])#', pdf_namen_entschluesseln([$dict]))) {
                if (count($objstm) >= 20) return null;
                if (!preg_match('#/Filter\s*/FlateDecode\s*[/>]#', $dict)) return null;
                $roh = @gzuncompress(substr($pdf, $start, $ende - $start), 1024 * 1024);
                if ($roh === false) return null;
                $budget -= strlen($roh);
                if ($budget < 0) return null;
                $objstm[] = $roh;
            }
        }
        $pos = $ende + 9;
    }
    $aufbau .= substr($pdf, $pos);
    return array_merge([$aufbau], $objstm);
}

// Namen dürfen Zeichen als #xx schreiben (/J#61vaScript = /JavaScript).
function pdf_namen_entschluesseln(array $teile): string
{
    $text = implode("\n", $teile);
    return (string)preg_replace_callback('/#([0-9A-Fa-f]{2})/', function ($t) { return chr(hexdec($t[1])); }, $text);
}


// ---------- Angaben aus dem Formular ----------

function saubere_email($wert): string
{
    $wert = trim(is_string($wert) ? $wert : '');
    if ($wert === '' || strlen($wert) > 254 || preg_match('/[\r\n]/', $wert)) return '';
    return filter_var($wert, FILTER_VALIDATE_EMAIL) ? $wert : '';
}

function sauberer_name($wert): string
{
    $wert = is_string($wert) ? $wert : '';
    if (preg_match('//u', $wert) !== 1) return ''; // kein gültiges UTF-8
    $wert = preg_replace('/[\p{C}]+/u', ' ', $wert);
    $wert = trim((string)preg_replace('/\s+/u', ' ', (string)$wert));
    preg_match('/^.{0,120}/us', $wert, $kurz);
    return trim($kurz[0] ?? '');
}

function sauberer_dateiname($wert): string
{
    $wert = is_string($wert) ? $wert : '';
    $wert = strtr($wert, ['ä' => 'ae', 'ö' => 'oe', 'ü' => 'ue', 'Ä' => 'Ae', 'Ö' => 'Oe', 'Ü' => 'Ue', 'ß' => 'ss']);
    $wert = preg_replace('/[^A-Za-z0-9_.-]+/', '_', $wert);
    $wert = trim((string)$wert, '._');
    if (!preg_match('/\.pdf$/i', $wert) || strlen($wert) > 120) return 'Aufnahmeantrag.pdf';
    return $wert;
}


// ---------- Mengengrenze ----------

// Je Anschluss höchstens N Anträge pro Stunde, insgesamt M pro Tag.
// Gemerkt wird nur ein gekürzter Prüfwert (HMAC, 20 Bit) der IP-Adresse – bei
// IPv6 des /64-Netzes, damit wechselnde Adressen eines Anschlusses nicht
// durchrutschen. Der Schlüssel wechselt täglich und steht nicht im Ordner
// daten/ (abgeleitet aus dem Postfach-Passwort; ohne Passwort, beim
// Versandweg "php-mail", ein Zufallswert für den Tag).
// Rückgabe: '' = erlaubt, sonst der Fehlername für die Antwort.
function zaehle_versand(array $E): string
{
    $h = grenzen_oeffnen();
    $stand = grenzen_lesen($h);
    $jetzt = time();
    $schluessel = anschluss_pruefwert($E, $stand);
    $meine = $stand['adressen'][$schluessel] ?? [];
    $fehler = '';
    if ((int)$stand['gesamt'] >= (int)$E['grenzen']['je_tag_gesamt']) $fehler = 'zu-viele-heute';
    elseif (count($meine) >= (int)$E['grenzen']['je_stunde_und_adresse']) $fehler = 'zu-viele';
    if ($fehler === '') {
        $meine[] = $jetzt;
        $stand['adressen'][$schluessel] = $meine;
        $stand['gesamt'] = (int)$stand['gesamt'] + 1;
    }
    grenzen_schreiben($h, $stand);
    return $fehler;
}

// Bei jeder Anfrage (auch abgelehnten und ?pruefen) Abgelaufenes löschen.
// still: bei ?pruefen nicht abbrechen, das meldet den Ordner selbst.
function grenzen_aufraeumen(bool $still = false): void
{
    $h = grenzen_oeffnen($still);
    if ($h) grenzen_schreiben($h, grenzen_lesen($h));
}

function grenzen_oeffnen(bool $still = false)
{
    $h = @fopen(__DIR__ . '/daten/grenzen.json', 'c+');
    if (!$h) {
        if ($still) return null;
        protokolliere('Ordner daten/ ist nicht beschreibbar');
        antworte(503, ['ok' => false, 'fehler' => 'speicher']);
    }
    flock($h, LOCK_EX);
    return $h;
}

// Liest den Stand; neuer Tag = alles verwerfen, sonst Einträge älter als
// eine Stunde entfernen.
function grenzen_lesen($h): array
{
    $stand = json_decode((string)stream_get_contents($h), true);
    $heute = date('Y-m-d');
    if (!is_array($stand) || ($stand['tag'] ?? '') !== $heute || !is_array($stand['adressen'] ?? null)) {
        $stand = ['tag' => $heute, 'zufall' => bin2hex(random_bytes(16)), 'gesamt' => 0, 'adressen' => []];
    }
    $grenze = time() - 3600;
    foreach ($stand['adressen'] as $k => $zeiten) {
        $zeiten = array_values(array_filter((array)$zeiten, function ($t) use ($grenze) { return is_int($t) && $t > $grenze; }));
        if ($zeiten) $stand['adressen'][$k] = $zeiten;
        else unset($stand['adressen'][$k]);
    }
    return $stand;
}

function grenzen_schreiben($h, array $stand): void
{
    ftruncate($h, 0);
    rewind($h);
    fwrite($h, (string)json_encode($stand));
    fflush($h);
    flock($h, LOCK_UN);
    fclose($h);
}

function anschluss_pruefwert(array $E, array $stand): string
{
    $ip = (string)($_SERVER['REMOTE_ADDR'] ?? '');
    $bin = @inet_pton($ip);
    if ($bin !== false && strlen($bin) === 16) $ip = bin2hex(substr($bin, 0, 8)) . '::/64';
    $geheim = $E['smtp']['passwort'] !== '' ? $E['smtp']['passwort'] : (string)$stand['zufall'];
    $schluessel = hash_hmac('sha256', 'grenzen|' . $stand['tag'], $geheim);
    return substr(hash_hmac('sha256', $ip, $schluessel), 0, 5);
}


// ---------- E-Mail ----------

function neuer_mailer(array $E): PHPMailer\PHPMailer\PHPMailer
{
    $m = new PHPMailer\PHPMailer\PHPMailer(true);
    $m->CharSet = 'UTF-8';
    $m->Encoding = 'quoted-printable';
    $m->XMailer = 'Aufnahmeantrag online ' . ANNAHME_VERSION;
    $domain = substr(strrchr($E['absender'], '@'), 1);
    if ($domain) $m->Hostname = $domain;
    $m->setFrom($E['absender'], $E['absender_name']);
    if ($E['versandweg'] === 'php-mail') {
        $m->isMail();
        $m->Sender = $E['absender'];
    } else {
        $s = $E['smtp'];
        $m->isSMTP();
        $m->Host = (string)$s['host'];
        $m->Port = (int)$s['port'];
        $m->SMTPAuth = true;
        $m->Username = (string)$s['benutzer'];
        $m->Password = (string)$s['passwort'];
        if ($s['sicherheit'] === 'ssl') $m->SMTPSecure = PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_SMTPS;
        elseif ($s['sicherheit'] === 'tls') $m->SMTPSecure = PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
        else { $m->SMTPSecure = ''; $m->SMTPAutoTLS = false; } // nur für den lokalen Test
        $m->Timeout = 20;
    }
    return $m;
}

function text_geschaeftsstelle(array $E, string $email): string
{
    $zeilen = [
        'Hallo,',
        '',
        'über die Website ist ein Aufnahmeantrag eingegangen. Der vollständige, online ausgefüllte und unterschriebene Antrag hängt als PDF an.',
        '',
        'Eingang: ' . date('d.m.Y, H:i') . ' Uhr',
        $email !== ''
            ? 'Antworten auf diese E-Mail gehen an die im Antrag angegebene Adresse: ' . $email
            : 'Die angegebene E-Mail-Adresse war ungültig – bitte die Kontaktdaten im PDF verwenden.',
        '',
        'Das PDF enthält persönliche Daten, bei Lastschrift auch die Bankverbindung. Bitte nach der Übernahme in die Mitgliederverwaltung aus dem Postfach löschen oder sicher ablegen.',
        '',
        '-- ',
        'Automatische Nachricht der Website (' . $E['verein'] . ', Aufnahmeantrag online)',
    ];
    return implode("\r\n", $zeilen);
}

function text_bestaetigung(array $E): string
{
    $zeilen = [
        'Guten Tag,',
        '',
        'vielen Dank! Ihr Aufnahmeantrag ist über unsere Website bei der Geschäftsstelle eingegangen. Wir melden uns, sobald er bearbeitet ist.',
        '',
        'Der Antrag selbst hängt hier bewusst nicht an, weil er persönliche Daten enthält, bei Lastschrift auch Ihre Bankverbindung. Wenn Sie beim Ausfüllen das PDF gespeichert haben, ist das Ihre Kopie.',
        '',
        'Fragen? Antworten Sie einfach auf diese E-Mail.',
        '',
        'Viele Grüße',
        $E['verein'] . ' – Geschäftsstelle',
        '',
        '-- ',
        'Diese E-Mail wurde automatisch versendet, weil auf unserer Website ein Aufnahmeantrag mit dieser Adresse abgeschickt wurde. Falls Sie das nicht waren, können Sie sie ignorieren.',
    ];
    return implode("\r\n", $zeilen);
}

// Fehler ins Protokoll des Webspace – ohne E-Mail-Adressen.
function protokolliere(string $was, ?Throwable $f = null, $mailer = null): void
{
    $info = '';
    if ($mailer instanceof PHPMailer\PHPMailer\PHPMailer && $mailer->ErrorInfo !== '') $info = $mailer->ErrorInfo;
    elseif ($f) $info = $f->getMessage();
    $info = preg_replace('/[^\s<>"]+@[^\s<>"]+/', '<adresse>', $info);
    error_log('aufnahmeantrag-annahme: ' . $was . ($info !== '' ? ': ' . $info : ''));
}


// ---------- Prüfen nach der Einrichtung ----------

// ?pruefen: zeigt, ob alles eingerichtet ist, und meldet sich einmal am
// Postfach an (ohne zu senden). Höchstens 10 Anmeldeversuche pro Stunde.
function pruefen(?array $E): void
{
    $fehlt = einstellungen_fehlen($E);
    $ergebnis = [
        'version' => ANNAHME_VERSION,
        // Die genaue PHP-Version nur nennen, wenn sie zu alt ist.
        'php' => PHP_VERSION_ID >= 80100 ? 'ok' : PHP_VERSION . ' – bitte 8.1 oder neuer einstellen',
        'einstellungen' => $E !== null,
        'versandweg' => $E['versandweg'] ?? null,
        'erlaubte_herkunft' => $E['erlaubte_herkunft'] ?? [],
        'daten_beschreibbar' => is_writable(__DIR__ . '/daten'),
        'fehlt' => $fehlt,
    ];
    if (!$ergebnis['daten_beschreibbar']) $ergebnis['fehlt'][] = 'Ordner daten/ ist nicht beschreibbar';
    if (PHP_VERSION_ID < 80100) $ergebnis['fehlt'][] = 'PHP 8.1 oder neuer nötig';
    // Die Schutzdateien beginnen mit einem Punkt und bleiben beim Hochladen
    // leicht zurück (am Mac unsichtbar).
    foreach (['.htaccess', 'lib/.htaccess', 'daten/.htaccess'] as $schutz) {
        if (!is_file(__DIR__ . '/' . $schutz)) $ergebnis['fehlt'][] = 'Schutzdatei ' . $schutz . ' fehlt (beim Hochladen mitnehmen)';
    }
    if ($E !== null && !$fehlt && $E['versandweg'] === 'smtp') {
        if (pruef_versuch_erlaubt()) {
            require_once __DIR__ . '/lib/PHPMailer/Exception.php';
            require_once __DIR__ . '/lib/PHPMailer/PHPMailer.php';
            require_once __DIR__ . '/lib/PHPMailer/SMTP.php';
            try {
                $m = neuer_mailer($E);
                $ergebnis['anmeldung_postfach'] = $m->smtpConnect() ? 'ok' : 'fehlgeschlagen';
                $m->smtpClose();
            } catch (Throwable $f) {
                $ergebnis['anmeldung_postfach'] = 'fehlgeschlagen';
                $ergebnis['fehlt'][] = 'Anmeldung am Postfach fehlgeschlagen – Passwort, Benutzer und Server prüfen';
            }
        } else {
            $ergebnis['anmeldung_postfach'] = 'nicht geprüft (zu viele Versuche, in einer Stunde wieder)';
        }
    }
    $ergebnis['bereit'] = !$ergebnis['fehlt'] && ($ergebnis['anmeldung_postfach'] ?? 'ok') === 'ok';
    antworte(200, $ergebnis);
}

function pruef_versuch_erlaubt(): bool
{
    $datei = __DIR__ . '/daten/pruefen.json';
    $h = @fopen($datei, 'c+');
    if (!$h) return false;
    flock($h, LOCK_EX);
    $zeiten = json_decode((string)stream_get_contents($h), true);
    $jetzt = time();
    $zeiten = array_values(array_filter(is_array($zeiten) ? $zeiten : [], function ($t) use ($jetzt) { return is_int($t) && $t > $jetzt - 3600; }));
    $erlaubt = count($zeiten) < 10;
    if ($erlaubt) $zeiten[] = $jetzt;
    ftruncate($h, 0);
    rewind($h);
    fwrite($h, (string)json_encode($zeiten));
    flock($h, LOCK_UN);
    fclose($h);
    return $erlaubt;
}
