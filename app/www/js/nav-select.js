/*This is a really simple script, however Cordova (quite reasonably) 
won't load inline scripts by default, so we need to do this.
Also I plan on using this in multiple places to be fair.*/

function __selectTab(tab){
    tab.classList.add("topnav-selected");
}

function __deselectTab(tab){
    tab.classList.remove("topnav-selected");
}

function __deselectAll(tabs){
    for (var t of tabs){
        __deselectTab(t);
    }
}

function __show(e){
    e.style = "display: block;";
}

function __hide(e){
    e.style = "display: none;";
}

function __hideAll(es){
    for (var e of es){
        __hide(e);
    }
}



function selectTab(toSelect, navbar, contentShow, contentContainer){
    //Mark the tabs as (un)selected
    __deselectAll(navbar.getElementsByTagName("div"));
    __selectTab(toSelect)
    //Show/hide the content
    __hideAll(contentContainer.getElementsByTagName("div"));
    __show(contentShow);
}