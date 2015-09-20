var fs          = require('fs'),
    _           = require('lodash'),
    log         = require('./logger')('difference-generator', 'red'),
    PNG         = require('node-png').PNG,
    debug       = false,
    config      = {
        blur: !debug,
        movingPixels: !debug,
        sizeDiff: debug ? 0 : 1,
        threshold: debug ? 0 : 15,
        cleanup: !debug,
        filterParentDiffs: !debug
    };

function comparePixels(a, b) {
    if (a === b) {
        return true;
    }

    for (let i = 0; i < a.length; i++) {
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

    const idx = y * png.width + x << 2;

    return [
        png.data[idx],
        png.data[idx + 1],
        png.data[idx + 2]
    ];
}

function getPixelBlur(png, x, y) {
    var width   = png.width,
        idx     = y * width + x << 2,
        idxT    = (y - 1) * width + x << 2,
        idxL    = y * width + (x - 1) << 2,
        idxR    = y * width + (x + 1) << 2,
        idxB    = (y + 1) * width + x << 2,
        idxTL   = (y - 1) * width + (x - 1) << 2,
        idxTR   = (y - 1) * width + (x + 1) << 2,
        idxBL   = (y + 1) * width + (x - 1) << 2,
        idxBR   = (y + 1) * width + (x + 1) << 2;

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
    ];
}

function compareSlices(a, imgA, b, imgB) {
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
            } else if (!comparePixels(srcPixel, getPixel(imgB, bLeftX, bTopY))) {
                return false;
            }
        }
    }

    return true;
}

function isMatchingVisually(a, imgA, b, imgB) {
    var isVisibleA = a.offset.width > 0 && a.offset.height > 0,
        isVisibleB = b.offset.width > 0 && b.offset.height > 0;

    if (isVisibleA && isVisibleB && isMatchingSize(a, b)) {
        return compareSlices(a, imgA, b, imgB);
    }

    return false;
}

function compare(a, imgA, b, imgB) {
    var result = [],
        nameMatching,
        offsetMatching,
        visualMatching,
        styleMatching,
        differences = [],
        diffObj = {},
        nodesLengthA,
        nodesLengthB;

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
            visualMatching = isMatchingVisually(a, imgA, b, imgB);
        } else {
            visualMatching = false;
        }

        if(!visualMatching) {
            differences.push('NOT_MATCHING_VISUALLY');
        }
    }

    if (a) {
        diffObj.a = {
            name: a.name,
            path: a.path,
            offset: a.offset,
            style: a.style
        };
    } else {
        differences.push('NODE_ADDED');
    }

    if (b) {
        diffObj.b = {
            name: b.name,
            path: b.path,
            offset: b.offset,
            style: b.style
        };
    } else {
        differences.push('NODE_REMOVED');
    }

    if (differences.length > 0 ) {
        diffObj.differences = differences;
        result.push(diffObj);
    }

    if (!visualMatching) {
        nodesLengthA = a && a.nodes && a.nodes.length || 0;
        nodesLengthB = b && b.nodes && b.nodes.length || 0;

        const length = Math.max(nodesLengthA, nodesLengthB);

        for(let i = 0; i < length; i++) {
            result = result.concat(compare(a && a.nodes && a.nodes[i], imgA, b && b.nodes && b.nodes[i], imgB));
        }
    }

    return result;
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
    return a.name === b.name;
}

function isMatchingOffset(a, b) {
    a = a.offset;
    b = b.offset;
    return a.width === b.width && a.height === b.height && a.left === b.left && a.top === b.top;
}

function isInside(innerNode, outerNode) {
    var innerOffset = innerNode.offset,
        outerOffset = outerNode.offset,
        iLeft       = innerOffset.left,
        iTop        = innerOffset.top,
        iRight      = iLeft + innerOffset.width,
        iBottom     = iTop + innerOffset.height,
        oLeft       = outerOffset.left,
        oTop        = outerOffset.top,
        oRight      = oLeft + outerOffset.width,
        oBottom     = oTop + outerOffset.height;

    return iLeft >= oLeft && iTop >= oTop && iRight <= oRight && iBottom <= oBottom;
}

