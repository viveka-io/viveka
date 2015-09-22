const zlib      = require('zlib');
const fs        = require('fs');
const appRoot   = require('app-root-path');
const mongoose  = require('mongoose');
const log       = require('./logger')('database', 'magenta');
const VError    = require('verror');

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

models.Test         = mongoose.model('Test', schemas.test);
models.FingerPrint  = mongoose.model('FingerPrint', schemas.fingerPrint);
models.Difference   = mongoose.model('Difference', schemas.difference);
models.Approval     = mongoose.model('Approval', schemas.approval);

async function init(link) {
    log.info(`Connecting to ${link}`);
    mongoose.connect(link, { server: { socketOptions: { connectTimeoutMS: 5000 }}});
    db = mongoose.connection;

    await new Promise(function(resolve, reject){
        db.on('error', function (err) {
            var werr = new VError(err, `Connection to '${link}' failed`);
            reject(werr);
        });
        db.once('open', function () {
            log.info('Connected');
            resolve();
        });
    });
}

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
        const test = await models.Test
            .create(data);

        log.info(`Test saved: ${test._id}`);
        return test;

    } catch (err) {
        throw new VError(err, 'Failed to create test');
    }
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
                { testId: 1 , state: 1 , created: 1, approved: 1 }
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
            zlib.unzip(buffer, function (err, buffer) {
                if (err) {
                    reject(err);
                }
                
                resolve(buffer.toString());
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
        log.info('Saving differences to the DB.')

        return await models.Difference
            .create(data);

    } catch (err) {
        throw new VError(err, 'Failed to save difference');
    }
}

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

    getDifference,
    getDifferenceByIds,
    createDifference,

    createApproval
};
