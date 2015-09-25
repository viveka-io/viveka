const webdriver = require('selenium-webdriver');
const log = require('./logger')('driver-builder', 'cyan');
const browserTypeMap = {
    CHROME: webdriver.Capabilities.chrome(),
    FIREFOX: webdriver.Capabilities.firefox(),
    PHANTOMJS: webdriver.Capabilities.phantomjs()
};
const browserURI = {
    CHROME: process.env.CHROME_URI,
    FIREFOX: process.env.FIREFOX_URI
};

function getBrowserType(type) {
    return browserTypeMap[type || 'FIREFOX'];
}

function getBrowserURI(type) {
    return browserURI[type];
}

async function build(config) {
    const URI = getBrowserURI(config.browser);

    log.info(`Using selenium node on: ${URI}`);

    let driver = new webdriver.Builder()
        .withCapabilities(getBrowserType(config.browser))
        .usingServer(URI)
        .build();

    driver.manage().window().setSize(parseInt(config.browserWidth), parseInt(config.browserHeight));
    driver.manage().deleteAllCookies();

    if (config.cookies) {
        driver.get(config.url.href);

        for (let i = 0; i < config.cookies.length; i++) {
            let cookie = config.cookies[i];

            await driver.manage().addCookie(cookie.name, cookie.value);
        }
    }

    return driver;
}

module.exports = {
    build
};
