var algorithms  = {
        KDA:        require('./algorithms/kda.js'),
        imageBased: require('./algorithms/image-based.js')
    };

function diff(a, b, cb) {
    // a AND b is a JSON
    //return algorithms.KDA.diff(a.domTree, b.domTree);
    return algorithms.imageBased.diff(a, b, cb);
}

module.exports = {
    diff: diff
};
