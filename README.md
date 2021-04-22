# WindowsControl-Socket

## Erklärung
Mit den Skripten in client.js und server.js lässt sich eine Verbindung zwischen Server und Client per Socket-IO aufbauen.
So ist es möglich vom Server Befehle an den Client zu senden und auch umgekehrt.
Momentan kann primär der Server Befehle an den Client senden und auch Antworten zurück erhalten.

## Mögliche Befehle vom Server an den Client
1. Notification (Benachrichtigung)
  Hierbei wird dem Client die Nachricht auf dem Datenpunkt geschickt und er zeigt diese als TrayIcon-Tooltip an

2. Powershell
  Hierbei wird dem Client der Text aus dem Datenpunkt geschickt und er führt dieses direkt aus, also vorsichtig mit sein!

3. Shutdown (Herunterfahren)
  Herunterfahren Befehl an den Client
  
4. Restart (Neustart)
  Neustart Befehl an den Client
  
 
## Informationen die der Server vom Client erhält
1. Connected (Verbunden)
  Zeigt an ob der Client mit dem Server verbunden ist

2. Architecture (Architektur)
  Zeigt die Client Architektur an z.B. x64 für 64-Bit

3. Distribution
   Zeigt die Client Distribution an z.B. Windows 10

4. Hostname (Computer-Name)
  Zeigt den Client Hostnamen an

## Konfiguration


### Server Seite
1. In der verwendeten JavaScript Instanz, sollte als zusätzliches NPM Modul **socket.io** eingetragen sein.
2. Die server.js aus diesem Projekt nun als Skript anlegen.
3. Nun sind noch Änderungen im Skript notwendig.
4. Die Variable INSTALL_FOLDER gibt an, an welche Stelle unter 0_userdata die neuen Datenpunkte angelegt werden. (Momentan wird nur die Installation unter 0_userdata untersützt.)


### Windows Client
Zuerst das Git Projekt runterladen und im Projektordner den folgenden Befehl durchführen um die Benötigten Abhängigkeiten runterzuladen.
```
npm i
```

### Voraussetzungen
1. NodeJs >= v14.16.1
2. Global installiertes NodeJs Modul pm2. (`npm install -g pm2`)
3. Im Projektverzeichnis (Verzeichnis wo die client.js liegt) eine .env anlegen und mit den notwendigen Variablen füllen (siehe unten)
4. Angepasste AutoStartMitPm2.bat in den Autostart
  i. Bitte den Pfad in der 3 Zeile anpassen, hier muss der Ordner zu diesem Projekt drin stehen
  ii. Der Autostartordner lässt sich leicht öffnen, indem man die Windowsanwendung "Ausführen" öffnet und hier "shell:startup" einträgt.


Um die NodeJs Anwendung auf einem Windowssystem zu starten nutze ich NodeJs v14.16.1 und setze die AutoStartMitPm2.bat in den Autostart Ordner von Windows.
Im Ordner des Projektes muss eine .env angelegt werden und mit folgenden Variablen können die wichtigsten Parameter gesetzt werden:

### Umgebungsvariablen in der .env Datei
1. SERVER_IP
  Die IP des Servers der die Verbindung annimmt
  
2. SERVER_PORT 
  Der Port des Servers der die Verbindung annimmt. Wenn nichts angegeben, wird 8588 verwendet

Beispiel:
```
SERVER_PORT=8588
SERVER_IP=192.168.2.10
```

### Die wichtigsten verwendeten Module und Credits
1. Danke an https://github.com/Mic-M dessen Skript zum Anlegen von Datenpunkten ich ein wenig angepasst habe und verwende.
2. socket.io
3. wintools
4. systeminformation
5. node-notifier
6. node-powershell

## Ideen für weitere Funktionen
1. Besseres Logging Clientseite (auch mit Logdateien)
2. Erweiterte Benachrichtigungen
  Hierbei könnte laut dem verwendeten NodeJs Modul auch mit dem Tooltip interagiert werden (Klick drauf) und damit Aktionen auf Server Seite auslösen.
  Oder auch eine Pfadangabe für ein alternatives Icon welchen beim Tooltip verwendet wird.
