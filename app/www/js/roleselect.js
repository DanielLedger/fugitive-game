function reportRoleChoice(rChoice){
	gameSocket.send(`SELECT ${rChoice}`);
	console.log(`Sending ${rChoice} as role choice.`);
}

document.getElementById('fugitivesel').onclick = () => {reportRoleChoice('fugitive')};
document.getElementById('eithersel').onclick = () => {reportRoleChoice('either')};
document.getElementById('huntersel').onclick = () => {reportRoleChoice('hunter')};
document.getElementById('spectatesel').onclick = () => {reportRoleChoice('spectator')};