var fs                 = require('fs'),
    express            = require('express'),
    http               = require('http'),
    app                = express(),
    server             = http.createServer(app),
    io                 = require('socket.io')(server),
    connect_handlebars = require('connect-handlebars'),
    log                = require('bunyan').createLogger({name: "viveka-server"}),
    VError             = require('verror'),
    generator          = require('./fingerprint-generator'),
    differ             = require('./difference-generator'),
    bodyParser         = require('body-parser'),
    db                 = require('./database.js');

function createTest(socket, message, params) {
    // - create test with given config
    var test = new db.models.Test({ config: JSON.stringify(params) });

    test.save(function (err, test) {
        if (err) {

            return handleError(socket, new VError(err, 'Failed to save test in db'));
        }

        log.info('TEST saved: ' + test._id);
        socket.emit(message, test);
    });
}

function getTests(socket, message) {
    // - get the tests
    db.models.Test.find(function (err, tests) {
        if (err) {
            return handleError(socket, new VError(err, 'Failed to get tests from db'));
        }

        log.info('Tests size: ' + tests.length);
        socket.emit(message, tests);
    });
}

function getTest(socket, message, params) {
    // - get test data (req.params.id)
    console.log(params);
    db.models.Test.find({ _id: params.id }, function (err, test) {
        if (err) {
            return handleError(socket, new VError(err, 'Failed to get test "%s" from db', params.id));
        }

        log.info('Test: ' + test[0]);
        socket.emit(message, test[0]);
    });
}

function deleteTest(socket, message, params) {
    // - delete test (req.params.id)
    // SHOULD WE REMOVE ALL THE FINGERPRINTS AND DIFFS RELATED TO THIS?
    db.models.Test.findByIdAndRemove(params.id, function (err) {
        if (err) {
            return handleError(socket, new VError(err, 'Failed to delete test "%s" from db', params.id));
        }

        log.info('Test with id: ' + params.id + ' deleted');
        socket.emit(message, 'Test with id: ' + params.id + ' deleted');
    });
}

function getFingerPrints(socket, message, params) {
    // - get the fingerprints associated with the test
    db.models.FingerPrint.find({ testId: params.id }, function (err, fingerPrints) {
        if (err) {
            return handleError(socket, new VError(err, 'Failed to get fingerprints of test "%s" from db', params.id));
        }

        log.info('FingerPrints: ' + fingerPrints.length);
        socket.emit(message, {fingerPrints: fingerPrints});
    });
}

function getFingerPrint(socket, message, params) {
    // - req.params.id
    db.models.FingerPrint.find({ _id: params.id }, function (err, fingerPrint) {
        if (err) {
            return handleError(socket, new VError(err, 'Failed to get fingerprint "%s" from db', params.id));
        }

        socket.emit(message, JSON.parse(JSON.stringify(fingerPrint[0])));
    });
}

function refreshFingerPrint(socket, message, params) {
    var config,
        fingerPrint;

    db.models.FingerPrint.find({ _id: params.id }, function (err, fingerPrint) {
        if (err) {
            return handleError(socket, new VError(err, 'Failed to get fingerprint "%s" from db', params.id));
        }

        fingerPrint = fingerPrint[0];

        db.models.Test.find({ _id: fingerPrint.testId }, function (err, test) {
            if (err) {
                return handleError(socket, new VError(err, 'Failed to get test "%s" from db', fingerPrint.testId));
            }

            config = JSON.parse(test[0].config);
            log.info('Refreshing fingerprint: ' + fingerPrint._id);
            generator.createFingerPrint(config).then(function(response) {
                log.info('Fingerprint generation finished ..');

                fingerPrint.domTree = JSON.stringify(response.jsonFingerPrint);
                fingerPrint.screenshot = '/images/fingerprints/'+ fingerPrint.id +'.png';
                fingerPrint.state   = 'DONE';

                fingerPrint.save(function (err) {
                    if (err) {
                        return handleError(socket, new VError(err, 'Failed to save fingerprint to db'));
                    }

                    log.info('Fingerprint saved to db ..');
                    var fileName = 'public' + fingerPrint.screenshot;

                    fs.writeFile(fileName, response.imageFingerPrint, 'base64', function(err) {
                        if (err) {
                            return handleError(socket, new VError(err, 'Failed to save screenshot to file "%s"', fileName));
                        }

                        log.info('Screenshot saved ..');
                        socket.emit(message, fingerPrint);
                    });
                });
            }, function(error) {
                return handleError(socket, error);
            });
        });
    });
}

