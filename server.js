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



/**
 * Create states under 0_userdata.0 or javascript.x
 * Current Version:     https://github.com/Mic-M/iobroker.createUserStates
 * Support:             https://forum.iobroker.net/topic/26839/
 * Autor:               Mic (ioBroker) | Mic-M (github)
 * Version:             1.1 (26 January 2020)
 * Example:             see https://github.com/Mic-M/iobroker.createUserStates#beispiel
 * -----------------------------------------------
 * PLEASE NOTE: Per https://github.com/ioBroker/ioBroker.javascript/issues/474, the used function setObject() 
 *              executes the callback PRIOR to completing the state creation. Therefore, we use a setTimeout and counter. 
 * -----------------------------------------------
 * @param {string} where          Where to create the state: '0_userdata.0' or 'javascript.x'.
 * @param {boolean} force         Force state creation (overwrite), if state is existing.
 * @param {array} statesToCreate  State(s) to create. single array or array of arrays
 * @param {object} [callback]     Optional: a callback function -- This provided function will be executed after all states are created.
 */
 function createUserStates(where, force, statesToCreate, callback = undefined) {
 
    const WARN = false; // Only for 0_userdata.0: Throws warning in log, if state is already existing and force=false. Default is false, so no warning in log, if state exists.
    const LOG_DEBUG = false; // To debug this function, set to true
    // Per issue #474 (https://github.com/ioBroker/ioBroker.javascript/issues/474), the used function setObject() executes the callback 
    // before the state is actual created. Therefore, we use a setTimeout and counter as a workaround.
    const DELAY = 50; // Delay in milliseconds (ms). Increase this to 100, if it is not working.

    // Validate "where"
    if (where.endsWith('.')) where = where.slice(0, -1); // Remove trailing dot
    if ( (where.match(/^((javascript\.([1-9][0-9]|[0-9]))$|0_userdata\.0$)/) == null) ) {
        log('This script does not support to create states under [' + where + ']', 'error');
        return;
    }

    // Prepare "statesToCreate" since we also allow a single state to create
    if(!Array.isArray(statesToCreate[0])) statesToCreate = [statesToCreate]; // wrap into array, if just one array and not inside an array

    // Add "where" to STATES_TO_CREATE
    for (let i = 0; i < statesToCreate.length; i++) {
        let lpPath = statesToCreate[i][0].replace(/\.*\./g, '.'); // replace all multiple dots like '..', '...' with a single '.'
        lpPath = lpPath.replace(/^((javascript\.([1-9][0-9]|[0-9])\.)|0_userdata\.0\.)/,'') // remove any javascript.x. / 0_userdata.0. from beginning
        lpPath = where + '.' + lpPath; // add where to beginning of string
        statesToCreate[i][0] = lpPath;
    }

    if (where != '0_userdata.0') {
        // Create States under javascript.x
        let numStates = statesToCreate.length;
        statesToCreate.forEach(function(loopParam) {
            if (LOG_DEBUG) log('[Debug] Now we are creating new state [' + loopParam[0] + ']');
            let loopInit = (loopParam[1]['def'] == undefined) ? null : loopParam[1]['def']; // mimic same behavior as createState if no init value is provided
            createState(loopParam[0], loopInit, force, loopParam[1], function() {
                numStates--;
                if (numStates === 0) {
                    if (LOG_DEBUG) log('[Debug] All states processed.');
                    if (typeof callback === 'function') { // execute if a function was provided to parameter callback
                        if (LOG_DEBUG) log('[Debug] Function to callback parameter was provided');
                        return callback();
                    } else {
                        return;
                    }
                }
            });
        });
    } else {
        // Create States under 0_userdata.0
        let numStates = statesToCreate.length;
        let counter = -1;
        statesToCreate.forEach(function(loopParam) {
            counter += 1;
            if (LOG_DEBUG) log ('[Debug] Currently processing following state: [' + loopParam[0] + ']');
            if( ($(loopParam[0]).length > 0) && (existsState(loopParam[0])) ) { // Workaround due to https://github.com/ioBroker/ioBroker.javascript/issues/478
                // State is existing.
                if (WARN && !force) log('State [' + loopParam[0] + '] is already existing and will no longer be created.', 'warn');
                if (!WARN && LOG_DEBUG) log('[Debug] State [' + loopParam[0] + '] is already existing. Option force (=overwrite) is set to [' + force + '].');
                if(!force) {
                    // State exists and shall not be overwritten since force=false
                    // So, we do not proceed.
                    numStates--;
                    if (numStates === 0) {
                        if (LOG_DEBUG) log('[Debug] All states successfully processed!');
                        if (typeof callback === 'function') { // execute if a function was provided to parameter callback
                            if (LOG_DEBUG) log('[Debug] An optional callback function was provided, which we are going to execute now.');
                            return callback();
                        }
                    } else {
                        // We need to go out and continue with next element in loop.
                        return; // https://stackoverflow.com/questions/18452920/continue-in-cursor-foreach
                    }
                } // if(!force)
            }

            // State is not existing or force = true, so we are continuing to create the state through setObject().
            let obj = {};
            obj.type = 'state';
            obj.native = {};
            obj.common = loopParam[1];
            setObject(loopParam[0], obj, function (err) {
                if (err) {
                    log('Cannot write object for state [' + loopParam[0] + ']: ' + err);
                } else {
                    if (LOG_DEBUG) log('[Debug] Now we are creating new state [' + loopParam[0] + ']')
                    let init = null;
                    if(loopParam[1].def === undefined) {
                        if(loopParam[1].type === 'number') init = 0;
                        if(loopParam[1].type === 'boolean') init = false;
                        if(loopParam[1].type === 'string') init = '';
                    } else {
                        init = loopParam[1].def;
                    }
                    setTimeout(function() {
                        setState(loopParam[0], init, true, function() {
                            if (LOG_DEBUG) log('[Debug] setState durchgeführt: ' + loopParam[0]);
                            numStates--;
                            if (numStates === 0) {
                                if (LOG_DEBUG) log('[Debug] All states processed.');
                                if (typeof callback === 'function') { // execute if a function was provided to parameter callback
                                    if (LOG_DEBUG) log('[Debug] Function to callback parameter was provided');
                                    return callback();
                                }
                            }
                        });
                    }, DELAY + (20 * counter) );
                }
            });
        });
    }
}


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
