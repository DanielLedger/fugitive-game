#!/usr/bin/env node

const config = require('config');

const port = config.get("Server.Port");

//Get express and initialise it.
const express = require('express');
const app = express();

//Set up CORS on all requests (since the server can be called from an arbitrary page).
const cors = require('cors');
app.use(cors());

app.use(express.json());

//We should be behind a localhost reverse proxy
app.set('trust proxy', 'loopback');

//Load and setup ExpressWS. This currently won't work with HTTPS.
require('express-ws')(app);

//Load game class.
const Game = require('./game').Game;

//All currently running games
var games = {};

//UUIDs mapped to the game codes, so we don't need to keep sending both.
var uuids = {};

//Ratelimit things: ratelimit is fixed at 1 request to restricted areas every two seconds.
var ipLimits = {};

//Checks if an IP hits against a ratelimit. If allowed, sets the cooldown and returns "true". Otherwise, resets the cooldown and returns false.
function testRatelimit(ip){
	var timeNow = Date.now();
	if ((ipLimits[ip] || 0) < timeNow){
		//Allowed
		ipLimits[ip] = timeNow + 2000;
		return true;
	} 
	
	else {
		//Not allowed, however still reset the timer.
		ipLimits[ip] = timeNow + 2000;
		return false;
	}
}

function removeGame(code, ...uuids){
	delete games[code];
	for (var uuid of uuids){
		delete uuids[code];
	}
}

//Define a game start, game join and game WS route.
app.post("/game/start", (req, resp) => {
	if (!testRatelimit(req.ip)){
		//This IP is ratelimited. Note that this will immediately break if you put the thing behind a reverse proxy.
		resp.sendStatus(429);
		return;
	}
	//Unsurprisingly, a game start route. Creates and initialises a game.
	var code = req.query.code;
	if (code.includes("<") || code.includes(">")){
		//Nice try...
		resp.statusMessage = 'Nice try.';
		resp.status(406).end();
	}
	else if (code === undefined){
		resp.sendStatus(400); //Can't send no code at all.
	}
	else if (games[code] !== undefined){
		//Can't duplicate a code (yes I'm aware of enumeration, fix is TODO)
		resp.sendStatus(409);
	}
	else {
		//Create a game with this code, and reply with the user's access UUID.
		var game = new Game(config, code, removeGame);
		var playerUUID = game.initSession();
		if (playerUUID === null) { //Really shouldn't happen here, but putting this just in case.
			resp.sendStatus(423);
		}
		games[code] = game;
		uuids[playerUUID] = code;
		resp.json(playerUUID);
	}
});

//Join game route, so the code must be correct.
app.post("/game/join", (req, resp) => {
	if (!testRatelimit(req.ip)){
		//This IP is ratelimited. Note that this will immediately break if you put the thing behind a reverse proxy.
		resp.sendStatus(429);
		return;
	}
	//Similar to start game, but check is inverted: code must exist for this to work.
	var code = req.query.code;
	if (code === undefined){
		resp.sendStatus(400); //Can't send no code at all.
	}
	else if (games[code] === undefined){
		resp.sendStatus(404);
	}
	else {
		var sess = games[code].initSession();
		if (sess === null) {
			resp.sendStatus(423);
		}
		uuids[sess] = code;
		resp.json(sess);
	}
});

//Websocket route: create a game socket.
app.ws('/game', (ws, req) => {
	//Verify code and UUID, and if so, make this session the current one.
	var code = req.query.code;
	var uuid = req.query.uuid;
	if (games[code] !== undefined && games[code].transferSession(uuid, ws)){
		//Valid uuid and code, so session has been transferred.
		ws.send("OK");
		//Set up ping every 30 seconds so Nginx doesn't murder us
		ws.pinger = setInterval(() => {
			ws.send('ping');
		},30000);
		ws.on('close', () => {
			clearInterval(ws.pinger);
		});
	}
	else {
		ws.send("INVALID");
		ws.close();
	}
})

//Import additional routes defined in other files.
require('./maproutes').init(config, app);
require('./locationpost').init(app, games, uuids);

//Start a timed task that kills off inactive games every few minutes.
setInterval(() => {
	for (var game of Object.values(games)){
		if (game.isDead()){
			//Kill
			var code = game.code;
			var players = Object.keys(game.players);
			console.info(`Killing inactive game with code ${code}...`);
			removeGame(code, players);
		}
	}
}, 3000); //TODO: Massively increase rate here (but I'm impatient).

if (!config.get('Server.SSL.Enabled')){
	app.listen(port, () => {
		console.log("Application started on port " + port + ".");
	});	
}
else {
	//Set up SSL (since SSL must be provided one way or another, there will be no insecure port).
	const https = require('https');
	const fs = require('fs');
	var key = fs.readFileSync(config.get('Server.SSL.Key'));
	var cert = fs.readFileSync(config.get('Server.SSL.Cert'));
	
	var srv = https.createServer({key: key, cert: cert, ciphers: "DEFAULT:!SSLv2:!RC4:!EXPORT:!LOW:!MEDIUM:!SHA1"}, app);
	srv.listen(port, () => {
		console.log("HTTPS application started on port " + port + ".");
	});	
}