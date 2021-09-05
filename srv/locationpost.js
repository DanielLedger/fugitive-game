function init(app, games, uuidMap){
	app.post("/loc", (req, resp) => {
		var params = req.params; //Contains 4 items: uuid, lat, lon and accuracy.
		var code = uuidMap[params.uuid];
		var game = games[code];
		if (!game.playing){
			resp.sendStatus(423);
		}
		var str = `${params.lat},${params.lon},${params.accuracy}`
		game.postLocation(params.uuid, str, game);
		resp.sendStatus(204); //No content, but that worked.
	});
}