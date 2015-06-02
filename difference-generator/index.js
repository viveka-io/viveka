var algorithms  = {
        KDA: require('./algorithms/kda.js')
    };

function diff(a, b) {
    // a AND b is a JSON
    return algorithms.KDA.diff(a, b);
}

module.exports = {
    diff: diff
};
