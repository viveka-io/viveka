require("babel/polyfill");
require('source-map-support').install();

const fs                   = require('fs');
const appRoot              = require('app-root-path');
const express              = require('express');
const http                 = require('http');
const app                  = express();
const server               = http.createServer(app);
const io                   = require('socket.io')(server);
const handlebars           = require('connect-handlebars/node_modules/handlebars/lib/index');
const handlebarsMiddleware = require('connect-handlebars');
const sassMiddleware       = require('node-sass-middleware');
const log                  = require('bunyan').createLogger({name: "viveka-server"});
const VError               = require('verror');
const generator            = require('./fingerprint-generator.js');
const differ               = require('./difference-generator');
const bodyParser           = require('body-parser');
const db                   = require('./database.js');

handlebars.registerHelper('toLowerCase', function(str) {
  return str.toLowerCase();
});

if (!process.env.DB_URI) {
    process.env.DB_URI = 'mongodb://localhost:27017/viveka';
}

async function getTests() {
    const tests = await db.getTests();

    return {
        result: tests,
        title: `${tests.length} Tests`
    };
}

async function getTest({id}) {
    const test = await db.getTest(id);

    return {
        result: test.toObject(),
        title: `Test #${id}`
    };
}

async function createTest(config) {
    const test = await db.createTest({ config });

    return {
        result: test,
        title: 'Test created...'
    };
}

async function deleteTest({id}) {
    await db.deleteTest(id);

    return { info: `Test #${id} deleted` };
}

async function getFingerPrints({id: testId}) {
    const fingerPrints = await db.getFingerPrintsForTest(testId);

    return {
        result: fingerPrints,
        title: `${fingerPrints.length} Fingerprints of Test #${testId}`
    };
}

async function getFingerPrint({id}) {
    const fingerprint = await db.getFingerPrint(id);

    if (!fingerprint) {
        return { info: 'No fingerprint found!' };
    }

    return {
        result: fingerprint.toObject(),
        title: `Fingerprint #${id}`
    };
}

async function getBaselineFingerPrint({id: testId}) {
    const fingerprint = await db.getBaselineFingerPrint(testId);

    if (!fingerprint) {
        return { info: 'No baseline fingerprint found!' };
    }

    return {
        result: fingerprint.toObject(),
        title: `Baseline fingerprint of Test #${testId}`
    };
}

async function getLatestFingerPrint({id: testId}) {
    const fingerprint = await db.getLatestFingerPrint(testId);

    if (!fingerprint) {
        return { info: 'No latest fingerprint found!' };
    }

    return {
        result: fingerprint.toObject(),
        title: `Latest fingerprint of Test #${testId}`
    };
}

async function createFingerPrint({id: testId}) {
    const baseline = await db.getBaselineFingerPrint(testId);
    const test = await db.getTest(testId);

    log.info(`Creating fingerprint for: ${testId}`);

    let fingerprint = await db.createFingerPrint({ testId, state: 'NEW' });

    log.info(`Generating fingerprint: ${fingerprint._id}`);

    const {domTree, screenshot} = await generator.createFingerPrint(test.config, baseline ? 'latest' : 'baseline');

    fingerprint.domTree = domTree;
    fingerprint.screenshot = `/images/fingerprints/${fingerprint.id}.png`;
    fingerprint.state = 'DONE';
    fingerprint.created = new Date();

    const fileName = 'public' + fingerprint.screenshot;

    await new Promise((resolve, reject) => {
        fs.writeFile(fileName, screenshot, 'base64', err => {
            if (err) {
                reject(err);
            }

            resolve();
        });
    });
    log.info('Screenshot saved to drive');

    try {
        await fingerprint.save();
        log.info('Fingerprint saved to db');
    } catch (err) {
        throw new VError(err, 'Failed to save screenshot');
    }

    return {
        result: fingerprint.toObject(),
        title: `Fingerprint #${fingerprint.id} created`
    };
}

async function approveFingerPrint({id}) {
    let fingerprint = await db.getFingerPrint(id);

    fingerprint.approved = true;
    await fingerprint.save();

    const savedApproval = await db.createApproval({
        fingerPrint: id,
        approval: true,
        date: new Date()
    });
    log.info(`Fingerprint with id ${id} approved`);

    return {
        result: savedApproval.toObject(),
        title: `Fingerprint #${id} approved`
    };
}

async function unapproveFingerPrint({id}) {
    let fingerprint = await db.getFingerPrint(id);
    fingerprint.approved = false;
    await fingerprint.save();

    const savedApproval = await db.createApproval({
        fingerPrint: id,
        approval: false,
        date: new Date()
    });
    log.info(`Fingerprint with id ${id} unapproved`);

    return {
        result: savedApproval.toObject(),
        title: `Fingerprint #${id} unapproved`
    };
}

