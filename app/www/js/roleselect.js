function reportRoleChoice(rChoice){
	gameSocket.send(`SELECT ${rChoice}`);
	console.log(`Sending ${rChoice} as role choice.`);
}

document.getElementById('fugitivesel').onclick = () => {reportRoleChoice('fugitive')};
document.getElementById('eithersel').onclick = () => {reportRoleChoice('either')};
document.getElementById('huntersel').onclick = () => {reportRoleChoice('hunter')};
document.getElementById('spectatesel').onclick = () => {reportRoleChoice('spectator')};

gameSocket.addEventListener('message', (m) => {
	if (m.data === "ROLE_OK"){
		//Role was valid, redirect to waiting room (which is TODO).
		document.location = "waiting.html";
	}
});