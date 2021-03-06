const zlib      = require('zlib');
const fs        = require('fs');
const appRoot   = require('app-root-path');
const mongoose  = require('mongoose');
const log       = require('./logger')('DB', 'magenta');
const VError    = require('verror');
const url       = require('url');

var schemas     = {},
    models      = {},
    db;

schemas.test = new mongoose.Schema({
    name: String,
    config: mongoose.Schema.Types.Mixed
});

schemas.fingerPrint = new mongoose.Schema({
    testId: { type: String, index: true },
    created: { type: Date, index: true },
    finished: Date,
    state: String,
    approved: { type: Boolean, index: true },
    domTree: mongoose.Schema.Types.Mixed,
    screenshot: String
});

schemas.difference = new mongoose.Schema({
    testId: { type: String, index: true },
    baselineId: { type: String, index: true },
    comparedId: { type: String, index: true },
    state: String,
    diff: mongoose.Schema.Types.Mixed
});

schemas.approval = new mongoose.Schema({
    fingerPrint: { type: mongoose.Schema.Types.ObjectId, ref: 'FingerPrint' },
    approval: Boolean,
    date: Date
});

schemas.cookies = new mongoose.Schema({
    domain: String,
    path: String,
    expires: Date,
    httpOnly: Boolean,
    secure: Boolean,
    name: { type: String, index: true },
    value: { type: String, index: true }
});

models.Test         = mongoose.model('Test', schemas.test);
models.FingerPrint  = mongoose.model('FingerPrint', schemas.fingerPrint);
models.Difference   = mongoose.model('Difference', schemas.difference);
models.Approval     = mongoose.model('Approval', schemas.approval);
models.Cookies      = mongoose.model('Cookies', schemas.cookies);

async function init(link) {
    log.info(`Connecting to ${link}`);
    mongoose.connect(link, { server: { socketOptions: { connectTimeoutMS: 5000 }}});
    db = mongoose.connection;

    await new Promise(function(resolve, reject){
        db.on('error', function (err) {
            log.error(new VError(err, `Connection to '${link}' failed`).toString());
            reject(err);
        });
        db.once('open', function () {
            log.info('Connected to DB');
            resolve();
        });
    });
}

/* TESTS */
async function getTests() {
    try {
        return await models.Test
            .find()
            .exec();

    } catch (err) {
        throw new VError(err, 'Failed to get tests');
    }
}

async function getTest(id) {
    let test;

    try {
        test = await models.Test
            .findOne({ _id: id })
            .exec();

    } catch (err) {
        throw new VError(err, `Failed to get test with id ${id}`);
    }

    if (!test) {
        throw new VError(`Test with id ${id} not found!`);
    }

    return test;
}

async function createTest(data) {
    try {
        data.config.url = url.parse(data.config.url);

        if (data.config.url.query) {
            data.config.url.queryParameters = parseQuery(data.config.url.query);
        }

        const test = await models.Test
            .create(data);

        log.info(`Test saved: ${test._id}`);

        if (data.config.cookies) {
            data.config.cookies.forEach(function (cookie) {
                createCookie(cookie);
            });
        }

        return test;

    } catch (err) {
        throw new VError(err, 'Failed to create test');
    }
}

function parseQuery(query) {
    return query.split('&').map(function (param) {
        var keyValue = param.split('=');

        return {
            key: keyValue[0],
            value: keyValue[1]
        };
    });
}

async function deleteTest(id) {
    try {
        await models.Test
            .findByIdAndRemove(id)
            .exec();

        await models.FingerPrint
            .remove({ testId: id })
            .exec();

        await models.Difference
            .remove({ testId: id })
            .exec();

        log.info(`Test with id: ${id} deleted`);
    } catch (err) {
        throw new VError(err, `Failed to delete test: ${id}`);
    }
}

/* FINGERPRINTS */
async function getFingerPrints() {
    try {
        return await models.FingerPrint
            .find()
            .exec();

    } catch (err) {
        throw new VError(err, 'Failed to get fingerprints');
    }
}

async function getFingerPrintsForTest(id) {
    try {
        return await models.FingerPrint
            .find(
                { testId: id },
                { testId: 1, state: 1, created: 1, approved: 1 }
            )
            .sort('-created')
            .exec();

    } catch (err) {
        throw new VError(err, `Failed to get fingerprints of test: ${id}`);
    }
}

async function getFingerPrint(id) {
    try {
        let fingerprint = await models.FingerPrint
            .findOne({ _id: id })
            .exec();

        const buffer = new Buffer(fingerprint.domTree, 'base64');
        const uncompressedDomTree = await new Promise((resolve, reject) => {
            zlib.unzip(buffer, (err, unzippedBuffer) => {
                if (err) {
                    reject(err);
                }

                resolve(unzippedBuffer.toString());
            });
        });

        fingerprint.domTree = JSON.parse(uncompressedDomTree);

        return fingerprint;
    } catch (err) {
        throw new VError(err, `Failed to get fingerprint: ${id}`);
    }
}

async function getBaselineFingerPrint(id) {
    try {
        return await models.FingerPrint
            .findOne({ testId: id, approved: true }, { _id: 1, screenshot: 1 })
            .sort('-created')
            .exec();

    } catch (err) {
        throw new VError(err, `Failed to get baseline fingerprints of test: ${id}`);
    }
}

