//There will be more stuff here once I bother moving it.
document.getElementById("tab1").onclick = () => {
    selectTab(
        document.getElementById("tab1"),
        document.getElementById("navheader"),
        document.getElementById("map"),
        document.getElementById("content")
    );
};

document.getElementById("tab2").onclick = () => {
    selectTab(
        document.getElementById("tab2"),
        document.getElementById("navheader"),
        document.getElementById("goals"),
        document.getElementById("content")
    );
};

document.getElementById("tab3").onclick = () => {
    selectTab(
        document.getElementById("tab3"),
        document.getElementById("navheader"),
        document.getElementById("players"),
        document.getElementById("content")
    );
};

document.getElementById("tab4").onclick = () => {
    selectTab(
        document.getElementById("tab4"),
        document.getElementById("navheader"),
        document.getElementById("abilities"),
        document.getElementById("content")
    );
};

//Websocket stuff
async function setupWS() {

    var gs = await getSocket();

	gs.on('TIME', (timers) => {
		timer = timers[0] + timers[1];
		if (timer <= escapeOpen){
			hideHSWindow();
		}
		else {
			showHSWindow();
		}
	})

	gs.on('OVER', () => {
		document.location = 'gameover.html';
	});

	gs.on('OUT', () => {
		window.sessionStorage.setItem('role', 'spectator');
		document.location.reload();
	});

	gs.on('COMPING', (target, from) => {
		showPing(target, from);
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

	gs.emit('INFO', (opts) => {
		showFromInfo(opts);
	});

	gs.on('LOC', (lat, lon, acc, who) => {
		onLocationObtained(who, lat, lon, acc);
	});

	gs.on('EVAC', (pt, rad) => {
		if (escapeMarker !== undefined){
			//Ignore, we already have it marked.
			return;
		}
		//Show our player where the evacuation point is.
		var escLat = pt.geometry.coordinates[1];
		var escLon = pt.geometry.coordinates[0];
		escapeMarker = L.marker([escLat, escLon], {
			icon: L.icon({
				iconSize: 32,
				iconUrl: 'img/escape.png'
			})
		}).addTo(map);
		escapeRad = L.circle([escLat, escLon], {radius: rad, opacity: 0.4, color: '#00ff00'}).addTo(map);
	});
}

//Make the socket
createSocket().then(() => {
    setupWS();
});