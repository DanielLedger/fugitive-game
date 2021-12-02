const idGen = require('./utils/idgen');

const { roles, r_roles } = require('./utils/enums');

class Player {
    constructor (socket, name, game, host = false){
        name = name.replace(/<|;|>|'|"/g, ''); //Stops XSS (escaping angle brackets for direct and quotes for parameter injection) and weirdness with semicolons.
        this.playerName = name;
        this.authId = idGen.getRandId();
        this.publicId = name + ";" + idGen.getRandId(); //Allows us to send names as well without *too* much modification. There will be plenty of modification later though.
        this.hosting = host;
        this.ws = socket;
        this.game = game;
        if (socket !== null){
            this.addListenersToSocket();
        }
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

        //Join the room given by the game code (we'll need this later)
        this.ws.join(game.code);
        console.log(this.ws.rooms);
    }

}

module.exports.Player = Player;