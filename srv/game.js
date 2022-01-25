const idGen = require('./utils/idgen');
const shuf = require('./utils/shuffle');


const { isInBorder } = require('./utils/bordercheck');
const { states, roles } = require('./utils/enums');
const { Player } = require('./player');

const { HelicopterEscape } = require('./utils/extractpointchoice/helicopter');
const { RoadEscape } = require('./utils/extractpointchoice/road');

const EVAC_OPTS = {
	Helicopter: new HelicopterEscape(),
	Road: new RoadEscape()
};

class Game {
	
	constructor(config, code, rmg, ioRef){
		this.removeGame = rmg;

		this.io = ioRef;

		this.players = {}; //Maintains a list of unique ids -> player objects.

		this.roleCounts = {}; //How many of each role are in the game.

		this.gameOpen = true;

		this.host = undefined; //Only the host can do important things like setting the boundary or starting the game.
		this.playing = false; //We need to know if we're playing or not.

		//We need to know our own code
		this.code = code;

		//Our state is important, since it tells the server terminator whether we should exist or not.
		this.state = states.LOBBY;

		//When we got our last websocket message.
		this.lastWSMsg = Date.now();

		this.evacPoint = undefined;

		//If it's a time, it's in seconds.
		this.options = {
			timings: {
				timer: 600,
				hstimer: 30,
				hunterLocDelay: 3, 
				fugitiveLocDelay: 30,
			},
			rolecounts: {
				fugitivelimit: true,
				fugitive: 1,
				hunterlimit: false,
				hunter: 0
			},
			escapes: {
				Helicopter: true,
				Road: true,
				escapeWindow: 300,
				escapeRadius: 10,
				revealedFugitive: 300,
				revealedHunter: 0
			},
			border: []
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

	__safeMerge(o1, o2){
		//Merges o2 into o1, but only updates a key in o1 if it already exists (it won't add new keys)
		for (var key of Object.keys(o2)){
			if (key === 'border'){
				//This exemption is required.
				o1[key] = o2[key];
			}
			else if (o1[key] !== undefined && typeof o1[key] === typeof o2[key]){
				//Don't allow additional options to be set, unless they exist already and are the correct type.
				if (typeof o1[key] === 'object'){
					//Recursively merge
					this.__safeMerge(o1[key], o2[key]);
				}
				else {
					o1[key] = o2[key];
				}
			}
		}
	}

	updateOptions(changed){
		this.__safeMerge(this.options, changed);
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

		var limits = this.options.rolecounts;

		//Put fugitive requesters on the fugitive pile.
		while (fugitiveReq.length > 0){
			if (fugitives.length >= (limits.fugitivelimit ? limits.fugitive : undefined)){
				//Will this work? No clue, hopefully. If the limit is undefined, this will be false.
				break;
			}
			var f = fugitiveReq.pop();
			fugitives.push(f);
		}
		//Same code for the hunters.
		while (hunterReq.length > 0){
			if (hunters.length >= (limits.hunterlimit ? limits.hunter : undefined)){
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
			if (!(fugitives.length >= (limits.fugitivelimit ? limits.fugitive : undefined))){
				//Add this person as a fugitive
				fugitives.push(person);
			}
			else if (!(limits.hunterlimit ? limits.hunter : undefined)){
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

	async chooseEvac(){
		//Choose a random evac point for this game.
		var methods = Object.keys(EVAC_OPTS).filter((eType) => this.options.escapes[eType]);
		console.log(methods);
		if (methods.length === 0){
			//Can't get a point.
			return null;
		}
		shuf.shuffle(methods);
		for (var method of methods){
			var resp = await EVAC_OPTS[method].getEscape(this.options.border);
			if (resp !== null){
				//Worked.
				return resp;
			}
		}
		return null; //Gave up.
	}

	async getEvacPoint(){
		if (this.evacPoint === undefined){
			//Set and return the promise.
			this.evacPoint = this.chooseEvac();
		}
		return this.evacPoint; //If the promise resolved ages ago, the value can just be fetched.
	}

	async hasEscaped(lat, lon){
		if (this.options.timings.timer > 0){
			//Escape not open.
			return false;
		}
		var point = await this.getEvacPoint();
		var escOrdsReverse = point.geometry.coordinates; //For reasons I'm not sure of, these are reversed.
		var escBorder = {centre: [escOrdsReverse[1], escOrdsReverse[0]], radius: this.options.escapes.escapeRadius};
		return isInBorder([lat, lon], 0, escBorder);
	}

	startGame(){
		this.playing = true; //We're now officially starting.
		this.roomBroadcast('START');
		this.state = states.PLAYING;
		//Generate the evac point.
		console.log("Generating evac point...");
		this.getEvacPoint().then((p) => console.log("Done generating evac point.")); //We just ignore the long-running element of this.
		//Set up a repeating task to decrement the timer by one second, every second.
		this.timerTask = setInterval(() => {
			var timings = this.options.timings;
			//Decrement the headstart timer first.
			if (timings.hstimer > 0){
				timings.hstimer--;
			}
			else {
				timings.timer--;
			}
			//To avoid spam, only send updates every 30 seconds or so (this'll probably be the minimum increment for the timer anyway at game start).
			if ((timings.timer + timings.hstimer) % 30 === 0){
				this.roomBroadcast('TIME', [timings.timer, timings.hstimer]);
			}
			if (timings.timer <= this.options.escapes.revealedFugitive && timings.timer % 30 === 0){
				//Send the ping to all fugitives, telling them where the escape is.
				console.log(this.getEvacPoint());
				this.getEvacPoint().then((pt) => {
					Object.values(this.players).filter((p) => p.getRole() === roles.FUGITIVE).forEach((pl) => {
						pl.getSocket().emit('EVAC', pt, this.options.escapes.escapeRadius);
					})
				});
			}
			if (timings.timer <= this.options.escapes.revealedHunter && timings.timer % 30 === 0){
				//Send the ping to all hunters, telling them where the escape is.
				this.getEvacPoint().then((pt) => {
					Object.values(this.players).filter((p) => p.getRole() === roles.HUNTER).forEach((pl) => {
						pl.getSocket().emit('EVAC', pt, this.options.escapes.escapeRadius);
					});
				});
			}
			if (timings.timer <= -this.options.escapes.escapeWindow){
				//Time has expired, game ends.
				clearInterval(this.timerTask);
				this.endGame();
			}
		}, 1000);
	}

	onLocation(lat, lon, acc, uuid){
		//For each player, send if their 'shouldSendTo' returns true.
		var pl = this.players[uuid];
		pl.setLastSeenLoc(lat, lon);
		//Quick check to ensure the player is still within the borders. Don't enforce if accuracy is too stupidly low however.
		if (pl.getRole() !== roles.POSTGAME && acc < 100 && !isInBorder([lat, lon], acc, this.options.border)){
			//Mark this player as having failed.
			//Some debug logging.
			console.debug(`Player ${uuid} went outside border!`);
			console.debug(`Player location: lat=${lat}, lon=${lon}, acc=${acc}`);
			console.debug(`Border: ${JSON.stringify(this.options.border)}`);
			pl.setHasWon(false, "Went outside border.");
			this.playerOut(uuid);
			pl.getSocket().emit('OUT');
			return;
		}
		if (pl.getRole() === roles.FUGITIVE){
			this.hasEscaped(lat, lon).then((e) => {
				if (e){
					console.log(`${pl.getPrivateId()} has escaped.`);
					//Player has escaped.
					pl.setHasWon(true, "Escaped.");
					//I guess they're technically out?
					this.playerOut(pl.getPrivateId());
					pl.getSocket().emit('OUT');
				}
			});
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

	onCommPing(target, from){
		//We already know this player is a hunter, so we don't need to recheck.
		//Simply iterate through and send the ping to all hunters.
		for (var player of Object.values(this.players)){
			if (player.getPrivateId() === from.getPrivateId()){
				continue; //Don't send to ourselves.
			}
			else if(player.getRole() !== roles.HUNTER){
				//Don't send hunter pings to non-hunters.
				continue;
			}
			else {
				//Send
				player.getSocket().emit('COMPING', target, from.getPublicId());
			}
		}
	}

}

module.exports.Game = Game;