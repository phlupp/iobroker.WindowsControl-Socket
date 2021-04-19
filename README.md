# WindowsControlNode

Um die NodeJs Anwendung auf einem Windowssystem zu starten nutze ich NodeJs v14.16.1 und setze die AutoStartMitPm2.bat in den Autostart Ordner von Windows.
Voraussetzung ist hierfür die Installation von pm2.
Im Ordner des Projektes muss eine .env angelegt werden und mit folgenden Variablen können die wichtigsten Parameter gesetzt werden:


SERVER_IP => Die IP des Servers der die Verbindung annimmt
SERVER_PORT => Der Port des Servers der die Verbindung annimmt

Beispiel:
SERVER_PORT=8588
SERVER_IP=192.168.2.10
