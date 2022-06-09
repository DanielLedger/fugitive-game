//Handle the websocket stuff

createSocket().then((s) => {
    s.on('REFETCH', () => {
        //Something changed, so reget the player info (not just options)
        //TODO: Just send the info directly (which is surprisngly annoying at the moment)
        s.emit('INFO', (opts) => {
            showGameStatus(opts);
        });
    });
    
    s.on('UPDATED', (newOpts) => {
        console.debug(newOpts);
        showOptions(newOpts);
    });
    
    s.on('START', () => {
        document.location = 'game.html';
    });

});

function getShareLink(){
    return `fugitive://${getServerIP().replaceAll('/', '~')}/${getGameCode()}`;
}

//Share link event
async function shareGame(){
    var pc = (resolve, reject) => {
        var uri = getShareLink();
        if (device.platform === 'browser'){
            //Copy link to clipboard
            navigator.clipboard.writeText(uri).then(resolve, reject);
            return;
        }
        
        var opts = {
            message: 'Join my game of Fugitive. Good luck!',
            url: uri
        };
        window.plugins.socialsharing.shareWithOptions(opts, resolve, reject);
    };
    return new Promise(pc);
}

//Create QR code
async function createGameQR(){
    var pc = (resolve, reject) => {
        var uri = getShareLink();
        cordova.plugins.qrcodejs.encode('TEXT_TYPE', uri, resolve, reject);
    };
    return new Promise(pc);
}

async function setGameQR(){
    var qrRaw = await createGameQR();
    document.getElementById('shareQR').src = qrRaw;
}

document.addEventListener('deviceready', () => {
    setGameQR();
}, false);

document.getElementById('share').onclick = shareGame;