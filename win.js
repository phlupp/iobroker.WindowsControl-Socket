"use strict";
const Shell = require('node-powershell');
const notifier = require('node-notifier');
const path = require('path');
const si = require('systeminformation');
const {shutdown} = require('wintools');
let notifies = [];
let interNotifies = null;

function executePowershell(cmd){
    console.log(`Execute Powershell command:\n${cmd}`);
    const ps = new Shell({
        executionPolicy: 'Bypass',
        noProfile: true
      });
      
      ps.addCommand(cmd);
      ps.invoke()
      .then(output => {
        console.log(output);
      });
}

function winShutdown(){
    return shutdown.poweroff();
}

function winRestart(){
    return shutdown.restart();
}

async function getSystemInfos(){
    console.log(`Get system infos`);
    return await si.osInfo();
}

function startNotifyService()
{
    if(interNotifies) return;
    interNotifies = setinterval(() => {
        const noti = notifies.shift();
        notifier.notify(noti);
        if(notifies.length === 0)
            clearInterval(interNotifies);
    }, 3000);
}

async function Notify({title, message}){
    let icon = process.env.IO_LOGO_PATH ?? `./io_logo.png`;
    if(icon)
        icon = path.join(__dirname,icon);
    if(!title)
        title = "Nachricht von ioBroker";

    console.log(`Show notification: ` + message);
    const notifyObj = {
        title,
        message,
        icon: process.env.IO_LOGO_PATH ?? `./io_logo.png`
      };

    // notifies.push(notifyObj);
    // startNotifyService();
    await notifier.notify(notifyObj);
}


module.exports = {
    shutdown: () => {
        try{
            return winShutdown();
        } catch(err){
            return {err};
        }
    },
    restart: () => {
        try{
            return winRestart();
        } catch(err){
            return {err};
        }
    },
    notify: async ({title, message}) => {
        return await Notify({title, message});
    },
    systemInfo: async () => {
        try{
            return await getSystemInfos();
        } catch(err){
            return {err};
        }
    },
    powershell: (cmd,cb) => {
        try{
            return executePowershell(cmd);
        } catch(err){
            console.log(err);
            if(cb) cb(err);
        }
    }
}