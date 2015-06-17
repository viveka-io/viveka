var fs          = require('fs'),
    PNG         = require('node-png').PNG,
    domA        = {},
    domB        = {},
    imgA        = [],
    imgB        = [],
    threshold   = 10,
    diff;

function getImageSlice(node, png) {
    var top      = node.offset.top,
        left     = node.offset.left,
        width    = node.offset.width,
        height   = node.offset.height,
        tempPNG;

    tempPNG = new PNG({
        width: width,
        height: height,
        filterType: 4
    });

    png.bitblt(tempPNG, left, top, width, height, 0, 0);

    return tempPNG.data;
}

function comparePixels(a, b) {
    var i;

    if (a === b) return true;

    for (i=0; i < a.length; i++) {
        if (Math.abs(b[i] - a[i]) > threshold) {
            return false;
        }
    }

    return true;
}

function compareSlices(a, b) {
    var sliceA = getImageSlice(a, imgA),
        sliceB = getImageSlice(b, imgB);

    return comparePixels(sliceA, sliceB);
}

function compare(a, b) {
    var nI, oI, hI,
        compares = [],
        diffObj = {};

    if (a && b) {

        nI = isMatchingName(a, b);
        oI = isMatchingOffset(a, b);
        hI = isMatchingVisually(a, b);


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

    if (!hI && a && b && a.nodes && b.nodes) {
        for(var i=0; i < Math.max(a.nodes.length, b.nodes.length); i++) {
            compare(a.nodes[i], b.nodes[i]);
        }
    }
}

function isMatchingVisually(a, b) {
    return isMatchingSize(a, b) && compareSlices(a, b);
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
    return a && b && isMatchingName(a, b) && isMatchingVisually(a, b) && isMatchingSize(a, b);
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

function compareFingerprints(a, b, cb) {
    var imgUrlA = 'public' + a.screenshot,
        imgUrlB = 'public' + b.screenshot;

    fs.createReadStream(imgUrlA)
        .pipe(new PNG({
            filterType: 4
        }))
        .on('parsed', function() {
            a.png = this;
            processImages(a, b, cb);
        });

    fs.createReadStream(imgUrlB)
        .pipe(new PNG({
            filterType: 4
        }))
        .on('parsed', function() {
            b.png = this;
            processImages(a, b, cb);
        });
}

function processImages(a, b, cb) {
    if (a.png && b.png) {
        imgA = a.png;
        imgB = b.png;
        domA = JSON.parse(a.domTree);
        domB = JSON.parse(b.domTree);

        compare(domA.nodes[0], domB.nodes[0]);
        cleanUpDiff(diff);
        cb(diff);

    }
}


module.exports = {
    diff: function(a, b, cb) {
        diff = [];
        compareFingerprints(a, b, cb);
    }
};
