const os            = require('os');
const osString      = os.platform();
const fs            = require('fs');
const log           = require('./logger')('ENV_CHECK', 'yellow');
const exec          = require('sync-exec');
const windowsConfig = {
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
    log.info(`Available browsers and drivers (${osString}):`);

    if (osString.lastIndexOf('win', 0) === 0) {
        await checkCommand('phantomjs', 'PHANTOMJS');
        await checkFiles(windowsConfig.firefox, 'FIREFOX');
        await checkFiles(windowsConfig.chrome, 'CHROME');
        await checkCommand('chromedriver.exe', 'CHROMEDRIVER');
        await checkFiles(windowsConfig.ie, 'INTERNETEXPLORER');
        await checkCommand('IEDriverServer.exe', 'IEDRIVER');
        await checkFiles(windowsConfig.safari, 'SAFARI');
    } else if (osString.lastIndexOf('linux', 0) === 0) {
        await checkCommandLinux('phantomjs', 'PHANTOMJS');
        await checkCommandLinux('firefox', 'FIREFOX');
        await checkCommandLinux('chrome', 'CHROME'); // This is just a test
    } else {
        log.info(`Your OS (${osString}) is not supported yet!`);
    }

    log.info('INFO: https://github.com/viveka-io/viveka/blob/master/README.md');
    log.info('SELENIUMHQ: http://www.seleniumhq.org/download/');
}

async function printAvailability(name, flag) {
    log.info(`[${flag ? 'X' : '-'}] ${name}`);
}

async function checkFiles(paths, name) {
    var found = false;

    for (let i = 0; i < paths.length; i++) {
        let result = await checkFile(paths[i]);
        found = found || result;
    }

    printAvailability(name, found);
}

async function checkCommand(cmd, name) {
    var isInstalled = false;
    var response    = await exec('where ' + cmd);

    if (response.stderr === '') {
        isInstalled = true;
    }

    printAvailability(name, isInstalled);
}

async function checkCommandLinux(cmd, name) {
    var isInstalled = false;
    var response    = await exec('which ' + cmd);

    if (response.stdout !== '') {
        isInstalled = true;
    }

    printAvailability(name, isInstalled);
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
