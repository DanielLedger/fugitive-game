//Contains sensible defaults for each event. Not everything is handled here, but some things are.

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

    onStart(){}

    onEnd(){}

    onHeadstartOver(){/*No sensible default*/}

    onEscapeReveal(role){/*No sensible default*/}

    onEscapeOpen(){/*No sensible default*/}

    onEscapeClose(){/*No sensible default*/}

    onPlayerEscape(pl){}

    onTick(){/*No sensible default*/}

    onAbility(pl, ability){} //Not currently called by anything.

    onLocChange(pl, oLoc, nLoc){/*No sensible default*/}

    onOut(pl, reason){}

    bindEvents(game){
        console.info(`Binding events for mode ${this.getName()}.`);
        game.addEventListener('start', this.onStart);
        game.addEventListener('end', this.onEnd);
        game.addEventListener('headstartOver', this.onHeadstartOver);
        game.addEventListener('escapeReveal', this.onEscapeReveal);
        game.addEventListener('escapeOpen', this.onEscapeOpen);
        game.addEventListener('escapeClose', this.onEscapeClose);
        game.addEventListener('playerEscape', this.onPlayerEscape);
        game.addEventListener('tick', this.onTick);
        game.addEventListener('abilityUsed', this.onAbility);
        game.addEventListener('locChnge', this.onLocChange);
        game.addEventListener('out', this.onOut);
    }
}

module.exports.GameMode = GameMode;