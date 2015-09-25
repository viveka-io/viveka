const fs            = require('fs');
const path          = require('path');
const log           = require('./logger')('fingerprint-generator', 'yellow');
const VError        = require('verror');
const appendQuery   = require('append-query');
const driverBuilder = require('./driver-builder.js');
const script        = fs.readFileSync(path.join(__dirname, './sense-script.js'), 'utf8');

async function createFingerPrint(config, mode) {
    try {
        const driver = await driverBuilder.build(config);
        const url = mode ? appendQuery(config.url.href, {'viveka_mode': mode}) : config.url.href;

        log.info('Creating fingerprint on page: ' + url);
        driver.get(url);

        const domTree = await getFingerPrint(driver);
        const screenshot = await driver.takeScreenshot();

        driver.quit();

        log.info('Fingerprint created.');

        return {
            domTree,
            screenshot
        };
    } catch (err) {
        throw new VError(err, 'Failed to generate fingerPrint');
    }
}

async function getFingerPrint(driver) {
    const wrappedScript = `${script}\ntry { return Sense.getJSONFootprint(); } catch(e) { return { error: e }; }`;
    let fingerprint;

    try {
        fingerprint = await driver.executeScript(wrappedScript);
    } catch (err) {
        throw new VError(err, 'Error during execution of sense-script.');
    }

    if (fingerprint.error) {
        throw new VError(fingerprint.error, 'Sense-script error.');
    }

    return JSON.parse(fingerprint);
}

module.exports = {
    createFingerPrint,
    getFingerPrint
};
