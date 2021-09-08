class Border {

    isInBorder; //A method which takes a centre and radius, and outputs a boolean: true if the circle is at all in the border, false if not.

    info;

    /*initObj should be either:
    1) A 2d array of points (not implemented yet)
    2) An object with a .centre attribute and a .radius attribute.
    */
    constructor(initObj){
        this.info = initObj;
        if (initObj.centre !== undefined){
            //Circlular border, define isInBorder for a circle.
            this.isInBorder = (centre, radius) => {
                //Check if the point is in the radius first.
                var distFromCentre = Math.hypot(centre[0] - this.info.centre[0], centre[1] - this.info.centre[1]);
                var maxAllowedDist = this.info.centre + radius; //If the point is more than this away, the circles cannot touch.
                return distFromCentre <= maxAllowedDist;
            };
        }
    }
    
    //storeInLayer isn't written directly, however it is how the function knows if it needs to edit/remove the old indicator.
    render (storeInLayer, map){
        if (storeInLayer !== undefined){
            storeInLayer.remove();
        }
        if (this.info.centre !== undefined){
            //Draw a circle.
            storeInLayer = L.circle(this.info.centre, {radius: this.info.radius, fill: false, color: '#ff0000', opacity: 1});
            storeInLayer.addTo(map);
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

}