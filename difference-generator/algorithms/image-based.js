var fs          = require('fs'),
    crypto      = require('crypto'),
    PNG         = require('node-png').PNG,
    domA        = {},
    domB        = {},
    imgA        = [],
    imgB        = [],
    threshold   = 10,
    diff;

// Fastest blur algorithm
function blurImageSlice(pix, w, h, radius) {
    var wm = w - 1,
        hm = h - 1,
        div = radius + radius + 1,
        r = [],
        g = [],
        b = [],
        rsum, gsum, bsum, x, y, i, p, p1, p2, yp, yi = 0, yw = 0,
        vmin = [],
        vmax = [],
        dv = [];

    for (i = 0; i < 256*div; i++){
        dv[i] = i / div;
    }

    for (y = 0; y < h; y++) {
        rsum = gsum = bsum = 0;

        for (i = -radius; i <= radius; i++) {
            p = pix[yi + Math.min(wm, Math.max(i, 0))];
            rsum += (p & 0xff0000) >> 16;
            gsum += (p & 0x00ff00) >> 8;
            bsum += p & 0x0000ff;
        }

        for (x = 0; x < w; x++) {

            r[yi] = dv[rsum];
            g[yi] = dv[gsum];
            b[yi] = dv[bsum];

            if (y == 0) {
                vmin[x] = Math.min(x + radius + 1, wm);
                vmax[x] = Math.max(x - radius, 0);
            }
            p1 = pix[yw + vmin[x]];
            p2 = pix[yw + vmax[x]];

            rsum += ((p1 & 0xff0000) - (p2 & 0xff0000)) >> 16;
            gsum += ((p1 & 0x00ff00) - (p2 & 0x00ff00)) >> 8;
            bsum += (p1 & 0x0000ff) - (p2 & 0x0000ff);
            yi++;
        }
        yw += w;
    }

    for (x = 0; x < w; x++) {
        rsum = gsum = bsum = 0;
        yp = -radius * w;
        for (i = -radius; i <= radius; i++) {
            yi = Math.max(0, yp) + x;
            rsum += r[yi];
            gsum += g[yi];
            bsum += b[yi];
            yp += w;
        }
        yi = x;
        for (y = 0; y < h; y++) {
            pix[yi] = 0xff000000 | (dv[rsum] << 16) | (dv[gsum] << 8) | dv[bsum];
            if (x == 0) {
                vmin[y] = Math.min(y + radius + 1, hm) * w;
                vmax[y] = Math.max(y - radius, 0) * w;
            }
            p1 = x + vmin[y];
            p2 = x + vmax[y];

            rsum += r[p1] - r[p2];
            gsum += g[p1] - g[p2];
            bsum += b[p1] - b[p2];

            yi += w;
        }
    }

    return pix;
}

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

    left   = Math.max(left, 0);
    top    = Math.max(top, 0);
    height = Math.min(height, png.height - top);
    width  = Math.min(width, png.width - left);

    //console.log('crop:', node.name, top, left, width, height);

    png.bitblt(tempPNG, left, top, width, height, 0, 0);

    //node.hash = crypto.createHash("md5").update(tempPNG.data).digest("hex");
    return blurImageSlice(tempPNG.data, width, height, 1);
}

function comparePixels(a, b) {
    var i,
        differentByteIndexes = [];

    if (a === b) return true;

    for (i=0; i < a.length; i++) {
        if (Math.abs(b[i] - a[i]) > threshold) {
            differentByteIndexes.push(i);
        }
    }

    return differentByteIndexes;
}

function compareSlices(a, b) {
    var sliceA = getImageSlice(a, imgA),
        sliceB = getImageSlice(b, imgB),
        tempPNG;

    tempPNG = new PNG({
        width: a.offset.width,
        height: a.offset.height,
        filterType: 4,
        data: sliceA
    });

    tempPNG.pack().pipe(fs.createWriteStream('public/images/blur/' + a.name + '.png').on('close', function() {
            var fileName = a.name + '.png';
            console.log(fileName + ' is created.');
        })
    );

    return comparePixels(sliceA, sliceB);
}

function isMatchingVisually(a, b) {
    var isVisibleA = a.offset.width > 0 && a.offset.height > 0,
        isVisibleB = b.offset.width > 0 && b.offset.height > 0;

    if (isVisibleA && isVisibleB && isMatchingSize(a, b)) {
        return compareSlices(a, b).length === 0;
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
        //if (a.offset.width > 0 && a.offset.height > 0) {
        //    getImageSlice(a, imgA);
        //}

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
        //if (b.offset.width > 0 && b.offset.height > 0) {
        //    getImageSlice(b, imgB);
        //}

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

    //if (!visualMatching) {
        nodesLengthA = (a && a.nodes && a.nodes.length) || 0;
        nodesLengthB = (b && b.nodes && b.nodes.length) || 0;

        //console.log('compare:', a && a.name, b && b.name, visualMatching);

        for(var i=0; i < Math.max(nodesLengthA, nodesLengthB); i++) {
            compare(a && a.nodes && a.nodes[i], b && b.nodes && b.nodes[i]);
        }
    //}

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
               // removeChildDiffs(diff[j].a);
                //delete leftValue.a;
                //delete rightValue.b;
            }

            if (leftValue.b && rightValue.a && sameNodes(leftValue.b, rightValue.a)) {
                leftValue.differences.push('NODE_REMOVED');
                rightValue.differences.push('NODE_ADDED');
                diff[j].bHasCopy = i;
                diff[i].aHasCopy = j;
                leftValue.deleteB = true;
                rightValue.deleteA = true;
                //removeChildDiffs(diff[j].b);
                //delete leftValue.b;
                //delete rightValue.a;
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
