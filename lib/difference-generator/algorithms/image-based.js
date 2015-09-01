var fs          = require('fs'),
    PNG         = require('node-png').PNG,
    domA        = {},
    domB        = {},
    imgA        = [],
    imgB        = [],
    debug       = false,
    config      = {
        blur:               !debug,
        movingPixels:       !debug,
        sizeDiff:           debug ? 0 : 1,
        threshold:          debug ? 0 : 15,
        cleanup:            !debug
    },
    diff;

function comparePixels(a, b) {
    var i = 0,
        length = a.length;

    if (a === b) return true;

    for (; i < length; i++) {
        if (Math.abs(b[i] - a[i]) > config.threshold) {
            return false;
        }
    }

    return true;
}

function getPixel(png, x, y) {

    if (config.blur) {
        return getPixelBlur(png, x, y);
    }

    var idx = (y * png.width + x) << 2;

    return [
        png.data[idx],
        png.data[idx + 1],
        png.data[idx + 2]
    ]
}

function getPixelBlur(png, x, y) {
    var width   = png.width,
        idx     = (y * width + x) << 2,
        idxT    = ((y - 1) * width + x) << 2,
        idxL    = (y * width + (x - 1)) << 2,
        idxR    = (y * width + (x + 1)) << 2,
        idxB    = ((y + 1) * width + x) << 2,
        idxTL   = ((y - 1) * width + (x - 1)) << 2,
        idxTR   = ((y - 1) * width + (x + 1)) << 2,
        idxBL   = ((y + 1) * width + (x - 1)) << 2,
        idxBR   = ((y + 1) * width + (x + 1)) << 2;

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
        width       = Math.min(aWidth, bWidth) - 1,
        height      = Math.min(aHeight, bHeight) - 1,
        x,
        y,
        srcPixel,
        bLeftX,
        bTopY;

    for (y = 1; y < height; y++) {
        for (x = 1; x < width; x++) {
            srcPixel = getPixel(imgA, aLeft + x, aTop + y);
            bLeftX = bLeft + x;
            bTopY = bTop + y;

            if (config.movingPixels) {
                if (!(comparePixels(srcPixel, getPixel(imgB, bLeftX, bTopY)) ||
                    comparePixels(srcPixel, getPixel(imgB, bLeftX, bTopY - 1)) ||
                    comparePixels(srcPixel, getPixel(imgB, bLeftX, bTopY + 1)) ||
                    comparePixels(srcPixel, getPixel(imgB, bLeftX + 1, bTopY)) ||
                    comparePixels(srcPixel, getPixel(imgB, bLeftX - 1, bTopY)) )) {
                    return false;
                }
            } else {
                if (!(comparePixels(srcPixel, getPixel(imgB, bLeftX, bTopY)))) {
                    return false;
                }
            }
        }
    }

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
    var nameMatching,
        offsetMatching,
        visualMatching,
        styleMatching,
        differences = [],
        diffObj = {},
        nodesLengthA,
        nodesLengthB,
        i = 0,
        length;

    if (a && b) {

        nameMatching = isMatchingName(a, b);
        offsetMatching = isMatchingOffset(a, b);
        styleMatching = isMatchingStyle(a, b);

        if (!(nameMatching && offsetMatching && styleMatching)) {

            if (!nameMatching) { differences.push('NOT_MATCHING_NAME'); }

            if (!offsetMatching && a && b) {
                if (a.offset.width > b.offset.width)    { differences.push('OFFSET_WIDTH_LOWER'); }
                if (a.offset.width < b.offset.width)    { differences.push('OFFSET_WIDTH_HIGHER'); }
                if (a.offset.height > b.offset.height ) { differences.push('OFFSET_HEIGHT_LOWER'); }
                if (a.offset.height < b.offset.height ) { differences.push('OFFSET_HEIGHT_HIGHER'); }
                if (a.offset.left > b.offset.left)      { differences.push('OFFSET_X_LOWER'); }
                if (a.offset.left < b.offset.left)      { differences.push('OFFSET_X_HIGHER'); }
                if (a.offset.top > b.offset.top)        { differences.push('OFFSET_Y_LOWER'); }
                if (a.offset.top < b.offset.top)        { differences.push('OFFSET_Y_HIGHER'); }
            }
        }

        if (!styleMatching) {
            differences.push('NOT_MATCHING_STYLE');
        }

        if (styleMatching && isMatchingSize(a, b)) {
            visualMatching = isMatchingVisually(a, b);
        } else {
            visualMatching = false;
        }

        if(!visualMatching) {
            differences.push('NOT_MATCHING_VISUALLY');
        }
    }

    if (a) {
        diffObj.a = {
            name:   a.name,
            path:   a.path,
            offset: a.offset,
            style:  a.style
        };
    } else {
        differences.push('NODE_ADDED');
    }

    if (b) {
        diffObj.b = {
            name:   b.name,
            path:   b.path,
            offset: b.offset,
            style:  b.style
        };
    } else {
        differences.push('NODE_REMOVED');
    }

    if (differences.length > 0 ) {
        diffObj.differences = differences;
        diff.push(diffObj);
    }

    if (!visualMatching) {
        nodesLengthA = (a && a.nodes && a.nodes.length) || 0;
        nodesLengthB = (b && b.nodes && b.nodes.length) || 0;

        length = Math.max(nodesLengthA, nodesLengthB);

        for(; i < length; i++) {
            compare(a && a.nodes && a.nodes[i], b && b.nodes && b.nodes[i]);
        }
    }

}

