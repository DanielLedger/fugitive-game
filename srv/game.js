const idGen = require('./utils/idgen');
const shuf = require('./utils/shuffle');


const { isInBorder } = require('./utils/bordercheck');
const { states, roles } = require('./utils/enums');
const { Player } = require('./player');

class Game {
	
	constructor(config, code, rmg, ioRef){
		this.removeGame = rmg;

		this.io = ioRef;

		this.players = {}; //Maintains a list of unique ids -> player objects.

		this.roleCounts = {}; //How many of each role are in the game.

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
	
	roomBroadcast(event, ...args){
		this.io.to(this.code).emit(event, ...args);
	}

	isDead(){
		/*
		if (this.state === states.PLAYING){
			//Don't kill live games, since people are running around who knows where and possibly not getting great signal.
			return false;
		}
		//Else, if the last message was more than x seconds ago, it's probaly eligible for deletion.
		return this.lastWSMsg + (1000*60) < Date.now(); //For the actual server, this'll be something like 6-12 hours.
		*/
		return false;
	}

	initSession(){
		if (!this.gameOpen){
			//Roles have already been assigned, so don't let the person in.
			return null;
		}
		var player = new Player(null, 'player', this); //Names are TODO.
		var id = player.getPrivateId();
		this.players[id] = player;
		return id;
	}
	
	transferSession(playerID, newSession){
		//Deletes this player's old session and makes the 'newSession' their current one.
		if (this.players[playerID] === undefined){
			//Player is not registered, do not transfer them a session and return false.
			return false;
		}
		else {
			//Player's current session is now the new one.
			this.players[playerID].setSocket(newSession);
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
				this.players[playerID].setHost(true);
			}
			return true;
		}
	}
	
	closeSession(sess){
		//Renders a websocket session invalid.
		sess.playerID = undefined;
	}
	
	playerOut(id) {
		//Mark a player as out of the game. This turns them into a spectator immediately. If there are no fugitives left, the game ends in a hunter victory (TODO).
		//First though, send a mock location of 'null,null,null' to get the location marker removed from the map (possibly leaving behind a ghostly final marker).
		var msg = this.players[id].getPublicId() + ":null,null,null";
		for (var session of Object.keys(this.players)){
			var ws = this.players[session].getSocket();
			ws.send(msg);
		}
		//Now, they become a spectator. Their live location feed is no longer required.
		this.setPlayerRole(this.players[id], roles.SPECTATOR);
		console.log(this.roleCounts);
		var fugitivesLeft = this.roleCounts[roles.FUGITIVE] || 0;
		var huntersLeft = this.roleCounts[roles.HUNTER] || 0;
		if (fugitivesLeft === 0 || huntersLeft === 0){
			//If all of one role are gone, then it's game over.
			this.endGame();
		}
	}

	endGame(){
		//Ends the game and enters post-game (which shows navigation maps on the end screen so people can actually meet up again without just having to call each other and yell).
		console.log(`Game with code ${this.code} has ended.`);
		this.roomBroadcast('OVER');
		for (var session of Object.keys(this.players)){
			//Set everyone's role to a special post-game role
			this.setPlayerRole(this.players[session], roles.POSTGAME);
		}
		this.state = states.POST;
		//Set it so that people can join the game again.
		this.gameOpen = true;
	}
	

	addRoleCount(r){
		this.roleCounts[r] = (this.roleCounts[r] || 0) + 1;
	}

	subRoleCount(r){
		var ctr = this.roleCounts[r];
		if (ctr === 1){
			delete this.roleCounts[r];
		}
		else {
			this.roleCounts[r] = ctr - 1;
		}
	}

	updateOptions(changed){
		for (var key of Object.keys(changed)){
			if (this.options[key] !== undefined && typeof this.options[key] === typeof changed[key]){
				//Don't allow additional options to be set, unless they exist already and are the correct type.
				this.options[key] = changed[key];
			}
		}
	}

	setPlayerRole(player, role){
		if (player.getRole() !== undefined){
			this.subRoleCount(player.getRole());
		}
		player.setRole(role);
		this.addRoleCount(role);
	}

