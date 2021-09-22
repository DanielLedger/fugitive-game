var options = {};

var host = false;

var oldBorder;

var border;

var borderHighlight;

var lastCircle;
var lastPoly;
var lastSmart;

var map = L.map('bordermap');

function showGameStatus(json){
	var giObj = JSON.parse(json);
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
	options = giObj.options;
	for (var key in giObj.options){
		var elem = document.getElementById(key);
		if (elem === null){
			continue;
		}
		else if (elem === document.activeElement){
			continue; //Don't edit the element the user has focussed, that's just annoying.
		}
		else {
			elem.value = giObj.options[key];
			elem.disabled = !giObj.host;
		}
	}
	border = new Border(giObj.options.border);
	//Set the border explicitly.
	if (!Border.areSame(border, oldBorder)){
		//Render the border.
		borderHighlight = border.render(borderHighlight, map, true);
		if (border.isCircle() && lastCircle === undefined){
			lastCircle = border;
		}
		/*//Update border radius (like how the others are changed). TODO: Accept polygonal borders without dying.
		var bRadCtrl = $('#borderrad')[0];
		if (bRadCtrl !== document.activeElement){ //Let the user edit the thing in peace.
			bRadCtrl.value = giObj.options.border.radius;
			bRadCtrl.disabled = !giObj.host;
		}*/
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
	gameSocket.send(`OPT ${JSON.stringify(justChange)}`);
}

gameSocket.addEventListener('message', (m) => {
	if (m.data.startsWith('INFO')){
		var json = m.data.split(' ')[1];
		showGameStatus(json);
	}
	else if (m.data === "START"){
		//We're starting. Good luck!
		document.location = "game.html";
	}
});

window.setInterval(() => {
	gameSocket.send("GAMEINFO");
}, 2000);

$('#lockroleselection')[0].onclick = () => {
	//Disable the button (so it can't be clicked again
	$('#lockroleselection')[0].disabled = true;
	//Send the assign roles message.
	gameSocket.send("ROLE_ASSIGN");
};

$('#startgame')[0].onclick = () => {
	//Send the assign roles message.
	gameSocket.send("START");
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
			borderHighlight = lastCircle.render(borderHighlight, map, true);
			break;
		case 'polygon':
			//As with circle, create a default border if we don't have one.
			if (lastPoly === undefined){
				lastPoly = new Border([]);
			}
			sendPolyUpdate(lastPoly.getPoints());
			borderHighlight = lastPoly.render(borderHighlight, map, true);

	}

}

function addPolyPoint(loc){
	//Adds a polygon point.
	var pointIndex = lastPoly.getPoints().length;
	lastPoly.getPoints().push(loc);
	sendPolyUpdate(lastPoly.getPoints());
	//Now, actually update the HTML
	//Firstly, re-enable the button to remove a point.
	$('#polypoint-rem')[0].disabled = false;
	//Now we need to add the actual point adjustment stuff.
	var newElem = $('<div>', {id: `polypoint${pointIndex}`});
	var latBox = $('<input>', {id: `polypoint${pointIndex}-lat`, type: 'number', step: 0.0001, value: loc[0]});
	var lonBox = $('<input>', {id: `polypoint${pointIndex}-lon`, type: 'number', step: 0.0001, value: loc[1]});
	//TODO: Event listeners on these.
	newElem.append(latBox);
	newElem.append(lonBox);
	$('#pointlist').append(newElem);
}

//Make the addPolyPoint button do something.
$('#polypoint-add')[0].onclick = () => addPolyPoint([map.getCenter().lat, map.getCenter().lng]);

function sendPolyUpdate(points){
	var newBorderObj = {
		border: points
	};
	//Send an OPT message to actually update it.
	gameSocket.send(`OPT ${JSON.stringify(newBorderObj)}`);

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
	gameSocket.send(`OPT ${JSON.stringify(newBorderObj)}`);

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
	maxZoom: 14,
	tileSize: 512,
	zoomOffset: -1
}).addTo(map);

map.locate({setView: true}); //Show where the player currently is.

$('#sharelink')[0].onclick = () => {
	navigator.clipboard.writeText($('#sharelink')[0].value).then(() => alert('Share link copied!'));
};

var code = window.sessionStorage.getItem('GameCode');
var srv = window.sessionStorage.getItem('GameIP');

var dat = JSON.stringify({code: code, ip: srv});

//$('#sharelink')[0].value = `${window.location.protocol}//${window.location.host}#${dat}`; //Can't be bothered to make my own interchange format, so using JSON. 

//Now, add listeners to all the options.
for (var id of ['timer', 'hstimer', 'hunterLocDelay', 'fugitiveLocDelay']){
	document.getElementById(id).oninput = (e) => {
		updateOptions(e.target.id, false);
	}
}