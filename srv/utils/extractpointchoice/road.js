const { PointProvider } = require('./pointprovider');

const { cachedQuery } = require('./getpoint');

class RoadEscape extends PointProvider{
    async getEscape(border){
        var results = [];
        //Run our query.
        results = (await this.getResultsInBorder(QUERY, border)).features;
        //Now, pick one at random.
        if (results === []){
            //Failed
            return null;
        }
        else {
            return results[Math.floor(Math.random() * results.length)];
        }
    }
}

module.exports.RoadEscape = RoadEscape;
const QUERY = `
/*
Our query should get all possible escape points in a given bbox, then run a series of
checks on them, returning only the points that could be used.
We're escaping via an unspecified offroad vehicle, so we're looking for things like intersections, parking, gates etc.

Usual filters of private property or completely inaccessible / dangerous apply here.
*/

/*STEP 0: Global filters*/
[out:json][timeout:60];

/*STEP 0.5: Border-based filtering*/
/* First, make a set of all nodes within our border. We can filter this later. */

{{PREP}}

/*STEP 1: Choosing POIs.*/
/*For the vehicle escape, we can use anything distinct, and by anything I mean *anything*. However, we should pick a reasonable subset so we don't essentially revert to just picking a random point.*/

/*Find any intersections*/
way.possible[highway~"^(primary|secondary|tertiary|unclassified|residential|living_street|primary_link|secondary_link|tertiary_link|service|track|escape|)$"][smoothness!~"^(horrible|very_horrible|impassable|)$"] -> .drivable;

(
  way.possible[highway~"^(footway|bridleway|steps|path|)$"];
  way.possible[smoothness~"^(horrible|very_horrible|impassable|)$"];
)-> .undrivable;

(
  /*Mountain high-point*/
  node.possible[mountain_pass=yes];
  
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
  
  /*Parking*/
  node.possible[amenity=parking];
  
  /*Crossings*/
  node.possible[highway=crossing];
  /*Note: level crossings deliberately omitted*/
  
  /*Intersections*/
  node(w.drivable)(w.undrivable);
  
  /*Any kind of barrier (that's a node)*/
  node.possible[barrier];
  
  /*Passing place*/
  node.possible[highway=passing_place];
  
  /*Turning areas*/
  node.possible[highway=turning_circle];
  node.possible[highway=turning_loop];
  
  
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


map_to_area -> .blacklist;

/*STEP 4: The check.*/
/* Take our list of points and run checks on them to ensure they're safe and legal to access. */
node.places(area.blacklist) -> .bad;

(.places; - .bad;) -> .safe;

/*STEP 3: Specific checks*/
/*
We're getting out by road, so we need to ensure that we don't give people a point which isn't actually accessible by, say, a tough SUV.

Yes, this is in the wrong order. No, I don't care.*/

node.safe(around.drivable:10);
out qt;`.replace(/\n/g, '').replace(/\/\*.*?\*\//g,'');