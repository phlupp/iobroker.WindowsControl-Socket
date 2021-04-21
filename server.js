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
// let listSockets = [];

// let lisDpEvents = [];

class Client
{
    constructor(socket)
    {
        this.socket = this.newObj({value: socket});
        this.rootFolder = '';
        this.client = {
            infos: {
                architecture: this.newObj(),
                connected: this.newObj({ typ: 'boolean'}),
                distro: this.newObj(),
                hostname: this.newObj(),
            },
            notification: this.newObj({write: true}),
            powershell: this.newObj({write: true}),
            shutdown: this.newObj({write:true, role: 'button'}),
            restart: this.newObj({write:true, role: 'button'}),
        };

        Debug(`Connecting with client ${this.getIp}`);
    }

    async init(parentFolder)
    {
        await this.setParentFolder(parentFolder);
        // await this.checkDataPoints(parentFolder);
        this.prepareEvents();
        await this.prepareClient();
        await this.prepareInfos();

        Info(`Connected with client ${this.getIp} - ${this.client.infos.hostname.get}`);
    }

    newObj({value,typ,dp, ip, write, role} = {})
    {
        const internIP = this.getIp;
        const createUserState = this.createUserState;
        /**
         * Typ:
         * 1 => Function
         * 2 => Info
         */
        return {
            value,
            dp: dp ||'',
            ip: ip || internIP,
            async hasChanged(v){
                if(!this.getDp()) return;
                if(await existsObjectAsync(this.getDp()))
                {
                    await setStateAsync(this.getDp(),v);
                    console.log(`State ${this.getDp()} changed to ${v}`);
                }
                else
                    Error(`DP ${this.getDp()} konnte nicht gesetzt werden`);
            }, 
            get get()
            {
                return this.value;
            },
            set set(v)
            {
                this.value = v;
                if (this.hasChanged) {
                    (async () => await this.hasChanged(this.value))();
                }
                return this;
            },
            dpEvent: null,
            dpFunc: null,
            async dpHasChanged(id, options = {}){
                Debug(`ID of datapoint ${id} changed`);
                if(!id || id.length === 0) return;
                const {func} = options;
                if(!await existsStateAsync(id))
                    return Error(`Cant subscribe not existing state ${id}`);
                Debug(`Subscribe to new dp ${id}`);
                if(this.dpEvent) unsubscribe(this.dpEvent); // delete events
                if(func || this.dpFunc)
                    this.dpEvent = on({id, change: "any"}, func || this.dpFunc); // Subsribe again with new ID and existing Function
            },
            getDp()
            {
                return this.dp;
            },
            getDpArrayFromTyp()
            {
                const obj = {'name': '','typ':typ || 'string', write: write || false, ip: this.ip, role: role || ''};
                switch(this.typ)
                {
                    case 'boolean':
                        {
                            obj.role = 'button';
                        }
                    break;
                };
                return ['', obj];
            },
            async setDp(id, options = {})
            {
                try {
                    if(!id || id.length === 0) return;
                    this.dp = id;
                    
                    if(!await existsStateAsync(id))
                    {
                        Info(`Create not existing dp ${id}`);
                        const createDpId = id.replace('0_userdata.0.','');
                        const dp = this.getDpArrayFromTyp();
                        dp[0] = createDpId;
                        await createUserState('0_userdata.0',false,dp);
                        let obj = await getObjectAsync(id);
                        obj.common = {...dp[1]};
                        await setObjectAsync(id,obj);
                        Debug(`Created`);
                    }
                    if (this.dpHasChanged) this.dpHasChanged(this.dp, options);
                    return this;
                } catch (error) {
                    Error(err);
                }
            }
        };
    }

    async setParentFolder(folder)
    {
        try {
            if(!folder || folder.length === 0 || !this.client || !this.client.infos) return;
            const folderInfo = `${folder}.${this.getIpName}.Info`;
            const {architecture,connected,distro,hostname} = this.client.infos;
    
            await architecture.setDp(`${folderInfo}.Architecture`);
            await connected.setDp(`${folderInfo}.Connected`);
            await distro.setDp(`${folderInfo}.Distro`);
            await hostname.setDp(`${folderInfo}.Hostname`);

            
            // Functions
            const folderFunctions = `${folder}.${this.getIpName}`;
            const{notification,powershell, shutdown, restart} = this.client;
            
            await notification.setDp(`${folderFunctions}.Notification`, {func: async (obj) => {
                if(obj.state.val.length == 0) return;
                await this.sendNotify(obj.state.val);
            }});

            await powershell.setDp(`${folderFunctions}.Powershell`, {func: async (obj) => {
                if(obj.state.val.length == 0) return;
                await this.sendPowershell(obj.state.val);
            }});

            await shutdown.setDp(`${folderFunctions}.Shutdown`, {func: async () => {
               await this.sendShutdown();
            }});

            await restart.setDp(`${folderFunctions}.Restart`, {func: async () => {
                await this.sendRestart();
             }});

        } catch (error) {
            Error(error);
        }
    }

    get getIp(){
        if(!this.socket || !this.socket.get) return;
        return this.socket.get.handshake.address.split(':').pop();
    }

    get getIpName()
    {
        return this.getIp.replace(/\./g,'_');
    }

    get getInfos()
    {
        return this.client.infos;
    }

    prepareEvents()
    {
        const socket = this.socket.get;
        if(!socket) return;
        socket.on(`authentication`, data => {
            // ...
        });
    }
    
