async function reportRoleChoice(rChoice){
	var gs = await getSocket();
	gs.emit('SELECT_ROLE', rChoice, (resp) => {
		if (resp){
			document.location = "waiting.html";
		}
	})
}

//Create the socket
createSocket().then(() => {
	$('#fugitivesel')[0].onclick = () => {reportRoleChoice('fugitive')};
	$('#eithersel')[0].onclick = () => {reportRoleChoice('either')};
	$('#huntersel')[0].onclick = () => {reportRoleChoice('hunter')};
	$('#spectatesel')[0].onclick = () => {reportRoleChoice('spectator')};
});