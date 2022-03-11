const FUDGE_FACTOR = 0.95; //Apply some leeway to circular borders, making them slightly bigger than they appear to account for inaccuracy

function isInBorder(centre, radius, border){
    console.log(border);
    if (border.centre !== undefined){
        //Check if the point is in the radius first. Because maths, we need to use the Haversine formula to calculate the distance in metres.
        var earthRad = 6731e3;
        var latRad1 = centre[0] * Math.PI * 1/180;
        var latRad2 = border.centre[0] * Math.PI * 1/180;
        var latRadDelta = (centre[0] - border.centre[0]) * Math.PI * 1/180;
        var lonRadDelta = (centre[1] - border.centre[1]) * Math.PI * 1/180;

        var a = Math.pow(Math.sin(latRadDelta/2), 2) +
            Math.cos(latRad1) * Math.cos(latRad2) * 
            Math.pow(Math.sin(lonRadDelta/2), 2);

        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

        var distFromCentre = earthRad * c * FUDGE_FACTOR;

        var maxAllowedDist = border.radius + radius; //If the point is more than this away, the circles cannot touch.

        console.log(`Central distance: ${distFromCentre}, max allowed is ${maxAllowedDist}`);

        return distFromCentre <= maxAllowedDist;
    }
    else {
        //Test for whether or not you're in a polygon: draw a line from point to infinity (will draw due north for simplicity)
        //If we cross the polygon an odd number of times in total, we're inside it. Else, we're outside.
        //I think playing near the north pole will break this, so don't do that.
        var crosses = 0;
        for (var i = 0; i < border.length; i++){
            //For each number
            var p1 = border[i];
            var p2 = border[(i+1) % border.length];
            if (doesLineIntersect(p1, p2, centre[1], centre[0])){
                crosses++;
            }
        }
        return (crosses & 1) == 1;
    }
}

function doesLineIntersect(llMin, llMax, lonTest, latitudeBase){
    //Tests if a line between two points intersects this specific line of longitude, at a point above the specified latitude.
    var lonMin = llMin[1];
    var lonMax = llMax[1];
    //If both points are on the same side of lonTest, they can't intersect.
    if ((lonMin < lonTest && lonMax < lonTest) || (lonMin > lonTest && lonMax > lonTest)){
        return false;
    }
    else {
        //Make sure the intersect is above 'latitudeBase' (a.k.a the intersect latitude > latitudeBase)
        /*y - y1 = m(x - x1)
        Therefore, y = m(x - x1) + y1
        Latitude is y because that works from an intuitive perspective.
        */
       var m = (llMin[0] - llMax[0])/(llMin[1] - llMax[1]);
       var y = m*(lonTest - llMin[1]) + llMin[0];
       return y > latitudeBase;
    }
}

function getBBox(border){
    //Gets the smallest rectangle which fully contains the border. Returns a list [south,west,north,east] (for OSM compatibility)
    if (border.centre !== undefined){
        //Circular border, use the radius to calculate the border.
        //Once again, I forgot that the radius is in metres but the co-ordinates are lat-lon. 
        var cent = border.centre;
        var rad = border.radius;
        return [cent[0] - rad, cent[1] - rad, cent[0] + rad, cent[1] + rad];
    }
    else {
        //Reduce over our points list. Thanks haskell for this programming style.
        return border.reduce((running, point) => [Math.min(running[0], point[0]), Math.min(running[1], point[1]), Math.max(running[2], point[0]), Math.max(running[3], point[1])], [999999, 999999, -999999, -999999]);
    }
}

module.exports.isInBorder = isInBorder;
module.exports.getBBox = getBBox;