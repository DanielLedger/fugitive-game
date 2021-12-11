const { randomBytes } = require('crypto');

function getId(){
    var randBuffer = randomBytes(33);
    return randBuffer.toString('base64url');
}

module.exports.getRandId = getId;