function createFingerPrint(socket, message, params) {
    // - get test data (req.params.id)
    // - create new fingerprint entry
    // generator.createFingerPrint(config)
    var config,
        fingerPrint;

    db.models.Test.find({ _id: params.id }, function (err, test) {
        if (err) {
            return handleError(socket, new VError(err, 'Failed to get test "%s" from db', params.id));
        }

        // SHOULD CHECK IF THERE IS AN UNFINISHED FINGERPRINT
        // AND ABORT IF IT EXISTS
        log.info('Generating fingerprint for: ' + test[0]._id);
        config = JSON.parse(test[0].config);
        fingerPrint = new db.models.FingerPrint({ testId: test[0]._id, state: 'NEW' });

        fingerPrint.save(function (err, fingerPrint) {
            if (err) {
                return handleError(socket, new VError(err, 'Failed to save fingerprint to db'));
            }

            generator.createFingerPrint(config).then(function(response) {
                log.info('Fingerprint generation finished ..');

                fingerPrint.domTree = JSON.stringify(response.jsonFingerPrint);
                fingerPrint.screenshot = '/images/fingerprints/'+ fingerPrint.id +'.png';
                fingerPrint.state   = 'DONE';

                fingerPrint.save(function (err) {
                    if (err) {
                        return handleError(socket, new VError(err, 'Failed to save fingerprint to db'));
                    }

                    log.info('Fingerprint saved to db..');
                    var fileName = 'public' + fingerPrint.screenshot;

                    fs.writeFile(fileName, response.imageFingerPrint, 'base64', function(err) {
                        if (err) {
                            return handleError(socket, new VError(err, 'Failed to save screenshot to file "%s"', fileName));
                        }

                        log.info('Screenshot saved ..');
                        socket.emit(message, fingerPrint);
                    });
                });
            });

        });
    });
}

function getDifference(socket, message, params) {
    // - get the difference
    db.models.Difference.find({ _id: params.id }, function (err, difference) {
        if (err) {
            return handleError(socket, new VError(err, 'Failed to get difference "%s" from db', params.id));
        }

        log.info('Difference: ' + difference[0]);
        socket.emit(message, difference[0]);
    });
}

function generateDifference(socket, message, params) {
    var diff,
        a,
        b;

    db.models.Difference.findOne({ baselineId: params.baselineId, comparedId: params.targetId }, function (err, difference) {
        if (err) {
            return handleError(socket, new VError(err, 'Failed to get difference by baselineId "%s" and comparedId "%s" from db', params.baselineId, params.targetId));
        }

        diff = difference;
        if (diff) {
            log.info('Difference: ' + difference);
            res.send(difference);
        } else {
            diff = new db.models.Difference({ baselineId: params.baselineId, comparedId: params.targetId });
            db.models.FingerPrint.findOne({ _id: params.baselineId }, function (err, fingerPrint) {
                a = fingerPrint;
                db.models.FingerPrint.findOne({ _id: params.targetId }, function (err, fingerPrint) {
                    b = fingerPrint;

                    if (a && b) {
                        log.info('Generate difference');
                        diff.diff = JSON.stringify(differ.diff(JSON.parse(a), JSON.parse(b)));
                        diff.save(function (err, diff) {
                            if (err) {
                                return handleError(socket, new VError(err, 'Failed to save difference to db'));
                            }

                            log.info('DIFF saved: ' + diff._id);
                            return socket.emit(message, diff);
                        });
                    }

                    handleError(socket, new VError('Missing fingerprint'));
                });
            })
        }
    });
}

function generateDifferenceJSON(socket, message, params) {
    var diff,
        a,
        b;

    db.models.FingerPrint.findOne({ _id: params.baselineId }, function (err, fingerPrint) {
        a = fingerPrint;
        db.models.FingerPrint.findOne({ _id: params.targetId }, function (err, fingerPrint) {
            b = fingerPrint;

            if (a && b) {
                log.info('Generate difference JSON');
                differ.diff(a, b, function(diff) {
                    socket.emit(message, diff);
                });
            } else {
                handleError(socket, new VError('Missing fingerprint'));
            }
        });
    })
}

app.use('/testpage/bower_components',  express.static(__dirname + '/../bower_components'));
app.use('/testpage/js/templates.js', connect_handlebars(__dirname + '/test-page/templates'));
app.use('/testpage', express.static(__dirname + '/test-page/public'));
app.use('/apipage/bower_components',  express.static(__dirname + '/../bower_components'));
app.use('/apipage/js/templates.js', connect_handlebars(__dirname + '/api-page/templates'));
app.use('/apipage', express.static(__dirname + '/api-page/public'));
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.get('/', function(req, res) {
    res.redirect('/apipage');
});

io.on('connection', function(socket){
  connect(socket, 'tests create', createTest);
  connect(socket, 'tests list', getTests);
  connect(socket, 'tests get', getTest);
  connect(socket, 'tests delete', deleteTest);

  connect(socket, 'fingerprints list', getFingerPrints);
  connect(socket, 'fingerprints create', createFingerPrint);
  connect(socket, 'fingerprints get', getFingerPrint);
  connect(socket, 'fingerprints update', refreshFingerPrint);

  connect(socket, 'differences get', getDifference);
  connect(socket, 'differences create', generateDifference);
  connect(socket, 'differences create json', generateDifferenceJSON);

});

function connect(socket, message, middleware) {
    socket.on(message, function(params) {
        middleware(socket, message, params);
    });
}

function handleError(socket, error) {
    log.error(error);
    socket.emit('error', error);
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
