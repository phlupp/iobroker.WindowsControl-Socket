@echo off
G:
cd "G:\Dokumente\NodejsProjekte\WindowsControlNode\services\control_api"
pm2 start client.js --name systemcontrol --watch