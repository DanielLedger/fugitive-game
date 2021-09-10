function reportRoleChoice(rChoice){
	gameSocket.send(`SELECT ${rChoice}`);
	console.log(`Sending ${rChoice} as role choice.`);
}

$('#fugitivesel').onclick = () => {reportRoleChoice('fugitive')};
$('#eithersel').onclick = () => {reportRoleChoice('either')};
$('#huntersel').onclick = () => {reportRoleChoice('hunter')};
$('#spectatesel').onclick = () => {reportRoleChoice('spectator')};

gameSocket.addEventListener('message', (m) => {
	if (m.data === "ROLE_OK"){
		//Role was valid, redirect to waiting room.
		document.location = "waiting.html";
	}
});