const { GameMode } = require('./_template');

class Classic extends GameMode {
    constructor(game){
        super("Classic", "The original mode: the fugitives must avoid capture for a certain timeframe, then reach the escape point before the time runs out", game);
    }
    //The defaults in _template.js will provide the classic game.
}

module.exports.Classic = Classic;