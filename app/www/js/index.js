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
	$('#makegame')[0].onclick = () => {
		onStartGame();
	};
	
	$('#joingame')[0].onclick = () => {
		onJoinGame();
	};
	
	//Add functionality to the button that generates a random code.
	$('#coderegen')[0].onclick = () => {
		var data = new Uint32Array(1); //Random number
		window.crypto.getRandomValues(data);
		var num = String(data[0]);
		num = num.padStart(9, '0');
		num = num.substring(num.length - 9); //We want a string that is exactly 9 numbers long.
		$('#gamecode')[0].value = `${num.substring(0, 3)}-${num.substring(3,6)}-${num.substring(6,9)}`;
	};

}

function handleOpenURL(uri){
	console.log("Using URI of " + uri);
	var parts = uri.replace('fugitive://', '').split('/');
	$('#serverip')[0].value = parts[0].replaceAll('~', '/');
	$('#gamecode')[0].value = parts[1];
}

function preGameStart(callNext) {
	//Call our "callback" function.
	callNext();
}

function postGameStart() {
	//Will likely redirect to an options page or something (depending on whether we started or joined the game).
	document.location = "roleselect.html";
}

//Two functions, will likely end up fairly similar.
function onStartGame() {
	console.log("Starting game: contacting server...");
	var ip = $('#serverip')[0].value;
	var code = $('#gamecode')[0].value;
	fetch(ip + "/game/start?code=" + code, {method: "POST"}).then((resp) => {
		//Expecting either 409 (shouldn't get this really), 429 or 200.
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
		else if (resp.status === 429) {
			displayAlert($('#alerts')[0], "danger", "Try again in a few seconds!");
		}
		else if (resp.status === 423) {
			displayAlert($('#alerts')[0], "danger", "Game has already started!");
		}
		else if (resp.status === 409) {
			displayAlert($('#alerts')[0], "danger", "Press 'Join a game' or try a different code.");
		}
		else {
			displayAlert($('#alerts')[0], "danger", `Unknown error (${resp.status}: ${resp.statusText}).`);
		}
	})
}

function onJoinGame() {
	console.log("Joining game: contacting server...");
	var ip = $('#serverip')[0].value;
	var code = $('#gamecode')[0].value;
	fetch(ip + "/game/join?code=" + code, {method: "POST"}).then((resp) => {
		//Expecting either 404, 429 or 200.
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
		else if (resp.status === 429) {
			displayAlert($('#alerts')[0], "danger", "Try again in a few seconds!");
		}
		else if (resp.status === 404) {
			displayAlert($('#alerts')[0], "danger", "Press 'start a game' or try a different code.");
		}
		else if (resp.status === 423) {
			displayAlert($('#alerts')[0], "danger", "Game has already started!");
		}
		else {
			displayAlert($('#alerts')[0], "danger", `Unknown error (${resp.status}: ${resp.statusText}).`);
		}
	})
}
