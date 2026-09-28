# Online-Aufnahmeantrag: automatischer Versand einrichten

**Für:** die Person mit Zugang zum IONOS-Kundenkonto des Vereins
**Dauer:** etwa 20 Minuten, einmalig
**Ergebnis:** Wer auf der Website den Aufnahmeantrag ausfüllt, tippt am Ende auf
„An die Geschäftsstelle senden“. Das fertige PDF kommt dann per E-Mail bei
geschaeftsstelle@sportfreunde04.de an, der Antragsteller bekommt eine
Eingangsbestätigung.

Du brauchst:

- die Datei **aufnahmeantrag-annahme.zip** (von Olgay),
- den Zugang zum IONOS-Kundenkonto (Vertrag der Domain sportfreunde04.de).

Die Menüs bei IONOS heißen je nach Ansicht etwas anders. Wenn etwas nicht
passt, einfach an der Stelle aufhören und Olgay Bescheid geben.

---

## 1. Nachsehen, ob der Vertrag Webspace hat

Im IONOS-Kundenkonto unter **Hosting** (oder „Webspace“) nachsehen, ob es für
sportfreunde04.de einen Webspace gibt.

- **Ja:** weiter mit Schritt 2.
- **Nein** (nur Domain und E-Mail): hier aufhören und Olgay Bescheid geben.
  Dann besprechen wir, ob sich ein kleiner Webspace lohnt oder ob wir den
  Weg über vmapit gehen.

## 2. Ein eigenes Postfach für den Versand anlegen

Unter **E-Mail** ein neues Postfach anlegen:

- Adresse: **formular@sportfreunde04.de**
- ein langes, zufälliges Passwort vergeben und sicher notieren (z. B. im
  Passwortmanager). Es wird gleich in Schritt 5 gebraucht.

Von diesem Postfach aus verschickt die Website die Anträge. Es muss niemand
hineinschauen. Antworten gehen direkt an die Antragsteller bzw. an die
Geschäftsstelle.

## 3. Eine Subdomain anlegen

Unter **Domains & SSL** › sportfreunde04.de › **Subdomain hinzufügen**:

- Name: **formular** (ergibt formular.sportfreunde04.de)
- Ziel bzw. Verwendung: **Webspace**, Ordner **/formular**
- **SSL-Zertifikat** für die Subdomain aktivieren (ist bei IONOS meist
  enthalten). Ohne SSL funktioniert es nicht.

Die Hauptadresse www.sportfreunde04.de bleibt unverändert. Sie leitet weiter
wie bisher zur Website bei appack.

## 4. Die Dateien hochladen

Unter **Hosting** › **Webspace-Explorer** (bzw. „Dateien“):

1. Die ZIP-Datei in den Hauptordner hochladen.
2. Im Webspace-Explorer auf die ZIP-Datei › **Entpacken**. Es entsteht der
   Ordner **formular** mit der Datei `annahme.php` direkt darin.
3. Die ZIP-Datei danach löschen.

Wichtig: Im Ordner liegen auch Dateien mit einem Punkt vorn (`.htaccess`,
auch in `lib` und `daten`). Sie schützen die Einstellungen. Am Mac sind sie
unsichtbar. Deshalb die ZIP-Datei auf dem Webspace entpacken und nicht vorher
auf dem eigenen Rechner.

## 5. Das Passwort eintragen

Im Ordner **formular** die Datei **einstellungen.php** öffnen
(Webspace-Explorer › Bearbeiten).

Die Zeile

```
HIER-DAS-PASSWORT-EINTRAGEN
```

durch das Passwort aus Schritt 2 ersetzen. Das Passwort steht allein auf
der Zeile, ohne Anführungszeichen. Sonst nichts ändern, dann speichern.

Die Datei ist gegen Abruf aus dem Internet geschützt. Trotzdem: nicht
weitergeben und nicht per E-Mail verschicken.

## 6. PHP-Version

Unter **Hosting** › **PHP-Einstellungen** sollte **PHP 8.1 oder neuer**
eingestellt sein (Standard bei IONOS). Meist ist hier nichts zu tun.

## 7. Prüfen

Im Browser aufrufen:

**https://formular.sportfreunde04.de/annahme.php?pruefen**

Dort steht eine kurze technische Antwort. Wichtig ist:

- `"bereit": true` – alles eingerichtet, fertig.
- `"bereit": false` – unter `"fehlt"` steht, was noch fehlt, z. B.
  „Passwort des Postfachs fehlt“ oder „Anmeldung am Postfach fehlgeschlagen“
  (dann das Passwort in Schritt 5 prüfen).

Die Prüfung meldet sich nur am Postfach an und verschickt nichts.

## 8. Olgay Bescheid geben

Wenn `"bereit": true` dasteht, eine kurze Nachricht an Olgay. Dann wird die
Website umgestellt und ein Test-Antrag geschickt, der als TEST markiert bei
der Geschäftsstelle ankommt.

---

## Datenschutz: Vertrag mit IONOS

Weil die Anträge über den Webspace laufen, braucht der Verein mit IONOS
einen **Vertrag zur Auftragsverarbeitung (AV-Vertrag)**. Für die Postfächer
gibt es ihn vermutlich schon. Im Kundenkonto unter **Verträge** bzw.
**Datenschutz** nachsehen und, falls noch nicht geschehen, abschließen. Das
geht dort online.

## Für die Geschäftsstelle

- Jeder Antrag kommt als E-Mail mit dem Betreff „Aufnahmeantrag online –
  Name“ und dem vollständigen, unterschriebenen PDF im Anhang.
- „Antworten“ geht direkt an die im Antrag angegebene E-Mail-Adresse.
- Das PDF enthält persönliche Daten, bei Lastschrift auch die
  Bankverbindung. Nach der Übernahme in die Mitgliederverwaltung bitte aus
  dem Postfach löschen oder sicher ablegen.

## Abschalten

Die Datei `annahme.php` umbenennen (z. B. in `annahme.php.aus`) oder den
Ordner löschen und Olgay Bescheid geben. Bis die Website zurückgestellt ist,
meldet sie beim Senden „hat nicht geklappt“ und bietet von selbst den
bisherigen Weg an: PDF herunterladen und selbst per E-Mail schicken.
