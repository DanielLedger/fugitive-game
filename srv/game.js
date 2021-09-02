const uuid = require('uuid');

class Game {
	
	constructor(config){
		this.players = {}; //Maintains a list of unique ids -> websocket sessions.
		this.publicIDS = {}; //A list of unique IDs -> public IDs that we send to the end clients (given that the ids here are also connection secrets).
		this.roles = {}; //The roles people have.
		this.requestedRoles = {}; //The roles people are requesting.
		this.gameOpen = true;
		this.roleLimits = config.get('RoleLimits');
		this.host = undefined; //Only the host can do important things like setting the boundary or starting the game.
		this.playing = false; //We need to know if we're playing or not.
		//If it's a time, it's in seconds.
		this.options = {
			timer: 600, 
			hunterLocDelay: 3, 
			fugitiveLocDelay: 30
		};
		this.lastSentLoc = {}; //When everyone's location was last broadcast.
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
	
	//The big method which powers a lot of the core functionailty of the game: this method controls the handling of the incoming websocket messages.
	handleWSMessage(sess, msg, game){
		console.log("WS message from " + sess.playerID + ": " + msg.data);
		try {
			if (msg.data.startsWith('SELECT')){
				//Role select message
				var role = msg.data.split(" ")[1];
				switch (role) {
					case "spectator":
						//Add this user directly to the roles object (since spectators can't be allocated a non-spectator role).
						this.roles[sess.playerID] = "spectator";
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
				gi.border = {ll: [53.348661,-1.5133166], rad: 500}; //Temporary.
				gi.requestedRole = this.requestedRoles[sess.playerID];
				gi.role = this.roles[sess.playerID];
				gi.options = this.options;
				sess.send("INFO " + JSON.stringify(gi));
				return;
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
					if (pair[1] === 'fugitive'){
						fugitiveReq.push(pair[0]);
					}
					else if (pair[1] === 'hunter'){
						hunterReq.push(pair[0]);
					}
					else {
						dontCare.push(pair[0]);
					}
				}
				//Since objects are hashmaps internally, the order will be determined by the random private IDs, so we don't need to shuffle
				//If there's bias, this'll be why. There is significant bias, fix is TODO.
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
						this.roles[person] = 'spectator';
					}
				}
				//Finally, add the fugitive list and hunter list of roles to the 'roles' object.
				for (var fugitive of fugitives){
					this.roles[fugitive] = 'fugitive';
				}
				for (var hunter of hunters){
					this.roles[hunter] = 'hunter';
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
			}
			else if (msg.data === 'pong'){
				//Keepalive ping-pong, do nothing.
				return;
			}
			else {
				//This is the location feed, send it to everyone else.
				var msg = game.publicIDS[sess.playerID] + ":" + msg.data;
				var now = Date.now();
				var lastSent = this.lastSentLoc[sess.playerID] || 0;
				var nextSend = lastSent;
				//Multiply by 1000 because delays are in seconds, but last sent is ms.
				if (this.roles[sess.playerID] === "hunter"){
					nextSend += (this.options.hunterLocDelay * 1000);
				}
				else {
					//Only other role capable of sending location is fugitive.
					nextSend += (this.options.fugitiveLocDelay * 1000);
				}
				var broadcast = nextSend <= now;
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
						case 'spectator':
							//Send regardless.
							ws.send(msg);
							break;
						default:
							//Anything else, only send if we're "broadcasting".
							if (broadcast) {
								ws.send(msg);
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