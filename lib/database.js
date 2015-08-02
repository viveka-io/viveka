var fs = require('fs'),
    appRoot = require('app-root-path'),
    mongoose = require('mongoose'),
    log = require('bunyan').createLogger({name: "viveka-server"}),
    VError = require('verror'),
    schemas = {},
    models = {},
    db;

schemas.Test = mongoose.Schema({
    config: mongoose.Schema.Types.Mixed
});

schemas.FingerPrint = mongoose.Schema({
    testId: String,
    created: Date,
    state: String,
    approved: Boolean,
    domTree: mongoose.Schema.Types.Mixed,
    screenshot: String
});

schemas.Difference = mongoose.Schema({
    baselineId: String,
    comparedId: String,
    state: String,
    diff: mongoose.Schema.Types.Mixed
});

schemas.Approval = mongoose.Schema({
    fingerPrint: { type: mongoose.Schema.Types.ObjectId, ref: 'FingerPrint' },
    approval: Boolean,
    date: Date
});

models.Test         = mongoose.model('Test', schemas.Test);
models.FingerPrint  = mongoose.model('FingerPrint', schemas.FingerPrint);
models.Difference   = mongoose.model('Difference', schemas.Difference);
models.Approval     = mongoose.model('Approval', schemas.Approval);

async function init(link) {
    log.info(`Connecting to database using URI ${link}`);
    mongoose.connect(link, { server: { socketOptions: { connectTimeoutMS: 5000 }}});
    db = mongoose.connection;
    await new Promise(function(resolve, reject){
        db.on('error', function (err) {
            var werr = new VError(err, `Connection to "${link}" failed`);
            reject(werr);
        });
        db.once('open', function () {
            log.info('Connected to database');
            resolve();
        });
    });
}

function getTests() {
    return models.Test.find().exec();
}

function getTest(id) {
    return models.Test.findOne({ _id: id }).exec()
        .then(function (test) {
            if (!test) {
                return (new mongoose.Promise).reject(new Error('Test with id ' + id + ' not found!'));
            }

            return(test);
        });
}

function createTest(data) {
    return models.Test.create(data);
}

function deleteTest(id) {
    // SHOULD WE REMOVE ALL THE FINGERPRINTS AND DIFFS RELATED TO THIS?
    return models.Test.findByIdAndRemove(id).exec();
}

function getFingerPrints() {
    return models.FingerPrint.find().exec();
}

function getFingerPrintsForTest(id) {
    return models.FingerPrint.find({ testId: id }).exec();
}

function getFingerPrint(id) {
    return models.FingerPrint.findOne({ _id: id }).exec();
}

function getBaselineFingerPrint(id) {
    return models.FingerPrint.findOne({ testId: id, approved: true }).sort('-created').exec();
}

function getLatestFingerPrint(id) {
    return models.FingerPrint.findOne({ testId: id}).sort('-created').exec();
}

function createFingerPrint(data) {
    return models.FingerPrint.create(data);
}

function getDifference(id) {
    return models.Difference.findOne({ _id: id }).exec();
}

function getDifferenceByIds(id1, id2) {
    return models.Difference.findOne({baselineId: id1, comparedId: id2}).exec();
}

function createDifference(data) {
    return models.Difference.create(data);
}

function createApproval(data) {
    return models.Approval.create(data);
}

function populateTestCases() {
    var testCases = require('../test-cases/test-cases');

    log.info('Populating test cases');
    return models.Test.remove({
        'config.testCase': true
    }).exec()
        .then(function() {
            return Promise.all(testCases.map(testCase => {
                return createTest({
                    _id: testCase.id,
                    config: {
                        testCase: true,
                        browserWidth: 1280,
                        browserHeight: 720,
                        url: 'http://localhost:5555/testpage/#/' + testCase.textId,
                        generator: 'SENSE',
                        browser: 'FIREFOX'
                    }
                });
            }));
        })
        .then(function() {
            return new Promise(function(resolve, reject) {
                fs.writeFile(appRoot + '/public/test_cases.json', JSON.stringify(testCases, null, 4), function(err){
                    if (err) {
                        reject(err);
                    }

                    resolve();
                });
            });
        })
        .then(function() {
            log.info(testCases.length +  ' test cases populated');
        });
}

module.exports = {
    schemas: schemas,
    models: models,
    init: init,

    getTests:               getTests,
    getTest:                getTest,
    createTest:             createTest,
    deleteTest:             deleteTest,
    populateTestCases:      populateTestCases,

    getFingerPrints:        getFingerPrints,
    getFingerPrintsForTest: getFingerPrintsForTest,
    getFingerPrint:         getFingerPrint,
    getBaselineFingerPrint: getBaselineFingerPrint,
    getLatestFingerPrint:   getLatestFingerPrint,
    createFingerPrint:      createFingerPrint,

    getDifference:          getDifference,
    getDifferenceByIds:     getDifferenceByIds,
    createDifference:       createDifference,

    createApproval:         createApproval
};
