# WindowsControlNode

Voraussetzungen:
NodeJs >= v14.16.1
Global installiertes NodeJs Modul pm2. (npm install -g pm2)



Um die NodeJs Anwendung auf einem Windowssystem zu starten nutze ich NodeJs v14.16.1 und setze die AutoStartMitPm2.bat in den Autostart Ordner von Windows.
Der Autostartordner lässt sich leicht öffnen, indem man die Windowsanwendung "Ausführen" öffnet und hier "shell:startup" einträgt.
In der AutoStartMitPm2.bat bitte den Pfad in der 3 Zeile anpassen, hier muss der Ordner zu diesem Projekt drin stehen.
Im Ordner des Projektes muss eine .env angelegt werden und mit folgenden Variablen können die wichtigsten Parameter gesetzt werden:


SERVER_IP => Die IP des Servers der die Verbindung annimmt

SERVER_PORT => Der Port des Servers der die Verbindung annimmt. Wenn nichts angegeben, wird 8588 verwendet

Beispiel:
SERVER_PORT=8588

SERVER_IP=192.168.2.10
