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

module.exports = {
    schemas: schemas,
    models: models,
    init: init
};
