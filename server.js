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
const idPowershell = '0_userdata.0.Datenpunkte.Funktion.WindowsControl.1.Powershell';

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
            console.log("CreateStates");
            const parent = clientDp.replace('0_userdata.0.','');
    
            const dpButton = ['', {'name': 'client', 'icon':''}];

            // Shutdown
            let commandShut = 'Shutdown';
            let dpidShut = `${parent}.${commandShut}`;
            if(!(await existsStateAsync(`${clientDp}.${commandShut}`))){
                console.log(dpidShut + ` will be created`);
                const dp = [dpidShut,...dpButton];
                dp[1].name = commandShut;
                createUserStates('0_userdata.0',false,dp, async () => {
                    let obj = await getObjectAsync('0_userdata.0.' + dpidShut);
                    const common ={"role":"button","type":"boolean","read":false,"write":true,ip};
                    obj =  {...obj,common};
                    await setObjectAsync('0_userdata.0.' + dpidShut,obj);
                    on({id: `${clientDp}.${commandShut}`, change: "any"}, async function (obj) {
                        if(obj.state.val)
                            shutdown(await getSocketFromDp(obj.id));
                    });
                  
                });
            }
            else{
                on({id: `${clientDp}.${commandShut}`, change: "any"}, async function (obj) {
                    if(obj.state.val)
                        shutdown(await getSocketFromDp(obj.id));
                });
            }
    
            // Restart
            let commandRest = 'Restart';
            let dpidRest = `${parent}.${commandRest}`;
            if(!(await existsStateAsync(`${clientDp}.${commandRest}`))){
                console.log(dpidRest + ` will be created`);
                const dp = [dpidRest,...dpButton];
                dp[1].name = commandRest;
                createUserStates('0_userdata.0',false,dp, async () => {
                    let obj = await getObjectAsync('0_userdata.0.' + dpidRest);
                    const common ={"role":"button","type":"boolean","read":false,"write":true};
                    obj =  {...obj,common, ip};
                    await setObjectAsync('0_userdata.0.' + dpidRest,obj);
                    
                    on({id: `${clientDp}.${commandRest}`, change: "any"}, async function (obj) {
                        if(obj.state.val)
                            restart(await getSocketFromDp(obj.id));
                    });
                });
            }
            else{
                on({id: `${clientDp}.${commandRest}`, change: "any"}, async function (obj) {
                    if(obj.state.val)
                        restart(await getSocketFromDp(obj.id));
                });
            }
    
            // Notification
            let commandNoti = 'Notification';
            let dpidNoti = `${parent}.${commandNoti}`;
            if(!(await existsStateAsync(`${clientDp}.${commandNoti}`))){
                console.log(dpidNoti + ` will be created`);
                const dp = [dpidNoti, {'name': commandNoti, 'icon':'','type':'string', ip}];
                createUserStates('0_userdata.0',false,dp, () => {
                    on({id: `${clientDp}.${commandNoti}`, change: "any"}, async function (obj) {
                        if(obj.state.val.length > 0)
                            sendNotify(await getSocketFromDp(obj.id),obj.state.val);
                    });
                });
            }
            else{
                on({id: `${clientDp}.${commandNoti}`, change: "any"}, async function (obj) {
                    if(obj.state.val.length > 0)
                        sendNotify(await getSocketFromDp(obj.id),obj.state.val);
                });
            }
    
            // Powershell
            let commandPower = 'Powershell';
            let dpidPower = `${parent}.${commandPower}`;
            if(!(await existsStateAsync(`${clientDp}.${commandPower}`))){
                console.log(dpidPower + ` will be created`);
                const dp = [dpidPower, {'name': commandPower, 'icon':'','type':'string', ip}];
                console.log("power:" + JSON.stringify(dp[1]));
                createUserStates('0_userdata.0',false,dp, () => {
                    on({id: `${clientDp}.${commandPower}`, change: "any"}, async function (obj) {
                        if(obj.state.val.length > 0)
                            sendPowershell(await getSocketFromDp(obj.id),obj.state.val);
                    });
                });
            }
            else{
                on({id: `${clientDp}.${commandPower}`, change: "any"}, async function (obj) {
                    if(obj.state.val.length > 0)
                        sendPowershell(await getSocketFromDp(obj.id),obj.state.val);
                });
            }
        }
    }
    
    
    function getNewId(){
        return (new Date()).getTime();
    }

    function getIpFromSocket(socket){
        return socket.handshake.address.split(':').pop();
    }

    server.on('connection',socket => {
        listSockets.push(socket);
        const address = getIpFromSocket(socket);
        createClient(address);
        socket.on('disconnect', function(reason) {
            log(`Disconnected from ${address}`);
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
    main();
} catch(err){
    clean();
}

onStop((callback) => {
    clean();
    
    callback();
}, 2000 /*ms*/);
