const config = require('config');
const port = config.get("Server.Port");

//Get express and initialise it.
const express = require('express');
const app = express();

//Import additional routes defined in other files.
require('./maproutes').init(config, app);

app.listen(port, () => {
	console.log("Application started on port " + port + ".");
});