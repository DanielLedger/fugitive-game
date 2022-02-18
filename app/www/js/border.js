class Border {

    isInBorder; //A method which takes a centre and radius, and outputs a boolean: true if the circle is at all in the border, false if not.

    info;

    /*initObj should be either:
    1) A 2d array of points
    2) An object with a .centre attribute and a .radius attribute.
    */
    constructor(initObj){
        this.info = initObj;
        if (initObj.centre !== undefined){
            //Circlular border, define isInBorder for a circle.
            this.isInBorder = (centre, radius) => {
                //Check if the point is in the radius first. Because maths, we need to use the Haversine formula to calculate the distance in metres.
                var earthRad = 6731e3;
                var latRad1 = centre[0] * Math.PI * 1/180;
                var latRad2 = this.info.centre[0] * Math.PI * 1/180;
                var latRadDelta = (centre[0] - this.info.centre[0]) * Math.PI * 1/180;
                var lonRadDelta = (centre[1] - this.info.centre[1]) * Math.PI * 1/180;

                var a = Math.pow(Math.sin(latRadDelta/2), 2) +
                    Math.cos(latRad1) * Math.cos(latRad2) * 
                    Math.pow(Math.sin(lonRadDelta), 2);

                var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

                var distFromCentre = earthRad * c;

                var maxAllowedDist = this.info.radius + radius; //If the point is more than this away, the circles cannot touch.
                console.log(`Distance: ${distFromCentre}, Maximum permitted distance: ${maxAllowedDist}`);
                return distFromCentre <= maxAllowedDist;
            };
        }
        else {
            //TODO: Write linear inequality setup thing.
            this.isInBorder = (centre, radius) => {
                //Test for whether or not you're in a polygon: draw a line from point to infinity (will draw due north for simplicity)
                //If we cross the polygon an odd number of times in total, we're inside it. Else, we're outside.
                //I think playing near the north pole will break this, so don't do that.
                var crosses = 0;
                for (var i in this.info){
                    //For each number
                    var p1 = this.info[i];
                    var p2 = this.info[(i+1) % this.info.length];
                    if (this.doesLineIntersect(p1, p2, centre[1], centre[0])){
                        crosses++;
                    }
                }
                //Return true if the number of crossings is odd.
                return (crosses & 1) == 1;
            }
        }
    }
    
    static areSame(b1, b2){
        try {
            //Check their types first.
            if (b1.isCircle() !== b2.isCircle()){return false;}
            if (b1.isCircle()){
                return b1.getRadius() === b2.getRadius() && b1.getCentre()[0] === b2.getCentre()[0] && b1.getCentre()[1] === b2.getCentre()[1];
            }
            else {
                //Just got to iterate though the points.
                var p1 = b1.getPoints();
                var p2 = b2.getPoints();
                if (p1.length !== p2.length){return false;}
                for (var i in p1){
                    if (p1[i][0] === p2[i][0] && p1[i][1] === p2[i][1]){
                        continue;
                    }
                    else {
                        return false;
                    }
                }
                return true; //Same border.
            }
        }
        catch (TypeError){
            return false; //One is undefined.
        }
    }

    doesLineIntersect(llMin, llMax, lonTest, latitudeBase){
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

    //storeInLayer isn't written directly, however it is how the function knows if it needs to edit/remove the old indicator.
    render (storeInLayer, map, fitTo){
        if (storeInLayer !== undefined){
            storeInLayer.remove();
        }
        if (this.info.centre !== undefined){
            //Draw a circle.
            storeInLayer = L.circle(this.info.centre, {radius: this.info.radius, fill: false, color: '#ff0000', opacity: 1});
            storeInLayer.addTo(map);
        }
        else {
            //Verify the data.
            if (this.info === []){
                return null; //Can't draw anything.
            }
            //Draw a polygon
            storeInLayer = L.polygon(this.info, {fill: false, color: '#ff0000', opacity: 1});
            storeInLayer.addTo(map);
        }
        if (fitTo){
            map.fitBounds(storeInLayer.getBounds()); //Zoom the map to show the border.
        }
        return storeInLayer;
    }

    isCircle() {
        return this.info.centre !== undefined;
    }

    isPoly() {
        return !this.isCircle();
    }

    getCentre() {
        return this.info.centre; //If poly, will return undefined (which is correct)
    }

    getRadius() {
        return this.info.radius;
    }

    getPoints() {
        if (this.isCircle()){
            return undefined;
        }
        else {
            return this.info;
        }
    }

}