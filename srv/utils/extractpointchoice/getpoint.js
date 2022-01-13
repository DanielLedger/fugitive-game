//Generates points in an area that actually make sense and can be accessed (e.g. not in water or anything like that)

const osmquery = require('query-overpass');

/*
NOTE: Due to the license of the module that this requires, if you are sexist, racist, homophobic, transphobic or similar
you need to rewrite this file from scratch to not use the query-overpass module.
*/

var areaQueryCache = {}; //Caches areas so we don't hit the OSM API 6 million times.

var options = {
    overpassUrl: "https://overpass.kumi.systems/api/interpreter" //Hits Kumi Systems' overpass instance, which is generally more performant
    //It also doesn't throw 429 errors every 5 seconds, unlike the regular one.
}

async function osmQueryPromise(query, opt){
    return new Promise((resolve, reject) => {
        osmquery(query, (err, data) => {
            if (err !== undefined){
                return reject(err);
            }
            else {
                return resolve(data);
            }
        }, opt);
    });
}

async function cachedQuery(query){
    console.debug(`Running OSM overpass query ${query}`);
    if (areaQueryCache[query] === undefined){
        //We need to get the response.
        var resp = await osmQueryPromise(query, options);
        areaQueryCache[query] = resp;
    }
    return areaQueryCache[query];
}

//cachedQuery('[out:json][timeout:25];(node["amenity"="drinking_water"](50.8871,-1.4867,50.9580,-1.2834););out body;>;out skel qt;').then(console.log, console.log);
//Test query
/*
[out:json][timeout:25];
// gather results
(
  // query part for: “"Drinking Water"”
  node["amenity"="drinking_water"](50.8871,-1.4867,50.9580,-1.2834);
);
// print results
out body;
>;
out skel qt;*/

module.exports.cachedQuery = cachedQuery;