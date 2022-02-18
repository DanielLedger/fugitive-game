var options = {};

var cfg;

var host = false;

var oldBorder;

var border;

var borderHighlight;

var lastCircle;
var lastPoly;
var lastSmart;

var mapCrosshair;

var map = L.map('bordermap');

var moved = false;

var currentLocationMarker;
var currentLocationAccuracy;

map.on('move', () => {
	if (mapCrosshair === undefined){
		mapCrosshair = L.marker(map.getCenter());
		mapCrosshair.addTo(map);
	}
	else {
		mapCrosshair.setLatLng(map.getCenter());
	}
});

function showGameStatus(giObj){
	host = giObj.host;
	//TODO: Have a nice looking bar here
	document.getElementById("wsping").innerHTML = `<span class='h4'>Websocket last ping: </span><span class='h5'>${Date.now()}</span>`;
	if (giObj.host){
		document.getElementById("ishost").innerHTML = `<span class='h4'>Host: </span><a class='btn btn-success'>Yes</a>`;
		//Show the 'allocate roles' button
		$('#lockroleselection')[0].style = "display: block;";
		//Undisable the "start game" button.
		$('#startgame')[0].disabled = false;
	}
	else {
		document.getElementById("ishost").innerHTML = `<span class='h4'>Host: </span><a class='btn btn-danger'>No</a>`;
		$('#lockroleselection')[0].style = "display: none;";
		//Disable the "start game" button.
		$('#startgame')[0].disabled = true;
	}
	document.getElementById("players").innerHTML = `<span class='h4'>Players: </span><span class='h5'>${giObj.players}</span>`;
	//TODO: Render this in a CASE-SENSITIVE font.
	document.getElementById("code").innerHTML = `<span>Game Code: </span><span>${window.sessionStorage.getItem('GameCode')}</span>`;
	//Show player role
	if (giObj.role !== undefined){
		document.getElementById("role").innerHTML = `<span>Role: </span><span>${giObj.role}</span>`;
		//Write our role to session storage
		window.sessionStorage.setItem("role", giObj.role);
		//Disable the role allocation button if we aren't a spectator (since spectators are allocated immediately).
		if (giObj.role !== 'spectator'){
			$('#lockroleselection')[0].disabled = true;
		}
	}
	else {
		document.getElementById("role").innerHTML = `<span>Requested role: </span><span>${giObj.requestedRole}</span>`;
		//Ensable the role allocation button.
		$('#lockroleselection')[0].disabled = false;
	}

	//Go through every option in the option JSON and, if it exists, set the value of the field. In addition, set readonly on them if we're not host (also validated serverside).
	showOptions(giObj.options);
	
}

function showOptions(gameOpts){
	$('#options')[0].innerHTML = ""; //Wipe the element.
	CONFIG_OPTIONS._goptions.disabled = !host; //If we're not host, we don't need to be able to press the buttons.
	cfg = new ConfigMenu(gameOpts, CONFIG_OPTIONS);
	cfg.addEventListener('change', () => {
		//Get the diff.
		var toSend = cfg.getDiff();
		//Send it?
		gameSocket.emit('OPTION', toSend);
	})
	cfg.display($('#options')[0]);
	border = new Border(gameOpts.border);
	//Set the border explicitly.
	if (!Border.areSame(border, oldBorder)){
		//Render the border.
		borderHighlight = border.render(borderHighlight, map, true);
		if (border.isCircle() && lastCircle === undefined){
			lastCircle = border;
		}
		oldBorder = border;
	}
}

function updateOptions(opt, israw){
	var newVal = document.getElementById(opt).value;
	if (!israw){
		newVal = Number(newVal);
	}
	options[opt] = newVal;
	//Send a JSON of purely what's changed.
	var justChange = {};
	justChange[opt] = newVal;
	gameSocket.emit('OPTION', justChange);
}

gameSocket.emit('INFO', (opts) => {
	showGameStatus(opts);
});

gameSocket.on('REFETCH', () => {
	//Something changed, so reget the player info (not just options)
	//TODO: Just send the info directly (which is surprisngly annoying at the moment)
	gameSocket.emit('INFO', (opts) => {
		showGameStatus(opts);
	});
});

gameSocket.on('UPDATED', (newOpts) => {
	console.debug(newOpts);
	showOptions(newOpts);
});

gameSocket.on('START', () => {
	document.location = 'game.html';
});

$('#lockroleselection')[0].onclick = () => {
	//Disable the button (so it can't be clicked again
	$('#lockroleselection')[0].disabled = true;
	//Send the assign roles message.
	gameSocket.emit("ROLE_ASSIGN");
};

$('#startgame')[0].onclick = () => {
	//Send the assign roles message.
	gameSocket.emit('STARTGAME');
};


//Set up the selection that changes what you see based on which border type you have enabled.
$('#bordersel')[0].onchange = () => {
	var bs = $('#bordersel')[0];
	console.debug(bs);
	for (var i = 0; i < bs.options.length; i++){
		var val = bs.options[i].value;
		console.debug(val);
		if (bs.value === val){
			$(`#${val}-opt`)[0].style = 'display: block;';
		}
		else {
			$(`#${val}-opt`)[0].style = 'display: none;';
		}
	}
	switch (bs.value){
		case 'circle':
			//If our border is undefined, set it to a default one.
			if (lastCircle === undefined){
				var dat = {
					centre: [map.getCenter().lat, map.getCenter().lng],
					radius: 1000
				};
				lastCircle = new Border(dat);
			}
			//Now, send an OPT packet to the server with our new border.
			circleBorderChange(lastCircle.getCentre(), lastCircle.getRadius());
			//Update our view now so we don't get any strange desyncs.
			borderHighlight = lastCircle.render(borderHighlight, map, false);
			break;
		case 'polygon':
			//As with circle, create a default border if we don't have one.
			if (lastPoly === undefined){
				lastPoly = new Border([]);
			}
			sendPolyUpdate(lastPoly.getPoints());
			borderHighlight = lastPoly.render(borderHighlight, map, false);

	}

}


