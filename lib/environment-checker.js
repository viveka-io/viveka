const os        = require('os');
const fs        = require('fs');
const log       = require('./logger')('environment-checker', 'yellow');
const exec      = require('sync-exec');
const config    = {
    chrome: [
        process.env.LOCALAPPDATA+'\\Google\\Chrome\\Application\\chrome.exe',
        process.env.PROGRAMFILES+'\\Google\\Chrome\\Application\\chrome.exe'
    ],
    firefox: [
        process.env.PROGRAMFILES+'\\Mozilla Firefox\\firefox.exe',
        process.env['PROGRAMFILES(x86)']+'\\Mozilla Firefox\\firefox.exe'
    ],
    ie: [
        process.env.PROGRAMFILES+'\\Internet Explorer\\iexplore.exe',
        process.env['PROGRAMFILES(x86)']+'\\Internet Explorer\\iexplore.exe'
    ],
    safari: [
        process.env.PROGRAMFILES+'\\Safari\\Safari.exe',
        process.env['PROGRAMFILES(x86)']+'\\Safari\\Safari.exe'
    ]
};

async function init() {
    const osString = os.platform();
    if (osString.lastIndexOf('win', 0) === 0) {
        log.info('Available browsers and drivers:');
        await checkCommand('phantomjs', 'PHANTOMJS');
        await checkFiles(config.firefox, 'FIREFOX');
        await checkFiles(config.chrome, 'CHROME');
        await checkCommand('chromedriver.exe', 'CHROMEDRIVER');
        await checkFiles(config.ie, 'INTERNETEXPLORER');
        await checkCommand('IEDriverServer.exe', 'IEDRIVER');
        await checkFiles(config.safari, 'SAFARI');
        log.info('INFO: https://github.com/viveka-io/viveka/blob/master/README.md');
        log.info('SELENIUMHQ: http://www.seleniumhq.org/download/');
    } else {
        log.info('Your OS is not supported yet!');
    }
}

async function checkFiles(paths, name) {
    var found = false;

    for (let i = 0; i < paths.length; i++) {
        let result = await checkFile(paths[i]);
        found = found || result;
    }

    log.info(`[${found ? 'X' : '-'}] ${name}`);
}

async function checkCommand(cmd, name) {
    var isInstalled = false;
    var response    = await exec('where ' + cmd);

    if (response.stderr === '') {
        isInstalled = true;
    }

    log.info(`[${isInstalled ? 'X' : '-'}] ${name}`);
}

async function checkFile(path) {
    var isInstalled = false;

    try {
        let stats = await fs.lstatSync(path);
        isInstalled = stats.isFile();
    } catch (e) {
        // FILE IS NOT FOUND
    }

    return isInstalled;
}

module.exports = {
    init
};
