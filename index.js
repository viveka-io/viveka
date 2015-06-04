var fs          = require('fs'),
    express     = require('express'),
    log         = require('bunyan').createLogger({name: "viveka-server"}),
    VError      = require('verror'),
    generator   = require('./fingerprint-generator'),
    differ      = require('./difference-generator'),
    bodyParser  = require('body-parser'),
    app         = express(),
    db          = require('./database.js');

function createTest(req, res, next) {
    // - create test with given config
    var test = new db.models.Test({ config: JSON.stringify(req.body) });

    test.save(function (err, test) {
        if (err) {
            return next(new VError(err, 'Failed to save test in db'));
        }

        log.info('TEST saved: ' + test._id);
        res.send(test);
    });
}

function getTests(req, res, next) {
    // - get the tests
    db.models.Test.find(function (err, tests) {
        if (err) {
            return next(new VError(err, 'Failed to get tests from db'));
        }

        log.info('Tests size: ' + tests.length);
        res.send({tests: tests});
    });
}

function getTest(req, res, next) {
    // - get test data (req.params.id)
    db.models.Test.find({ _id: req.params.id }, function (err, test) {
        if (err) {
            return next(new VError(err, 'Failed to get test "%s" from db', req.params.id));
        }

        log.info('Test: ' + test[0]);
        res.send(test[0]);
    });
}

function deleteTest(req, res, next) {
    // - delete test (req.params.id)
    // SHOULD WE REMOVE ALL THE FINGERPRINTS AND DIFFS RELATED TO THIS?
    db.models.Test.findByIdAndRemove(req.params.id, function (err, post) {
        if (err) {
            return next(new VError(err, 'Failed to delete test "%s" from db', req.params.id));
        }

        log.info(post);
        res.send(post);
    });
}

function getFingerPrints(req, res, next) {
    // - get the fingerprints associated with the test
    db.models.FingerPrint.find({ testId: req.params.id }, function (err, fingerPrints) {
        if (err) {
            return next(new VError(err, 'Failed to get fingerprints of test "%s" from db', req.params.id));
        }

        log.info('FingerPrints: ' + fingerPrints.length);
        res.send({fingerPrints: fingerPrints});
    });
}

function getFingerPrint(req, res, next) {
    // - req.params.id
    db.models.FingerPrint.find({ _id: req.params.id }, function (err, fingerPrint) {
        if (err) {
            return next(new VError(err, 'Failed to get fingerprint "%s" from db', req.params.id));
        }

        log.info('Fingerprint: ' + fingerPrint[0]);
        res.send(JSON.parse(JSON.stringify(fingerPrint[0])));
    });
}

function refreshFingerPrint(req, res, next) {
    var config,
        fingerPrint;

    db.models.FingerPrint.find({ _id: req.params.id }, function (err, fingerPrint) {
        if (err) {
            return next(new VError(err, 'Failed to get fingerprint "%s" from db', req.params.id));
        }

        fingerPrint = fingerPrint[0];

        db.models.Test.find({ _id: fingerPrint.testId }, function (err, test) {
            if (err) {
                return next(new VError(err, 'Failed to get test "%s" from db', fingerPrint.testId));
            }

            config = JSON.parse(test[0].config);
            log.info('Refreshing fingerprint: ' + fingerPrint._id);
            generator.createFingerPrint(config).then(function(response) {
                log.info('Fingerprint generation finished ..');

                fingerPrint.domTree = JSON.stringify(response.jsonFingerPrint);
                fingerPrint.state   = 'DONE';

                fingerPrint.save(function (err, fingerPrint) {
                    if (err) {
                        return next(new VError(err, 'Failed to save fingerprint to db'));
                    }

                    log.info('Fingerprint saved ..');
                    var fileName = 'public/images/fingerprints/'+ fingerPrint.id +'.png';

                    fs.writeFile(fileName, response.imageFingerPrint, 'base64', function(err) {
                        if (err) {
                            return next(new VError(err, 'Failed to save screenshot to file "%s"', fileName));
                        }

                        log.info('Screenshot saved ..');
                    });
                });
            }, function(error) {
                return next(error);
            });
            res.send(fingerPrint);
        });
    });
}

