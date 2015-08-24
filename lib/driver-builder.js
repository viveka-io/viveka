const webdriver = require('selenium-webdriver');
const browserTypeMap = {
    CHROME: webdriver.Capabilities.chrome(),
    FIREFOX: webdriver.Capabilities.firefox(),
    PHANTOMJS: webdriver.Capabilities.phantomjs()
};
const browserURI = {
    CHROME: process.env.CHROME_URI,
    FIREFOX: process.env.FIREFOX_URI
}

function getBrowserType(type) {
    return browserTypeMap[type || 'FIREFOX'];
}

function getBrowserURI(type) {
    return browserURI[type];
}

function build(config) {
    const URI = getBrowserURI(config.browser);

    console.log('Using selenium node on: ' + URI);

    let driver = new webdriver.Builder()
        .withCapabilities(getBrowserType(config.browser))
        .usingServer(URI)
        .build();

    driver.manage().window().setSize(parseInt(config.browserWidth), parseInt(config.browserHeight));
    return driver;
}

module.exports = {
    build
}