function isMatchingStyle(a, b) {
    var filteredAttributes = [ 'top', 'left', 'right', 'bottom', 'width', 'height', 'perspective-origin', 'transform-origin', 'cursor' ];

    filteredAttributes.forEach(function(attribute) {
        delete a.style[attribute];
        delete b.style[attribute];
    });

    return JSON.stringify(a.style) === JSON.stringify(b.style);
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
    return (Math.abs(a.width - b.width) <= config.sizeDiff && Math.abs(a.height - b.height) <= config.sizeDiff);
}

function sameNodes(a, b) {
    return a && b && isMatchingName(a, b) && isMatchingSize(a, b) && isMatchingStyle(a, b) && isMatchingVisually(a, b);
}

function cleanUpDiff() {
    var i, j,
        length = diff.length,
        leftValue,
        rightValue;

    for (j = 0; j < length; j++) {
        for (i = 0; i < length; i++) {

            leftValue  = diff[j];
            rightValue = diff[i];

            if (leftValue.a && rightValue.b && sameNodes(leftValue.a, rightValue.b)) {
                if (leftValue.differences.indexOf('NODE_ADDED') === -1) { leftValue.differences.push('NODE_ADDED'); }
                if (rightValue.differences.indexOf('NODE_REMOVED') === -1) { rightValue.differences.push('NODE_REMOVED'); }
                diff[j].aHasCopy = i;
                diff[i].bHasCopy = j;
                leftValue.deleteA = true;
                rightValue.deleteB = true;
            }

            if (leftValue.b && rightValue.a && sameNodes(rightValue.a, leftValue.b)) {
                if (leftValue.differences.indexOf('NODE_REMOVED') === -1) { leftValue.differences.push('NODE_REMOVED'); }
                if (rightValue.differences.indexOf('NODE_ADDED') === -1) { rightValue.differences.push('NODE_ADDED'); }
                diff[j].bHasCopy = i;
                diff[i].aHasCopy = j;
                leftValue.deleteB = true;
                rightValue.deleteA = true;
            }
        }

    }

    if (config.cleanup) {
        diff = diff.filter(function(diffItem, i) {

            var pixelsChangedOnly = diffItem.differences.indexOf('NOT_MATCHING_VISUALLY') > -1 &&
                                    diffItem.differences.indexOf('NOT_MATCHING_STYLE') === -1 &&
                                    diffItem.differences.indexOf('NODE_ADDED') === -1 &&
                                    diffItem.differences.indexOf('NODE_REMOVED') === -1;

            diff.forEach(function(item, index) {
                if (diffItem.a && item.a && diffItem.differences.indexOf('NODE_REMOVED') > -1 && diffItem.a.path !== item.a.path && diffItem.a.path.indexOf(item.a.path) > -1) {
                    diffItem.deleteA = true;
                }
                if (diffItem.b && item.b && diffItem.differences.indexOf('NODE_ADDED') > -1 && diffItem.b.path !== item.b.path && diffItem.b.path.indexOf(item.b.path) > -1) {
                    diffItem.deleteB = true;
                }
            });

            if (diffItem.a && (diffItem.deleteA || pixelsChangedOnly)) {
                delete diff[i].a;
                delete diff[i].deleteA;
                delete diff[i].aHasCopy;
            }

            if (diffItem.b && (diffItem.deleteB || pixelsChangedOnly)) {
                delete diff[i].b;
                delete diff[i].deleteB;
                delete diff[i].bHasCopy;
            }

            return diff[i].a || diff[i].b;
        });

    }

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
