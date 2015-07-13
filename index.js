var fs                   = require('fs'),
    express              = require('express'),
    http                 = require('http'),
    app                  = express(),
    server               = http.createServer(app),
    io                   = require('socket.io')(server),
    handlebars           = require('./node_modules/connect-handlebars/node_modules/handlebars/lib/index'),
    handlebarsMiddleware = require('connect-handlebars'),
    lessMiddleware       = require('less-middleware'),
    log                  = require('bunyan').createLogger({name: "viveka-server"}),
    VError               = require('verror'),
    generator            = require('./fingerprint-generator.js'),
    differ               = require('./difference-generator'),
    bodyParser           = require('body-parser'),
    db                   = require('./database.js');
    
handlebars.registerHelper('toLowerCase', function(str) {
  return str.toLowerCase();
});

if (!process.env.DB_URI) {
    process.env.DB_URI = 'mongodb://localhost:27017/viveka';
}

function getTests(params, respond) {
    db.getTests()
        .then(function (tests) {
            log.info('Tests size: ' + tests.length);
            respond({result: tests});
        }, handleError(respond, 'Failed to get tests'));
}

function getTest(params, respond) {
    db.getTest(params.id)
        .then(function (test) {
            log.info('Test: ' + test.toObject());
            respond({result: test.toObject()});
        }, handleError(respond, 'Failed to get test: ' + params.id));
}

function createTest(params, respond) {
    db.createTest({ config: params })
        .then(function (test) {
            log.info('Test saved: ' + test._id);
            respond({result: test});
        }, handleError(respond, 'Failed to create test'));
}

function deleteTest(params, respond) {
    db.deleteTest(params.id)
        .then(function () {
            log.info('Test with id: ' + params.id + ' deleted');
            respond({info: 'Test with id: ' + params.id + ' deleted'});
        }, handleError(respond, 'Failed to delete test: ' + params.id));
}

function getFingerPrints(params, respond) {
    db.getFingerPrintsForTest(params.id)
        .then(function (fingerPrints) {
            log.info('FingerPrints: ' + fingerPrints.length);
            respond({result: fingerPrints});
        }, handleError(respond, 'Failed to get fingerprints of test: ' + params.id));
}

function getFingerPrint(params, respond) {
    db.getFingerPrint(params.id)
        .then(function (fingerPrint) {
            respond({result: fingerPrint.toObject()});
        }, handleError(respond, 'Failed to get fingerprint: ' + params.id));
}

function getBaselineFingerPrint(params, respond) {   
    db.getBaselineFingerPrint(params.id)
        .then(function (fingerPrint) {
            if (fingerPrint) {
                respond({result: fingerPrint.toObject()});
            } else {
                respond({info: 'No baseline fingerprint found!'});
            }
            
        }, handleError(respond, 'Failed to get fingerprint for test: ' + params.id));
}

function getLatestFingerPrint(params, respond) {
    db.getLatestFingerPrint(params.id)
        .then(function (fingerPrint) {
            respond({result: fingerPrint.toObject()});
        }, handleError(respond, 'Failed to get fingerprint for test: ' + params.id));
}

function createFingerPrint(params, respond) {
    var mode,
        testId = params.id,
        config,
        fingerP,
        fileName;

    db.getBaselineFingerPrint(testId)
        .then(function(fingerprint){
            mode = !fingerprint ? 'baseline' : 'latest';   
            return db.getTest(testId);
        }, handleError(respond, 'Failed to get baseline finerprint for test: ' + testId))
        .then(function (test) {
            config = test.config;
            log.info('Creating fingerprint for: ' + testId);
            return db.createFingerPrint({ testId: testId, state: 'NEW' });
        }, handleError(respond, 'Failed to get test: ' + testId))
        .then(function (fingerPrint) {
            fingerP = fingerPrint;
            log.info('Generating fingerprint: ' + fingerPrint._id);
            return generator.createFingerPrint(config, mode);
        }, handleError(respond, 'Failed to create fingerPrint'))
        .then(function (response) {
            fingerP.domTree     = response.jsonFingerPrint;
            fingerP.screenshot  = '/images/fingerprints/'+ fingerP.id +'.png';
            fingerP.state       = 'DONE'
            fingerP.created     = new Date();
            fileName            = 'public' + fingerP.screenshot;

            return fs.writeFile(fileName, response.imageFingerPrint, 'base64');
        }, handleError(respond, 'Failed to generate fingerPrint'))
        .then(function () {
            log.info('Screenshot saved to drive');
            return fingerP.save();
        }, handleError(respond, 'Failed to save screenshot'))
        .then(function () {
            log.info('Fingerprint saved to db');
            respond({result: fingerP.toObject()});
        }, handleError(respond, 'Failed to save fingerPrint'));
}

