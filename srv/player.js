const idGen = require('./utils/idgen');

const { roles } = require('./utils/enums');

class Player {
    constructor (socket, name, host = false){
        name = name.replace(/<|;|>|'|"/g, ''); //Stops XSS (escaping angle brackets for direct and quotes for parameter injection) and weirdness with semicolons.
        this.playerName = name;
        this.authId = idGen.getRandId();
        this.publicId = name + ";" + idGen.getRandId(); //Allows us to send names as well without *too* much modification. There will be plenty of modification later though.
        this.hosting = host;
        this.ws = socket;

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

}

module.exports.Player = Player;