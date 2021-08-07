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
		preGameStart(onStartGame);
	};
	
	document.getElementById('joingame').onclick = () => {
		preGameStart(onJoinGame);
	};
}

function preGameStart(callNext) {
	//Save the entered IP address to session storage.
	window.sessionStorage.setItem("GameIP", document.getElementById('serverip').value);
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
}

function onJoinGame() {
	console.log("Joining game: contacting server...");
}
