var map;

var attemptingReconnect = false;

var lastPing = Date.now();

var fugitives = {};

var us;

var playerLocations = {}; //A dict of player public IDs -> {location, accuracy, marker, accuracyCircle}

var timeLeft = 0;
var hsTime = 0; //How much of a headstart we have to sit through.

var border;
var borderLine;

var infoRequester;

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

function showPing(target, from){
	console.debug(`Pinging ${JSON.stringify(target)}.`);
	//TODO: Sort out how notifications will work.
	if (typeof target === 'string'){
		//Either a UUID, a Y or a N.
		if (target === 'Y'){
			//Show a yes from the person it was from.
			playerLocations[from].marker.bindPopup("<b>OK</b>").openPopup();
		}
		else if (target === 'N'){
			//Show a yes from the person it was from.
			playerLocations[from].marker.bindPopup("<b>REPEAT?</b>").openPopup();
		}
		else {
			//Pinging a player.
			if (target === us){
				playerLocations['self'].marker.bindPopup("<b>YOU</b>").openPopup();
			}
			else {
				playerLocations[target].marker.bindPopup("<b>THEM</b>").openPopup();
			}
		}
	}
	else {
		//A location was pinged.
		L.popup().setLatLng(target).setContent("<b>HERE</b>").openOn(map);
	}
}

function showFromInfo(gi){
	gi.fugitives.map((f) => {fugitives[f] = true}); //Hashset
	if (fugitives[gi.publicID]){
		//We're a fugitive too, add 'self' to the set.
		delete fugitives[gi.publicID];
		fugitives['self'] = true;
		//Hide the ping buttons.
		$('#pingbuttons')[0].style = "display: none;";
	}
	//Set time from this as well.
	timeLeft = gi.options.timings.timer;
	hsTime = gi.options.timings.hstimer;

	if (hsTime <= 0){
		$('#blanker')[0].style="display: none;"; //Remove blanker from visibility.
	}
	else {
		$('#blanker')[0].style="display: block;"; //Show blanker. TODO: Show headstart timer + don't do this for spectators.
	}
	//Set the border
	border = new Border(gi.options.border);
	borderLine = border.render(borderLine, map, window.sessionStorage.getItem("role") === 'spectator'); //Only snap to the border if the player is a spectator.
	//Stores who we are
	us = gi.publicID;
}

function setupWS() {

	gameSocket.on('TIME', (timers) => {
		timeLeft = timers[0];
		hsTime = timers[1];
		if (hsTime <= 0){
			$('#blanker')[0].style="display: none;"; //Remove blanker from visibility.
		}
		else {
			$('#blanker')[0].style="display: block;"; //Show blanker. TODO: Show headstart timer + don't do this for spectators.
		}
	})

	gameSocket.on('OVER', () => {
		document.location = 'gameover.html';
	});

	gameSocket.on('OUT', () => {
		window.sessionStorage.setItem('role', 'spectator');
		document.location.reload();
	});

	gameSocket.on('COMPING', (target, from) => {
		showPing(target, from);
	});

	gameSocket.on('disconnect', (reason) => {
		console.warn(`Disconnct: ${reason}`);
		//Warn the user our connection died.
		var alertBox = $('#alerts')[0];
		alertBox.innerHTML = "";
		displayAlert(alertBox, 'warning', "Lost connection to server. Reconnecting...");
	});

	gameSocket.on('connect', () => {
		var alertBox = $('#alerts')[0];
		alertBox.innerHTML = "";
		displayAlert(alertBox, 'success', "Connected.");
		//"set" the map's zoom to the same to trigger a reload.
		map.setZoom(map.getZoom() - 1);
		map.setZoom(map.getZoom() + 1);
	});

	gameSocket.emit('INFO', (opts) => {
		showFromInfo(opts);
	});

	gameSocket.on('LOC', (lat, lon, acc, who) => {
		onLocationObtained(who, lat, lon, acc);
	});
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
				gameSocket.emit('LOC', l.latitude, l.longitude, l.accuracy);
			}
		});
	}
	//Set up the ability to ping.
	if (window.sessionStorage.getItem("role") === 'hunter'){
		$('#gotthat')[0].onclick = () => sendPing('Y');
		$('#repeat')[0].onclick = () => sendPing('N');
		//Map is more complex: if you click a player's marker, then it'll ping the player, else a location will be pinged.
		map.on('click', (e) => {
			sendPing([e.latlng.lat, e.latlng.lng]);
		})
		//The marker click is handled elsewhere.
	}
	setupWS();
}

function sendPing(target){
	gameSocket.emit('COMPING', target, (accepted) => {
		if (accepted){
			showPing(target, 'self');
		}
	})
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
		//If we're a hunter, make it possible to ping this marker.
		if (window.sessionStorage.getItem("role") === 'hunter'){
			data.marker.on('click', (e) => {
				sendPing(who); //Possible scope issues.
			})
		}
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
	if (lat !== undefined && this.fugitives[who] != this.fugitives['self']){
		//Person is our opposite role and moved, check if they're within buzz range (default is 100m)
		if (new Border({centre: playerLocations['self'].ll, radius: 100}).isInBorder([lat, lng], 0)){
			//In buzz range, play a buzz on the vibrator.
			navigator.vibrate(500);
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

			gameSocket.emit('OUT', () => {
				window.sessionStorage.setItem('role', 'spectator');
				document.location.reload();
			});
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