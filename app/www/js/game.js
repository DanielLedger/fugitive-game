var map;

var accuracyCircle;

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


//Copy-pasted from Leaflet example code, then modified to suit me.
function onLocationFound(e) {
	console.log(e);
    var radius = e.accuracy;
	//Delete old accuracy circle
	if (accuracyCircle !== undefined) {
		map.removeLayer(accuracyCircle);
	}
	//Create new one.
    accuracyCircle = L.circle(e.latlng, radius).addTo(map);
}

window.setTimeout(setupMap, 200); //Set a small timeout to allow everything to load.