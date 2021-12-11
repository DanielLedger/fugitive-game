function init(app, games, uuidMap){
	app.post("/loc", (req, resp) => {
		var params = req.body[0]; //Contains 4 items: uuid, lat, lon and accuracy.
		console.debug(params);
		var code = uuidMap[params.uuid];
		var game = games[code];
		if (!game.playing){
			resp.sendStatus(423);
		}
		game.onLocation(params.lat, params.lon, params.accuracy, params.uuid);
		resp.sendStatus(204); //No content, but that worked.
	});
}

module.exports.init = init;