const idGen = require('./utils/idgen');

const { states, roles, r_roles, out_reasons } = require('./utils/enums');

class Player {
    constructor (socket, name, game, host = false){
        name = name.replace(/[<;>'"]/g, ''); //Stops XSS (escaping angle brackets for direct and quotes for parameter injection) and weirdness with semicolons.
        this.playerName = name;
        this.authId = idGen.getRandId();
        this.publicId = name + ";" + idGen.getRandId(); //Allows us to send names as well without *too* much modification. There will be plenty of modification later though.
        this.hosting = host;
        this.ws = socket;
        this.game = game;
        if (socket !== null){
            this.addListenersToSocket();
        }

        this.win = false;
        this.winReason = null;

        this.usedJammer = false;
        this.jammerTime = 60;
        this.jammerActive = false;
    }

    getPublicId(){
        return this.publicId;
    }

    getPrivateId(){
        return this.authId;
    }

    isHost(){
        return this.hosting;
    }

    setHost(isHost){
        this.hosting = isHost;
    }

    getSocket(){
        return this.ws;
    }

    setSocket(newSock){
        this.ws = newSock;
        if (newSock !== null){
            this.addListenersToSocket();
        }
    }

    getName(){
        return this.playerName;
    }

    setRequestedRole(role) {
        this.requestedRole = role;
        if (role === roles.SPECTATOR){
            this.role = role;
        }
    }

    setRole(role) {
        this.role = role;
    }

    getRole(){
        return this.role;
    }

    getRequestedRole(){
        return this.requestedRole;
    }

    setLastSeenLoc(lat, lon){
        //Will be useful to store this info for implementing dynamic timings.
        this.lastSeen = [lat, lon];
    }

    getLastSeenLoc(){
        return this.lastSeen ?? null;
    }

    shouldSendLocation(to){
        //Spectators get live location
        if (to.getRole() === roles.SPECTATOR || to.getRole() === roles.POSTGAME){
            return true;
        }

        if (this.jammerActive){
            return false; //If our jammer is active, never send our true location (jammer location bypasses this check)
        }
        //Should we send our location to this person or not?
        //For now, just ignore and simply use timings.
        var time = Date.now()
        var lastSent = this.lastLocationBroadcast ?? 0
        var delta = time - lastSent
        var gap;
        if (this.getRole() === roles.HUNTER){
            gap = this.game.options.timings.hunterLocDelay
        }
        else if (this.getRole() === roles.FUGITIVE){
            gap = this.game.options.timings.fugitiveLocDelay
        }
        return delta >= (gap * 1000); //gap is in seconds, delta in ms.
    }

    setHasWon(winner, reason){
        //Sets if this player has won the game or not.
        this.win = winner;
        this.winReason = reason;
    }

    alreadyWon(){
        return this.win;
    }

    addListenersToSocket(){
        var game = this.game;
        var player = this;

        //Role selection route.
        this.ws.on('SELECT_ROLE', (sel, callback) => {
            if ((r_roles[sel] || roles.POSTGAME) !== roles.POSTGAME){
                //Set the person's role choice.
                player.setRequestedRole(sel);
                console.log(`${player.getName()} requested role ${sel}.`);
                callback(true);
            }
            else {
                //Do nothing and return false.
                callback(false);
            }
        });

        //Game info route.
        this.ws.on('INFO', (callback) => {
            callback(game.getGameInfo(player));
        });

        //Option update route.
        this.ws.on('OPTION', (newOpts, callback) => {
            if (player.isHost()){ //Check dynamically since host might change.
                game.updateOptions(newOpts);
                game.roomBroadcast('UPDATED', game.options);
            }
        })

        //Role assign.
        this.ws.on('ROLE_ASSIGN', () => {
            if (player.isHost()){
                game.assignRoles();
                game.roomBroadcast('REFETCH');
            }
        });

        //Game start.
        this.ws.on('STARTGAME', () => {
            if (player.isHost()){
                game.startGame();
            }
        });

        //Player is out.
        this.ws.on('OUT', (callback) => {
            //Muffin
            game.playerOut(this, out_reasons.CAUGHT);
            callback();
        });

        //Player location update (not normally sent)
        this.ws.on('LOC', (lat, lng, acc) => {
            game.onLocation(lat, lng, acc, player.getPrivateId());
        });

        //Hunter communication ping.
        this.ws.on('COMPING', (target, callback) => {
            if (player.getRole() === roles.HUNTER){
                game.onCommPing(target, player);
                callback(true);
            }
            callback(false);
        })

        this.ws.on('HAS_WON', (callback) => {
            callback(this.win, this.winReason);
        })

        this.ws.on('connect', () => {
            if (game.getState() === states.POST){
                //Remind the client we've finished.
                this.ws.send('OVER');
            }
        });

        this.ws.on('JAMMER', (callback) => {
            //Jammer lasts for 60s.
            if (this.usedJammer || this.getRole() !== roles.FUGITIVE){
                //Do nothing.
                return;
            }
            else {
                //Create a timer task that manages the jamming.
                this.jammerActive = true;
                this.usedJammer = true;
                this.jamTask = setInterval(() => {
                    console.log("Running jam task...");
                    if (this.jammerTime == 0){
                        //End.
                        this.jammerActive = false;
                        clearInterval(this.jamTask);
                        callback();
                    }
                    else {
                        this.jammerTime--;
                        console.log("Will jam location.");
                        //Post fake location updates every 3 seconds with a wild inaccuracy. TODO: Maybe some kind of ramp up/ramp down?
                        var maxAccuracy = 110; //Needs to be at least 100 metres so we don't get bordered.
                        var minAccuracy = 300;
                        //We will pick a random offset (0.008 degrees) from our true location and send that, along with a random accuracy error.
                        //Note that the accuracy circle may not include the actual location.
                        var shownAcc = maxAccuracy + (Math.random() * (minAccuracy - maxAccuracy));
                        var shownLat = this.getLastSeenLoc()[0] + ((Math.random() - 0.5) * 0.016);
                        var shownLon = this.getLastSeenLoc()[1] + ((Math.random() - 0.5) * 0.016);

                        //Send our location.
                        game.sendFakeLoc(shownLat, shownLon, shownAcc, this.getPrivateId());
                    }
                }, 1000);
            }
        })

        //Join the room given by the game code (we'll need this later)
        this.ws.join(game.code);
        console.log(this.ws.rooms);
    }

}

module.exports.Player = Player;