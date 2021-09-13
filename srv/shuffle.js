function shuffle(list){
    //Shuffles this list in-place using Fisher-Yates. Will also return a reference to it for nice function chaining.
    for (var i in list){
        var randIndex = Math.floor(Math.random() * list.length);
        var tmp = list[i];
        list[i] = list[randIndex];
        list[randIndex] = tmp; 
    }
    return list;
}

module.exports.shuffle = shuffle;