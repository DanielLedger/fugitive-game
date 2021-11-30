var serverIP = window.sessionStorage.getItem('GameIP');

var gameSocket;

if (serverIP === null) {
	//No connected server, redirect to the main page.
	document.location = "index.html"
}

function getWS(){
	//Contact the server and try to get a websocket.
	var code = window.sessionStorage.getItem('GameCode'); //Identifies the game.
	var uuid = window.sessionStorage.getItem('ID'); //Identifies the us.
	
	if (code === null || uuid === null){
		//Not got two bits of required info.
		document.location = "index.html";
	}
	
	//Try and make a websocket connection.
	gameSocket = io(serverIP, {
		auth: {
			game: code,
			player: uuid
		}
	});
}

getWS();
