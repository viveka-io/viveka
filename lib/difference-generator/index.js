var algorithms  = {
        imageBased: require('./algorithms/image-based.js')
    };

function diff(a, b, cb) {
    // a AND b is a JSON
    return algorithms.imageBased.diff(a, b, cb);
}

module.exports = {
    diff: diff
};
