const uuid = require('uuid');
const shuf = require('./shuffle');

const states = {
	LOBBY: 'Lobby', //Not started the game yet.
	PLAYING: 'Playing', //In-game.
	POST: 'Post-game' //After the game, so we can show people a map with live locations on it.
}

const roles = {
	FUGITIVE: 'fugitive',
	HUNTER: 'hunter',
	SPECTATOR: 'spectator',
	POSTGAME: 'postgame'
}

class Game {
	
	constructor(config, code, rmg){
		this.removeGame = rmg;
		this.players = {}; //Maintains a list of unique ids -> websocket sessions.
		this.publicIDS = {}; //A list of unique IDs -> public IDs that we send to the end clients (given that the ids here are also connection secrets).
		this.roles = {}; //The roles people have.
		this.requestedRoles = {}; //The roles people are requesting.
		this.gameOpen = true;
		this.roleLimits = config.get('RoleLimits');
		this.host = undefined; //Only the host can do important things like setting the boundary or starting the game.
		this.playing = false; //We need to know if we're playing or not.

		//We need to know our own code
		this.code = code;

		//Our state is important, since it tells the server terminator whether we should exist or not.
		this.state = states.LOBBY;

		//When we got our last websocket message.
		this.lastWSMsg = Date.now();

		//If it's a time, it's in seconds.
		this.options = {
			timer: 600,
			hstimer: 30,
			hunterLocDelay: 3, 
			fugitiveLocDelay: 30,
			border: [
				[50.919, -1.4151],
				[50.932, -1.4112],
				[50.928, -1.4026]
			]
		};
		this.lastSentLoc = {}; //When everyone's location was last broadcast.
	}
	
	isDead(){
		if (this.state === states.PLAYING){
			//Don't kill live games, since people are running around who knows where and possibly not getting great signal.
			return false;
		}
		//Else, if the last message was more than x seconds ago, it's probaly eligible for deletion.
		return this.lastWSMsg + (1000*60) < Date.now(); //For the actual server, this'll be something like 6-12 hours.
	}

	initSession(){
		if (!this.gameOpen){
			//Roles have already been assigned, so don't let the person in.
			return null;
		}
		//Creates a session for a new player. Returns them a unique ID for their session.
		var newID = uuid.v4();
		//Since they don't currently have a socket, add them as 'null' (NOT undefined, since that means "session isn't valid")
		this.players[newID] = null;
		//Generate them a new public ID.
		this.publicIDS[newID] = uuid.v4();
		return newID;
	}
	
	transferSession(playerID, newSession){
		//Deletes this player's old session and makes the 'newSession' their current one.
		if (this.players[playerID] === undefined){
			//Player is not registered, do not transfer them a session and return false.
			return false;
		}
		else {
			//Player's current session is now the new one.
			this.players[playerID] = newSession;
			newSession.playerID = playerID; //This may or may not work.
			var currentGame = this; //Required due to scope problems.
			//Set up the new session with a handler.
			var ws = newSession;
			newSession.onmessage = (msg) => {
				currentGame.handleWSMessage(ws, msg, currentGame);
			};
			//Also set it up with a close handler.
			newSession.onclose = () => {
				currentGame.closeSession(ws); //This is why we need a 'currentGame' reference: 'this' refers to the websocket.
			};
			//If host is undefined, this player is now the host.
			if (this.host === undefined) {
				this.host = playerID;
			}
			return true;
		}
	}
	
	closeSession(sess){
		//Renders a websocket session invalid.
		sess.playerID = undefined;
	}
	
	postLocation(uuid, str, game){
		//Acts like this string was sent in by this person (when it was sent in via a POST request)
		game.handleWSMessage({playerID: uuid}, {data: str}, game); //The advantages of dynamic typing.
	}
	
