var mongoose = require('mongoose'),
    schemas = {},
    models = {},
    db;

schemas.Test = mongoose.Schema({
    config: String
});

schemas.FingerPrint = mongoose.Schema({
    testId: String,
    state: String,
    domTree: String
});

schemas.Difference = mongoose.Schema({
    baselineId: String,
    comparedId: String,
    diff: String
});

models.Test         = mongoose.model('Test', schemas.Test);
models.FingerPrint  = mongoose.model('FingerPrint', schemas.FingerPrint);
models.Difference   = mongoose.model('Difference', schemas.Difference);

function init(link) {
    console.log('Connecting to database ..')
    mongoose.connect(link);
    db = mongoose.connection;
    db.on('error', console.error.bind(console, 'connection error:'));
    db.once('open', function (callback) {
        console.log('Connected to database ..')
    });
}

module.exports = {
    schemas: schemas,
    models: models,
    init: init
};
