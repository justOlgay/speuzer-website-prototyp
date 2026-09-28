"""Lokaler Test der Aufnahmeantrag-Annahme (nur Testdaten, nichts verlässt den Rechner).

Baut eine IONOS-ähnliche Umgebung nach: Apache (macOS /usr/sbin/httpd) mit
.htaccess und PHP-FPM (Homebrew), dazu eine SMTP-Falle, die E-Mails nur als
Datei ablegt. Prüft Versand, Eingangsbestätigung, Zugriffsschutz, Herkunft,
Mengengrenze, Datei-Prüfungen, Kopfzeilen-Einschleusung, ?pruefen und den
Versandweg „php-mail“ (sendmail_path zeigt dafür auf eine Falle).

Aufruf (aus dem Repo):
    python3 server/aufnahmeantrag-annahme/test/annahme_test.py [PDF]
PDF: ein vom Online-Antrag erzeugtes Test-PDF (Vorgabe: das aus dem
Browser-Test tools/cache/antrag-pdf/test/ergebnis/endpunkt/).

Mit --bereitstellen startet das Skript nur die Umgebung und wartet (für den
Browser-Test); die Adresse steht dann in tools/cache/annahme-test/adresse.txt.
"""

import email
import email.policy
import json
import os
import re
import shutil
import signal
import subprocess
import sys
import time
import urllib.error
import urllib.request
import uuid
from pathlib import Path

HIER = Path(__file__).resolve().parent
QUELLE = HIER.parent
ROOT = QUELLE.parent.parent
sys.path.insert(0, str(HIER))
from smtp_falle import SmtpFalle  # noqa: E402

ARBEIT = ROOT / "tools" / "cache" / "annahme-test"
HERKUNFT = "https://cdn.appack.de"
BENUTZER, PASSWORT = "formular@sportfreunde04.test", 'Te"st\'Pa$$ \\wort'
EMPFAENGER = "geschaeftsstelle@sportfreunde04.test"
ANTRAGSTELLER = "max.mustermann@example.org"
PHP_FPM = shutil.which("php-fpm") or "/opt/homebrew/sbin/php-fpm"
HTTPD = "/usr/sbin/httpd"

ergebnisse = []


def pruefe(name, bedingung, info=""):
    ergebnisse.append((name, bool(bedingung), info))
    print(("OK   " if bedingung else "FEHL ") + name + (f"  – {info}" if info and not bedingung else ""))


def frei_port():
    import socket
    s = socket.socket()
    s.bind(("127.0.0.1", 0))
    p = s.getsockname()[1]
    s.close()
    return p


def einstellungen_php(smtp_port, versandweg="smtp", passwort=PASSWORT, je_stunde=3, je_tag=50, max_bytes=10 * 1024 * 1024, bestaetigung=True):
    return f"""<?php
if (!defined('ANNAHME')) {{ http_response_code(404); exit; }}
return [
    'empfaenger' => '{EMPFAENGER}',
    'absender' => '{BENUTZER}',
    'absender_name' => 'Website FFV Sportfreunde 04 (Test)',
    'verein' => 'FFV Sportfreunde 04',
    'versandweg' => '{versandweg}',
    'smtp' => [
        'host' => '127.0.0.1',
        'port' => {smtp_port},
        'sicherheit' => '',
        'benutzer' => '{BENUTZER}',
        'passwort' => <<<'PASSWORT'
{passwort}
PASSWORT,
    ],
    'erlaubte_herkunft' => ['{HERKUNFT}', 'https://appack.de'],
    'bestaetigung' => {'true' if bestaetigung else 'false'},
    'grenzen' => ['je_stunde_und_adresse' => {je_stunde}, 'je_tag_gesamt' => {je_tag}, 'max_bytes' => {max_bytes}],
];
"""