	getGameInfo(playerFor){
		var gi = {};
		gi.players = Object.keys(this.players).length; //Doesn't appear to be a better way of doing this.
		gi.host = (playerFor.isHost());
		gi.requestedRole = playerFor.getRequestedRole();
		gi.role = playerFor.getRole();
		gi.options = this.options;
		//The client needs to know who's a fugitive and who's a hunter, so send the fugitives (by process of elimination, non-fugitives are hunters if we get their location).
		gi.fugitives = Object.values(this.players).filter((p) => {return p.getRole() === roles.FUGITIVE}).map((v) => {return v.getPublicId()});
		gi.publicID = playerFor.getPublicId(); //Client needs to know their public ID.
		return gi;
	}

	assignRoles(){
		//Assigns everyone a role, chosen based on their preference.
				
		var fugitiveReq = [];
		var hunterReq = [];
		var dontCare = [];
		for (var pl of Object.values(this.players)){
			switch (pl.getRequestedRole()){
				case roles.FUGITIVE:
					fugitiveReq.push(pl);
					break;
				case roles.HUNTER:
					hunterReq.push(pl);
					break;
				default:
					dontCare.push(pl);
					break;
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
				this.setPlayerRole(person, roles.SPECTATOR);
			}
		}
		//Finally, add the fugitive list and hunter list of roles to the 'roles' object.
		for (var fugitive of fugitives){
			this.setPlayerRole(fugitive, roles.FUGITIVE);
		}
		for (var hunter of hunters){
			this.setPlayerRole(hunter, roles.HUNTER);
		}
		//Close game off.
		this.gameOpen = false;
	}

	startGame(){
		this.playing = true; //We're now officially starting.
		this.roomBroadcast('START');
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
				this.roomBroadcast('TIME', [this.options.timer, this.options.hstimer]);
			}
			if (this.options.timer <= 0){
				//Time has expired, game ends.
				clearInterval(this.timerTask);
				this.endGame();
			}
		}, 1000);
	}

	onLocation(lat, lon, acc, uuid){
		//For each player, send if their 'shouldSendTo' returns true.
		var pl = this.players[uuid];
		//Quick check to ensure the player is still within the borders
		if (pl.getRole() !== roles.POSTGAME && !isInBorder([lat, lon], acc, this.options.border)){
			this.playerOut(uuid);
			pl.getSocket().emit('OUT');
			return;
		}
		for (var player of Object.values(this.players)){
			if (player.getPrivateId() === uuid){
				continue; //Don't send to ourselves.
			}
			else if (!pl.shouldSendLocation(player)){
				continue; //Don't send to any of these people.
			}
			else {
				//Send to this player.
				player.getSocket().emit('LOC', lat, lon, acc, pl.getPublicId());
			}
		}
	}

	//The big method which powers a lot of the core functionailty of the game: this method controls the handling of the incoming websocket messages.
	handleWSMessage(sess, msg, game){
		console.log("WS message from " + sess.playerID + ": " + msg.data);
		var person = this.players[sess.playerID];
		try {
			//Log the fact that we just got a websocket message.
			this.lastWSMsg = Date.now();
			if (msg.data.startsWith("COMPING")){
				//A hunter communication ping.
				if (person.getRole() !== roles.HUNTER){
					//Only hunters may use communication pings.
					return;
				}
				var newDat = msg.data.replace('self', sess.playerID) + " " + this.players[sess.playerID].getPublicId(); //So we ping the person who sent it, not the receiver.
				for (var session of Object.keys(game.players)){
					if (person.getRole() === roles.HUNTER && session !== sess.playerID){
						//Send the packet on.
						game.players[session].getSocket().send(newDat);
					}
				}
			}
			else {
				//This is the location feed, send it to everyone else.
				var toSendOn = game.players[sess.playerID].getPublicId() + ":" + msg.data;
				//Do a quick boundary check.
				var info = msg.data.split(',');
				console.log(info);
				var ll = [Number(info[0]), Number(info[1])];
				var acc = Number(info[2]);
				if (this.state !== states.POST && !this.isInBorder(ll, acc)){
					//*oops*
					this.playerOut(sess.playerID); //This won't sync correctly at the moment.
				}
				var now = Date.now();
				var lastSent = this.lastSentLoc[sess.playerID] || 0;
				var nextSend = lastSent;
				//Multiply by 1000 because delays are in seconds, but last sent is ms.
				if (person.getRole() === roles.HUNTER){
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
					var ws = game.players[session].getSocket();
					if (ws === null){
						continue; //Race condition kinda. Don't think this is relevant anymore though.
					}
					else if (session === sess.playerID){
						//Don't send to us.
						continue;
					}
					switch (person.getRole()){
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