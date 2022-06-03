var map;

var playerLocations = {}; //A dict of player public IDs -> {location, accuracy, marker, accuracyCircle}

function setupMap() {
	map = L.map('map');
	L.tileLayer(getServerIP() + "/tile?x={x}&y={y}&z={z}", {
		//Standard settings for mapbox (which we're using for the forseeable future).
		attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    	maxZoom: 18,
    	tileSize: 512,
		zoomOffset: -1
	}).addTo(map);
    //Temporary, just to try and get the damn thing to work.
    if (cordova.platformId !== 'browser'){
        BackgroundGeolocation.configure({
            url: getServerIP() + "/loc",
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
	setupWS();
}

//Called when any player's location is obtained.
function onLocationObtained(who, lat, lng, accuracy){
	//Needed regardless.
	var icon = L.icon({
		iconUrl: 'img/running_hunter.png',
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
			data.circle.setStyle({opacity: 0.2, color: '#0000ff'});
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
		//Fairly alarming colours, but those can be changed. Marker will also change.
		data.circle = L.circle([lat, lng], {radius: accuracy, opacity: 0.2, color: '#0000ff'}).addTo(map);
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

//When we leave this page, stop location watching.
window.onbeforeunload = () => {
	if (BackgroundGeolocation !== undefined){
		BackgroundGeolocation.stop(); //Stop the background task when the game is unloaded.
	}
}