function isMatchingSize(a, b) {
    a = a.offset;
    b = b.offset;
    return Math.abs(a.width - b.width) <= config.sizeDiff && Math.abs(a.height - b.height) <= config.sizeDiff;
}

function sameNodes(a, imgA, b, imgB) {
    return a && b && isMatchingName(a, b) && isMatchingSize(a, b) && isMatchingStyle(a, b) && isMatchingVisually(a, imgA, b, imgB);
}

function cleanUpDiff(diff, imgA, imgB) {
    var result = _.clone(diff),
        leftValue,
        rightValue;

    for (let j = 0; j < diff.length; j++) {
        for (let i = 0; i < diff.length; i++) {

            leftValue  = diff[j];
            rightValue = diff[i];

            if (leftValue.a && rightValue.b && sameNodes(leftValue.a, imgA, rightValue.b, imgB)) {
                if (leftValue.differences.indexOf('NODE_ADDED') === -1) { leftValue.differences.push('NODE_ADDED'); }
                if (rightValue.differences.indexOf('NODE_REMOVED') === -1) { rightValue.differences.push('NODE_REMOVED'); }
                diff[j].aHasCopy = i;
                diff[i].bHasCopy = j;
                leftValue.deleteA = true;
                rightValue.deleteB = true;
            }

            if (leftValue.b && rightValue.a && sameNodes(rightValue.a, imgA, leftValue.b, imgB)) {
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
        result = result.filter(function(diffItem, i) {

            var pixelsChangedOnly = diffItem.differences.indexOf('NOT_MATCHING_VISUALLY') > -1 &&
                                    diffItem.differences.indexOf('NOT_MATCHING_STYLE') === -1 &&
                                    diffItem.differences.indexOf('NODE_ADDED') === -1 &&
                                    diffItem.differences.indexOf('NODE_REMOVED') === -1;

            if (config.filterParentDiffs) {
                diff.forEach(function(item) {
                    if (diffItem.a && item.a && diffItem.a.path !== item.a.path && isInside(diffItem.a, item.a)) {
                        diffItem.deleteA = true;
                    }
                    if (diffItem.b && item.b && diffItem.b.path !== item.b.path && isInside(diffItem.b, item.b)) {
                        diffItem.deleteB = true;
                    }
                });
            }

            if (diffItem.a && (diffItem.deleteA || pixelsChangedOnly)) {
                delete result[i].a;
                delete result[i].deleteA;
                delete result[i].aHasCopy;
            }

            if (diffItem.b && (diffItem.deleteB || pixelsChangedOnly)) {
                delete result[i].b;
                delete result[i].deleteB;
                delete result[i].bHasCopy;
            }

            return result[i].a || result[i].b;
        });
    }

    return result;
}

async function compareFingerprints(a, b) {
    const pngs =  await Promise.all([
        readPNG('tmp' + a.screenshot),
        readPNG('tmp' + b.screenshot)
    ]);
    a.png = pngs[0];
    b.png = pngs[1];

    return processImages(a, b);
}

function processImages(a, b) {
    if (a.png && b.png) {
        let diff = compare(a.domTree.nodes[0], a.png, b.domTree.nodes[0], b.png);
        const cleanDiff = cleanUpDiff(diff, a.png, b.png);
        return cleanDiff;
    }
}

function readPNG(filename) {
    return new Promise((resolve, reject) => {
        log.info(`Reading image ${filename}`);
        fs.createReadStream(filename)
            .pipe(new PNG({
                filterType: 4
            }))
            .on('parsed', function() {
                resolve(this);
            })
            .on('error', function(error) {
                reject(error);
            });
    });
}

module.exports = {
    diff: async function(a, b) {
        if (a._id === b._id) {
            return [];
        }

        return await compareFingerprints(a, b);
    }
};
