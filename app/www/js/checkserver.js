const el = () => {};

async function createSocket(onPing = el, onNetFail = el, onRecStart = el, onRecSuccess = el, onRecFail = el){
	//Resolve returns the object. Reject returns a JSON of why and if we should redirect out of the game.
	var toExec = (resolve, reject) => {
		if (window.location.hash === "#nosrv"){
			reject({
				err: 'Explicitly requested no connection.',
				redirect: false
			});
		}

		//Get the data from our session storage
		var serverIP = getServerIP();
		var code = window.sessionStorage.getItem('GameCode'); //Identifies the game.
		var uuid = window.sessionStorage.getItem('ID'); //Identifies the us.
		
		if (serverIP === null || code === null || uuid === null){
			//Not got three bits of required info, reject and request a redirect.
			reject({
				err: 'Not got required information.',
				redirect: true
			});
		}

		gameSocket = io(serverIP, {
			auth: {
				game: code,
				player: uuid
			},
			autoConnect: false
		});
		
		//Bind our requested events.
		gameSocket.on('disconnect', (reason) => {
			console.warn(`Disconnct: ${reason}`);
			if (reason === "io server disconnect"){
				//We got server disconnected, don't reconnect and redirect to index. This is always the correct behaviour.
				document.location = "index.html";
			}
			else if (["transport close", "ping timeout", "transport error"].includes(reason)) {
				//Fire the netFail callback
				onNetFail(reason);
			}
		});
		gameSocket.on('error', (e) => {
			reject({
				err: e.message,
				redirect: false
			});
		});
		gameSocket.on('connect_error', (e) => {
			reject({
				err: e.message,
				redirect: false
			});
		});
		//Fire the reconnect callbacks
		gameSocket.on('reconnect_attempt', onRecStart);
		gameSocket.on('reconnect', onRecSuccess);
		gameSocket.on('reconnect_error', onRecFail);

		//Fire the onPing callback
		gameSocket.on('ping', onPing);

		//Finally, bind the 'connection success' to the resolve function, and connect.
		gameSocket.on('connect', () => {resolve(gameSocket);});

		gameSocket.connect();
	};
	gameSockPromise = new Promise(toExec);
	return gameSockPromise;
}

async function getSocket() {
	if (gameSockPromise === null){
		return Promise.reject("Need to call 'createSocket' first!");
	}
	else if (gameSocket !== null && gameSocket.connected){
		//Already connected, just return the socket.
		return gameSocket;
	}
	else {
		//Return the already created promise (as we should be waiting for a connection).
		return gameSockPromise;
	}
	
}

function getServerIP(){
	return window.sessionStorage.getItem('GameIP');
}

var gameSocket;
var gameSockPromise;