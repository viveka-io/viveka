var fs = require('fs'),
    path = require('path'),
    script = fs.readFileSync(path.join(__dirname, './sense-script.js'), 'utf8'),
    waitForJQueryScript = 'return window.jQuery !== undefined';

module.exports = {
    getFingerPrint: function(driver) {
        var s = script + 'return Sense.getJSONFootprint();';

        return driver
            .getTitle().then(function(title) {
                console.log('Page title: ' + title);
            })
            .then(function() {
                return driver
                    .wait(function() {
                        return driver.executeScript(waitForJQueryScript).then(function(jQueryReady) {
                            console.log('jQueryReady: ' + jQueryReady);
                            return jQueryReady;
                        });
                    }, 2000)
            })
            .then(function() {
                return driver.executeScript(s);
            });
    }
};