async function getDifference({id}) {
    const difference = await db.getDifference(id);

    return {
        result: difference.toObject(),
        title: `Difference #${id}`
    };
}

async function generateDifference({baselineId, targetId, persist = false}) {
    let difference = await db.getDifferenceByIds(baselineId, targetId);

    if (difference) {
        return {
            result: difference.toObject(),
            title: `Difference #${baselineId} vs. #${targetId}`
        };
    }

    if (persist) {
        difference = await db.createDifference({
            baselineId,
            comparedId: targetId,
            state: 'NEW'
        });
    }

    const baseline = await db.getFingerPrint(baselineId);
    const target = await db.getFingerPrint(targetId);

    if (baseline && target) {
        log.info('Generate difference');

        const diff = await new Promise((resolve, reject) => {
            differ.diff(baseline.toObject(), target.toObject(), resolve);
        });
        log.info('Difference created');

        if (!persist) {
            return {result: diff};
        }

        difference.diff   = diffJSON;
        difference.state  = 'DONE';
    } else {
        throw new VError('Missing fingerprint');
    }

    try {
        await difference.save();
        log.info(`DIFF saved: ${difference._id}`);
    } catch (err) {
        throw new VError(err, 'Failed to save diff');
    }

    return {
        result: difference.toObject(),
        title: `Difference #${baselineId} vs. #${targetId}`
    }
}

//Bower
app.use('/bower_components',  express.static(appRoot + '/bower_components'));

// Main page
app.use('/', sassMiddleware({
    src: appRoot + '/developers/main-page',
    dest: appRoot + '/developers/main-page/public',
    outputStyle: 'compressed',
    sourceMap: true
}));
app.use('/', express.static(appRoot + '/developers/main-page/public'));

// Test page
app.use('/testpage/js/templates.js', handlebarsMiddleware(appRoot + '/test-page/templates'));
app.use('/testpage/js/testcase-templates.js', handlebarsMiddleware(appRoot + '/test-cases/templates'));
app.use('/testpage/css', sassMiddleware({
    src: appRoot + '/test-page/styles',
    dest: appRoot + '/test-page/public/css',
    outputStyle: 'compressed',
    sourceMap: true
}));
app.use('/testpage', express.static(appRoot + '/test-page/public'));

// API page
app.use('/apipage/js/templates.js', handlebarsMiddleware(appRoot + '/api-page/templates'));
app.use('/apipage/css', sassMiddleware({
    src: appRoot + '/api-page/styles',
    dest: appRoot + '/api-page/public/css',
    outputStyle: 'compressed',
    sourceMap: true
}));
app.use('/apipage', express.static(appRoot + '/api-page/public'));

// Diff page
app.use('/diffpage/js/templates.js', handlebarsMiddleware(appRoot + '/diff-page/templates'));
app.use('/diffpage/css', sassMiddleware({
    src: appRoot + '/diff-page/styles',
    dest: appRoot + '/diff-page/public/css',
    outputStyle: 'compressed',
    sourceMap: true
}));
app.use('/diffpage', express.static(appRoot + '/diff-page/public'));

// General routes
app.use(express.static(appRoot + '/public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

function wrap(asyncFunction) {
    return (params, reply) => {
        asyncFunction(params)
            .then(data => reply(data))
            .catch(err => {
                log.error(err);
                reply({error: err.message});
            });
    }
}

io.on('connection', function(socket){
    socket.on('tests create',              wrap(createTest));
    socket.on('tests list',                wrap(getTests));
    socket.on('tests get',                 wrap(getTest));
    socket.on('tests delete',              wrap(deleteTest));

    socket.on('fingerprints list',         wrap(getFingerPrints));
    socket.on('fingerprints create',       wrap(createFingerPrint));
    socket.on('fingerprints get',          wrap(getFingerPrint));
    socket.on('fingerprints get baseline', wrap(getBaselineFingerPrint));
    socket.on('fingerprints get latest',   wrap(getLatestFingerPrint));
    socket.on('fingerprints approve',      wrap(approveFingerPrint));
    socket.on('fingerprints unapprove',    wrap(unapproveFingerPrint));
    // socket.on('fingerprints update', refreshFingerPrint);

    socket.on('differences get',           wrap(getDifference));
    socket.on('differences create',        wrap(generateDifference));
    socket.on('differences create json',   wrap(generateDifference));
});

(async function() {
    await db.init(process.env.DB_URI);
    server.listen(5555, function() {
        log.info(`Viveka server is listening at ${server.address().port}`);
        db.populateTestCases();
    });
})();