class Umgebung:
    """Apache + PHP-FPM + SMTP-Falle in tools/cache/annahme-test/."""

    def __init__(self):
        if ARBEIT.exists():
            shutil.rmtree(ARBEIT)
        self.web = ARBEIT / "web"
        self.post = ARBEIT / "post"
        self.sendmail = ARBEIT / "sendmail"
        for d in (self.web, self.post, self.sendmail, ARBEIT / "logs"):
            d.mkdir(parents=True)
        # Nur die Dateien, die auch auf den Webspace kommen.
        shutil.copy(QUELLE / "annahme.php", self.web)
        shutil.copy(QUELLE / ".htaccess", self.web)
        shutil.copy(QUELLE / "index.html", self.web)
        shutil.copy(QUELLE / "einstellungen.beispiel.php", self.web)
        shutil.copytree(QUELLE / "lib", self.web / "lib")
        (self.web / "daten").mkdir()
        shutil.copy(QUELLE / "daten" / ".htaccess", self.web / "daten")
        self.falle = SmtpFalle(self.post, BENUTZER, PASSWORT).start()
        self.einstellungen()
        self.fpm_port, self.http_port = frei_port(), frei_port()
        self._sendmail_falle()
        self._fpm()
        self._apache()
        self.basis = f"http://127.0.0.1:{self.http_port}"
        for _ in range(50):
            try:
                urllib.request.urlopen(self.basis + "/annahme.php?pruefen", timeout=2).read()
                break
            except urllib.error.HTTPError:
                break
            except Exception:
                time.sleep(0.1)

    def einstellungen(self, **kw):
        (self.web / "einstellungen.php").write_text(einstellungen_php(self.falle.port, **kw), encoding="utf-8")

    def grenzen_zuruecksetzen(self):
        for f in ("grenzen.json", "pruefen.json"):
            p = self.web / "daten" / f
            if p.exists():
                p.unlink()

    def _sendmail_falle(self):
        skript = ARBEIT / "sendmail-falle.sh"
        skript.write_text(f"""#!/bin/sh
f="{self.sendmail}/$(date +%s%N)-$$.eml"
printf 'X-Sendmail-Argumente: %s\\r\\n' "$*" > "$f"
cat >> "$f"
""")
        skript.chmod(0o755)
        self.sendmail_skript = skript

    def _fpm(self):
        conf = ARBEIT / "php-fpm.conf"
        conf.write_text(f"""[global]
error_log = {ARBEIT}/logs/php-fpm.log
daemonize = no
[www]
listen = 127.0.0.1:{self.fpm_port}
pm = static
pm.max_children = 4
catch_workers_output = yes
php_admin_value[error_log] = {ARBEIT}/logs/php-fehler.log
php_admin_flag[log_errors] = on
php_admin_value[error_reporting] = E_ALL
php_admin_value[sendmail_path] = {self.sendmail_skript}
php_admin_value[upload_max_filesize] = 20M
php_admin_value[post_max_size] = 20M
; Einstellungen wechseln im Test sekundenschnell – ohne Zwischenspeicher
php_admin_value[opcache.enable] = 0
""")
        self.fpm = subprocess.Popen([PHP_FPM, "-n", "-y", str(conf), "-F", "-d", "extension_dir=" + self._ext_dir()],
                                    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True)
        time.sleep(0.8)

    def _ext_dir(self):
        return subprocess.check_output(["php", "-r", "echo ini_get('extension_dir');"], text=True)

    # Apache und PHP-FPM in eigener Prozessgruppe starten: Apache (prefork)
    # beendet beim Herunterfahren seine ganze Gruppe – sonst auch dieses Skript.
    def _apache(self):
        mods = "/usr/libexec/apache2"
        conf = ARBEIT / "httpd.conf"
        conf.write_text(f"""ServerRoot "{ARBEIT}"
Listen 127.0.0.1:{self.http_port}
PidFile "{ARBEIT}/logs/httpd.pid"
DefaultRuntimeDir "{ARBEIT}/logs"
Mutex file:{ARBEIT}/logs default
ErrorLog "{ARBEIT}/logs/apache-fehler.log"
LogLevel warn
ServerName annahme.test
LoadModule mpm_prefork_module {mods}/mod_mpm_prefork.so
LoadModule authz_core_module {mods}/mod_authz_core.so
LoadModule authz_host_module {mods}/mod_authz_host.so
LoadModule access_compat_module {mods}/mod_access_compat.so
LoadModule dir_module {mods}/mod_dir.so
LoadModule mime_module {mods}/mod_mime.so
LoadModule unixd_module {mods}/mod_unixd.so
LoadModule headers_module {mods}/mod_headers.so
LoadModule proxy_module {mods}/mod_proxy.so
LoadModule proxy_fcgi_module {mods}/mod_proxy_fcgi.so
LoadModule autoindex_module {mods}/mod_autoindex.so
LoadModule alias_module {mods}/mod_alias.so
TypesConfig /private/etc/apache2/mime.types
DocumentRoot "{self.web}"
<Directory "{self.web}">
  AllowOverride All
  Options Indexes
  Require all granted
</Directory>
<FilesMatch "\\.php$">
  SetHandler "proxy:fcgi://127.0.0.1:{self.fpm_port}"
</FilesMatch>
""")
        self.httpd = subprocess.Popen([HTTPD, "-f", str(conf), "-DFOREGROUND"],
                                      stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, start_new_session=True)
        time.sleep(0.8)
        if self.httpd.poll() is not None:
            raise SystemExit("Apache startet nicht: " + self.httpd.stderr.read().decode())

    def stop(self):
        for p in (getattr(self, "httpd", None), getattr(self, "fpm", None)):
            if p and p.poll() is None:
                p.send_signal(signal.SIGTERM)
                try:
                    p.wait(5)
                except subprocess.TimeoutExpired:
                    p.kill()
        self.falle.stop()

    def php_fehler(self):
        p = ARBEIT / "logs" / "php-fehler.log"
        return p.read_text(errors="replace") if p.exists() else ""


