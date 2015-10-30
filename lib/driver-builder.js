const webdriver         = require('selenium-webdriver');
const log               = require('./logger')('DRIVER', 'cyan');
const http              = require('http');
const browserTypeMap    = {
    CHROME: webdriver.Capabilities.chrome(),
    FIREFOX: webdriver.Capabilities.firefox(),
    PHANTOMJS: webdriver.Capabilities.phantomjs()
};

function getBrowserType(type) {
    return browserTypeMap[type || 'FIREFOX'];
}

async function preCheckUrl(url) {
    return await new Promise(function(resolve, reject){
        http.get(url, function(res) {
            log.info(url + ': ' + res.statusCode);
            resolve(true);
        }).on('error', function() {
            log.info(url + ' is not reachable');
            resolve(false);
        });
    });
}

async function build(config) {
    let isUrlReachable = await preCheckUrl(config.url.href);

    if (isUrlReachable) {
        let driver = new webdriver.Builder()
            .withCapabilities(getBrowserType(config.browser))
            .build();

        driver.manage().window().setSize(parseInt(config.browserWidth), parseInt(config.browserHeight));
        driver.manage().deleteAllCookies();

        if (config.cookies) {
            // NOTE: Should handle this with a proxy maybe
            driver.get(config.url.href);

            for (let i = 0; i < config.cookies.length; i++) {
                let cookie = config.cookies[i];

                await driver.manage().addCookie(cookie.name, cookie.value);
            }
        }

        return driver;
    } else {
        return undefined;
    }
}

module.exports = {
    build
};
