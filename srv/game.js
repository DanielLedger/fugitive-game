const uuid = require('uuid');

const fs = require('fs');

class Game {
	
	constructor(config){
		this.players = {}; //Maintains a list of unique ids -> websocket sessions.
		this.publicIDS = {}; //A list of unique IDs -> public IDs that we send to the end clients (given that the ids here are also connection secrets).
		this.roles = {}; //The roles people have.
		this.requestedRoles = {}; //The roles people are requesting.
		this.roleLimits = config.get('RoleLimits');
	}
	
	initSession(){
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
		console.log("Before players: " + JSON.stringify(this.players));
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
			
			console.log("After players: " + JSON.stringify(this.players));
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
			//Echo it to all connected clients (except the one that sent it, they don't care).
			var msg = game.publicIDS[sess.playerID] + ":" + msg.data;
			for (var ws of Object.values(game.players)){
				if (ws === null){
					continue; //Race condition kinda.
				}
				if (ws !== sess){
					ws.send(msg);
				}
			}
		}
		catch (e){
			console.error("Message caused error: " + e);
		}
	}
}

module.exports.Game = Game;