var fs = require('fs'),
    appRoot = require('app-root-path'),
    mongoose = require('mongoose'),
    log = require('./logger')('database', 'magenta'),
    VError = require('verror'),
    schemas = {},
    models = {},
    db;

schemas.test = new mongoose.Schema({
    name: String,
    config: mongoose.Schema.Types.Mixed
});

schemas.fingerPrint = new mongoose.Schema({
    testId: { type: String, index: true },
    created: Date,
    finished: Date,
    state: String,
    approved: { type: Boolean, index: true },
    domTree: mongoose.Schema.Types.Mixed,
    screenshot: String
});

schemas.difference = new mongoose.Schema({
    baselineId: String,
    comparedId: String,
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
            var werr = new VError(err, `Connection to "${link}" failed`);
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
    // SHOULD WE REMOVE ALL THE FINGERPRINTS AND DIFFS RELATED TO THIS?
    try {
        await models.Test
            .findByIdAndRemove(id)
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
            .find({ testId: id })
            .select('_id testId state created approved')
            .sort('-created')
            .exec();

    } catch (err) {
        throw new VError(err, `Failed to get fingerprints of test: ${id}`);
    }
}

async function getFingerPrint(id) {
    try {
        return await models.FingerPrint
            .findOne({ _id: id })
            .exec();

    } catch (err) {
        throw new VError(err, `Failed to get fingerprint: ${id}`);
    }
}

async function getBaselineFingerPrint(id) {
    try {
        return await models.FingerPrint
            .findOne({ testId: id, approved: true })
            .select('_id')
            .sort('-created')
            .exec();

    } catch (err) {
        throw new VError(err, `Failed to get baseline fingerprints of test: ${id}`);
    }
}

async function getLatestFingerPrint(id) {
    try {
        return await models.FingerPrint
            .findOne({ testId: id})
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
                url: 'http://localhost:5555/test-page.html#/' + testCase.textId,
                generator: 'SENSE',
                browser: 'FIREFOX'
            }
        });
    });

    await new Promise(function(resolve, reject) {
        fs.writeFile(appRoot + '/tmp/public/test-cases.json', JSON.stringify(testCases, null, 4), function(err){
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
