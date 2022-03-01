//Isn't actually loaded in by Game, just a... template.

class GameMode {

    constructor(name, desc){
        this.__name = name;
        this.__desc = desc;
    }

    getName(){
        return this.__name;
    }

    getDesc(){
        return this.__desc;
    }

    bindEvents(game){
        console.warning(`No bindEvents override for gamemode ${this.getName()}. The game won't actually do anything.`);
    }
}

module.exports.GameMode = GameMode;