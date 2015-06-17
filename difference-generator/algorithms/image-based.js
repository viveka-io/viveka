var fs = require('fs'),
    PNG = require('node-png').PNG,
    tempTree = {},
    diff = [{ a: 'valami'}];

function createHash(node, png) {
    var top      = node.offset.top,
        left     = node.offset.left,
        width    = node.offset.width,
        height   = node.offset.height,
        onScreen = (0 <= top && top < png.height) &&
            (0 <= left && left < png.width) &&
            (left + width <= png.width) &&
            (top + height <= png.height) &&
            width > 0 &&
            height > 0,
        hash     = -1,
        tempPNG;

    if (onScreen) {
        tempPNG = new PNG({
            width: width,
            height: height,
            filterType: 4
        });

        png.bitblt(tempPNG, left, top, width, height, 0, 0);

        if (tempPNG.data) {
            //node.bitmap = tempPNG.data;
            hash = crypto.createHash("md5").update(tempPNG.data).digest("hex");
        }
    }

    return hash;
}

function compareFingerprints(a, b, cb) {
    var imgUrlA = 'public' + a.screenshot,
        imgUrlB = 'public' + b.screenshot;

    fs.createReadStream(imgUrlA)
        .pipe(new PNG({
            filterType: 4
        }))
        .on('parsed', function() {
            a.imgdata = this.data;
            processImages(a, b, cb);
        });

    fs.createReadStream(imgUrlB)
        .pipe(new PNG({
            filterType: 4
        }))
        .on('parsed', function() {
            b.imgdata = this.data;
            processImages(a, b, cb);
        });
}

function processImages(a, b, cb) {
    var domA = JSON.parse(a.domTree),
        domB = JSON.parse(b.domTree),
        imgA = a.imgdata,
        imgB = b.imgdata,
        queue,
        i = 0;

    if (imgA && imgB) {

        queue = [{
            a: domA.nodes[0],
            b: domB.nodes[0]
        }, null];

        //while (queue[i] != null || (i == 0 || queue[i-1] != null)) {
        //    if (queue[i] == null) {
        //        queue.push(null);
        //    }
        //    else {
        //
        //        queue[i].a.nodes.forEach(function (elem) {
        //            queue.push(elem);
        //        });
        //    }
        //    i++;
        //}

        cb(diff);
    }
}


module.exports = {
    diff: function(a, b, cb) {
        compareFingerprints(a, b, cb);
    }
};