    async prepareInfos()
    {
        try {
            Info(`Get infos`)
            const infos = await this.getSysteminfo();
            const {
                distro // z.B. Windows 10
                ,arch // z.B. 64 bit
                ,hostname // Rechnername
            } = infos;
    
            if(distro)
                this.client.infos.distro.set = distro;

            if(arch)
                this.client.infos.architecture.set = arch;

            if(hostname)
                this.client.infos.hostname.set = hostname;

            this.client.infos.connected.set = true;

        } catch (error) {
            Error(error);
        }
    }

    async prepareClient()
    {

    }

    async checkDataPoints()
    {

    } 

    disconnect()
    {
        if(!this.socket.get) return;
        this.socket.get.close();
    }

    async stop(reason)
    {
        if(!this.socket.get) return;
        await promiseEmit(`discn`,reason);
    }


    async promiseEmit(eventName, obj = null)
    {
        if(!this.socket.get) return Error(`Socket empty`);
        if(!eventName || eventName.length === 0) return Error(`Event empty`)
        
        Info('Prepare emit');
        return new Promise((resolve, reject) => {
            let timeout = setTimeout(() => {
                Warn(`Timeout reached event ${eventName}`)
                return resolve()
            },5000);

            function res(ob = null)
            {
                clearTimeout(timeout);
                return resolve(ob);
            }
            Debug('Fire emit ' + eventName);
            if(obj)
                this.socket.get.emit(eventName,obj,res);
            else
                this.socket.get.emit(eventName,res);
        });
    }

    base64Encode(text){
        return Buffer.from(text, 'utf-8').toString('base64');
    }

    async clientAnswer(text)
    {
        if(!text || text.length === 0) return;
        Debug(`Client answer: ${text}`);
    }

    async sendNotify(message){
        try {
            if(!this.socket.get) return;
            Debug('Send to client: ' + message);
            message = this.base64Encode(message);
            return await this.promiseEmit('notify',{message});
        } catch (error) {
            Error(error);
        }
    }

    async sendPowershell(cmd){
        try {
            if(!this.socket.get) return;
            Debug('Send powershell to client: ' + cmd);
            cmd = this.base64Encode(cmd);
            const err = await this.promiseEmit('powershell',cmd);
            if(err) Error(err);
        } catch (error) {
            Error(error);
        }
    }

    async sendShutdown(){
        try {
            if(!this.socket.get) return;
            Debug('Send shutdown to client');
            const err = await this.promiseEmit('shutdown');
            if(err) Error(err);
        } catch (error) {
            Error(error);
        }
    }

    async sendRestart(){
        try {
            if(!this.socket.get) return;
            Debug('Send restart to client');
            const err = await this.promiseEmit('restart');
            if(err) Error(err);
        } catch (error) {
            Error(error);
        }
    }

    async getSysteminfo()
    {
        try {
            if(!this.socket.get) return;
            Debug(`Get system infos`);
            return await this.promiseEmit('systeminfo');
        } catch (error) {
            Error(error);
        }
    }

    /**
     * Create states under 0_userdata.0 or javascript.x
     * Current Version:     https://github.com/Mic-M/iobroker.createUserStates
     * Support:             https://forum.iobroker.net/topic/26839/
     * Autor:               Mic (ioBroker) | Mic-M (github)
     * Version:             1.2 (20 October 2020)
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
    async createUserState(where, force, statesToCreate, callback = undefined) {
    
        return new Promise((resolve) => {
            callback = resolve;
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
                                } else {  // no callback, return anyway
                                    return;
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
        });
    }
}


class ClientList
{
    constructor(parentFolder)
    {
        this.parentFolder = parentFolder;
        this.clients = [];
    }

    async addClient(socket)
    {
        if(!socket) return;
        const client = new Client(socket);
        await client.init(this.parentFolder);
        if(this.clients.find(c => c.getIp === client.getIp))
        {
            const message = `IP ${client.getIp} is already connected and will be disconnected`;
            Warn(message);
            client.stop(message);
            return;
        }
        this.clients.push(client);
        return client;
    }

    removeClientByIp(ip)
    {
        const client = this.clients.find(c => c.getIp === ip)
        if(client) client.client.infos.connected.set = false;
        this.clients = this.clients.filter(c => c.getIp !== ip);
    }

    removeClientByClient(client)
    {
        this.removeClientByIp(client.getIp);
    }

    removeClientBySocket(socket)
    {
        this.clients = this.clients.filter(c => c.socket.get !== socket);
    }

    findClientWithIp(ip){
        if(!ip || ip.length === 0) return;
        return this.clients.find(client => client.getIp() === ip);
    }
}

const clientList = new ClientList(idRootFolder);

function Info(text)
{
    console.log(text);
}

function Debug(text)
{
    console.log(text);
}

function Error(text)
{
    console.log(text,'error');
}

function Warn(text)
{
    console.log(text,'warn');
}


function clean(){
    if (server != null) 
        server.close();
}

try{
    // Reset States
    Debug(`Reset all states`);
    let selector = $(`[id=${idRootFolder}*Info*Connected]`);
    selector.each(async (id, i) => await setStateAsync(id, false));

    server.on('connection',async (socket) => {
        const client = await clientList.addClient(socket);
        socket.on('disconnect', async function(reason) {
            clientList.removeClientByClient(client);
        });
    });
    
    /**
     * Start Server
     */
    server.listen(8588);
    log('Listening on port 8588');
} catch(err){
    clean();
}

onStop((callback) => {
    clean();
    
    callback();
}, 2000 /*ms*/);
