"use strict";
// Für socket io muss "socket.io" in der Javascript Instanz als Modul hinzugefügt werden
const server = require('socket.io')();

// Datenpunkte

// Mit dem folgenden Button wird der Shutdownbefehl gesendet
const idShutdown = '0_userdata.0.Datenpunkte.Funktion.Yannick_win_shutdown';

// Dies ist ein Text Datenpunkt der eine Benachrichtigung als Windows Notification anzeigt
const idNotify = '0_userdata.0.Datenpunkte.Funktion.WindowsControl.1.Nachricht';

// Mit dem folgenden Datenpunkt können Powershell Befehle und Skripte direkt als Text übetragen werden
// Diese werden Base64 encodiert übetragen und dann decodiert auf dem Ziel PC ausgeführt
const idPowershell = '0_userdata.0.Datenpunkte.Funktion.WindowsControl.1.Powershell';;

// Unter dem folgenden Ordner werden die notwendigen Datenpunkte angelegt
const idRootFolder = '0_userdata.0.Datenpunkte.Funktion.WindowsControlNode';

let DEBUG = true;
let listSockets = [];


function main(){
    async function createClient(ip){
        if(!await existsStateAsync(idRootFolder))
            await createStateAsync(idRootFolder);
        
        const clientDp = `${idRootFolder}.${String(ip).replace(/\./g,'_')}`;
        console.log(`Create Client ` + clientDp);
        await createStates();
        
    
        async function createStates(){
            const parent = clientDp.replace('0_userdata.0.','');
            const dpButton = [{'name': 'client', 'icon':''}];

            const userData = '0_userdata.0';

            async function createButton(name, event, {parentFolder} = {}){
                const dpIdCreate = `${parentFolder || parent}.${name}`;
                const dpFull = `${clientDp}.${name}`;

                if(!(await existsStateAsync(dpFull))){
                    console.log(dpId + ` will be created`);
                    const dp = [dpIdCreate,...dpButton];
                    dp[1].name = name;
                    createUserStates(userData,false,dp, async () => {
                        let obj = await getObjectAsync(dpFull);
                        const common = {"role":"button","type":"boolean","read":false,"write":true,ip};
                        obj =  {...obj,common};
                        await setObjectAsync(dpFull,obj);
                        if (event && (typeof event == "function")) 
                            on({id: dpFull, change: "any"}, event);
                    
                    });
                }
                else{
                    // Check ip of existing dp
                    let obj = await getObjectAsync(dpFull);
                    if(obj.common.ip !== ip)
                    {
                        console.log(`Correcting ip of ${dpFull}`);
                        obj.common.ip = ip;
                        await setObjectAsync(dpFull,obj);
                    }
                    if (event && (typeof event == "function")) 
                        on({id: dpFull, change: "any"}, event);
                }
            }

            async function createTextDp(name, event, {parentFolder} = {})
            {
                const dpIdCreate = `${parentFolder || parent}.${name}`;
                const dpFull = `${clientDp}.${name}`;

                if(!(await existsStateAsync(dpFull))){
                    console.log(dpId + ` will be created`);
                    const dp = [dpIdCreate, {'name': name,'type':'string', ip}];

                    dp[1].name = name;
                    createUserStates(userData,false,dp, async () => {
                        if (event && (typeof event == "function")) 
                            on({id: dpFull, change: "any"}, event)
                    });
                }
                else{
                    // Check ip of existing dp
                    let obj = await getObjectAsync(dpFull);
                    if(obj.common.ip !== ip)
                    {
                        console.log(`Correcting ip of ${dpFull}`);
                        obj.common.ip = ip;
                        await setObjectAsync(dpFull,obj);
                    }
                    if (event && (typeof event == "function")) 
                        on({id: dpFull, change: "any"}, event)
                }
            }

            async function createInformation(name)
            {
                const dpIdCreate = `${parent}.Info.${name}`;
                const dpFull = `${clientDp}.Info.${name}`;

                if(!(await existsStateAsync(dpFull))){
                    console.log(dpFull + ` will be created`);
                    const dp = [dpIdCreate, {'name': name,'type':'string', ip, 'write':false}];
                    dp[1].name = name;
                    createUserStates(userData,false,dp);
                }
                else{
                    // Check ip of existing dp
                    let obj = await getObjectAsync(dpFull);
                    if(obj.common.ip !== ip)
                    {
                        console.log(`Correcting ip of ${dpFull}`);
                        obj.common.ip = ip;
                        await setObjectAsync(dpFull,obj);
                    }
                }
            }
            
            await createButton(`Shutdown`, async function(obj){
                if(obj.state.val) shutdown(await getSocketFromDp(obj.id));
            });

            await createButton(`Restart`,async function(obj){
                if(obj.state.val) restart(await getSocketFromDp(obj.id));
            })

            await createTextDp(`Notification`, async function(obj){
                if(obj.state.val.length > 0) sendNotify(await getSocketFromDp(obj.id),obj.state.val);
            });

            await createTextDp(`Powershell`, async function(obj){
                if(obj.state.val.length > 0) sendPowershell(await getSocketFromDp(obj.id),obj.state.val);
            });

            await createInformation(`Connected`);
            await createInformation(`Hostname`);
            await createInformation(`Architektur`);
            await createInformation(`Distro`);

        }
    }
    
    
    function getNewId(){
        return (new Date()).getTime();
    }

    function getIpFromSocket(socket){
        return socket.handshake.address.split(':').pop();
    }

    function getDpInfo(ip){
        return `${idRootFolder}.${ip.replace(/\./g,'_')}.Info`
    }

  

    server.on('connection',async (socket) => {
        const address = getIpFromSocket(socket);
        // Check if already exists
        if(listSockets.find(s => getIpFromSocket(s) === address))
        {
            console.log(`IP ${address} is already connected and will be disconnected`);
            socket.emit("discn",`Client is already connected, new one will be disconnected`);
            return;
        }
        listSockets.push(socket);
        const dpConnected = getDpInfo(address) + '.Connected';
        await createClient(address);
        if(await (existsStateAsync(dpConnected)))
            await setStateAsync(dpConnected,`true`);

        // Get System Infos
        getSysteminfo(socket);

        socket.on('disconnect', async function(reason) {
            log(`Disconnected from ${address}`);
            await setStateAsync(dpConnected,`false`);
            listSockets = listSockets.filter(s => s != socket); // Entferne Socket von der Liste
        });
    
        log('Connected with ' + address);
    });
    
    function base64Encode(text){
        return Buffer.from(text, 'utf-8').toString('base64');
    }
    
    function clientCallback(answer){
        console.log("Client Antwort: " + JSON.stringify(answer));   
    }
    
    function sendCmd(socket,typ){
        if(!socket) return;
        const obj = {id: getNewId(),typ};
        log(`Send command ` + typ);
        if(socket != null)
            socket.emit('cmd',obj, clientCallback);
        
    }
    
    function shutdown(socket){
        sendCmd(socket,1);
    }
    
    function restart(socket){
        sendCmd(socket,2);
    }
    
    
    function sendNotify(socket,message, title = ''){
        if(!socket) return;
        console.log('Send to client: ' + message);
        message = base64Encode(message);
        if(title && title.length > 0)
            title = base64Encode(title);
    
        
        const notify = {title, message};
        const obj = {id: getNewId(),typ: 4,cmd:notify};
        socket.emit('cmd',obj, clientCallback);
    }
    
    function sendPowershell(socket,cmd){
        if(!socket) return;
        cmd = base64Encode(cmd);
        const obj = {id: getNewId(),typ: 5,cmd};
        log(`Send powershell ` + JSON.stringify(obj));
        if(socket != null)
            socket.emit('cmd',obj,clientCallback);
    }

    async function getSysteminfo(socket)
    {
        if(!socket) return;
        const typ = 3;
        const obj = {id: getNewId(),typ};
        if(socket != null)
            socket.emit('cmd',obj, ({answer}) => setSystemInfos(answer, socket));
    }

    async function setSystemInfos(obj, socket)
    {
        const dpFolderInfo = `${idRootFolder}.${getIpFromSocket(socket).replace(/\./g,'_')}.Info.`;
        const {
            distro // z.B. Windows 10
            ,arch // z.B. 64 bit
            ,hostname // Rechnername
        } = obj;
        let dpName = dpFolderInfo + `Distro`;
        if(distro && await existsStateAsync(dpName))
            await setStateAsync(dpName, distro);
        
        dpName = dpFolderInfo + `Architektur`;
        if(arch && await existsStateAsync(dpName))
            await setStateAsync(dpName, arch);

        dpName = dpFolderInfo + `Hostname`;
        if(hostname && await existsStateAsync(dpName))
            await setStateAsync(dpName, hostname);

    }
    
    async function getSocketFromDp(dp){
        const obj = await getObjectAsync(dp);
        const socket = listSockets.find(s => getIpFromSocket(s) === obj.common.ip);
        return socket;
    }
    
    /**
     * Start Server
     */
    server.listen(8588);
    log('Listening on port 8588');
    
}

function clean(){
    if (server != null) 
        server.close();
}

try{
    await main();
} catch(err){
    clean();
}

onStop((callback) => {
    clean();
    
    callback();
}, 2000 /*ms*/);