def anfrage(url, methode="GET", daten=None, kopf=None):
    req = urllib.request.Request(url, data=daten, method=methode, headers=kopf or {})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, dict(r.headers), r.read()
    except urllib.error.HTTPError as f:
        return f.code, dict(f.headers), f.read()


def mehrteilig(felder, dateien):
    grenze = "----annahme" + uuid.uuid4().hex
    teile = []
    for k, v in felder.items():
        teile.append(f'--{grenze}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n'.encode() + v.encode("utf-8") + b"\r\n")
    for k, (name, inhalt, typ) in dateien.items():
        teile.append(f'--{grenze}\r\nContent-Disposition: form-data; name="{k}"; filename="{name}"\r\nContent-Type: {typ}\r\n\r\n'.encode() + inhalt + b"\r\n")
    teile.append(f"--{grenze}--\r\n".encode())
    return b"".join(teile), f"multipart/form-data; boundary={grenze}"


def sende(u, pdf, herkunft=HERKUNFT, email_adresse=ANTRAGSTELLER, name="Max Mustermann", dateiname="Aufnahmeantrag_Mustermann_Max.pdf"):
    felder = {}
    if email_adresse is not None:
        felder["email"] = email_adresse
    if name is not None:
        felder["name"] = name
    dateien = {"antrag": (dateiname, pdf, "application/pdf")} if pdf is not None else {}
    daten, typ = mehrteilig(felder, dateien)
    kopf = {"Content-Type": typ}
    if herkunft:
        kopf["Origin"] = herkunft
    status, k, body = anfrage(u.basis + "/annahme.php", "POST", daten, kopf)
    try:
        j = json.loads(body)
    except Exception:
        j = {"roh": body[:200].decode("utf-8", "replace")}
    return status, k, j


def neue_mails(u, vorher):
    return [email.message_from_bytes(p.read_bytes(), policy=email.policy.default) for p in u.falle.nachrichten()[vorher:]]


def eins_pdf_mit_seiten(n, kennung, katalog_zusatz=""):
    """Minimal-PDF ohne Kompression mit n Seiten und gegebener /ID (für die Vorlagen-Prüfung)."""
    objekte = [f"<< /Type /Catalog /Pages 2 0 R {katalog_zusatz}>>",
               "<< /Type /Pages /Kids [" + " ".join(f"{3 + i} 0 R" for i in range(n)) + f"] /Count {n} >>"]
    objekte += ["<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] >>" for _ in range(n)]
    aus = b"%PDF-1.7\n%" + b"x" * 30000 + b"\n"
    offs = []
    for i, o in enumerate(objekte, 1):
        offs.append(len(aus))
        aus += f"{i} 0 obj\n{o}\nendobj\n".encode()
    xref = len(aus)
    aus += f"xref\n0 {len(objekte) + 1}\n0000000000 65535 f \n".encode()
    aus += b"".join(f"{o:010d} 00000 n \n".encode() for o in offs)
    aus += f"trailer\n<< /Size {len(objekte) + 1} /Root 1 0 R /ID [<{kennung}><{kennung}>] >>\nstartxref\n{xref}\n%%EOF\n".encode()
    return aus


