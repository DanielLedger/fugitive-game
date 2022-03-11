//Contains sensible defaults for each event. Not everything is handled here, but some things are.

const { states, roles, out_reasons } = require('../utils/enums');

class GameMode {

    constructor(name, desc, game){
        this.__name = name;
        this.__desc = desc;
        this.__game = game;
        this.__gameEnding = false;
        this.__escapes = 0;
    }

    getName(){
        return this.__name;
    }

    getDesc(){
        return this.__desc;
    }

    getGame(){
        return this.__game;
    }

    areRolesActive(){
        console.log(this.getGame().roleCounts);
		var fugitivesLeft = this.getGame().roleCounts[roles.FUGITIVE] || 0;
		var huntersLeft = this.getGame().roleCounts[roles.HUNTER] || 0;
		return (fugitivesLeft > 0 && huntersLeft > 0);
    }

    onStart(){/*No sensible default*/}

    onEnd(){
        //Set a flag that stops the endgame being called multiple times.
        if (this.__gameEnding){
            return;
        }
        this.__gameEnding = true;
        if ((this.getGame().roleCounts[roles.HUNTER] || 0) === 0){
            //No hunters left, I guess the fugitives win by default?
            console.log("All hunters out: remaining fugitives win by default.");
            for (var leftFugitive of (Object.values(this.getGame().players).filter((p) => {return p.getRole() === roles.FUGITIVE}))){
                leftFugitive.setHasWon(true, out_reasons.ALL_HUNTERS_GONE);
            }
        }
        else {
            //Create custom message for hunters.
            var hunterOutMsg = (this.__escapes == 0) ? out_reasons.ALL_CAUGHT : `${this.__escapes} of your targets escaped.`;
            //Every fugitive left now has run out of time and therefore loses.
            for (var f of (Object.values(this.getGame().players).filter((p) => {return p.getRole() === roles.FUGITIVE}))){
                f.setHasWon(false, out_reasons.TIME);
            }

            //Every hunter in the game gets their own special message. Whether or not they win depends on if anyone escaped before the time expired.
            for (var h of (Object.values(this.getGame().players).filter((p) => {return p.getRole() === roles.HUNTER}))){
                h.setHasWon((this.__escapes == 0), hunterOutMsg);
            }
        }
    }

    onHeadstartOver(){/*No sensible default*/}

    onEscapeReveal(role){/*No sensible default*/}

    onEscapeOpen(){/*No sensible default*/}

    onEscapeClose(){/*No sensible default*/}

    onPlayerEscape(pl){
        //Mark the player as "out" and that they've won.
        console.log(`${pl.getPrivateId()} has escaped.`);
        //Add one to the escapes count.
        this.__escapes += 1;
        //Player has escaped.
        //I guess they're technically out?
        this.getGame().playerOut(pl, out_reasons.ESCAPE);
    }

    onTick(){/*No sensible default*/}

    onAbility(pl, ability){/*Not currently implemented*/} //Not currently called by anything.

    onLocChange(pl, oLoc, nLoc){/*No sensible default*/}

    onOut(pl, reason){
        console.log(`${pl.getPrivateId()} is out for the following reason: ${reason}.`);
        if (reason === out_reasons.ESCAPE || reason === out_reasons.ALL_CAUGHT || reason === out_reasons.ALL_HUNTERS_GONE){
			//These are all winning reasons to be 'out'
			pl.setHasWon(true, reason);
		}
		else {
			//Lost
			pl.setHasWon(false, reason);
		}
		this.getGame().setPlayerRole(pl, roles.SPECTATOR);
        //Check if all of one role are gone
        if (!this.areRolesActive() && !this.__gameEnding){
            this.getGame().endGame();
        }
    }

    bindEvents(){
        var game = this.getGame();
        console.info(`Binding events for mode ${this.getName()}.`);
        game.addListener('start', this.onStart);
        game.addListener('end', this.onEnd);
        game.addListener('headstartOver', this.onHeadstartOver);
        game.addListener('escapeReveal', this.onEscapeReveal);
        game.addListener('escapeOpen', this.onEscapeOpen);
        game.addListener('escapeClose', this.onEscapeClose);
        game.addListener('playerEscape', this.onPlayerEscape);
        game.addListener('tick', this.onTick);
        game.addListener('abilityUsed', this.onAbility);
        game.addListener('locChnge', this.onLocChange);
        game.addListener('out', this.onOut);
    }
}

module.exports.GameMode = GameMode;