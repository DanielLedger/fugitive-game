function reportRoleChoice(rChoice){
	gameSocket.send(`SELECT ${rChoice}`);
	console.log(`Sending ${rChoice} as role choice.`);
}

$('#fugitivesel')[0].onclick = () => {reportRoleChoice('fugitive')};
$('#eithersel')[0].onclick = () => {reportRoleChoice('either')};
$('#huntersel')[0].onclick = () => {reportRoleChoice('hunter')};
$('#spectatesel')[0].onclick = () => {reportRoleChoice('spectator')};

gameSocket.addEventListener('message', (m) => {
	if (m.data === "ROLE_OK"){
		//Role was valid, redirect to waiting room.
		document.location = "waiting.html";
	}
});