var mongoose = require('mongoose'),
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
    state: String,
    domTree: mongoose.Schema.Types.Mixed,
    screenshot: String
});

schemas.Difference = mongoose.Schema({
    baselineId: String,
    comparedId: String,
    state: String,
    diff: mongoose.Schema.Types.Mixed
});

models.Test         = mongoose.model('Test', schemas.Test);
models.FingerPrint  = mongoose.model('FingerPrint', schemas.FingerPrint);
models.Difference   = mongoose.model('Difference', schemas.Difference);

function init(link, callback) {
    log.info('Connecting to database ..')
    mongoose.connect(link, { server: { socketOptions: { connectTimeoutMS: 5000 }}});
    db = mongoose.connection;
    db.on('error', function (err) {
        var werr = new VError(err, 'Connection to "%s" failed', link);
        callback(werr);
    });
    db.once('open', function () {
        log.info('Connected to database ..');
        callback();
    });
}

function getTests() {
    return models.Test.find().exec()
        .then(function (tests) {
            return(tests);
        });
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
    return models.Test.create(data)
        .then(function (test) {
            return(test);
        });
}

function deleteTest(id) {
    // SHOULD WE REMOVE ALL THE FINGERPRINTS AND DIFFS RELATED TO THIS?
    return models.Test.findByIdAndRemove(id).exec()
        .then(function (test) {
            return(test);
        });
}

function getFingerPrints() {
    return models.FingerPrint.find().exec()
        .then(function (fingerPrints) {
            return(fingerPrints);
        });
}

function getFingerPrintsForTest(id) {
    return models.FingerPrint.find({ testId: id }).exec()
        .then(function (fingerPrints) {
            return(fingerPrints);
        });
}

function getFingerPrint(id) {
    return models.FingerPrint.findOne({ _id: id }).exec()
        .then(function (fingerPrint) {
            return(fingerPrint);
        });
}

function createFingerPrint(data) {
    return models.FingerPrint.create(data)
        .then(function (fingerPrint) {
            return(fingerPrint);
        });
}

function getDifference(id) {
    return models.Difference.findOne({ _id: id }).exec()
        .then(function (difference) {
            return(difference);
        });
}

function getDifferenceByIds(id1, id2) {
    return models.Difference.findOne({baselineId: id1, comparedId: id2}).exec()
        .then(function (difference) {
            return(difference);
        });
}

function createDifference(data) {
    return models.Difference.create(data)
        .then(function (difference) {
            return(difference);
        });
}

module.exports = {
    schemas: schemas,
    models: models,
    init: init,

    getTests:   getTests,
    getTest:    getTest,
    createTest: createTest,
    deleteTest: deleteTest,

    getFingerPrints:        getFingerPrints,
    getFingerPrintsForTest: getFingerPrintsForTest,
    getFingerPrint:         getFingerPrint,
    createFingerPrint:      createFingerPrint,

    getDifference:      getDifference,
    getDifferenceByIds: getDifferenceByIds,
    createDifference:   createDifference
};
