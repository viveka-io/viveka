var fs              = require('fs'),
    path            = require('path'),
    log             = require('bunyan').createLogger({name: "fingerprint-generator"}),
    VError          = require('verror'),
    webdriver       = require('selenium-webdriver'),
    PNG             = require('node-png').PNG,
    crypto          = require('crypto'),
    appendQuery     = require('append-query'),
    driverBuilder   = require('./driver-builder.js'),
    script          = fs.readFileSync(path.join(__dirname, './sense-script.js'), 'utf8'),
    waitForJQuery   = 'return window.jQuery !== undefined';

function createFingerPrint(config, mode) {
    var response    = {},
        driver      = driverBuilder.build(config),
        url         = mode ? appendQuery(config.url, {viveka_mode: mode}) : config.url;
     
    log.info('Creating fingerprint on page: ' + url);   
    return driver.get(url)
        .then(function() {
            return getFingerPrint(driver);
        }, function (err) {
            console.log(err);
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

function getFingerPrint(driver) {
    var s = 'try { ' + script + 'return Sense.getJSONFootprint(); } catch(e) { return { error: e }; }';

    return driver
        .getTitle().then(function(title) {
            console.log('Page title: ' + title);
        })
        .then(function() {
            return driver
                .wait(function() {
                    return driver.executeScript(waitForJQuery).then(function(jQueryReady) {
                        console.log('jQueryReady: ' + jQueryReady);
                        return jQueryReady;
                    });
                }, 2000)
        })
        .then(function() {
            return driver.executeScript(s);
        });
}

module.exports = {
    createFingerPrint: createFingerPrint,
    getFingerPrint: getFingerPrint
};
