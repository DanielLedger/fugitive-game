const config = require('config');
const port = config.get("Server.Port");
const mapbox_token = config.get("Mapbox.Token");

//Get express and initialise it.
const express = require('express');
const app = express();

//Test server
app.get("/", (req, resp) => {
	resp.send(mapbox_token);
});

app.listen(port, () => {
	console.log("Application started.");
});