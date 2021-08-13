const config = require('config');

const port = config.get("Server.Port");

//Get express and initialise it.
const express = require('express');
const app = express();

//Load and setup ExpressWS
const expressWS = require('express-ws')(app);

//Import additional routes defined in other files.
require('./maproutes').init(config, app);


if (!config.get('Server.SSL.Enabled')){
	app.listen(port, () => {
		console.log("Application started on port " + port + ".");
	});	
}
else {
	//Set up SSL (since SSL must be provided one way or another, there will be no insecure port).
	const https = require('https');
	const fs = require('fs');
	var key = fs.readFileSync(config.get('Server.SSL.Key'));
	var cert = fs.readFileSync(config.get('Server.SSL.Cert'));
	
	var srv = https.createServer({key: key, cert: cert, ciphers: "DEFAULT:!SSLv2:!RC4:!EXPORT:!LOW:!MEDIUM:!SHA1"}, app);
	srv.listen(port, () => {
		console.log("HTTPS application started on port " + port + ".");
	});	
}