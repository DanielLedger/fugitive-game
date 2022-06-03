async function setupWS() {

    gs = await getSocket();

	gs.on('LOC', (lat, lon, acc, who) => {
		onLocationObtained(who, lat, lon, acc);
	});
	
	gs.on('disconnect', (reason) => {
		console.warn(`Disconnct: ${reason}`);
		//Warn the user our connection died.
		var alertBox = $('#alerts')[0];
		alertBox.innerHTML = "";
		displayAlert(alertBox, 'warning', "Lost connection to server. Reconnecting...");
	});

	gs.on('connect', () => {
		var alertBox = $('#alerts')[0];
		alertBox.innerHTML = "";
		displayAlert(alertBox, 'success', "Connected.");
		//"set" the map's zoom to the same to trigger a reload.
		map.setZoom(map.getZoom() - 1);
		map.setZoom(map.getZoom() + 1);
	});

	//Ask the server why we're here (socket.io will wait until we've connected to send this)
	gs.emit('HAS_WON', (winner, reason) => {
		if (winner){
			$('#haswon')[0].innerText = 'You won!';
		}
		else {
			$('#haswon')[0].innerText = 'You lost!';
		}
		$('#reason')[0].innerText = reason;
	});
}

//Make the socket
createSocket().then(() => {
    setupWS();
});