var map;

var playerLocations = {}; //A dict of player public IDs -> {location, accuracy, marker, accuracyCircle}

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
	map.locate({watch: true, setView: true, maxZoom: 16});
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
	}
}

function onLocationFound(e) {
    var radius = e.accuracy;
	//Call our on location found method thing.
	onLocationObtained('self', e.latlng.lat, e.latlng.lng, radius);
}

window.setTimeout(setupMap, 200); //Set a small timeout to allow everything to load.