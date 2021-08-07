const got = require('got');

const fs = require('fs');

function init(config, app){
	var mapbox_token = config.get("Mapbox.Token");
	if (mapbox_token === 'YOUR_TOKEN_HERE'){
		console.error('Please create a copy of the config and add an actual mapbox token to the file!');
		process.exit(1); //End immediately.
	}
	
	var tileset = config.get("Mapbox.Tileset");
	
	var req_url = `https://api.mapbox.com/v4/${tileset}/{z}/{x}/{y}@2x.jpg90`; //The URL we're sending the request to. TODO make this configurable.
	var cache_dir = `./cache/tiles/${tileset}`;
	var file_path = `${cache_dir}/{z}_{x}_{y}.jpeg`;
	
	fs.mkdirSync(cache_dir, {recursive: true}); //Creates the cache (needed before requests can be handled, so may as well be sync).
	
	async function getMapboxTile(x, y, z){
		//Gets a mapbox tile from mapbox (unsurprisingly). Annoyingly, this needs to be done by hand, since there's no obvious way to use the API.
		sendto = req_url.replace('{x}', x).replace('{y}', y).replace('{z}', z);
		console.debug(sendto);
		resp = await got.get(sendto, {searchParams: {access_token: mapbox_token}});
		console.debug(resp.statusCode);
		return resp.rawBody;
	}
	
	async function cacheTile(fpath, data){
		try{
			var f = await fs.promises.open(fpath, "w");
			f.write(data);
		}
		finally{
			if (f){
				await f.close();
			}
		}
	}
	
	app.get("/tile", (req, res) => {
		var params = req.query;
		//Prevents minor directory traversal (by setting one of x,y,z to a path relative to the cache directory) and also error handling.
		var x = Number(params.x);
		var y = Number(params.y);
		var z = Number(params.z);
		console.debug("Getting tile " + x + "," + y + "," + z);
		var fpath = file_path.replace('{x}', x).replace('{y}', y).replace('{z}', z);
		fs.promises.open(fpath).then((f) => {
			//Image is cached
			f.readFile().then((img) => {
				console.debug("Serving tile " + x + "," + y + "," + z + " from file location " + fpath)
				res.type('.jpeg');
				res.send(img);
				f.close();
			});
		},
		() => {
			getMapboxTile(x, y, z).then((img) => {
				res.type('.jpeg');
				res.send(img);
				//Now, cache the file.
				console.debug("Caching tile " + x + "," + y + "," + z + " at file location " + fpath);
				cacheTile(fpath, img);
			},
			(err) => {
				console.error(err);
				res.sendStatus(500);
			});
		});
	});
}

module.exports.init = init;