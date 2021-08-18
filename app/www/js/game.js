var map;

var playerLocations = {}; //A dict of player public IDs -> {location, accuracy, marker, accuracyCircle}

function setupWS() {
	//Set the gameSocket to render players on the map (this will need changing since other control methods can also be sent).
	gameSocket.addEventListener('message', (m) => {
		var raw = m.data;
		//The protocol is now officially: 'user:lat,lng,acc'
		var splitDat = raw.split(":");
		var user = splitDat[0];
		var infoSplit = splitDat[1].split(",");
		onLocationObtained(user, Number(infoSplit[0]), Number(infoSplit[1]), Number(infoSplit[2]));
	});
	
	//Set up a message for if we drop connection.
	gameSocket.onclose = () => {
		var alertBox = document.getElementById('alerts');
		alertBox.innerHTML = "";
		displayAlert(alertBox, 'warning', "Connection lost! Attempting to reconnect...");
	};
	
	//Set up another message for when we regain connection.
	gameSocket.onopen = () => {
		var alertBox = document.getElementById('alerts');
		alertBox.innerHTML = "";
		displayAlert(alertBox, 'success', "Connected.");
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
	map.on('locationfound', onLocationFound);
	map.locate({watch: true, setView: false, maxZoom: 16, enableHighAccuracy: true});
	setupWS();
}

//Called when any player's location is obtained.
function onLocationObtained(who, lat, lng, accuracy){
	if (playerLocations[who] !== undefined){
		//Just move the already existing data.
		var data = playerLocations[who];
		data.marker.setLatLng([lat, lng]);
		data.circle.setLatLng([lat, lng]);
		data.circle.setRadius(accuracy);
		//Update the actual data.
		data.ll = [lat, lng];
		data.acc = accuracy;
		playerLocations[who] = data; //Set back over the top of the old one.
	}
	else {
		//Need to create the data from scratch.
		var data = {};
		data.marker = L.marker([lat, lng]).addTo(map);
		data.circle = L.circle([lat, lng], {radius: accuracy, opacity: 0.2}).addTo(map);
		//Add raw data
		data.ll = [lat, lng];
		data.acc = accuracy;
		playerLocations[who] = data; //Set this data in our list.
		if (who === 'self'){
			//This is us, and we don't currently have a location, so set an initial view.
			map.setView([lat, lng], 16);
		}
	}
}

function onLocationFound(e) {
    var radius = e.accuracy;
	//Call our on location found method thing.
	onLocationObtained('self', e.latlng.lat, e.latlng.lng, radius);
	//Send this location to all other instances via the websocket.
	gameSocket.send(`${e.latlng.lat},${e.latlng.lng},${radius}`);
}

window.setTimeout(setupMap, 200); //Set a small timeout to allow everything to load.