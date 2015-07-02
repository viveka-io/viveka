var fs          = require('fs'),
    crypto      = require('crypto'),
    PNG         = require('node-png').PNG,
    domA        = {},
    domB        = {},
    imgA        = [],
    imgB        = [],
    threshold   = 15,
    diff;

function getImageSlice(node, png) {
    var top      = node.offset.top - 1,
        left     = node.offset.left - 1,
        width    = node.offset.width + 2,
        height   = node.offset.height + 2,
        tempPNG;

    left   = Math.max(left, 0);
    top    = Math.max(top, 0);
    height = Math.min(height, png.height - top);
    width  = Math.min(width, png.width - left);

    tempPNG = new PNG({
        width: width,
        height: height,
        filterType: 4
    });

    png.bitblt(tempPNG, left, top, width, height, 0, 0);
    //tempPNG.data = blurImageSlice(tempPNG.data, width, height);
    //tempPNG.data = bilinear(tempPNG.data, width, height, .5);
    //tempPNG.data = bicubic(tempPNG.data, width, height, .5);

    return tempPNG;
}

function comparePixels(a, b) {
    var i;

    if (a === b) return true;

    for (i = 0; i < a.length; i++) {
        if (Math.abs(b[i] - a[i]) > threshold) {
            return false;
        }
    }

    return true;
}

function getPixel(png, x, y) {
    var idx = (y * png.width + x) << 2,
        idxT = ((y - 1) * png.width + x) << 2,
        idxL = (y * png.width + (x - 1)) << 2,
        idxR = (y * png.width + (x + 1)) << 2,
        idxB = ((y + 1) * png.width + x) << 2,
        idxTL = ((y - 1) * png.width + (x - 1)) << 2,
        idxTR = ((y - 1) * png.width + (x + 1)) << 2,
        idxBL = ((y + 1) * png.width + (x - 1)) << 2,
        idxBR = ((y + 1) * png.width + (x + 1)) << 2;

    return [
        Math.round((
            png.data[idx] + png.data[idxT] + png.data[idxL] + png.data[idxR] + png.data[idxB] +
            png.data[idxTL] + png.data[idxTR] + png.data[idxBL] + png.data[idxBR]
        ) / 9),
        Math.round((
            png.data[idx + 1] + png.data[idxT + 1] + png.data[idxL + 1] + png.data[idxR + 1] + png.data[idxB + 1] +
            png.data[idxTL + 1] + png.data[idxTR + 1] + png.data[idxBL + 1] + png.data[idxBR + 1]
        ) / 9),
        Math.round((
            png.data[idx + 2] + png.data[idxT + 2] + png.data[idxL + 2] + png.data[idxR + 2] + png.data[idxB + 2] +
            png.data[idxTL + 2] + png.data[idxTR + 2] + png.data[idxBL + 2] + png.data[idxBR + 2]
        ) / 9)
    ]
}

function compareSlices(a, b) {
    var imgAWidth   = imgA.width,
        imgAHeight  = imgA.height,
        imgBWidth   = imgB.width,
        imgBHeight  = imgB.height,
        aTop        = Math.max(a.offset.top - 1, 0),
        aLeft       = Math.max(a.offset.left - 1, 0),
        aWidth      = Math.min(a.offset.width + 2, imgAWidth - aLeft),
        aHeight     = Math.min(a.offset.height + 2, imgAHeight - aTop),
        bTop        = Math.max(b.offset.top - 1, 0),
        bLeft       = Math.max(b.offset.left - 1, 0),
        bWidth      = Math.min(b.offset.width + 2, imgBWidth - bLeft),
        bHeight     = Math.min(b.offset.height + 2, imgBHeight - bTop),
        width       = Math.min(aWidth, bWidth),
        height      = Math.min(aHeight, bHeight),
        x, y, srcPixel;

        for (y = 1; y < height - 1; y++) {
            for (x = 1; x < width - 1; x++) {
                srcPixel = getPixel(imgA, aLeft + x, aTop + y);

                if (!(comparePixels(srcPixel, getPixel(imgB, bLeft + x, bTop + y)) ||
                      comparePixels(srcPixel, getPixel(imgB, bLeft + x, bTop + y - 1)) ||
                      comparePixels(srcPixel, getPixel(imgB, bLeft + x, bTop + y + 1)) ||
                      comparePixels(srcPixel, getPixel(imgB, bLeft + x + 1, bTop + y)) ||
                      comparePixels(srcPixel, getPixel(imgB, bLeft + x - 1, bTop + y)) )) {
                    //console.log('pix diff:', x, y, a.name, a.offset.left, a.offset.top, a.offset.width, a.offset.height, b.name, b.offset.left, b.offset.top, b.offset.width, b.offset.height);
                    return false;
                }
            }
        }


    //tempPNG = new PNG({
    //    width: Math.ceil(sliceA.width),
    //    height: Math.ceil(sliceA.height),
    //    filterType: 4
    //});
    //
    //tempPNG.data = sliceA.data;
    //
    //fileName = a.name + '-' + a.offset.top + '-' + a.offset.left + '-' + a.offset.width + '-' + a.offset.height + '-A.png';
    //
    //tempPNG.pack().pipe(fs.createWriteStream('public/images/blur/' + fileName).on('close', function() {
    //        console.log(fileName + ' is created.');
    //    })
    //);
    //
    //tempPNG = new PNG({
    //    width: Math.ceil(sliceB.width),
    //    height: Math.ceil(sliceB.height),
    //    filterType: 4
    //});
    //
    //tempPNG.data = sliceB.data;
    //
    //fileName = b.name + '-' + b.offset.top + '-' + b.offset.left + '-' + b.offset.width + '-' + b.offset.height + '-B.png';
    //
    //tempPNG.pack().pipe(fs.createWriteStream('public/images/blur/' + fileName).on('close', function() {
    //        console.log(fileName + ' is created.');
    //    })
    //);

    return true;
}

