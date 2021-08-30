function showGameStatus(json){
	var giObj = JSON.parse(json);
	//TODO: Have a nice looking bar here
	document.getElementById("wsping").innerHTML = `<span class='h4'>Websocket last ping: </span><span class='h5'>${Date.now()}</span>`;
	if (giObj.host){
		document.getElementById("ishost").innerHTML = `<span class='h4'>Host: </span><a class='btn btn-success'>Yes</a>`;
		//Show the 'allocate roles' button
		document.getElementById('lockrolesselection').style = "display: block;";
	}
	else {
		document.getElementById("ishost").innerHTML = `<span class='h4'>Host: </span><a class='btn btn-danger'>No</a>`;
		document.getElementById('lockrolesselection').style = "display: none;";
	}
	document.getElementById("players").innerHTML = `<span class='h4'>Players: </span><span class='h5'>${giObj.players}</span>`;
	//TODO: Render this in a CASE-SENSITIVE font.
	document.getElementById("code").innerHTML = `<span>Game Code: </span><span>${window.sessionStorage.getItem('GameCode')}</span>`;
}

gameSocket.addEventListener('message', (m) => {
	if (m.data.startsWith('INFO')){
		var json = m.data.split(' ')[1];
		showGameStatus(json);
	}
});

window.setInterval(() => {
	gameSocket.send("GAMEINFO");
}, 2000);

document.getElementById('lockrolesselection').onclick = () => {
	//Disable the button (so it can't be clicked again
	document.getElementById('lockrolesselection').disabled = true;
	//Send the assign roles message.
	gameSocket.send("ROLE_ASSIGN");
};