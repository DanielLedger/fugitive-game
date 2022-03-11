const { EventEmitter } = require('events');


/**
 * Provides an extension to EventEmitter that supports event cancellation.
 * There are two ways to cancel events:
 * 1) The listener can explicitly return 'false' to immediately cancel and short circuit other listeners to return.
 * 2) The listener can return a number to vote on if the event should appear cancelled: negatives vote for cancellation, positives vote against.
 *    This will not short-circuit any listeners (unless a later one returns 'false')
 * 
 * NOTE: The 'this' keyword will be undefined unless an anchor object is set using setAnchorObj.
 */
class CancellableEventEmitter extends EventEmitter{
    //Similar to a regular event emitter, except allows (sync) events to optionally cancel the propagation.

    setAnchorObj(o){
        this.__anchor = o;
    }

    getAnchorObj(){
        return this.__anchor;
    }

    emit(event, ...args){
        var listeners = this.listeners(event);
        var vote = 0;
        for (var l of listeners){
            var ret = l.bind(this.getAnchorObj())(...args);
            if (ret === false){
                return false; //Cancelled.
            }
            else if (typeof(ret) === 'number'){
                vote += ret;
            }
            else {
                //Ignore it.
            }
        }
        return vote >= 0;
    }

    constructor(){
        super();
        this.__anchor = null;
    }

}

module.exports.CancellableEventEmitter = CancellableEventEmitter;