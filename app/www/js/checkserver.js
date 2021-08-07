var serverIP = window.sessionStorage.getItem('GameIP');

if (serverIP === null) {
	//No connected server, redirect to the main page.
	document.location = "index.html"
}

//TODO: Actually check if the server IP is valid or not.