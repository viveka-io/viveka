var fs                   = require('fs'),
    express              = require('express'),
    http                 = require('http'),
    app                  = express(),
    server               = http.createServer(app),
    io                   = require('socket.io')(server),
    handlebarsMiddleware = require('connect-handlebars'),
    sassMiddleware       = require('node-sass-middleware'),
    log                  = require('bunyan').createLogger({name: "viveka-server"}),
    VError               = require('verror'),
    generator            = require('./fingerprint-generator.js'),
    differ               = require('./difference-generator'),
    bodyParser           = require('body-parser'),
    db                   = require('./database.js');

if (!process.env.DB_URI) {
    process.env.DB_URI = 'mongodb://localhost:27017/viveka';
}

function getTests(socket, message) {
    db.getTests()
        .then(function (tests) {
            log.info('Tests size: ' + tests.length);
            socket.emit(message, {tests: tests});
        }, handleError(socket, 'Failed to get tests'));
}

function getTest(socket, message, params) {
    db.getTest(params.id)
        .then(function (test) {
            log.info('Test: ' + test.toObject());
            socket.emit(message, test.toObject());
        }, handleError(socket, 'Failed to get test: ' + params.id));
}

function createTest(socket, message, params) {
    db.createTest({ config: params })
        .then(function (test) {
            log.info('Test saved: ' + test._id);
            socket.emit(message, test);
        }, handleError(socket, 'Failed to create test'));
}

function deleteTest(socket, message, params) {
    db.deleteTest(params.id)
        .then(function () {
            log.info('Test with id: ' + params.id + ' deleted');
            socket.emit(message, 'Test with id: ' + params.id + ' deleted');
        }, handleError(socket, 'Failed to delete test: ' + params.id));
}

function getFingerPrints(socket, message, params) {
    db.getFingerPrintsForTest(params.id)
        .then(function (fingerPrints) {
            log.info('FingerPrints: ' + fingerPrints.length);
            socket.emit(message, {fingerPrints: fingerPrints});
        }, handleError(socket, 'Failed to get fingerprints of test: ' + params.id));
}

function getFingerPrint(socket, message, params) {
    db.getFingerPrint(params.id)
        .then(function (fingerPrint) {
            socket.emit(message, fingerPrint.toObject());
        }, handleError(socket, 'Failed to get fingerprint: ' + params.id));
}

function createFingerPrint(socket, message, params) {
    var testId = params.id,
        config,
        fingerP,
        fileName;

    db.getTest(testId)
        .then(function (test) {
            config = test.config;
            log.info('Creating fingerprint for: ' + testId);
            return db.createFingerPrint({ testId: testId, state: 'NEW' });
        }, handleError(socket, 'Failed to get test: ' + testId))
        .then(function (fingerPrint) {
            fingerP = fingerPrint;
            log.info('Generating fingerprint: ' + fingerPrint._id);
            return generator.createFingerPrint(config);
        }, handleError(socket, 'Failed to create fingerPrint'))
        .then(function (response) {
            fingerP.domTree     = response.jsonFingerPrint;
            fingerP.screenshot  = '/images/fingerprints/'+ fingerP.id +'.png';
            fingerP.state       = 'DONE'
            fileName            = 'public' + fingerP.screenshot;

            return fs.writeFile(fileName, response.imageFingerPrint, 'base64');
        }, handleError(socket, 'Failed to generate fingerPrint'))
        .then(function () {
            log.info('Screenshot saved to drive');
            return fingerP.save();
        }, handleError(socket, 'Failed to save screenshot'))
        .then(function () {
            log.info('Fingerprint saved to db');
            socket.emit(message, fingerP.toObject());
        }, handleError(socket, 'Failed to save fingerPrint'));
}

function approveFingerPrint(socket, message, params) {
    db.getFingerPrint(params.id)
        .then(function(){
           return db.createApproval({
                fingerPrint: params.id,
                approval: true,
                date: new Date()
            });                              
        }, handleError(socket, 'Failed to get fingerprint: ' + params.id))
        .then(function(savedApproval) {
            log.info('APPROVAL saved: ' + savedApproval._id);
            socket.emit(message, savedApproval);
        }, handleError(socket, 'Failed to save approval in db'));
}

function unapproveFingerPrint(socket, message, params) {
    db.getFingerPrint(params.id)
        .then(function(){
           return db.createApproval({
                fingerPrint: params.id,
                approval: false,
                date: new Date()
            });                              
        }, handleError(socket, 'Failed to get fingerprint: ' + params.id))
        .then(function(savedApproval) {
            log.info('UNAPPROVAL saved: ' + savedApproval._id);
            socket.emit(message, savedApproval);
        }, handleError(socket, 'Failed to save unapproval in db'));
}

function getDifference(socket, message, params) {
    db.getDifference(params.id)
        .then(function (difference) {
            log.info('Difference: ' + difference.toObject());
            socket.emit(message, difference.toObject());
        }, handleError(socket, 'Failed to get difference ' + params.id));
}

