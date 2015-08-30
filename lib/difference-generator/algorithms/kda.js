var diff = [];

function compare(a, b) {
    var nI, oI, hI,
        compares = [],
        diffObj = {};

    if (a && b) {

        nI = isMatchingName(a, b);
        oI = isMatchingOffset(a, b);
        hI = isMatchingHash(a, b);


        if(!(nI && oI && hI)) {
            if(!nI) { compares.push('NOT_MATCHING_NAME'); }
            if(!hI) { compares.push('NOT_MATCHING_HASH'); }
            if(!oI && a && b) {
                if (a.offset.width > b.offset.width) { compares.push('OFFSET_WIDTH_LOWER'); }
                if (a.offset.width < b.offset.width) { compares.push('OFFSET_WIDTH_HIGHER'); }
                if (a.offset.height > b.offset.height ) { compares.push('OFFSET_HEIGHT_LOWER'); }
                if (a.offset.height < b.offset.height ) { compares.push('OFFSET_HEIGHT_HIGHER'); }
                if (a.offset.left > b.offset.left) { compares.push('OFFSET_X_LOWER'); }
                if (a.offset.left < b.offset.left) { compares.push('OFFSET_X_HIGHER'); }
                if (a.offset.top > b.offset.top) { compares.push('OFFSET_Y_LOWER'); }
                if (a.offset.top < b.offset.top) { compares.push('OFFSET_Y_HIGHER'); }
            }
        }
    }

    if (a) {
        diffObj.a = {
            name:   a.name,
            offset: a.offset,
            hash:   a.hash
        };
    } else {
        compares.push('NODE_ADDED');
    }

    if (b) {
        diffObj.b = {
            name:   b.name,
            offset: b.offset,
            hash:   b.hash
        };
    } else {
        compares.push('NODE_REMOVED');
    }

    if (compares.length > 0 ) {
        diffObj.differences = compares;
        diff.push(diffObj);
    }

    if (a && b && a.nodes && b.nodes) {
        for(var i=0; i < Math.max(a.nodes.length, b.nodes.length); i++) {
            compare(a.nodes[i], b.nodes[i]);
        }
    }
}

function isMatchingHash(a, b) {
    return (a.hash === b.hash);
}

function isMatchingName(a, b) {
    return (a.name === b.name);
}

function isMatchingOffset(a, b) {
    a = a.offset;
    b = b.offset;
    return (a.width === b.width && a.height === b.height && a.left === b.left && a.top === b.top);
}

function isMatchingSize(a, b) {
    a = a.offset;
    b = b.offset;
    return (a.width === b.width && a.height === b.height);
}

function sameNodes(a, b) {
    return a && b && isMatchingName(a, b) && isMatchingHash(a, b) && isMatchingSize(a, b);
}

function cleanUpDiff(diffs) {
    return diffs.filter(function (value, index) {
        var i;

        for (i = index+1; i < diffs.length; i++) {

            if (value.a && diffs[i].b && sameNodes(value.a, diffs[i].b)) {
                value.differences.push('NODE_ADDED');
                diffs[i].differences.push('NODE_REMOVED');
                delete value.a;
                delete diffs[i].b;
            }

            if (value.b && diffs[i].a && sameNodes(value.b, diffs[i].a)) {
                value.differences.push('NODE_REMOVED');
                diffs[i].differences.push('NODE_ADDED');
                delete value.b;
                delete diffs[i].a;
            }
        }

        return value.a || value.b;

    });
}

module.exports = {
    diff: function(a, b) {
        diff = [];
        compare(a.nodes[0], b.nodes[0]);
        return cleanUpDiff(diff);
    }
};
