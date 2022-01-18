const { PointProvider } = require('./pointprovider');


const { cachedQuery } = require('./getpoint');

class HelicopterEscape extends PointProvider{
    async getEscape(border){
        var results = [];
        //Give us a 50% chance to skip the exciting query (so it's not always that one peak in your playable area)
        if (Math.random() < 0.5){
            console.debug('Running exciting query.');
            results = await this.getResultsInBorder(QUERY_EXCITING, border);
            results = results.features;
        }
        //Now, if results is empty, run our fallback query.
        if (results.length == 0){
            console.debug('Running main query.');
            results = await this.getResultsInBorder(QUERY_FUNCTIONAL, border);
            results = results.features;
        }
        //Now, pick one at random.
        if (results === []){
            //STILL failed (this really really does not bode well)
            return null;
        }
        else {
            return results[Math.floor(Math.random() * results.length)];
        }
    }

    async getResultsInBorder(query, border){
        var points = await cachedQuery(this.prepareQuery(query, border));
        return points;
    }
}

module.exports.HelicopterEscape = HelicopterEscape;
const QUERY_EXCITING = `
/*
Our query should get all possible escape points in a given bbox, then run a series of
checks on them, returning only the points that could be used.
For this particular query, we're canonically escaping by helicopter, so it can be anywhere that
isn't too densely wooded or, you know, inside.

Usual filters of private property or completely inaccessible / dangerous apply here.
*/

/*STEP 0: Global filters*/
[out:json][timeout:60];

/*STEP 0.5: Border-based filtering*/
/* First, make a set of all nodes within our border. We can filter this later. */

{{PREP}}

/*STEP 1: Choosing POIs.*/
/*This can be basically anything distinct.
Since this game is designed to be played outside, we want pickups to ideally be 
dramatic, so we'll use things like wind turbines, distinct trees or castle ruins vs
gates and picnic tables. Note that we NEED to end up with nodes only, ways will be ignored.*/

/*These are the exciting ones, so be quite choosy.*/
(
  /*Single trees*/
  /*node.possible[natural=tree];*/
  /*Mountain peak*/
  node.possible[natural=peak];
  /*Other hill*/
  node.possible[natural=hill];
  /*Uncomment if you want to kill people*/
  /*node.possible[natural=volcano];*/
  /*Distinct rock or stone.*/
  node.possible[natural=rock];
  node.possible[natural=stone];
  /*Cursed rock-arch*/
  node.possible[natural=arch];
  
  /*Wind turbines. Quotes required due to colon.*/
  node.possible["generator:source"=wind];
  
  /*Viewpoint*/
  node.possible[tourism=viewpoint];
  /*Art*/
  node.possible[tourism=art];
  /*Alpine hut (might be privately owned but oh well).*/
  node.possible[tourism=alpine_hut];
  /*Temporary bunkhouse*/
  node.possible[tourism=wilderness_hut];
  
  /*Navigational beacon*/
  node.possible[man_made=beacon];
  
  /*Communication tower, Far-Cry style*/
  node.possible[man_made=communications_tower];
  
  /*Flagpole*/
  node.possible[man_made=flagpole];
  
  /*Lighthouse*/
  node.possible[man_made=lighthouse];
  
  /*Mast*/
  node.possible[man_made=mast];
  
  /*Obelisk*/
  node.possible[man_made=obelisk];
  
  /*Tower*/
  node.possible[man_made=tower];
  
  /*Moist tower*/
  node.possible[man_made=water_tower];
  
) -> .places;

/*STEP 2: Area blacklist.*/
/*
Just because an area matches our tags, doesn't mean it's actually safe or legal to go. This finds any ways marked with things we want to avoid.
*/
(
  nwr.possible[access][access!~"^[yes|public|permissive|]$"][foot!=yes]; /*Anywhere without one of those designations (although UK right-to-roam *might* exempt from parts of this check we can't ensure it)*/
  nwr.possible[foot=no]; /*Explicit no-foot traffic check.*/
  
  /*Check for dangerous landuses or landcover.*/
  nwr.possible[aeroway];
  
  nwr.possible[landuse="^[construction|education|industrial|allotments|farmyard|flowerbed|basin|resevoir|salt_pond|brownfield|depot|greenhouse_horticulture|landfill|military|port|quarry|railway|religious|winter_sports]$"];
  
  /*Don't get hit by a car.*/
  nwr.possible[highway~"^[motorway|trunk|primary]$"];
  
  /*Or a golf ball*/
  nwr.possible[leisure=golf_course];

  /*Seems a bit moist at this evac point.*/
  nwr.possible[natural=water][water!~"^[stream|reflecting_pool|pond|moat]$"];
);

/*STEP 3: Specific checks*/
/*
Canonically, this is a helicopter evacuation, so the area we're leaving from
cannot be wooded, else the pilot won't be
able to get close enough to evacuate.*/

(
  ._; /*This is CRITICAL: make sure to save the bad places from earlier.*/
  
  /*Amusingly, there's no consensus on tagging forests because obviously there isn't. Therefore, we're catering for a few common approaches.*/
  nwr.possible[natural=wood];
  nwr.possible[landuse=forest];
  nwr.possible[landcover=trees];
  /*For the 2 areas that use this*/
  nwr.possible[wood=yes];
);


map_to_area -> .blacklist;

/*STEP 4: The check.*/
/* Take our list of points and run checks on them to ensure they're safe and legal to access. */
node.places(area.blacklist) -> .bad;

(.places; - .bad;);
out qt;`.replace(/\n/g, '').replace(/\/\*.*?\*\//g,'');

const QUERY_FUNCTIONAL = `
/*
Our query should get all possible escape points in a given bbox, then run a series of
checks on them, returning only the points that could be used.
For this particular query, we're canonically escaping by helicopter, so it can be anywhere that
isn't too densely wooded or, you know, inside.

Usual filters of private property or completely inaccessible / dangerous apply here.
*/

/*STEP 0: Global filters*/
[out:json][timeout:60];

/*STEP 0.5: Border-based filtering*/
/* First, make a set of all nodes within our border. We can filter this later. */

{{PREP}}

/*STEP 1: Choosing POIs.*/
/*This can be basically anything distinct.
This query is the backup in case we fail at getting something exciting, so these nodes should be common.*/

/*These are the exciting ones, so be quite choosy.*/
(
  /*Single trees*/
  node.possible[natural=tree];
  /*Gate*/
  node.possible[barrier=gate];
  /*Other gate*/
  node.possible[barrier=kissing_gate];
  /*Picnic site*/
  node.possible[tourism=picnic_site];
  /*Carpark*/
  node.possible[amenity=parking];
  /*Info board*/
  node.possible[information=board];
  /*Signpost*/
  node.possible[information=guidepost];
  
) -> .places;

/*STEP 2: Area blacklist.*/
/*
Just because an area matches our tags, doesn't mean it's actually safe or legal to go. This finds any ways marked with things we want to avoid.
*/
(
  nwr.possible[access][access!~"^[yes|public|permissive|]$"][foot!=yes]; /*Anywhere without one of those designations (although UK right-to-roam *might* exempt from parts of this check we can't ensure it)*/
  nwr.possible[foot=no]; /*Explicit no-foot traffic check.*/
  
  /*Check for dangerous landuses or landcover.*/
  nwr.possible[aeroway];
  
  /*area[landuse="^[yes]$"];*/
  nwr.possible[landuse="^[construction|education|industrial|allotments|farmyard|flowerbed|basin|resevoir|salt_pond|brownfield|depot|greenhouse_horticulture|landfill|military|port|quarry|railway|religious|winter_sports]$"];
  
  /*Don't get hit by a car.*/
  nwr.possible[highway~"^[motorway|trunk|primary]$"];
  
  /*Or a golf ball*/
  nwr.possible[leisure=golf_course];
  
  /*Seems a bit moist at this evac point.*/
  nwr.possible[natural=water][water!~"^[stream|reflecting_pool|pond|moat]$"];
);

/*STEP 3: Specific checks*/
/*
Canonically, this is a helicopter evacuation, so the area we're leaving from
cannot be wooded, else the pilot won't be
able to get close enough to evacuate.*/

(
  ._; /*This is CRITICAL: make sure to save the bad places from earlier.*/
  
  /*Amusingly, there's no consensus on tagging forests because obviously there isn't. Therefore, we're catering for a few common approaches.*/
  nwr.possible[natural=wood];
  nwr.possible[landuse=forest];
  nwr.possible[landcover=trees];
  /*For the 2 areas that use this*/
  nwr.possible[wood=yes];
);


map_to_area -> .blacklist;

/*STEP 4: The check.*/
/* Take our list of points and run checks on them to ensure they're safe and legal to access. */
node.places(area.blacklist) -> .bad;

(.places; - .bad;);
out qt;`.replace(/\n/g, '').replace(/\/\*.*?\*\//g,'');