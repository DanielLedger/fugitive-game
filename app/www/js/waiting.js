var options = {};

var oldBorder;

var border;

var borderHighlight;

var map = L.map('bordermap');

function showGameStatus(json){
	var giObj = JSON.parse(json);
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
		//Update border radius (like how the others are changed). TODO: Accept polygonal borders without dying.
		var bRadCtrl = $('#borderrad')[0];
		if (bRadCtrl !== document.activeElement){ //Let the user edit the thing in peace.
			bRadCtrl.value = giObj.options.border.radius;
			bRadCtrl.disabled = !giObj.host;
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
}

//Set up the border listeners, which work completely differently.
$('#borderrad')[0].onchange = () => {
	var newBorderObj = {
			border: {
				centre: border.getCentre(), //This doesn't change.
				radius: Number($('#borderrad')[0].value)
			}
	};
	//Send an OPT message to actually update it.
	gameSocket.send(`OPT ${JSON.stringify(newBorderObj)}`);
};

//Map clicked, update centre.
map.on('click', (e) => {
	//As above, except sets centre and leaves radius alone.
	var newBorderObj = {
		border: {
			centre: [e.latlng.lat, e.latlng.lng],
			radius: border.getRadius()
		}
	};
	//Send an OPT message to actually update it.
	gameSocket.send(`OPT ${JSON.stringify(newBorderObj)}`);
});

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