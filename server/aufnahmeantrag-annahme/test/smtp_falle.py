"""Kleiner SMTP-Server nur für den lokalen Test der Aufnahmeantrag-Annahme.

Nimmt E-Mails an, versendet nichts und legt jede Nachricht als .eml in
einem Ordner ab. Versteht EHLO/HELO, AUTH PLAIN/LOGIN (nur mit den beim
Start übergebenen Zugangsdaten), MAIL, RCPT, DATA, RSET, NOOP, QUIT – kein
STARTTLS (die Test-Einstellungen schalten die Verschlüsselung ab).

    falle = SmtpFalle(ordner, benutzer="test@example.org", passwort="geheim")
    falle.start(); ...; falle.stop()
"""

import base64
import socketserver
import threading
from pathlib import Path


class _Verbindung(socketserver.StreamRequestHandler):
    def schreibe(self, zeile):
        self.wfile.write((zeile + "\r\n").encode("ascii"))
        self.wfile.flush()

    def lies(self):
        roh = self.rfile.readline(65536)
        if not roh:
            return None
        return roh.decode("utf-8", "replace").rstrip("\r\n")

    def handle(self):
        falle = self.server.falle
        angemeldet = False
        absender, empfaenger = None, []
        self.schreibe("220 smtp-falle.test ESMTP")
        while True:
            zeile = self.lies()
            if zeile is None:
                return
            befehl = zeile.split(" ", 1)[0].upper()
            rest = zeile[len(befehl):].strip()
            if befehl in ("EHLO", "HELO"):
                falle.helo.append(rest)
                if befehl == "EHLO":
                    self.schreibe("250-smtp-falle.test")
                    self.schreibe("250-AUTH PLAIN LOGIN")
                    self.schreibe("250-8BITMIME")
                    self.schreibe("250 SIZE 20000000")
                else:
                    self.schreibe("250 smtp-falle.test")
            elif befehl == "AUTH":
                teile = rest.split()
                art = teile[0].upper() if teile else ""
                if art == "PLAIN":
                    daten = teile[1] if len(teile) > 1 else None
                    if daten is None:
                        self.schreibe("334 ")
                        daten = self.lies() or ""
                    try:
                        _, nutzer, pw = base64.b64decode(daten).decode("utf-8").split("\0")
                    except Exception:
                        nutzer, pw = "", ""
                elif art == "LOGIN":
                    self.schreibe("334 VXNlcm5hbWU6")
                    nutzer = base64.b64decode(self.lies() or "").decode("utf-8", "replace")
                    self.schreibe("334 UGFzc3dvcmQ6")
                    pw = base64.b64decode(self.lies() or "").decode("utf-8", "replace")
                else:
                    self.schreibe("504 unbekanntes Verfahren")
                    continue
                falle.anmeldungen.append(nutzer)
                if nutzer == falle.benutzer and pw == falle.passwort:
                    angemeldet = True
                    self.schreibe("235 ok")
                else:
                    self.schreibe("535 falsche Zugangsdaten")
            elif befehl == "MAIL":
                if not angemeldet:
                    self.schreibe("530 bitte erst anmelden")
                    continue
                absender, empfaenger = rest.split(":", 1)[-1].strip(), []
                self.schreibe("250 ok")
            elif befehl == "RCPT":
                empfaenger.append(rest.split(":", 1)[-1].strip())
                self.schreibe("250 ok")
            elif befehl == "DATA":
                if not empfaenger:
                    self.schreibe("503 keine Empfänger")
                    continue
                self.schreibe("354 los")
                zeilen = []
                while True:
                    roh = self.rfile.readline(1 << 22)
                    if not roh or roh in (b".\r\n", b".\n"):
                        break
                    if roh.startswith(b".."):
                        roh = roh[1:]
                    zeilen.append(roh)
                with falle.sperre:
                    falle.zaehler += 1
                    datei = falle.ordner / f"{falle.zaehler:03d}.eml"
                kopf = f"X-Falle-Absender: {absender}\r\nX-Falle-Empfaenger: {', '.join(empfaenger)}\r\n".encode()
                datei.write_bytes(kopf + b"".join(zeilen))
                self.schreibe("250 angenommen")
                absender, empfaenger = None, []
            elif befehl == "RSET":
                absender, empfaenger = None, []
                self.schreibe("250 ok")
            elif befehl == "NOOP":
                self.schreibe("250 ok")
            elif befehl == "QUIT":
                self.schreibe("221 bye")
                return
            else:
                self.schreibe("502 nicht unterstützt")


class _Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


class SmtpFalle:
    def __init__(self, ordner, benutzer, passwort, port=0):
        self.ordner = Path(ordner)
        self.ordner.mkdir(parents=True, exist_ok=True)
        self.benutzer, self.passwort = benutzer, passwort
        self.zaehler = 0
        self.sperre = threading.Lock()
        self.helo, self.anmeldungen = [], []
        self.server = _Server(("127.0.0.1", port), _Verbindung)
        self.server.falle = self
        self.port = self.server.server_address[1]

    def start(self):
        threading.Thread(target=self.server.serve_forever, daemon=True).start()
        return self

    def stop(self):
        self.server.shutdown()
        self.server.server_close()

    def nachrichten(self):
        return sorted(self.ordner.glob("*.eml"))
