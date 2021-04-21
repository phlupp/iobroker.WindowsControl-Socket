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
        if(cb) return cb(await win.shutdown(cb));
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


