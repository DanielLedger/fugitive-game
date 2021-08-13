const uuid = require('uuid');

class Game {
	
	constructor(){
		this.players = {}; //Maintains a list of unique ids -> websocket sessions.
		this.sessionRevLookup = {} //A list of websockets -> ids.
		this.publicIDS = {} //A list of unique IDs -> public IDs that we send to the end clients (given that the ids here are also connection secrets).
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
		if (this.players[playerID] === undefined){
			//Player is not registered, do not transfer them a session and return false.
			return false;
		}
		else {
			//Player's current session is now the new one.
			this.players[playerID] = newSession;
			this.sessionRevLookup[newSession] = playerID;
			var currentGame = this; //Required due to scope problems.
			//Set up the new session with a handler.
			newSession.onmessage = (msg) => {
				currentGame.handleWSMessage(playerID, msg);
			};
			//Also set it up with a close handler.
			newSession.onclose = () => {
				currentGame.closeSession(this); //This is why we need a 'currentGame' reference: 'this' refers to the websocket.
			}
			return true;
		}
	}
	
	closeSession(sess){
		//Renders a websocket session invalid.
		delete this.sessionRevLookup[sess];
	}
	
	//The big method which powers a lot of the core functionailty of the game: this method controls the handling of the incoming websocket messages.
	handleWSMessage(sess, msg){
		console.log("WS message from " + sess + ": " + msg);
		//Echo it to all connected clients (except the one that sent it, they don't care).
		var msg = this.publicIDS[this.sessionRevLookup[sess]] + ":" + msg;
		for (var ws of this.players){
			if (ws !== sess){
				ws.send(msg);
			}
		}
	}
}

module.exports.Game = Game;