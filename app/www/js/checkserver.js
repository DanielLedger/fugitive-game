var serverIP = window.sessionStorage.getItem('GameIP');

var gameSocket;

if (serverIP === null) {
	//No connected server, redirect to the main page.
	document.location = "index.html"
}

function refreshWS(){
	//Contact the server and try to get a websocket.
	var code = window.sessionStorage.getItem('GameCode'); //Identifies the game.
	var uuid = window.sessionStorage.getItem('ID'); //Identifies the us.
	
	if (code === null || uuid === null){
		//Not got two bits of required info.
		document.location = "index.html";
	}
	
	//Try and make a websocket connection.
	var wsIP = serverIP.replace(/https?/, "ws"); //Replace http or https with ws (because it's a wesocket).
	gameSocket = new WebSocket(`${wsIP}/game?code=${code}&uuid=${uuid}`);
	gameSocket.onclose = () => {
		//If closed by not us, that probably means our credentials are wrong.
		document.location = "index.html";
	};
}

//Call refresh once (so it's not really refreshing so much as initialising).
refreshWS();