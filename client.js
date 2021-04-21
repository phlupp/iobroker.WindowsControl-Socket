require('dotenv').config();
const io = require("socket.io-client");
const win = require("./win");
const socket = io.connect(`ws://${process.env.SERVER_IP ?? "localhost"}:${process.env.SERVER_PORT ?? 8588}` );


socket.on('connect', () => {
  console.log(`Connected`);
});

socket.on('disconnect', () => {
  console.log('Disconnected');
});

// socket.on('discn', (message) => {
//     // Client already connected so close application
//     console.log(message);
//     socket.close();
//     process.exit(0);
// })

// handle the event sent with socket.send()
socket.on('cmd', async (data, cb) => {
    console.log(`Message vom server: ` + JSON.stringify(data));
    const {typ, id, cmd} = data;
    let answer = {};
    let error = null; 
    switch(typ)
    {
        case 1: // shutdown
            {
                error = win.shutdown();
            }
        break;
        case 2: // restart
            {
                error = win.restart();
            }
        break;
        case 3: 
            {
                answer = await win.systemInfo();
            }
        break;
        case 4: // Notification
            {
                let {title, message} = cmd;
                if(title) 
                    title = base64Decode(title);
                if(message) 
                    message = base64Decode(message);
                error = win.notify({title, message});
            }
        break;
        case 5: // Powershell
            {
                if(cmd) 
                    error = win.powershell(base64Decode(cmd))
            }
        break;
    }
    if (cb && (typeof cb == "function")) {
        const retValue = {...answer, id,error};
        console.log(`Return object: ` + JSON.stringify(retValue));
        cb(retValue);
    }
});

function base64Decode(text){
    if(!text || text.length === 0) return;
    return Buffer.from(text, 'base64').toString('utf-8');
}

socket.on('notify', async (data, cb) => {
    try 
    {
        let {message} = data;
        console.log(`Received notification: ` + message);
        if(message) 
            message = base64Decode(message);

        if(message)
        {
            if(cb) cb(await win.notify({message}));
        }
        if(cb) cb(new Error(`Message is empty`));
    } catch(err)
    {
        console.log(err);
        // if(cb) cb(err);
    }
});

socket.on('powershell', async (cmd, cb) => {
    try 
    {
        console.log(`Received powershell command: ` + cmd);
        if(cmd) 
            cmd = base64Decode(cmd);

        if(cmd && cb) return cb(await win.powershell(cmd,cb));
        if(cb) cb(new Error(`Message is empty`));
    } catch(err)
    {
        console.log(err);
    }
});

socket.on('shutdown', async (cb) => {
    try 
    {
        console.log(`Received shutdown command`);
        // if(cb) return cb(await win.shutdown(cb));
        if(cb) return cb(null);
        if(cb) cb(new Error(`Command failed`));
    } catch(err)
    {
        console.log(err);
    }
});

socket.on('restart', async (cmd, cb) => {
    try 
    {
        console.log(`Received shutdown command`);
        if(cb) return cb(await win.restart(cb));
        if(cb) cb(new Error(`Command failed`));
    } catch(err)
    {
        console.log(err);
    }
});

socket.on('systeminfo', async (cb) => {
    try 
    {
        if(cb) cb(await win.systemInfo());
    } catch(err)
    {
        console.log(err);
        if(cb) cb(err);
    }
});


