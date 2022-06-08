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

//Share link event
async function shareGame(){
    var pc = (resolve, reject) => {
        var uri = `fugitive://${getServerIP().replaceAll('/', '~')}/${getGameCode()}`;
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

document.getElementById('share').onclick = shareGame;