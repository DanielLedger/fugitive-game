const { cachedQuery } = require('./getpoint');

class PointProvider {
    async getEscape(border){
        return new Promise((resolve, reject) => {
            reject('No "getEscape" method was provided!');
        });
    }

    async getResultsInBorder(query, border){
        var points = await cachedQuery(this.prepareQuery(query, border));
        return points;
    }

    prepareQuery(query, border){
        var repl;
        if (border.centre !== undefined){
            //Circle, replace {{PREP}} with node(around:rad,lat,lon) -> .possible;
            repl = `nwr(around:${border.radius},${border.centre[0]},${border.centre[1]}) -> .possible;`;
        }
        else {
            //Poly, replace {{PREP}} with node(poly:"lat1 lon1 lat2 lon2...") -> .possible;
            repl = `nwr(poly:"${border.flat().join(" ")}") -> .possible;`;
        }
        return query.replace('{{PREP}}', repl);
    }
}

module.exports.PointProvider = PointProvider;

/*
 * How the escape chooser works:
 * 1) Pick a method of escape from the enabled ones.
 * 2) Call that method's 'getEscape' function.
 * 3) If it resolves, we have a point.
 * 4) If it rejects, go back to step 1 up to 'n' times.
 * 5) If we exceed 'n' tries, use the backup finder.
 * 6) Failing *that*, pick a completely random point in the boundary and hope.
 */