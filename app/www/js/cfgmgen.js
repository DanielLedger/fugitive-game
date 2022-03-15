class ConfigMenu extends EventTarget{
    /*
    * A config menu representation.
    */

    constructor (configuring, options){
        super(); //Important
        //configuring is the object we're configuring, options are the object options (I'll get back to that)
        this.__conf = configuring;
        this.__opt = options;
        //JS has no useful method of deep-cloning for some reason, at least not one supported by most browsers
        this.__oldObj = JSON.parse(JSON.stringify(this.__conf));

    }

    display (parent){
        //Displays in 'parent' which should obviously be an html element of some kind.
        this.__render(parent, this.__conf, "", this.__opt);
    }


    __getOption(elemFor, name, inherit = true){
        //Gets the option for 'elemFor' addressed by 'name'
        //Note that elemFor should be a full key.
        var splitK = elemFor.split('.');
        var currentVal = undefined;
        var currentKey;
        if (!inherit){
            currentKey = splitK.join("_") + "_options";
            return (this.__opt[currentKey] || {})[name]; 
        }
        for (var i = splitK.length;i >= 0;i--){
            currentKey = splitK.slice(0, i).join("_") + (i == splitK.length ? "_options" : "_goptions");
            console.debug(currentKey);
            currentVal = this.__opt[currentKey];
            if (currentVal != undefined && currentVal[name] != undefined){
                return currentVal[name];
            }
        }
        return undefined;

    }

    __render(parent, obj, rootKey, options){
        //Renders a given object's config. Currently very basic.
        for (var key in obj){
            var val = obj[key];

            var fullPath = "";
            if (rootKey !== ''){
                fullPath = rootKey + ".";
            }
            fullPath += key;
            if (typeof (val) === 'object'){
                //Create a submenu. Will have to nick some code from W3Schools to make this look nicer at some point.
                var submenu = document.createElement('div');

                var heading = document.createElement('h4');
                heading.innerText = this.__getOption(fullPath, 'displayName', false) || key;

                var lblClasses = this.__getOption(fullPath, 'labelClasses') || []; //Add some label classes.
                if (typeof(lblClasses) === 'string'){
                    heading.className = lblClasses;
                }
                else {
                    //Classes is a list of strings.
                    for (var c of lblClasses){
                        heading.classList.add(c);
                    }
                }

                submenu.appendChild(heading);

                var submenuContainer = document.createElement("div");
                submenuContainer.style.display = 'none';
                submenu.appendChild(submenuContainer);

                var classes = this.__getOption(fullPath, 'classes') || []; //Add some classes.
                if (typeof(classes) === 'string'){
                    submenuContainer.className = classes;
                }
                else {
                    //Classes is a list of strings.
                    for (var c of classes){
                        submenuContainer.classList.add(c);
                    }
                }

                this.__render(submenuContainer, val, fullPath, options);
                parent.appendChild(submenu);

                //Set up the accordian toggling.
                heading.onclick = (e) => {
                    accordianToggle(e.target.parentElement.querySelector('div'));
                };

                continue;
            }
            var inp = document.createElement('input');

            var classes = this.__getOption(fullPath, 'classes') || []; //Add some classes.
            if (typeof(classes) === 'string'){
                inp.className = classes;
            }
            else {
                //Classes is a list of strings.
                for (var c of classes){
                    inp.classList.add(c);
                }
            }

            var lbl = document.createElement('label');
            
            var lblClasses = this.__getOption(fullPath, 'labelClasses') || []; //Add some label classes.
            console.debug(lblClasses);
            if (typeof(lblClasses) === 'string'){
                lbl.className = lblClasses;
            }
            else {
                //Classes is a list of strings.
                for (var c of lblClasses){
                    lbl.classList.add(c);
                }
            }

            lbl.innerText = this.__getOption(fullPath, 'displayName', false) || key;
            lbl.id = `lbl-${fullPath}`;

            inp.id = `in-${fullPath}`;

            lbl.setAttribute('for', inp.id);
            switch (typeof(val)){
                case 'string':
                    //Set up the event listener.
                    var opts = this.__getOption(fullPath, 'options', false)
                    if (opts === undefined){
                        //Free choice.
                        var f = function (us, key, input){ //Need to do this to take a local copy of all these variables because JS is dumb.
                            input.onchange = (e) => {
                                //Edit our backing object.
                                us.__edit(key, input.value);
                            };
                        }
                        f(this, `${fullPath}`, inp);
                        //Set the default value to what it is at the moment.
                        inp.value = val;
                        //Set the type based on what we were given.
                        inp.setAttribute('type', this.__getOption(fullPath, 'type')||'text');
                    }
                    else {
                        //<select> menu.
                        var selMenu = document.createElement('select');
                        selMenu.className = inp.className;
                        selMenu.id = inp.id;
                        for (var opt of opts){
                            var optElem = document.createElement('option');
                            optElem.innerText = opt;
                            optElem.value = opt;
                            selMenu.appendChild(optElem);
                        }
                        inp = selMenu;
                        var f = function (us, key, input){
                            input.onchange = (e) => {
                                //Edit our backing object.
                                us.__edit(key, input.value);
                            };
                        }
                        f(this, `${fullPath}`, selMenu);
                        if (opts.includes(val)){
                            inp.value = val;
                        }
                    }
                    break;
                case 'number':
                    var exact = this.__getOption(fullPath, 'exact');
                    if (exact || exact === undefined){
                        //Set the type of this input to be a number entry.
                        inp.setAttribute('type', 'number');
                    }
                    else {
                        //Set the type to be a range.
                        inp.setAttribute('type', 'range');
                    }

                    //Set min-max-step.
                    inp.min = this.__getOption(fullPath, 'min');
                    inp.max = this.__getOption(fullPath, 'max');
                    inp.step = this.__getOption(fullPath, 'step');

                    //Set up the event listener.
                    var f = function (us, key, input){
                        input.onchange = (e) => {
                            //Edit our backing object.
                            us.__edit(key, Number(input.value));
                        };
                    }
                    f(this, `${fullPath}`, inp);
                    //Set the default value to what it is at the moment.
                    inp.value = val;
                    break;
                case 'boolean':
                    //Set the type of this input to be a checkbox.
                    inp.setAttribute('type', 'checkbox');
                    //Set up the event listener.
                    var f = function (us, key, input){
                        input.onchange = (e) => {
                            //Edit our backing object.
                            us.__edit(key, input.checked);
                        };
                    }
                    f(this, `${fullPath}`, inp);
                    //Set the default value to what it is at the moment.
                    inp.checked = val;
                    break;
                default:
                    console.warn('Uncaught value got through.');
                    console.warn(val);
                    continue;
            }
            //If input is disabled, do that now.
            inp.disabled = this.__getOption(fullPath, 'disabled') || false;

            //Add these objects to the parents, followed by a linebreak.
            parent.appendChild(lbl);
            parent.appendChild(inp);
            parent.appendChild(document.createElement('br'));
            
        }
    }

    __edit(key, value){
        //Edits the object at the given key to be equal to the given value.
        this.__editAt(key.split('.'), value, this.__conf);
        //Dispatch an 'onchange' event.
        this.dispatchEvent(new Event('change'));
    }

    __editAt(key, value, ref){
        //Edits the given object BY REFERENCE. Key is an array of strings.
        if (key.length === 1){
            ref[key[0]] = value;
        }
        else {
            this.__editAt(key.slice(1), value, ref[key[0]]); //Elegant, recursive def.
        }
    }

    //Couple of utility methods:
    getObj(){
        return this.__conf;
    }

    __oDiff(a, b){
        //Recursively finds the difference between two objects. Since fields can only be modified, we just return an object.
        var diff = {}
        for (var k of Object.keys(a)){
            if (a[k] === b[k]){
                continue; //Don't need to worry.
            }
            else {
                if (typeof(a[k]) === 'object'){
                    var res = this.__oDiff(a[k], b[k])
                    if (Object.keys(res).length !== 0){
                        diff[k] = res
                    }
                }
                else {
                    diff[k] = b[k];
                }
            }
        }
        return diff;
    }

    getDiff(){
        //Gets what has changed since the last time this method was called.
        var diff = this.__oDiff(this.__oldObj, this.__conf);
        this.__oldObj = JSON.parse(JSON.stringify(this.__conf));
        return diff;
    }

    update(newObj) {
        //Takes an object and sets the form contents in our config menu to be from this. Same types are required, differing types are undefined.
        this.__updateFrom("", newObj);
        //Set the internal object to be correct.
        this.__conf = JSON.parse(JSON.stringify(newObj));
    }

    __updateFrom(root, newObject){
        for (var key of Object.keys(newObject)){
            var val = newObject[key];

            var fullPath = "";
            if (root !== ''){
                fullPath = root + ".";
            }
            fullPath += key;

            if (typeof(val) === 'object'){
                //Some kind of object, so recurse down.
                this.__updateFrom(fullPath, val);
            }
            else {
                //Update the UI.
                console.debug(`in-${fullPath}`);
                var inElem = document.getElementById(`in-${fullPath}`);
                if (inElem === null){
                    console.warn(`Element of ID in-${fullPath} doesn't exist, skipping!`);
                }
                else {
                    inElem.value = val;
                }
            }
        }
    }
}

//
function accordianToggle(elem) {
    if (elem.style.display === 'none') {
        elem.style.display = 'block';
    } 
    else {
        elem.style.display = 'none';
    }
  }