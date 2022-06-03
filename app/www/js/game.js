var map;

var attemptingReconnect = false;

var lastPing = Date.now();

var fugitives = {};

var us;

var playerLocations = {}; //A dict of player public IDs -> {location, accuracy, marker, accuracyCircle}


var hsTime = 0; //How much of a headstart we have to sit through.
var escapeReveal = 0; //Time until the escape is revealed.
var escapeOpen = 0; //Time until the escape opens.
var escapeClose = 0; //Time until the escape closes.

var timer = 0;

var jammerLeft = 0;

var border;
var borderLine;

var escapeRad;
var escapeMarker;

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

function onOutButton(){
	if (confirm("Are you sure you meant to press this button?")){
		//Player is out.
		//Cancel background location task.
		getGeolocationService().stop();

		getSocket().then((s) => {
			s.emit('OUT', () => {
				window.sessionStorage.setItem('role', 'spectator');
				document.location.reload();
			});
		});
	}
}

function onJammer(){
	getSocket().then((s) => {
		s.emit('JAMMER', () => {
			//Callback is sent once the jamming ends (after 60 seconds).
			$('#jammer')[0].innerText = "Jammer used.";
		});
	});
	//Add a timer to the button
	jammerLeft = 60;
	window.setInterval(() => {
		if (jammerLeft == 0 ){
			//Ended clientside, however we can't say "ended" yet, so just wait at 0s.
		}
		else {
			jammerLeft--;
			$('#jammer')[0].innerText = `Jamming: ${jammerLeft}s`;
		}
	}, 1000);
	//Immediately disable the button
	$('#jammer')[0].disabled = true;
}

function configureUI(){
	//Configures the UI based on the player's set role. Everything that can be hidden starts hidden
	if (window.sessionStorage.getItem("role") === 'fugitive'){
		//Show the 'I got caught' button and the jammer ability
		$('#fugitivebuttons')[0].style = "display: block;";

		//Bind the events to the buttons.
		$('#caught')[0].onclick = onOutButton;
		$('#jammer')[0].onclick = onJammer;
	}
	else if (window.sessionStorage.getItem("role") === 'hunter'){
		//Show the ping menu.
		$('#pingbuttons')[0].style = "display: block;";

		//Bind events.
		$('#gotthat')[0].onclick = () => sendPing('Y');
		$('#repeat')[0].onclick = () => sendPing('N');
		//Map is more complex: if you click a player's marker, then it'll ping the player, else a location will be pinged.
		//Markers are not handled here.
		map.on('click', (e) => {
			sendPing([e.latlng.lat, e.latlng.lng]);
		});
	}
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
	}
	//Set time from this as well.
	escapeOpen = gi.options.timings.timer;
	hsTime = gi.options.timings.hstimer;
	escapeClose = -gi.options.escapes.escapeWindow;
	escapeReveal = fugitives['self'] ? gi.options.escapes.revealedFugitive : gi.options.escapes.revealedHunter;

	//The single timer which we decrement throughout the course of the game.
	timer = escapeOpen + hsTime;

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



function setupMap() {
	map = L.map('map');
	L.tileLayer(serverIP + "/tile?x={x}&y={y}&z={z}", {
		//Standard settings for mapbox (which we're using for the forseeable future).
		attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    	maxZoom: 20,
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
				getSocket().then((s) => {s.emit('LOC', l.latitude, l.longitude, l.accuracy);});
			}
		});
	}
	setupWS();
	configureUI();
}

async function sendPing(target){
	var gs = await getSocket();
	gs.emit('COMPING', target, (accepted) => {
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
	var data;
	if (playerLocations[who] !== undefined){
		//Just move the already existing data.
		data = playerLocations[who];
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
		data = {};
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
	timer--; //Decrement the timer
	//Escape just closed, do nothing.
	if (timer <= escapeClose){
		return;
	}
	//Headstart blanker
	if (timer <= escapeOpen || window.sessionStorage.getItem("role") === 'fugitive'){
		$('#blanker')[0].style="display: none;"; //Remove blanker from visibility.
	}
	else {
		$('#blanker')[0].style="display: block;"; //Show blanker. TODO: Show headstart timer + don't do this for spectators.
		$('#headstarttimer')[0].innerText = `Headstart: ${calculateTimeRep(timer - escapeOpen)}`
	}
	//Calculate the time until the three big events. If less than zero, cap at zero.
	var timeUntilReveal = Math.max(0, timer - escapeReveal);
	var timeUntilOpen = Math.max(0, timer);
	var timeUntilClose = Math.max(0, timer - escapeClose);
	//Now, make a nice stringrep of the timers.
	$('#untilreveal')[0].innerText = `Escape revealed in: ${calculateTimeRep(timeUntilReveal)}`;
	$('#untilopen')[0].innerText = `Escape opens in: ${calculateTimeRep(timeUntilOpen)}`;
	$('#untilclose')[0].innerText = `Escape closes in: ${calculateTimeRep(timeUntilClose)}`;
}, 1000);



//When we leave this page, stop location watching.
window.onbeforeunload = () => {
	if (BackgroundGeolocation !== undefined){
		BackgroundGeolocation.stop(); //Stop the background task when the game is unloaded.
	}
}