function createFingerPrint(req, res, next) {
    // - get test data (req.params.id)
    // - create new fingerprint entry
    // generator.createFingerPrint(config)
    var config,
        fingerPrint;

    db.models.Test.find({ _id: req.params.id }, function (err, test) {
        if (err) {
            return next(new VError(err, 'Failed to get test "%s" from db', req.params.id));
        }

        // SHOULD CHECK IF THERE IS AN UNFINISHED FINGERPRINT
        // AND ABORT IF IT EXISTS
        log.info('Generating fingerprint for: ' + test[0]._id);
        config = JSON.parse(test[0].config);
        fingerPrint = new db.models.FingerPrint({ testId: test[0]._id, state: 'NEW' });

        fingerPrint.save(function (err, fingerPrint) {
            if (err) {
                return next(new VError(err, 'Failed to save fingerprint to db'));
            }

            log.info('Fingerprint: ' + fingerPrint);
            generator.createFingerPrint(config).then(function(response) {
                log.info('Fingerprint generation finished ..');

                fingerPrint.domTree = JSON.stringify(response.jsonFingerPrint);
                fingerPrint.screenshot = 'images/fingerprints/'+ fingerPrint.id +'.png';
                fingerPrint.state   = 'DONE';

                fingerPrint.save(function (err, fingerPrint) {
                    if (err) {
                        return next(new VError(err, 'Failed to save fingerprint to db'));
                    }

                    log.info('Fingerprint saved ..');
                    var fileName = 'public/images/fingerprints/'+ fingerPrint.id +'.png';

                    fs.writeFile(fileName, response.imageFingerPrint, 'base64', function(err) {
                        if (err) {
                            return next(new VError(err, 'Failed to save screenshot to file "%s"', fileName));
                        }

                        log.info('Screenshot saved ..');
                    });
                });
            });

            res.send(fingerPrint);
        });
    });
}

function getDifference(req, res, next) {
    // - get the difference
    db.models.Difference.find({ _id: req.params.id }, function (err, difference) {
        if (err) {
            return next(new VError(err, 'Failed to get difference "%s" from db', req.params.id));
        }

        log.info('Difference: ' + difference[0]);
        res.send(difference[0]);
    });
}

function generateDifference(req, res, next) {
    var diff,
        a,
        b;

    db.models.Difference.findOne({ baselineId: req.params.baselineId, comparedId: req.params.targetId }, function (err, difference) {
        if (err) {
            return next(new VError(err, 'Failed to get difference by baselineId "%s" and comparedId "%s" from db', req.params.baselineId, req.params.targetId));
        }

        diff = difference;
        if (diff) {
            log.info('Difference: ' + difference);
            res.send(difference);
        } else {
            diff = new db.models.Difference({ baselineId: req.params.baselineId, comparedId: req.params.targetId });
            db.models.FingerPrint.findOne({ _id: req.params.baselineId }, function (err, fingerPrint) {
                a = fingerPrint;
                db.models.FingerPrint.findOne({ _id: req.params.targetId }, function (err, fingerPrint) {
                    b = fingerPrint;

                    console.log(a)
                    console.log(b)

                    if (a && b) {
                        log.info('Generate difference');
                        diff.diff = JSON.stringify(differ.diff(JSON.parse(a.domTree), JSON.parse(b.domTree)));
                        diff.save(function (err, diff) {
                            if (err) {
                                return next(new VError(err, 'Failed to save difference to db'));
                            }

                            log.info('DIFF saved: ' + diff._id);
                            return res.send(diff);
                        });
                    }

                    next(new VError('Missing fingerprint'));
                });
            })
        }
    });
}

function logErrors(err, req, res, next) {
  log.error(err);
  next(err);
}

function clientErrorHandler(err, req, res, next) {
  if (req.xhr) {
    res.status(500).send({ error: err });
  } else {
    next(err);
  }
}

app.use('/bower_components',  express.static(__dirname + '/../bower_components'));
app.use(express.static(__dirname + '/docs'));
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.post('/tests', createTest);
app.get('/tests', getTests);
app.get('/tests/:id', getTest);
app.delete('/tests/:id', deleteTest);
app.get('/tests/:id/fingerprints', getFingerPrints);
app.post('/tests/:id/fingerprints', createFingerPrint);
app.get('/fingerprints/:id', getFingerPrint);
app.put('/fingerprints/:id', refreshFingerPrint);
app.get('/differences/:id', getDifference);
app.get('/differences/:baselineId/:targetId', generateDifference);
app.use(logErrors);
app.use(clientErrorHandler);

db.init(process.env.DB_URI, function(err) {
    if (err) {
        throw new VError(err, "Failed to start the server.");
    }

    var server = app.listen(5555, function() {
        log.info('Viveka server is listening at %s', server.address().port);
        log.info('Database URI: %s', process.env.DB_URI);
    });
});
