var map;

var attemptingReconnect = false;

var lastPing = Date.now();

var fugitives = {};

var playerLocations = {}; //A dict of player public IDs -> {location, accuracy, marker, accuracyCircle}

var timeLeft = 0;
var hsTime = 0; //How much of a headstart we have to sit through.

var border;
var borderLine;

function calculateTimeRep(seconds){
	var hours = (seconds / 3600) >> 0; //Cursed integer division.
	var hoursString = hours.toString(); //Unlike the other 3, this can in theory go above 99, so it's a special case (obviously).
	if (hoursString.length === 1){
		hoursString = '0' + hoursString;
	}
	var secondsLeft = seconds % 3600;
	//The quotient of this division is minutes, remainer is seconds.
	var mins = (secondsLeft / 60) >> 0;
	var secs = secondsLeft % 60;
	return `${hoursString}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function setupWS() {
	//Set the gameSocket to render players on the map.
	gameSocket.addEventListener('message', (m) => {
		lastPing = Date.now();
		var raw = m.data;
		if (raw === 'OK'){}
		else if (raw.startsWith('INFO')){
			var gi = JSON.parse(raw.split(' ')[1]);
			gi.fugitives.map((f) => {fugitives[f] = true}); //Hashset
			if (fugitives[gi.publicID]){
				//We're a fugitive too, add 'self' to the set.
				fugitives['self'] = true;
			}
			//Set time from this as well.
			timeLeft = gi.options.timer;
			hsTime = gi.options.hstimer;
			//Set the border
			border = new Border(gi.options.border);
			borderLine = border.render(borderLine, map, window.sessionStorage.getItem("role") === 'spectator'); //Only snap to the border if the player is a spectator.
		}
		else if (raw === 'ping'){
		}
		else if (raw.startsWith('TIME')){
			var dat = raw.split(" ");
			timeLeft = Number(dat[1]);
			hsTime = Number(dat[2]);
			if (hsTime <= 0){
				$('#blanker')[0].style="display: none;"; //Remove blanker from visibility.
			}
			else {
				$('#blanker')[0].style="display: block;"; //Show blanker. TODO: Show headstart timer + don't do this for spectators.
			}
		}
		else if (raw.startsWith('OVER')){
			//Go to the gameover page.
			document.location = 'gameover.html';
		}
		else {
			//The protocol is now officially: 'user:lat,lng,acc'
			var splitDat = raw.split(":");
			var user = splitDat[0];
			var infoSplit = splitDat[1].split(",");
			if (splitDat[1] === 'null,null,null'){
				onLocationObtained(user); //Undefined, so location itself doesn't change, just the look of the marker.
			}
			else {
				onLocationObtained(user, Number(infoSplit[0]), Number(infoSplit[1]), Number(infoSplit[2]));
			}
		}
	});
	
	//Set up a message for if we drop connection.
	gameSocket.onclose = () => {
		var alertBox = $('#alerts')[0];
		alertBox.innerHTML = "";
		displayAlert(alertBox, 'warning', "Connection lost! Attempting to reconnect...");
	};
	
	//Set up another message for when we regain connection.
	gameSocket.onopen = () => {
		var alertBox = $('#alerts')[0];
		alertBox.innerHTML = "";
		displayAlert(alertBox, 'success', "Connected.");
		lastPing = Date.now(); //Connecting counts as a ping.
		//"set" the map's zoom to the same to trigger a reload.
		map.setZoom(map.getZoom() - 1);
		map.setZoom(map.getZoom() + 1);
	};
}

function setupMap() {
	map = L.map('map');
	L.tileLayer(serverIP + "/tile?x={x}&y={y}&z={z}", {
		//Standard settings for mapbox (which we're using for the forseeable future).
		attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    	maxZoom: 18,
    	tileSize: 512,
		zoomOffset: -1
	}).addTo(map);
	//Request gameinfo
	window.setTimeout(() => {
		gameSocket.send('GAMEINFO');
		console.debug('Sent gameinfo request.');
	}, 1000);
	if (window.sessionStorage.getItem("role") !== 'spectator'){ //Don't watch spectator location.
		//Temporary, just to try and get the damn thing to work.
		if (cordova.platformId !== 'browser'){
			BackgroundGeolocation.configure({
				url: serverIP + "/loc",
				postTemplate: {
					lat: "@latitude",
					lon: "@longitude",
					accuracy: "@accuracy",
					uuid: window.sessionStorage.getItem('ID')
				}
			});
		}
		getGeolocationService().watch(3000, (l) => {
			onLocationObtained('self', l.latitude, l.longitude, l.accuracy);
			if (cordova.platformId === 'browser'){
				//We're not using BackgroundGeolocation, send it through the websocket as normal
				gameSocket.send(`${l.latitude},${l.longitude},${l.accuracy}`);
			}
		});
	}
	setupWS();
}

//Called when any player's location is obtained.
function onLocationObtained(who, lat, lng, accuracy){
	//Needed regardless.
	var icon = L.icon({
		iconUrl: this.fugitives[who] ? 'img/running_fugitive.png' : 'img/running_hunter.png',
		iconSize: [32, 32]
	});
	if (playerLocations[who] !== undefined){
		//Just move the already existing data.
		var data = playerLocations[who];
		if (lat === undefined){
			//Final 'move', so just show a semi-transparent marker with no accuracy circle.
			data.circle.remove();
			data.marker.setOpacity(0.3);
		}
		else {
			data.marker.setLatLng([lat, lng]);
			data.marker.setIcon(icon);
			data.circle.setLatLng([lat, lng]);
			data.circle.setRadius(accuracy);
			data.circle.setStyle({opacity: 0.2, color: this.fugitives[who] ? '#ff0000' : '#0000ff'});
			//Update the actual data.
			data.ll = [lat, lng];
			data.acc = accuracy;
			playerLocations[who] = data; //Set back over the top of the old one.
		}
	}
	else {
		//Need to create the data from scratch.
		var data = {};
		data.marker = L.marker([lat, lng], {icon: icon}).addTo(map);
		//Fairly alarming colours, but those can be changed. Marker will also change.
		data.circle = L.circle([lat, lng], {radius: accuracy, opacity: 0.2, color: this.fugitives[who] ? '#ff0000' : '#0000ff'}).addTo(map);
		//Add raw data
		data.ll = [lat, lng];
		data.acc = accuracy;
		playerLocations[who] = data; //Set this data in our list.
		if (who === 'self' || window.sessionStorage.getItem("role") === 'spectator'){
			//This is us or we're a spectator, and we don't currently have a location, so set an initial view.
			map.setView([lat, lng], 16);
		}
	}
}

window.setTimeout(setupMap, 200); //Set a small timeout to allow everything to load.

//Set a timer decrementer.
window.setInterval(() => {
	//If we're at t<=0, do nothing
	if (timeLeft <= 0){
		return;
	}
	if (hsTime > 0){
		//Decrement headstart timer first.
		hsTime--;
		if (hsTime <= 0){
			$('#blanker')[0].style="display: none;"; //Remove blanker from visibility.
		}
		else {
			$('#blanker')[0].style="display: block;"; //Show blanker. TODO: Show headstart timer + don't do this for spectators.
			$('#headstarttimer')[0].innerText = `Headstart: ${calculateTimeRep(hsTime)}`
		}
	}
	else{
		timeLeft--; //Decrement timer as normal.
	}
	//Now, make a nice stringrep of the time.
	$('#timer')[0].innerText = `Time left: ${calculateTimeRep(timeLeft)}`;
}, 1000);

//Bind the button that reacts when the player is out, if they're a fugitive. This WON'T BE ENFORCED SERVERSIDE, since hunters can go out by other means (specifically, leaving the bounds).
if (window.sessionStorage.getItem("role") === 'fugitive'){
	$('#caught')[0].onclick = () => {
		if (confirm("Are you sure you meant to press this button?")){
			//Player is out.
			//Cancel background location task.
			getGeolocationService().stop();
			if (gameSocket.readyState === 1){
				//Send the message that you're out now.
				gameSocket.send("OUT");
				window.setTimeout(() => {
					window.sessionStorage.setItem('role', 'spectator');
					document.location.reload();
				}, 1500);
			}
			else {
				//Send the message once the socket comes back.
				gameSocket.addEventListener('open', () => {
					gameSocket.send("OUT");
					//Set our role to spectator and refresh.
					window.setTimeout(() => {
						window.sessionStorage.setItem('role', 'spectator');
						document.location.reload();
					}, 1500);
				});
			}
		}
	}
}
else {
	$('#caught')[0].style = "display: none;";
}

//When we leave this page, stop location watching.
window.onbeforeunload = () => {
	if (BackgroundGeolocation !== undefined){
		BackgroundGeolocation.stop(); //Stop the background task when the game is unloaded.
	}
}