	playerOut(id) {
		//Mark a player as out of the game. This turns them into a spectator immediately. If there are no fugitives left, the game ends in a hunter victory (TODO).
		//First though, send a mock location of 'null,null,null' to get the location marker removed from the map (possibly leaving behind a ghostly final marker).
		var msg = this.publicIDS[id] + ":null,null,null";
		for (var session of Object.keys(this.players)){
			var ws = this.players[session];
			ws.send(msg);
		}
		//Now, they become a spectator. Their live location feed is no longer required.
		this.roles[id] = roles.SPECTATOR;
		var fugitivesLeft = Object.keys(this.roles).filter((v) => {return this.roles[v] === roles.FUGITIVE}).length;
		var huntersLeft = Object.keys(this.roles).filter((v) => {return this.roles[v] === roles.HUNTER}).length;
		if (fugitivesLeft === 0 || huntersLeft === 0){
			//If all of one role are gone, then it's game over.
			this.endGame();
		}
	}

	endGame(){
		//Ends the game and enters post-game (which shows navigation maps on the end screen so people can actually meet up again without just having to call each other and yell).
		console.log(`Game with code ${this.code} has ended.`);
		for (var session of Object.keys(this.players)){
			var ws = this.players[session];
			ws.send("OVER");
			//Set everyone's role to a special post-game role
			this.roles[session] = roles.POSTGAME;
		}
		this.state = states.POST;
		//Set it so that people can join the game again.
		this.gameOpen = true;
	}

	//Borders need to be handled serverside because background issues.
	isInBorder(centre, radius){
		if (this.options.border.centre !== undefined){
			console.log("circular border.");
			//Check if the point is in the radius first. Because maths, we need to use the Haversine formula to calculate the distance in metres.
			var earthRad = 6731e3;
			var latRad1 = centre[0] * Math.PI * 1/180;
			var latRad2 = this.options.border.centre[0] * Math.PI * 1/180;
			var latRadDelta = (centre[0] - this.options.border.centre[0]) * Math.PI * 1/180;
			var lonRadDelta = (centre[1] - this.options.border.centre[1]) * Math.PI * 1/180;

			var a = Math.pow(Math.sin(latRadDelta/2), 2) +
				Math.cos(latRad1) * Math.cos(latRad2) * 
				Math.pow(Math.sin(lonRadDelta), 2);

			var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

			var distFromCentre = earthRad * c;

			var maxAllowedDist = this.options.border.radius + radius; //If the point is more than this away, the circles cannot touch.
			console.log(`Distance: ${distFromCentre}, Maximum permitted distance: ${maxAllowedDist}`);
			return distFromCentre <= maxAllowedDist;
        }
        else {
			console.log("poly border.");
			//Test for whether or not you're in a polygon: draw a line from point to infinity (will draw due north for simplicity)
			//If we cross the polygon an odd number of times in total, we're inside it. Else, we're outside.
			//I think playing near the north pole will break this, so don't do that.
			var crosses = 0;
			for (var i in this.options.border){
				//For each number
				var p1 = this.options.border[i];
				var p2 = this.options.border[(i+1) % this.options.border.length];
				if (this.doesLineIntersect(p1, p2, centre[1], centre[0])){
					crosses++;
				}
			}
			//Return true if the number of crossings is odd.
			console.debug(`Lat: ${centre[0]}, Lon: ${centre[1]}, Crosses: ${crosses}`);
			return crosses & 1 == 1;
        }
	}

	doesLineIntersect(llMin, llMax, lonTest, latitudeBase){
        //Tests if a line between two points intersects this specific line of longitude, at a point above the specified latitude.
        var lonMin = llMin[1];
        var lonMax = llMax[1];
        //If both points are on the same side of lonTest, they can't intersect.
        if ((lonMin < lonTest && lonMax < lonTest) || (lonMin > lonTest && lonMax > lonTest)){
            return false;
        }
        else {
            //Make sure the intersect is above 'latitudeBase' (a.k.a the intersect latitude > latitudeBase)
            /*y - y1 = m(x - x1)
            Therefore, y = m(x - x1) + y1
            Latitude is y because that works from an intuitive perspective.
            */
           var m = (llMin[0] - llMax[0])/(llMin[1] - llMax[1]);
           var y = m*(lonTest - llMin[1]) + llMin[0];
           return y > latitudeBase;
        }
    }

