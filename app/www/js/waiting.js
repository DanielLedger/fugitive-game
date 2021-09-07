var options = {};

function showGameStatus(json){
	var giObj = JSON.parse(json);
	//TODO: Have a nice looking bar here
	document.getElementById("wsping").innerHTML = `<span class='h4'>Websocket last ping: </span><span class='h5'>${Date.now()}</span>`;
	if (giObj.host){
		document.getElementById("ishost").innerHTML = `<span class='h4'>Host: </span><a class='btn btn-success'>Yes</a>`;
		//Show the 'allocate roles' button
		document.getElementById('lockroleselection').style = "display: block;";
		//Undisable the "start game" button.
		document.getElementById('startgame').disabled = false;
	}
	else {
		document.getElementById("ishost").innerHTML = `<span class='h4'>Host: </span><a class='btn btn-danger'>No</a>`;
		document.getElementById('lockroleselection').style = "display: none;";
		//Disable the "start game" button.
		document.getElementById('startgame').disabled = true;
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
			document.getElementById('lockroleselection').disabled = true;
		}
	}
	else {
		document.getElementById("role").innerHTML = `<span>Requested role: </span><span>${giObj.requestedRole}</span>`;
		//Ensable the role allocation button.
		document.getElementById('lockroleselection').disabled = false;
	}

	//Go through every option in the option JSON and, if it exists, set the value of the field. In addition, set readonly on them if we're not host (also validated serverside).
	options = giObj.options;
	for (var key in giObj.options){
		var elem = document.getElementById(key);
		if (elem === null){
			continue;
		}
		else {
			elem.value = giObj.options[key];
			elem.disabled = !giObj.host;
		}
	}
}

function updateOptions(opt, isnum){
	var newVal = document.getElementById(opt).value;
	if (isnum){
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

document.getElementById('lockroleselection').onclick = () => {
	//Disable the button (so it can't be clicked again
	document.getElementById('lockroleselection').disabled = true;
	//Send the assign roles message.
	gameSocket.send("ROLE_ASSIGN");
};

document.getElementById('startgame').onclick = () => {
	//Send the assign roles message.
	gameSocket.send("START");
};

document.getElementById('sharelink').onclick = () => {
	navigator.clipboard.writeText(document.getElementById('sharelink').value).then(() => alert('Share link copied!'));
};

var code = window.sessionStorage.getItem('GameCode');
var srv = window.sessionStorage.getItem('GameIP');

var dat = encodeURIComponent(JSON.stringify({code: code, ip: srv}));

document.getElementById('sharelink').value = `${window.location.protocol}//${window.location.host}#${dat}`; //Can't be bothered to make my own interchange format, so using JSON. 

//Now, add listeners to all the options.
for (var id of ['timer']){
	document.getElementById(id).oninput = () => updateOptions(id);
}