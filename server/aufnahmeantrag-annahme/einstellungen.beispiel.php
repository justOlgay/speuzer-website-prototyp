<?php
/*
 * Einstellungen der Aufnahmeantrag-Annahme (FFV Sportfreunde 04)
 *
 * Diese Datei als „einstellungen.php“ in denselben Ordner wie annahme.php
 * legen und unten das Passwort des Absender-Postfachs eintragen.
 * Nur diese eine Stelle muss man anfassen – alles andere ist vorbereitet.
 *
 * Das Passwort steht zwischen den Zeilen „PASSWORT“ allein auf einer Zeile
 * (so dürfen darin auch Anführungszeichen und Sonderzeichen vorkommen).
 * Die Datei ist vor Abruf aus dem Internet geschützt (.htaccess und die
 * Zeile gleich unten), trotzdem: niemandem schicken, nicht ins Repo.
 */

if (!defined('ANNAHME')) { http_response_code(404); exit; }

return [
    // An diese Adresse gehen die Anträge (mit PDF im Anhang).
    'empfaenger' => 'geschaeftsstelle@sportfreunde04.de',

    // Von diesem Vereinspostfach aus wird gesendet. Es muss bei IONOS
    // existieren; ein eigenes Postfach nur dafür ist am saubersten.
    'absender' => 'formular@sportfreunde04.de',
    'absender_name' => 'Website FFV Sportfreunde 04',
    'verein' => 'FFV Sportfreunde 04',

    // "smtp" (empfohlen): Anmeldung am Postfach mit Passwort.
    // "php-mail": Versand über den Webspace ohne Passwort – nur nutzen,
    // wenn "smtp" nicht geht; dann kann unten das Passwort leer bleiben.
    'versandweg' => 'smtp',

    'smtp' => [
        'host' => 'smtp.ionos.de',
        'port' => 587,
        'sicherheit' => 'tls',      // 587 = "tls" (STARTTLS), 465 = "ssl"
        'benutzer' => 'formular@sportfreunde04.de',
        'passwort' => <<<'PASSWORT'
HIER-DAS-PASSWORT-EINTRAGEN
PASSWORT,
    ],

    // Von diesen Seiten aus darf gesendet werden (die Website liegt bei appack).
    'erlaubte_herkunft' => [
        'https://cdn.appack.de',
        'https://appack.de',
    ],

    // Eingangsbestätigung an die im Antrag angegebene Adresse
    // (fester Text, ohne Anhang, ohne Angaben aus dem Antrag).
    'bestaetigung' => true,

    // Schutz vor Missbrauch.
    'grenzen' => [
        'je_stunde_und_adresse' => 5,
        'je_tag_gesamt' => 50,
        'max_bytes' => 10 * 1024 * 1024,
    ],
];
