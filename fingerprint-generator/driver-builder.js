var webdriver = require('selenium-webdriver'),
    driver;

function getBrowserType(type) {
    if (type === 'CHROME') return webdriver.Capabilities.chrome();
    if (type === 'FIREFOX') return webdriver.Capabilities.firefox();
    if (type === 'PHANTOMJS') return webdriver.Capabilities.phantomjs();
    return webdriver.Capabilities.firefox();
}

function getBrowserURI(type) {
    if (type === 'FIREFOX') return process.env.FIREFOX_URI;
    if (type === 'CHROME') return process.env.CHROME_URI;
}

module.exports = {
    build: function(config) {
        driver = new webdriver.Builder()
                    .withCapabilities(getBrowserType(config.browser))
                    .usingServer(getBrowserURI(config.browser))
                    .build();
        driver.manage().window().setSize(parseInt(config.browserWidth), parseInt(config.browserHeight));
        return driver;
    }
}