function approveFingerPrint(params, respond) {
    db.getFingerPrint(params.id)
        .then(function(fingerPrint){
            fingerPrint.approved = true;
            return fingerPrint.save();
        }, handleError(respond, 'Failed to get fingerprint: ' + params.id))
        .then(function(){
           return db.createApproval({
                fingerPrint: params.id,
                approval: true,
                date: new Date()
            });                              
        }, handleError(respond, 'Failed to save fingerprint: ' + params.id))
        .then(function(savedApproval) {
            log.info('APPROVAL saved: ' + savedApproval._id);
            respond({result: savedApproval});
        }, handleError(respond, 'Failed to save approval in db'));
}

function unapproveFingerPrint(params, respond) {
    db.getFingerPrint(params.id)
        .then(function(fingerPrint){
            fingerPrint.approved = false;
            return fingerPrint.save();
        }, handleError(respond, 'Failed to get fingerprint: ' + params.id))
        .then(function(){
           return db.createApproval({
                fingerPrint: params.id,
                approval: false,
                date: new Date()
            });                              
        }, handleError(respond, 'Failed to save fingerprint: ' + params.id))
        .then(function(savedApproval) {
            log.info('UNAPPROVAL saved: ' + savedApproval._id);
            respond({result: savedApproval});
        }, handleError(respond, 'Failed to save unapproval in db'));
}

function getDifference(params, respond) {
    db.getDifference(params.id)
        .then(function (difference) {
            log.info('Difference: ' + difference.toObject());
            respond({result: difference.toObject()});
        }, handleError(respond, 'Failed to get difference ' + params.id));
}

function generateDifference(params, respond) {
    var baselineId = params.baselineId,
        targetId = params.targetId,
        diff, a, b;

    db.getDifferenceByIds(baselineId, targetId)
        .then(function (difference) {
            if (difference) { // Diff found, resolving promise
                respond({result: diff.toObject()});
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
        }, handleError(respond, 'Failed to create diff'))
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
                handleError(respond, new VError('Missing fingerprint'));
            }
        })
        .then(function (savedDiff) {
            log.info('DIFF saved: ' + savedDiff._id);
            respond({result: savedDiff.toObject()});
        }, handleError(respond, 'Failed to save diff'));
}

function generateDifferenceJSON(params, respond) {
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
                    respond({result: diff});
                });
            } else {
                handleError(respond, new VError('Missing fingerprint'));
            }
        });
}

//Bower
app.use('/bower_components',  express.static(__dirname + '/bower_components'));

// Test page
app.use('/testpage/js/templates.js', handlebarsMiddleware(__dirname + '/test-page/templates'));
app.use('/testpage/js/testcase-templates.js', handlebarsMiddleware(__dirname + '/test-cases/templates'));
app.use('/testpage/css', lessMiddleware(__dirname + '/test-page/styles', {
    dest: __dirname + '/test-page/public/css',
    debug: true,
    render: {
        yuicompress: true
    }
}));
app.use('/testpage', express.static(__dirname + '/test-page/public'));

// API page
app.use('/apipage/js/templates.js', handlebarsMiddleware(__dirname + '/api-page/templates'));
app.use('/apipage/css', lessMiddleware(__dirname + '/api-page/styles', {
    dest: __dirname + '/api-page/public/css',
    debug: true,
    render: {
        yuicompress: true
    }
}));
app.use('/apipage', express.static(__dirname + '/api-page/public'));

// Diff page
app.use('/diffpage/js/templates.js', handlebarsMiddleware(__dirname + '/diff-page/templates'));
app.use('/diffpage/css', lessMiddleware(__dirname + '/diff-page/styles', {
    dest: __dirname + '/diff-page/public/css',
    debug: true,
    render: {
        yuicompress: true
    }
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
    socket.on('tests create', createTest);
    socket.on('tests list',   getTests);
    socket.on('tests get',    getTest);
    socket.on('tests delete', deleteTest);

    socket.on('fingerprints list',         getFingerPrints);
    socket.on('fingerprints create',       createFingerPrint);
    socket.on('fingerprints get',          getFingerPrint);
    socket.on('fingerprints get baseline', getBaselineFingerPrint);
    socket.on('fingerprints get latest',   getLatestFingerPrint);
    socket.on('fingerprints approve',      approveFingerPrint);
    socket.on('fingerprints unapprove',    unapproveFingerPrint);
    // socket.on('fingerprints update', refreshFingerPrint);

    socket.on('differences get',           getDifference);
    socket.on('differences create',        generateDifference);
    socket.on('differences create json',   generateDifferenceJSON);
});

function handleError(respond, error) {
    return function (err) {
        log.error(new VError(err, error));
        respond({error: error});
    };
}

db.init(process.env.DB_URI, function(err) {
    if (err) {
        throw new VError(err, "Failed to start the server.");
    }

    server.listen(5555, function() {
        log.info('Viveka server is listening at %s', server.address().port);
        log.info('Database URI: %s', process.env.DB_URI);
        db.populateTestCases();
    });
});
