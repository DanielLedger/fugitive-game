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
	var wsIP = serverIP.replace(/https?/, "ws"); //Replace http or https with ws (because it's a wesocket).
	gameSocket = new ReconnectingWebSocket(`${wsIP}/game?code=${code}&uuid=${uuid}`);
	gameSocket.addEventListener('message', (e) => {
		if (e.data === "INVALID"){
			//Something is wrong
			document.location = "index.html";
		}
	});
}

getWS();