async function getLatestFingerPrint(id) {
    try {
        return await models.FingerPrint
            .findOne({ testId: id}, { _id: 1, screenshot: 1 })
            .sort('-created')
            .exec();

    } catch (err) {
        throw new VError(err, `Failed to get latest fingerprints of test: ${id}`);
    }
}

async function createFingerPrint(data) {
    try {
        return await models.FingerPrint
            .create(data);
    } catch (err) {
        throw new VError(err, 'Failed to save fingerprint');
    }
}

async function approveFingerPrint(id) {
    try {
        return await models.FingerPrint
            .update({ _id: id }, { approved: true });
    } catch (err) {
        throw new VError(err, 'Failed to approve fingerprint id: ' + id);
    }
}

async function unapproveFingerPrint(id) {
    try {
        return await models.FingerPrint
            .update({ _id: id }, { approved: false });
    } catch (err) {
        throw new VError(err, 'Failed to unapprove fingerprint id: ' + id);
    }
}

async function updateFingerPrint(id, data) {
    try {
        const compressedDomTree = await new Promise((resolve, reject) => {
            zlib.deflate(JSON.stringify(data.domTree), (err, buffer) => {
                if (err) {
                    reject(err);
                }

                resolve(buffer.toString('base64'));
            });
        });

        return await models.FingerPrint
            .update({ _id: id }, {
                screenshot: data.screenshot,
                finished: data.finished,
                state: data.state,
                domTree: compressedDomTree
            });
    } catch (err) {
        throw new VError(err, 'Failed to update fingerprint id: ' + id);
    }
}

/* DIFFERENCES */
async function getDifference(id) {
    try {
        return await models.Difference
            .findOne({ _id: id })
            .exec();

    } catch (err) {
        throw new VError(err, `Failed to get difference: ${id}`);
    }
}

async function getDifferenceByIds(id1, id2) {
    try {
        return await models.Difference
            .findOne({baselineId: id1, comparedId: id2})
            .exec();

    } catch (err) {
        throw new VError(err, `Failed to get difference between ${id1} and ${id2}`);
    }
}

async function createDifference(data) {
    try {
        log.info('Saving differences to the DB.');

        return await models.Difference
            .create(data);

    } catch (err) {
        throw new VError(err, 'Failed to save difference');
    }
}

/* COOKIES */
async function getCookies() {
    try {
        return await models.Cookies
            .find()
            .exec();

    } catch (err) {
        throw new VError(err, `Failed to get cookies.`);
    }
}

async function getDistinctCookieNames() {
    try {
        return await models.Cookies
            .find({}, { name: 1 })
            .distinct('name')
            .exec();

    } catch (err) {
        throw new VError(err, `Failed to get distinct cookies.`);
    }
}

async function getCookieNameSuggestions(cookieName) {
    try {
        return await models.Cookies
            .find({ name: { $regex: new RegExp('^' + cookieName) } })
            .distinct('name')
            .exec();

    } catch (err) {
        throw new VError(err, `Failed to get cookie name suggestions.`);
    }
}

async function getCookieValueSuggestions(cookieName, cookieValue) {
    try {
        return await models.Cookies
            .find({
                name: cookieName,
                value: { $regex: new RegExp(cookieValue) }
            })
            .distinct('value')
            .exec();

    } catch (err) {
        throw new VError(err, `Failed to get cookie name suggestions.`);
    }
}

async function createCookie(data) {
    try {
        log.info('Saving cookie to the DB');

        return await models.Cookies
            .create(data);

    } catch (err) {
        throw new VError(err, 'Failed to save cookie');
    }
}

/* ELSE */
async function createApproval(data) {
    try {
        return await models.Approval
            .create(data);

    } catch (err) {
        throw new VError(err, 'Failed to save approval in db');
    }
}

async function populateTestCases() {
    var testCases = require('./test-cases');

    log.info('Populating test cases');
    await models.Test.remove({
        'config.testCase': true
    }).exec();

    await testCases.map(testCase => {
        return createTest({
            _id: testCase.id,
            name: testCase.name,
            config: {
                testCase: true,
                browserWidth: 1280,
                browserHeight: 720,
                url: 'http://localhost:5555/dev-section/test-page.html#/' + testCase.textId,
                generator: 'SENSE',
                browser: 'FIREFOX'
            }
        });
    });

    await new Promise(function(resolve, reject) {
        fs.writeFile(appRoot + '/tmp/public/dev-section/test-cases.json', JSON.stringify(testCases, null, 4), function(err){
            if (err) {
                reject(err);
            }

            resolve();
        });
    });

    log.info(`${testCases.length} test cases populated`);
}

module.exports = {
    schemas,
    models,
    init,

    getTests,
    getTest,
    createTest,
    deleteTest,
    populateTestCases,

    getFingerPrints,
    getFingerPrintsForTest,
    getFingerPrint,
    getBaselineFingerPrint,
    getLatestFingerPrint,
    createFingerPrint,
    approveFingerPrint,
    unapproveFingerPrint,
    updateFingerPrint,

    getDifference,
    getDifferenceByIds,
    createDifference,

    getCookies,
    getDistinctCookieNames,
    getCookieNameSuggestions,
    getCookieValueSuggestions,
    createCookie,

    createApproval
};