	//The big method which powers a lot of the core functionailty of the game: this method controls the handling of the incoming websocket messages.
	handleWSMessage(sess, msg, game){
		console.log("WS message from " + sess.playerID + ": " + msg.data);
		try {
			//Log the fact that we just got a websocket message.
			this.lastWSMsg = Date.now();
			if (msg.data.startsWith('SELECT')){
				//Role select message
				var role = msg.data.split(" ")[1];
				switch (role) {
					case "spectator":
						//Add this user directly to the roles object (since spectators can't be allocated a non-spectator role).
						this.roles[sess.playerID] = roles.SPECTATOR;
						break;
					case "fugitive":
					case "either":
					case "hunter":
						this.requestedRoles[sess.playerID] = role;
						break;
					default:
						sess.send("INVALID_ROLE");
						return;
				}
				//If we get to here, got a valid role sent to us.
				sess.send("ROLE_OK");
				return;
			}
			else if (msg.data === "GAMEINFO"){
				//Client is expecting JSON of gameinfo.
				var gi = {};
				gi.players = Object.keys(this.players).length; //Doesn't appear to be a better way of doing this.
				gi.host = (sess.playerID === this.host);
				gi.requestedRole = this.requestedRoles[sess.playerID];
				gi.role = this.roles[sess.playerID];
				gi.options = this.options;
				//The client needs to know who's a fugitive and who's a hunter, so send the fugitives (by process of elimination, non-fugitives are hunters if we get their location).
				gi.fugitives = Object.keys(this.roles).filter((v) => {return this.roles[v] === roles.FUGITIVE}).map((v) => {return this.publicIDS[v]});
				gi.publicID = this.publicIDS[sess.playerID]; //Client needs to know their public ID.
				sess.send("INFO " + JSON.stringify(gi));
				return;
			}
			else if (msg.data.startsWith("OPT")){
				if (sess.playerID !== this.host){
					return; //Only the host may change stuff.
				}
				var changed = JSON.parse(msg.data.split(' ')[1]);
				for (var key of Object.keys(changed)){
					if (this.options[key] !== undefined && typeof this.options[key] === typeof changed[key]){
						//Don't allow additional options to be set, unless they exist already and are the correct type.
						this.options[key] = changed[key];
					}
				}
			}
			else if (msg.data === "ROLE_ASSIGN"){
				//Assigns everyone a role, chosen based on their preference.
				//Host only, and closes the game once run.
				if (sess.playerID !== this.host || !this.gameOpen){
					return; //Can't use this.
				}
				var fugitiveReq = [];
				var hunterReq = [];
				var dontCare = [];
				for (var pair of Object.entries(this.requestedRoles)){
					if (pair[1] === roles.FUGITIVE){
						fugitiveReq.push(pair[0]);
					}
					else if (pair[1] === roles.HUNTER){
						hunterReq.push(pair[0]);
					}
					else {
						dontCare.push(pair[0]);
					}
				}
				//Shuffles the request lists since, turns out it was biased very badly.
				shuf.shuffle(fugitiveReq);
				shuf.shuffle(hunterReq);
				var fugitives = [];
				var hunters = [];
				console.log(this.roleLimits)
				//Put fugitive requesters on the fugitive pile.
				while (fugitiveReq.length > 0){
					if (fugitives.length >= this.roleLimits.Fugitive){
						//Will this work? No clue, hopefully. If the limit is undefined, this will be false.
						break;
					}
					var f = fugitiveReq.pop();
					fugitives.push(f);
				}
				//Same code for the hunters.
				while (hunterReq.length > 0){
					if (hunters.length >= this.roleLimits.Hunter){
						//Will this work? No clue, hopefully. If the limit is undefined, this will be false.
						break;
					}
					var f = hunterReq.pop();
					hunters.push(f);
				}
				//Merge the two other lists into the "don't care" pile, which is technically wrong (they expressed an opinion) but works.
				dontCare.push(...fugitiveReq);
				dontCare.push(...hunterReq);
				//Shuffle this, just in case.
				shuf.shuffle(dontCare);
				for (var person of dontCare){
					if (!(fugitives.length >= this.roleLimits.Fugitive)){
						//Add this person as a fugitive
						fugitives.push(person);
					}
					else if (!(hunters.length >= this.roleLimits.Hunter)){
						//Add this person as a hunter
						hunters.push(person);
					}
					else {
						//Game is full, add them as spectator.
						this.roles[person] = roles.SPECTATOR;
					}
				}
				//Finally, add the fugitive list and hunter list of roles to the 'roles' object.
				for (var fugitive of fugitives){
					this.roles[fugitive] = roles.FUGITIVE;
				}
				for (var hunter of hunters){
					this.roles[hunter] = roles.HUNTER;
				}
				//Close game off.
				this.gameOpen = false;
				return;
			}
			else if (msg.data === "START"){
				//Only the host can start the game, and the roles must've been assigned (so the game must be closed)
				if (sess.playerID !== this.host || this.gameOpen){
					return; //Can't use this.
				}
				this.playing = true; //We're now officially starting.
				for (var ws of Object.values(game.players)){
					ws.send("START");
				}
				this.state = states.PLAYING;
				//Set up a repeating task to decrement the timer by one second, every second.
				this.timerTask = setInterval(() => {
					//Decrement the headstart timer first.
					if (this.options.hstimer > 0){
						this.options.hstimer--;
					}
					else {
						this.options.timer--;
					}
					//To avoid spam, only send updates every 30 seconds or so (this'll probably be the minimum increment for the timer anyway at game start).
					if ((this.options.timer + this.options.hstimer) % 30 === 0){
						for (var ws of Object.values(game.players)){
							ws.send(`TIME ${this.options.timer} ${this.options.hstimer}`);
						}
					}
					if (this.options.timer <= 0){
						//Time has expired, game ends.
						clearInterval(this.timerTask);
						this.endGame();
					}
				}, 1000);
			}
			else if (msg.data === 'pong'){
				//Keepalive ping-pong, do nothing.
				return;
			}
			else if (msg.data === 'OUT'){
				//Player was caught.
				this.playerOut(sess.playerID);
			}
			else {
				//This is the location feed, send it to everyone else.
				var toSendOn = game.publicIDS[sess.playerID] + ":" + msg.data;
				//Do a quick boundary check.
				var info = msg.data.split(',');
				console.log(info);
				var ll = [Number(info[0]), Number(info[1])];
				var acc = Number(info[2]);
				if (!this.isInBorder(ll, acc)){
					//*oops*
					this.playerOut(sess.playerID); //This won't sync correctly at the moment.
				}
				var now = Date.now();
				var lastSent = this.lastSentLoc[sess.playerID] || 0;
				var nextSend = lastSent;
				//Multiply by 1000 because delays are in seconds, but last sent is ms.
				if (this.roles[sess.playerID] === roles.HUNTER){
					nextSend += (this.options.hunterLocDelay * 1000);
				}
				else {
					//Only other role capable of sending location is fugitive.
					nextSend += (this.options.fugitiveLocDelay * 1000);
				}
				var broadcast = ((this.options.hstimer <= 0) && nextSend <= now);
				if (broadcast){
					//Update the last send time to be now.
					this.lastSentLoc[sess.playerID] = now;
				}
				for (var session of Object.keys(game.players)){
					var ws = game.players[session];
					if (ws === null){
						continue; //Race condition kinda. Don't think this is relevant anymore though.
					}
					else if (session === sess.playerID){
						//Don't send to us.
						continue;
					}
					switch (this.roles[session]){
						case roles.POSTGAME:
						case roles.SPECTATOR:
							//Send regardless.
							ws.send(toSendOn);
							break;
						default:
							//Anything else, only send if we're "broadcasting".
							if (broadcast) {
								ws.send(toSendOn);
							} 
					}
				}
			}
		}
		catch (e){
			console.error("Message caused error: " + e);
		}
	}
}

module.exports.Game = Game;