def pdf_mit_objstm(kennung, anzahl=1, kaputt=False, filter="/FlateDecode"):
    """PDF, dessen 4 Seiten in Objekt-Streams liegen (wie bei pdf-lib); kaputt = nicht entpackbar."""
    import zlib
    seiten = b"\n".join(b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] >>" for _ in range(4))
    aus = b"%PDF-1.7\n%" + b"x" * 30000 + b"\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Count 4 >>\nendobj\n"
    for i in range(anzahl):
        inhalt = (seiten if i == 0 else b"<< /Leer true >>")
        daten = b"xxxxxxxxnichtzlib" if kaputt else zlib.compress(inhalt)
        aus += f"{10 + i} 0 obj\n<< /Type /ObjStm /N 4 /First 0 /Length {len(daten)} /Filter {filter} >>\nstream\n".encode() + daten + b"\nendstream\nendobj\n"
    aus += f"trailer\n<< /Root 1 0 R /ID [<{kennung}><{kennung}>] >>\nstartxref\n0\n%%EOF\n".encode()
    return aus


def bereitstellen():
    u = Umgebung()
    u.einstellungen(je_stunde=20)
    (ARBEIT / "adresse.txt").write_text(u.basis + "/annahme.php")
    print("Annahme bereit:", u.basis + "/annahme.php", "· Post in", u.post, flush=True)
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        pass
    finally:
        u.stop()


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    pdf_pfad = Path(args[0]) if args else ROOT / "tools/cache/antrag-pdf/test/ergebnis/endpunkt/Aufnahmeantrag_Mustermann_Max.pdf"
    pdf = pdf_pfad.read_bytes()
    u = Umgebung()
    try:
        # --- Zugriffsschutz (.htaccess unter Apache) ---
        for pfad in ("/einstellungen.php", "/einstellungen.beispiel.php", "/lib/PHPMailer/PHPMailer.php", "/lib/", "/daten/", "/daten/grenzen.json", "/lib/PHPMailer/LICENSE"):
            s, _, b = anfrage(u.basis + pfad)
            pruefe(f"gesperrt: {pfad}", s in (403, 404) and PASSWORT.encode() not in b, f"Status {s}")
        s, _, b = anfrage(u.basis + "/")
        pruefe("Startseite ist index.html (keine Ordneransicht)", s == 200 and b"Online-Aufnahmeantr" in b and b"annahme.php" not in b, f"Status {s}: {b[:80]!r}")

        # --- ?pruefen ---
        s, _, b = anfrage(u.basis + "/annahme.php?pruefen")
        j = json.loads(b)
        pruefe("?pruefen: bereit, Anmeldung ok", s == 200 and j.get("bereit") is True and j.get("anmeldung_postfach") == "ok", str(j))
        pruefe("?pruefen: kein Passwort in der Antwort", PASSWORT.encode() not in b)

        # --- Vorabfrage (CORS) ---
        s, k, _ = anfrage(u.basis + "/annahme.php", "OPTIONS", None, {"Origin": HERKUNFT, "Access-Control-Request-Method": "POST"})
        pruefe("OPTIONS von der Website: 204 + Allow-Origin", s == 204 and k.get("Access-Control-Allow-Origin") == HERKUNFT, f"{s} {k.get('Access-Control-Allow-Origin')}")
        s, k, _ = anfrage(u.basis + "/annahme.php", "OPTIONS", None, {"Origin": "https://boese.example"})
        pruefe("OPTIONS fremde Seite: 403 ohne Allow-Origin", s == 403 and "Access-Control-Allow-Origin" not in k, str(s))
        s, _, _ = anfrage(u.basis + "/annahme.php")
        pruefe("GET ohne ?pruefen: 405", s == 405, str(s))

        # --- Der Normalfall ---
        u.grenzen_zuruecksetzen()
        vorher = len(u.falle.nachrichten())
        s, k, j = sende(u, pdf)
        mails = neue_mails(u, vorher)
        pruefe("Antrag: 200 ok, Bestätigung", s == 200 and j == {"ok": True, "bestaetigung": True}, f"{s} {j}")
        pruefe("Antrag: Allow-Origin gesetzt", k.get("Access-Control-Allow-Origin") == HERKUNFT)
        pruefe("Antrag: zwei E-Mails", len(mails) == 2, str(len(mails)))
        if len(mails) == 2:
            an_gs, an_as = mails
            anh = [t for t in an_gs.iter_attachments()]
            pruefe("Geschäftsstelle: Empfänger", an_gs["X-Falle-Empfaenger"] == f"<{EMPFAENGER}>", an_gs["X-Falle-Empfaenger"])
            pruefe("Geschäftsstelle: Absender", BENUTZER in str(an_gs["From"]), str(an_gs["From"]))
            pruefe("Geschäftsstelle: Antwort an Antragsteller", str(an_gs["Reply-To"]) == ANTRAGSTELLER, str(an_gs["Reply-To"]))
            pruefe("Geschäftsstelle: Betreff mit Name", str(an_gs["Subject"]) == "Aufnahmeantrag online – Max Mustermann", str(an_gs["Subject"]))
            pruefe("Geschäftsstelle: genau ein Anhang, PDF unverändert", len(anh) == 1 and anh[0].get_content_type() == "application/pdf" and anh[0].get_content() == pdf,
                   f"{len(anh)} Anhänge")
            pruefe("Geschäftsstelle: Dateiname", anh and anh[0].get_filename() == "Aufnahmeantrag_Mustermann_Max.pdf", anh and anh[0].get_filename())
            text_as = an_as.get_body(("plain",)).get_content()
            pruefe("Bestätigung: an Antragsteller, Antwort an Geschäftsstelle", an_as["X-Falle-Empfaenger"] == f"<{ANTRAGSTELLER}>" and str(an_as["Reply-To"]) == EMPFAENGER,
                   f"{an_as['X-Falle-Empfaenger']} / {an_as['Reply-To']}")
            pruefe("Bestätigung: kein Anhang, kein Name, fester Betreff", not list(an_as.iter_attachments()) and "Mustermann" not in text_as and str(an_as["Subject"]) == "Ihr Aufnahmeantrag beim FFV Sportfreunde 04",
                   str(an_as["Subject"]))
            pruefe("HELO mit Vereinsdomain", u.falle.helo and u.falle.helo[-1] == "sportfreunde04.test", str(u.falle.helo[-1:]))
        pruefe("Anmeldung mit Sonderzeichen-Passwort", BENUTZER in u.falle.anmeldungen)
        stand = json.loads((u.web / "daten" / "grenzen.json").read_text())
        pruefe("Mengengrenze speichert keine IP im Klartext", "127.0.0.1" not in json.dumps(stand) and stand["gesamt"] == 1, json.dumps(stand)[:120])

        # --- Ungültige E-Mail: nur Geschäftsstelle, ohne Antwort-Adresse ---
        u.grenzen_zuruecksetzen()
        vorher = len(u.falle.nachrichten())
        s, _, j = sende(u, pdf, email_adresse="keine-adresse")
        mails = neue_mails(u, vorher)
        pruefe("ungültige E-Mail: 200, keine Bestätigung, eine E-Mail ohne Reply-To",
               s == 200 and j.get("bestaetigung") is False and len(mails) == 1 and mails[0]["Reply-To"] is None, f"{s} {j} {len(mails)}")

        # --- Kopfzeilen-Einschleusung ---
        u.grenzen_zuruecksetzen()
        vorher = len(u.falle.nachrichten())
        s, _, j = sende(u, pdf, name="Max\r\nBcc: boese@example.org", email_adresse="max@example.org\r\nBcc: boese@example.org")
        mails = neue_mails(u, vorher)
        pruefe("Einschleusung: kein Bcc, kein fremder Empfänger, Betreff einzeilig",
               s == 200 and len(mails) == 1 and mails[0]["Bcc"] is None and "boese" not in mails[0]["X-Falle-Empfaenger"]
               and mails[0]["Reply-To"] is None and str(mails[0]["Subject"]) == "Aufnahmeantrag online – Max Bcc: boese@example.org",
               f"{s} {j} {len(mails)} {mails[0]['Subject'] if mails else ''}")

        # --- Herkunft ---
        u.grenzen_zuruecksetzen()
        vorher = len(u.falle.nachrichten())
        for h, titel in ((None, "ohne Origin"), ("https://boese.example", "fremde Seite"), ("http://cdn.appack.de", "http statt https")):
            s, k, j = sende(u, pdf, herkunft=h)
            pruefe(f"Herkunft {titel}: 403", s == 403 and j.get("fehler") == "herkunft" and "Access-Control-Allow-Origin" not in k, f"{s} {j}")
        pruefe("Herkunft: keine E-Mail verschickt", len(u.falle.nachrichten()) == vorher)

        # --- Datei-Prüfungen ---
        kennung = "5F7DA90716DA214E8AA5F50A1137C202"
        falsch = pdf.replace(kennung.encode(), b"0123456789ABCDEF0123456789ABCDEF")
        for titel, daten, fehler in (
            ("kein PDF", b"Hallo " * 10000, "kein-pdf"),
            ("zu klein", pdf[:5000], "kein-pdf"),
            ("abgeschnitten (kein %%EOF)", pdf[:-3000], "kein-pdf"),
            ("fremde Vorlage (/ID)", falsch, "falsche-vorlage"),
            ("richtige /ID, aber 1 Seite", eins_pdf_mit_seiten(1, kennung), "falsche-vorlage"),
            ("richtige /ID, 5 Seiten", eins_pdf_mit_seiten(5, kennung), "falsche-vorlage"),
            ("ohne Datei", None, "kein-pdf"),
        ):
            s, _, j = sende(u, daten)
            pruefe(f"Datei {titel}: 400 {fehler}", s == 400 and j.get("fehler") == fehler, f"{s} {j}")
        pruefe("Kontrolle: Minimal-PDF mit 4 Seiten und richtiger /ID wird angenommen",
               sende(u, eins_pdf_mit_seiten(4, kennung))[0] == 200)
        u.grenzen_zuruecksetzen()
        pruefe("Kontrolle: Seiten in Objekt-Stream (wie pdf-lib) werden gezählt", sende(u, pdf_mit_objstm(kennung))[0] == 200)
        u.grenzen_zuruecksetzen()
        for titel, daten, fehler in (
            ("mit /OpenAction + JavaScript", eins_pdf_mit_seiten(4, kennung, "/OpenAction << /S /JavaScript /JS (app.alert(1)) >> "), "falsche-vorlage"),
            ("mit verstecktem /J#61vaScript", eins_pdf_mit_seiten(4, kennung, "/Names << /J#61vaScript 9 0 R >> "), "falsche-vorlage"),
            ("mit Link (/URI)", eins_pdf_mit_seiten(4, kennung, "/X << /S /URI /URI (https://boese.example) >> "), "falsche-vorlage"),
            ("mit eingebetteter Datei", eins_pdf_mit_seiten(4, kennung, "/Names << /EmbeddedFiles 9 0 R >> "), "falsche-vorlage"),
            ("Objekt-Stream nicht entpackbar", pdf_mit_objstm(kennung, kaputt=True), "kein-pdf"),
            ("Objekt-Stream ohne FlateDecode", pdf_mit_objstm(kennung, filter="/LZWDecode"), "kein-pdf"),
            ("21 Objekt-Streams", pdf_mit_objstm(kennung, anzahl=21), "kein-pdf"),
        ):
            s, _, j = sende(u, daten)
            pruefe(f"Datei {titel}: 400 {fehler}", s == 400 and j.get("fehler") == fehler, f"{s} {j}")
        u.grenzen_zuruecksetzen()
        s, _, j = sende(u, b"%PDF-1.7\n" + b"0" * (11 * 1024 * 1024) + b"\n%%EOF\n")
        pruefe("Datei zu groß: 413", s == 413 and j.get("fehler") == "zu-gross", f"{s} {j}")
        s, _, j = sende(u, pdf, dateiname="../../etc/passwd")
        pruefe("Dateiname mit Pfad: wird zu Aufnahmeantrag.pdf", s == 200, f"{s} {j}")
        letzte = email.message_from_bytes(u.falle.nachrichten()[-2].read_bytes(), policy=email.policy.default)
        pruefe("Dateiname im Anhang bereinigt", [a.get_filename() for a in letzte.iter_attachments()] == ["Aufnahmeantrag.pdf"],
               str([a.get_filename() for a in letzte.iter_attachments()]))

        # --- Mengengrenze (Test: 3 je Stunde) ---
        u.grenzen_zuruecksetzen()
        stati = [sende(u, pdf)[0] for _ in range(4)]
        pruefe("Mengengrenze: 3× 200, dann 429", stati == [200, 200, 200, 429], str(stati))

        # --- Tagesgrenze ---
        u.grenzen_zuruecksetzen()
        u.einstellungen(je_stunde=10, je_tag=2)
        stati = [sende(u, pdf) for _ in range(3)]
        pruefe("Tagesgrenze: 2× 200, dann 429 zu-viele-heute", [x[0] for x in stati] == [200, 200, 429] and stati[2][2].get("fehler") == "zu-viele-heute", str([(x[0], x[2]) for x in stati]))
        stand = json.loads((u.web / "daten" / "grenzen.json").read_text())
        pruefe("Prüfwert gekürzt (5 Zeichen), kein Salz/Schlüssel gespeichert",
               all(len(k) == 5 for k in stand["adressen"]) and "salz" not in stand, json.dumps(stand)[:160])

        # --- Eingangsbestätigung abgeschaltet ---
        u.grenzen_zuruecksetzen()
        u.einstellungen(bestaetigung=False)
        vorher = len(u.falle.nachrichten())
        s, _, j = sende(u, pdf)
        pruefe("Bestätigung abgeschaltet: bestaetigung null, eine E-Mail", s == 200 and j == {"ok": True, "bestaetigung": None} and len(u.falle.nachrichten()) == vorher + 1, f"{s} {j}")
        u.einstellungen()

        # --- Kopien der Einstellungen und abgeschaltete Dateien sind gesperrt ---
        for kopie in ("einstellungen.php.bak", "einstellungen.php~", "einstellungen.php.save", "annahme.php.aus"):
            quelle = u.web / ("einstellungen.php" if kopie.startswith("einst") else "annahme.php")
            (u.web / kopie).write_bytes(quelle.read_bytes())
            s, _, b = anfrage(u.basis + "/" + kopie)
            pruefe(f"gesperrt: /{kopie}", s in (403, 404) and PASSWORT.encode() not in b, f"Status {s}")
            (u.web / kopie).unlink()

        # --- Tippfehler in einstellungen.php (Schlusszeile eingerückt) ---
        text = (u.web / "einstellungen.php").read_text()
        (u.web / "einstellungen.php").write_text(text.replace("\nPASSWORT,", "\n    PASSWORT,"))
        s, _, b = anfrage(u.basis + "/annahme.php?pruefen")
        try:
            jj = json.loads(b)
        except Exception:
            jj = {}
        pruefe("?pruefen erklärt Tippfehler in einstellungen.php", s == 200 and any("Zeile" in f for f in jj.get("fehlt", [])), f"{s} {b[:200]!r}")
        s, _, j = sende(u, pdf)
        pruefe("Tippfehler in einstellungen.php: Antrag 500 einstellungen", s == 500 and j.get("fehler") == "einstellungen", f"{s} {j}")
        u.einstellungen()

        # --- Alle bisher erzeugten Test-PDFs des Online-Antrags werden angenommen ---
        u.grenzen_zuruecksetzen()
        u.einstellungen(je_stunde=10000, je_tag=10000, bestaetigung=False)
        alle = sorted(p for p in (ROOT / "tools/cache/antrag-pdf/test/ergebnis").rglob("*.pdf"))
        abgelehnt = []
        for p in alle:
            s, _, j = sende(u, p.read_bytes(), dateiname=p.name)
            if s != 200:
                abgelehnt.append(f"{p.parent.name}/{p.name}: {s} {j}")
        pruefe(f"alle {len(alle)} Test-PDFs aus dem Browser-Test angenommen", alle and not abgelehnt, "; ".join(abgelehnt[:5]))
        u.einstellungen()

        # --- Postfach-Passwort falsch ---
        u.grenzen_zuruecksetzen()
        u.einstellungen(passwort="falsch")
        vorher = len(u.falle.nachrichten())
        s, _, j = sende(u, pdf)
        pruefe("falsches Passwort: 502 versand, keine E-Mail", s == 502 and j.get("fehler") == "versand" and len(u.falle.nachrichten()) == vorher, f"{s} {j}")
        s, _, b = anfrage(u.basis + "/annahme.php?pruefen")
        j = json.loads(b)
        pruefe("?pruefen meldet falsches Passwort", j.get("bereit") is False and j.get("anmeldung_postfach") == "fehlgeschlagen", str(j))

        # --- Passwort noch nicht eingetragen ---
        u.einstellungen(passwort="HIER-DAS-PASSWORT-EINTRAGEN")
        s, _, j = sende(u, pdf)
        pruefe("Passwort nicht eingetragen: 500 einstellungen", s == 500 and j.get("fehler") == "einstellungen", f"{s} {j}")
        s, _, b = anfrage(u.basis + "/annahme.php?pruefen")
        pruefe("?pruefen: Passwort fehlt", "Passwort des Postfachs fehlt" in json.loads(b).get("fehlt", []), b[:200])

        # --- Schutzdatei vergessen ---
        (u.web / "daten" / ".htaccess").rename(u.web / "daten" / "htaccess.weg")
        s, _, b = anfrage(u.basis + "/annahme.php?pruefen")
        pruefe("?pruefen meldet fehlende Schutzdatei", any("daten/.htaccess" in f for f in json.loads(b).get("fehlt", [])) and json.loads(b).get("bereit") is False, b[:300])
        (u.web / "daten" / "htaccess.weg").rename(u.web / "daten" / ".htaccess")

        # --- ohne einstellungen.php ---
        (u.web / "einstellungen.php").unlink()
        s, _, j = sende(u, pdf)
        pruefe("ohne einstellungen.php: 500 (ohne Allow-Origin)", s in (403, 500), f"{s} {j}")
        s, _, b = anfrage(u.basis + "/annahme.php?pruefen")
        pruefe("?pruefen ohne einstellungen.php", json.loads(b).get("einstellungen") is False, b[:200])

        # --- Versandweg php-mail (sendmail-Falle) ---
        u.einstellungen(versandweg="php-mail", passwort="")
        u.grenzen_zuruecksetzen()
        s, _, j = sende(u, pdf)
        sm = sorted(u.sendmail.glob("*.eml"))
        pruefe("php-mail: 200, zwei Aufrufe von sendmail", s == 200 and len(sm) == 2, f"{s} {j} {len(sm)}")
        if sm:
            erst = sm[0].read_bytes()
            pruefe("php-mail: Absender per -f", f"-f{BENUTZER}".encode() in erst.split(b"\r\n")[0] or f"-f {BENUTZER}".encode() in erst.split(b"\r\n")[0],
                   erst.split(b"\r\n")[0].decode(errors="replace"))
            m = email.message_from_bytes(erst.split(b"\r\n", 1)[1], policy=email.policy.default)
            pruefe("php-mail: PDF-Anhang unverändert", [a.get_content() for a in m.iter_attachments()] == [pdf])

        # --- Daten-Ordner nicht beschreibbar ---
        u.einstellungen()
        u.grenzen_zuruecksetzen()
        (u.web / "daten").chmod(0o555)
        vorher = len(u.falle.nachrichten())
        s, _, j = sende(u, pdf)
        (u.web / "daten").chmod(0o755)
        pruefe("daten/ schreibgeschützt: 503, keine E-Mail", s == 503 and len(u.falle.nachrichten()) == vorher, f"{s} {j}")

        fehler = u.php_fehler()
        warnungen = [z for z in fehler.splitlines() if re.search(r"PHP (Warning|Notice|Deprecated|Fatal|Parse)", z)]
        pruefe("PHP-Protokoll ohne Warnungen/Hinweise", not warnungen, "\n".join(warnungen[:5]))
        pruefe("PHP-Protokoll ohne E-Mail-Adressen", not re.search(r"[\w.+-]+@[\w-]+\.[\w.]+", fehler), fehler[-300:])
    finally:
        u.stop()

    fehlgeschlagen = [e for e in ergebnisse if not e[1]]
    print(f"\n{len(ergebnisse) - len(fehlgeschlagen)}/{len(ergebnisse)} Prüfungen bestanden")
    (ARBEIT / "ergebnis.json").write_text(json.dumps([{"pruefung": n, "ok": ok, "info": str(i)} for n, ok, i in ergebnisse], ensure_ascii=False, indent=1))
    sys.exit(1 if fehlgeschlagen else 0)


if __name__ == "__main__":
    if "--bereitstellen" in sys.argv:
        bereitstellen()
    else:
        main()
