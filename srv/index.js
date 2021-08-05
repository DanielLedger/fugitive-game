const config = require('config');
const port = config.get("Server.Port");
const mapbox_token = config.get("Mapbox.Token");

//Get express and initialise it.
const express = require('express');
const app = express();

//Import additional routes defined in other files.
require('./maproutes').init(mapbox_token, app);

//Test server
app.get("/", (req, resp) => {
	resp.send(mapbox_token);
});

app.listen(port, () => {
	console.log("Application started on port " + port + ".");
});