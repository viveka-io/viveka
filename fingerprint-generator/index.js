var fs = require('fs'),
    log = require('bunyan').createLogger({name: "fingerprint-generator"}),
    VError = require('verror'),
    webdriver = require('selenium-webdriver'),
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
            if (fingerPrint.error) {
                return webdriver.promise.rejected(new VError(fingerPrint.error, 'Error during execution of sense-script.'));
            }

            response.jsonFingerPrint = JSON.parse(fingerPrint);
            return driver.takeScreenshot();
        })
        .then(function(image) {
            var screenshot = new PNG({
                    checkCRC: false,
                    filterType: 4
                }),
                defer = webdriver.promise.defer(),
                imageBuffer = new Buffer(image, 'base64');

            response.imageFingerPrint = image;

            screenshot.parse(imageBuffer).on('parsed', function() {
                log.info("Create hash codes...");
                processNodes(response.jsonFingerPrint.nodes, this);
                defer.fulfill(response);
            });

            driver.quit();
            return defer.promise;
        }, function (err) {
            return webdriver.promise.rejected(err);
        })
        .then(function(fingerPrint) {
            log.info('Fingerprint created.');
            return webdriver.promise.fulfilled(fingerPrint);
        }, function (err) {
            return webdriver.promise.rejected(err);
        });
}

module.exports = {
    createFingerPrint: createFingerPrint
};
