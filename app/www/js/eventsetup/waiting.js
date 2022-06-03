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



