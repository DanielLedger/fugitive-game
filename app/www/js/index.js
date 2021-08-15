/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

// Wait for the deviceready event before using any of Cordova's device APIs.
// See https://cordova.apache.org/docs/en/latest/cordova/events/events.html#deviceready
document.addEventListener('deviceready', onDeviceReady, false);

function onDeviceReady() {
    // Cordova is now initialized. Have fun!

    console.log('Running cordova-' + cordova.platformId + '@' + cordova.version);

	//Add functionality to the join game and start game buttons.
	document.getElementById('makegame').onclick = () => {
		onStartGame();
	};
	
	document.getElementById('joingame').onclick = () => {
		onJoinGame();
	};
	
	//Add functionality to the button that generates a random code.
	document.getElementById('coderegen').onclick = () => {
		var data = new Uint8Array(9); //Using 9 bytes because that encodes into base64 without padding.
		window.crypto.getRandomValues(data);
		var str = "";
		data.forEach((i) => {str += String.fromCharCode(i)});
		document.getElementById('gamecode').value = btoa(str);
	};
}

function preGameStart(callNext) {
	//Save the entered IP address to session storage.
	window.sessionStorage.setItem("GameIP", );
	//Call our "callback" function.
	callNext();
}

function postGameStart() {
	//Will likely redirect to an options page or something (depending on whether we started or joined the game).
	document.location = "game.html";
}

//Two functions, will likely end up fairly similar.
function onStartGame() {
	console.log("Starting game: contacting server...");
	var ip = document.getElementById('serverip').value;
	var code = document.getElementById('gamecode').value;
	fetch(ip + "/game/start?code=" + code, {method: "POST"}).then((resp) => {
		//Expecting either 409 (shouldn't get this really) or 200.
		if (resp.status === 200){
			console.log("Got okay from server, saving data and redirecting...");
			//Success!
			//Now have a UUID, so save everything to sessionstorage
			window.sessionStorage.setItem("GameIP", ip);
			window.sessionStorage.setItem("GameCode", code);
			resp.json().then((dat) => {
				window.sessionStorage.setItem("ID", dat);
				postGameStart();
			})
		}
	})
}

function onJoinGame() {
	console.log("Joining game: contacting server...");
	var ip = document.getElementById('serverip').value;
	var code = document.getElementById('gamecode').value;
	fetch(ip + "/game/join?code=" + code, {method: "POST"}).then((resp) => {
		//Expecting either 404 or 200.
		if (resp.status === 200){
			console.log("Got okay from server, saving data and redirecting...");
			//Success!
			//Now have a UUID, so save everything to sessionstorage
			window.sessionStorage.setItem("GameIP", ip);
			window.sessionStorage.setItem("GameCode", code);
			resp.json().then((dat) => {
				window.sessionStorage.setItem("ID", dat);
				postGameStart();
			})
		}
	})
}