function addPolyPoint(loc){
	//Adds a polygon point.
	var points;
	if (lastPoly === undefined){
		points = [];
	}
	else {
		points = lastPoly.getPoints();
	}
	var pointIndex = points.length;
	points.push(loc);
	sendPolyUpdate(points);
	//Now, actually update the HTML
	//Firstly, re-enable the button to remove a point.
	$('#polypoint-rem')[0].disabled = false;
	//Now we need to add the actual point adjustment stuff.
	var newElem = $('<div>', {id: `polypoint${pointIndex}`});
	var latBox = $('<input>', {id: `polypoint${pointIndex}-lat`, type: 'number', step: 0.0001, value: loc[0]});
	var lonBox = $('<input>', {id: `polypoint${pointIndex}-lon`, type: 'number', step: 0.0001, value: loc[1]});
	latBox.change(() => {
		var i = pointIndex; //Make a local copy because JS scope is weird.
		editPolyPoint(i, [Number($(`#polypoint${i}-lat`)[0].value),Number($(`#polypoint${i}-lon`)[0].value)])
	});
	lonBox.change(() => {
		var i = pointIndex; //Make a local copy because JS scope is weird.
		editPolyPoint(i, [Number($(`#polypoint${i}-lat`)[0].value),Number($(`#polypoint${i}-lon`)[0].value)])
	});
	newElem.append(latBox);
	newElem.append(lonBox);
	$('#pointlist').append(newElem);
}

function editPolyPoint(index, newPoint){
	console.debug(`Editing point ${index} to have value of ${newPoint}.`);
	lastPoly.getPoints()[index] = newPoint;
	sendPolyUpdate(lastPoly.getPoints());
}

function removePolyPoint(){
	//Removes the most recently added polygonal point.
	lastPoly.getPoints().pop();
	var remIndex = lastPoly.getPoints().length; //Since length is max index + 1, this is the bit we just removed.
	if (remIndex === 0){
		//Disable the point remover button.
		$('#polypoint-rem')[0].disabled = true;
	}
	//Send the update.
	sendPolyUpdate(lastPoly.getPoints());
	//Remove the point controls.
	$(`#polypoint${remIndex}`).remove();
}

//Make the addPolyPoint button do something.
$('#polypoint-add')[0].onclick = () => addPolyPoint([map.getCenter().lat, map.getCenter().lng]);
$('#polypoint-rem')[0].onclick = () => removePolyPoint();

function sendPolyUpdate(points){
	var newBorderObj = {
		border: points
	};
	//Send an OPT message to actually update it.
	gameSocket.emit('OPTION', newBorderObj);

	//Also update lastPoly
	lastPoly = new Border(newBorderObj.border);
}

function circleBorderChange(centre, rad){
	var newBorderObj = {
		border: {
			centre: centre,
			radius: rad
		}
	};
	//Send an OPT message to actually update it.
	gameSocket.emit('OPTION', newBorderObj);

	//Now, update 'lastCircle' to be this.
	lastCircle = new Border(newBorderObj.border);

	//Finally, update the various inputs to reflect our changes.
	var bRadCtrl = $('#borderrad')[0];
	if (bRadCtrl !== document.activeElement){ //Let the user edit the thing in peace.
		bRadCtrl.value = lastCircle.getRadius();
		bRadCtrl.disabled = !host;
	}
	var bLatCtrl = $('#circlelat')[0];
	var bLonCtrl = $('#circlelon')[0];
	if (bLatCtrl !== document.activeElement){ 
		bLatCtrl.value = lastCircle.getCentre()[0];
		bLatCtrl.disabled = !host;
	}
	if (bLonCtrl !== document.activeElement){ 
		bLonCtrl.value = lastCircle.getCentre()[1];
		bLonCtrl.disabled = !host;
	}
};

//Set up the border listeners, which work completely differently.
$('#borderrad')[0].onchange = () => circleBorderChange(lastCircle.getCentre(), Number($('#borderrad')[0].value));
$('#circlelat')[0].onchange = () => circleBorderChange([Number($('#circlelat')[0].value),Number($('#circlelon')[0].value)], lastCircle.getRadius());
$('#circlelon')[0].onchange = () => circleBorderChange([Number($('#circlelat')[0].value),Number($('#circlelon')[0].value)], lastCircle.getRadius());

//Map clicked, update centre.
map.on('click', (e) => circleBorderChange([e.latlng.lat, e.latlng.lng], lastCircle.getRadius()));

L.tileLayer(serverIP + "/tile?x={x}&y={y}&z={z}", {
	//Standard settings for mapbox (which we're using for the forseeable future).
	attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
	maxZoom: 17,
	tileSize: 512,
	zoomOffset: -1
}).addTo(map);

map.locate({watch: true}); //Show where the player currently is.

map.on('locationfound', (e) => {
	if (!moved){
		moved = true; //Only do this once, else it'll get annoying.
		map.setView(e.latlng, 15);
	}
	var icon = L.icon({
		iconUrl: 'img/running_hunter.png',
		iconSize: [32, 32]
	});
	if (currentLocationMarker === undefined){
		currentLocationMarker = L.marker(e.latlng, {icon: icon}).addTo(map);
		currentLocationAccuracy = L.circle(e.latlng, {radius: e.accuracy, opacity: 0.2, color: '#0000ff'}).addTo(map);
	}
	else {
		currentLocationMarker.setLatLng(e.latlng);
		currentLocationAccuracy.setLatLng(e.latlng);
	}
})