function isMatchingVisually(a, b) {
    var isVisibleA = a.offset.width > 0 && a.offset.height > 0,
        isVisibleB = b.offset.width > 0 && b.offset.height > 0;

    if (isVisibleA && isVisibleB && isMatchingSize(a, b)) {
        return compareSlices(a, b);
    } else {
        return false;
    }
}

function compare(a, b) {
    var nI, oI, visualMatching,
        compares = [],
        diffObj = {},
        nodesLengthA,
        nodesLengthB;

    if (a && b) {

        nI = isMatchingName(a, b);
        oI = isMatchingOffset(a, b);
        visualMatching = isMatchingVisually(a, b);

        if(!(nI && oI && visualMatching)) {
            if(!nI) { compares.push('NOT_MATCHING_NAME'); }
            if(!visualMatching) { compares.push('NOT_MATCHING_HASH'); }
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
            path:   a.path,
            //hash:   a.hash,
            offset: a.offset
        };
    } else {
        compares.push('NODE_ADDED');
    }

    if (b) {
        diffObj.b = {
            name:   b.name,
            path:   b.path,
            //hash:   b.hash,
            offset: b.offset
        };
    } else {
        compares.push('NODE_REMOVED');
    }

    if (compares.length > 0 ) {
        diffObj.differences = compares;
        diff.push(diffObj);
    }

    if (!visualMatching) {
        nodesLengthA = (a && a.nodes && a.nodes.length) || 0;
        nodesLengthB = (b && b.nodes && b.nodes.length) || 0;

        //console.log('compare:', a && a.name, b && b.name, visualMatching);

        for(var i=0; i < Math.max(nodesLengthA, nodesLengthB); i++) {
            compare(a && a.nodes && a.nodes[i], b && b.nodes && b.nodes[i]);
        }
    }

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
    return (Math.abs(a.width - b.width) < 2 && Math.abs(a.height - b.height) < 2);
}

function sameNodes(a, b) {
    return a && b && isMatchingName(a, b) && isMatchingVisually(a, b) && isMatchingSize(a, b);
}

function removeChildDiffs(diffItem) {
    var i;

    for (i = 0; i < diff.length; i++) {
        if (diff[i].a && diff[i].a.path.indexOf(diffItem.path) != -1) {
            diff[i].deleteA = true;
        }
        if (diff[i].b && diff[i].b.path.indexOf(diffItem.path) != -1) {
            diff[i].deleteB = true;
        }
    }
}

function cleanUpDiff() {
    var i,
        j,
        leftValue,
        rightValue;

    for (j = 0; j < diff.length; j++) {
        for (i = 0; i < diff.length; i++) {

            leftValue  = diff[j];
            rightValue = diff[i];

            if (leftValue.a && rightValue.b && sameNodes(leftValue.a, rightValue.b)) {
                leftValue.differences.push('NODE_ADDED');
                rightValue.differences.push('NODE_REMOVED');
                diff[j].aHasCopy = i;
                diff[i].bHasCopy = j;
                leftValue.deleteA = true;
                rightValue.deleteB = true;
                //removeChildDiffs(diff[j].a);
            }

            if (leftValue.b && rightValue.a && sameNodes(rightValue.a, leftValue.b)) {
                leftValue.differences.push('NODE_REMOVED');
                rightValue.differences.push('NODE_ADDED');
                diff[j].bHasCopy = i;
                diff[i].aHasCopy = j;
                leftValue.deleteB = true;
                rightValue.deleteA = true;
                //removeChildDiffs(diff[j].b);
            }
        }

    }

    diff = diff.filter(function(diffItem, i) {

        if (diffItem.a && diffItem.deleteA) {
            delete diff[i].a;
        }

        if (diffItem.b && diffItem.deleteB) {
            delete diff[i].b;
        }

        if (!diff[i].a && !diff[i].b) {
            return false;
        }


        return true;
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
        domA = a.domTree;
        domB = b.domTree;

        compare(domA.nodes[0], domB.nodes[0]);
        cleanUpDiff();
        cb(diff);
    }
}


module.exports = {
    diff: function(a, b, cb) {
        diff = [];
        compareFingerprints(a, b, cb);
    }
};
