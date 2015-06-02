var fs = require('fs'),
    PNG = require('node-png').PNG,
    crypto = require('crypto'),
    driverBuilder = require('./driver-builder.js'),
    driver,
    generators = {
        SENSE: require('./generators/sense.js')
    };


function createHash(node, png) {
    var top      = node.offset.top,
        left     = node.offset.left,
        width    = node.offset.width,
        height   = node.offset.height,
        onScreen = (0 <= top && top < png.height) && (0 <= left && left < png.width) && (left + width <= png.width) && (top + height <= png.height),
        hash     = -1,
        tempPNG  = new PNG({
            width: width,
            height: height,
            filterType: 4
        });

    if (onScreen) {
        png.bitblt(tempPNG, left, top, width, height, 0, 0);
        if (tempPNG.data) {
            hash = crypto.createHash("md5").update(tempPNG.data).digest("hex");
        }
    }

    return hash;
}

function processNodes(nodes, png) {
    nodes.forEach(function(node) {
        if (node.nodes) {
            processNodes(node.nodes, png);
        } else {
            node.hash = createHash(node, png);
        }
    });
}

function createFingerPrint(config, saveToFile) {
    var response = {};

    driver = driverBuilder.build(config);
    return driver.get(config.url)
        .then(function() {
            return generators[config.generator].getFingerPrint(driver);
        })
        .then(function(fingerPrint) {
            // console.log(JSON.stringify(JScON.parse(fingerPrint), null, 4));
            response.jsonFingerPrint = JSON.parse(fingerPrint);
            return driver.takeScreenshot();
        })
        .then(function(image, err) {
            var screenshot = new PNG({
                    checkCRC: false,
                    filterType: 4
                }),
                imageBuffer = new Buffer(image, 'base64');

            response.imageFingerPrint = image;

            screenshot.parse(imageBuffer).on('parsed', function() {

                console.log("Create hash codes...");
                processNodes(response.jsonFingerPrint.nodes, this);

                if (saveToFile) {
                    fs.writeFile('fingerprints/'+ config.id +'.json', JSON.stringify(response.jsonFingerPrint), function(error) {
                        if (error) { console.log(error); }
                    });
                    console.log("Write screenshot image...");
                    fs.writeFile('fingerprints/'+ config.id +'.png', image, 'base64', function(error) {
                        if (error) { console.log(error); }
                    });
                    console.log("Write fingerprint json...");
                    fs.writeFile('fingerprints/'+ config.id +'-fingerprint.json', JSON.stringify(response), function(error) {
                        if (error) { console.log(error); }
                    });
                }
            });

            driver.quit();
            return response;
        });
}

module.exports = {
    createFingerPrint: createFingerPrint
};
