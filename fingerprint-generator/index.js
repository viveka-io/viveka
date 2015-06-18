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