function generateDifference(socket, message, params) {
    var baselineId = params.baselineId,
        targetId = params.targetId,
        diff, a, b;

    db.getDifferenceByIds(baselineId, targetId)
        .then(function (difference) {
            if (difference) { // Diff found, resolving promise
                socket.emit(message, diff.toObject());
                this.resolve();
            }
            return difference;
        })
        .then(function () {
            return db.createDifference({ baselineId: baselineId, comparedId: targetId, state: 'NEW' });
        })
        .then(function (difference) {
            diff = difference;
            return db.getFingerPrint(baselineId);
        }, handleError(socket, 'Failed to create diff'))
        .then(function (fingerPrint) {
            a = fingerPrint;
            return db.getFingerPrint(targetId);
        })
        .then(function (fingerPrint) {
            b = fingerPrint;

            if (a && b) {
                log.info('Generate difference');
                differ.diff(a.toObject(), b.toObject(), function(diffJSON) {
                    diff.diff   = diffJSON;
                    diff.state  = 'DONE';
                    return diff.save();
                });
            } else {
                handleError(socket, new VError('Missing fingerprint'));
            }
        })
        .then(function (savedDiff) {
            log.info('DIFF saved: ' + savedDiff._id);
            socket.emit(message, savedDiff.toObject());
        }, handleError(socket, 'Failed to save diff'));
}

function generateDifferenceJSON(socket, message, params) {
    var a, b;

    db.getFingerPrint(params.baselineId)
        .then(function (fingerPrint) {
            a = fingerPrint;
            return db.getFingerPrint(params.targetId);
        })
        .then(function (fingerPrint) {
            b = fingerPrint;

            if (a && b) {
                log.info('Generate difference JSON');
                differ.diff(a.toObject(), b.toObject(), function(diff) {
                    socket.emit(message, diff);
                });
            } else {
                handleError(socket, new VError('Missing fingerprint'));
            }
        });
}

// Test page
app.use('/testpage/bower_components',  express.static(__dirname + '/bower_components'));
app.use('/testpage/js/templates.js', handlebarsMiddleware(__dirname + '/test-page/templates'));
app.use('/testpage/css', sassMiddleware({
    src: __dirname + '/test-page/styles',
    dest: __dirname + '/test-page/public/css',
    debug: true,
    outputStyle: 'compressed'
}));
app.use('/testpage', express.static(__dirname + '/test-page/public'));

// API page
app.use('/apipage/bower_components',  express.static(__dirname + '/bower_components'));
app.use('/apipage/js/templates.js', handlebarsMiddleware(__dirname + '/api-page/templates'));
app.use('/apipage/css', sassMiddleware({
    src: __dirname + '/api-page/styles',
    dest: __dirname + '/api-page/public/css',
    debug: true,
    outputStyle: 'compressed'
}));
app.use('/apipage', express.static(__dirname + '/api-page/public'));

// Diff page
app.use('/diffpage/bower_components',  express.static(__dirname + '/bower_components'));
app.use('/diffpage/js/templates.js', handlebarsMiddleware(__dirname + '/diff-page/templates'));
app.use('/diffpage/css', sassMiddleware({
    src: __dirname + '/diff-page/styles',
    dest: __dirname + '/diff-page/public/css',
    debug: true,
    outputStyle: 'compressed'
}));
app.use('/diffpage', express.static(__dirname + '/diff-page/public'));

// General routes
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.get('/', function(req, res) {
    res.redirect('/apipage');
});

io.on('connection', function(socket){
    connect(socket, 'tests create', createTest);
    connect(socket, 'tests list',   getTests);
    connect(socket, 'tests get',    getTest);
    connect(socket, 'tests delete', deleteTest);

    connect(socket, 'fingerprints list',        getFingerPrints);
    connect(socket, 'fingerprints create',      createFingerPrint);
    connect(socket, 'fingerprints get',         getFingerPrint);
    connect(socket, 'fingerprints approve',     approveFingerPrint);
    connect(socket, 'fingerprints unapprove',   unapproveFingerPrint);
    // connect(socket, 'fingerprints update', refreshFingerPrint);

    connect(socket, 'differences get',          getDifference);
    connect(socket, 'differences create',       generateDifference);
    connect(socket, 'differences create json',  generateDifferenceJSON);
});

function connect(socket, message, middleware) {
    socket.on(message, function(params) {
        middleware(socket, message, params);
    });
}

function handleError(socket, error) {
    return function (err) {
        log.error(new VError(err, error));
        socket.emit('verror', error);
    }
}

db.init(process.env.DB_URI, function(err) {
    if (err) {
        throw new VError(err, "Failed to start the server.");
    }

    server.listen(5555, function() {
        log.info('Viveka server is listening at %s', server.address().port);
        log.info('Database URI: %s', process.env.DB_URI);
    });
});
