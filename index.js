var fs          = require('fs'),
    express     = require('express'),
    generator   = require('viveka-fingerprint-generator'),
    differ      = require('viveka-difference-tool'),
    bodyParser  = require('body-parser'),
    app         = express(),
    db          = require('./database.js');

function createTest(req, res, next) {
    // - create test with given config
    var test = new db.models.Test({ config: JSON.stringify(req.body) });
    test.save(function (err, test) {
        if (err) {
            console.error(err);
            res.send({error: err});
        } else {
            console.log('TEST saved: ' + test._id);
            res.send(test);
        }
    });
}

function getTests(req, res, next) {
    // - get the tests
    db.models.Test.find(function (err, tests) {
        if (err) {
            console.error(err);
            res.send({error: err});
        } else {
            console.log('Tests size: ' + tests.length);
            res.send({tests: tests});
        }
    });
}

function getTest(req, res, next) {
    // - get test data (req.params.id)
    db.models.Test.find({ _id: req.params.id }, function (err, test) {
        if (err) {
            console.error(err);
            res.send({error: err});
        } else {
            console.log('Test: ' + test[0]);
            res.send(test[0]);
        }
    });
}

function getFingerPrints(req, res, next) {
    // - get the fingerprints associated with the test
    db.models.FingerPrint.find({ testId: req.params.id }, function (err, fingerPrints) {
        if (err) {
            console.error(err);
            res.send({error: err});
        } else {
            console.log('FingerPrints: ' + fingerPrints.length);
            res.send({fingerPrints: fingerPrints});
        }
    });
}

function getFingerPrint(req, res, next) {
    // - req.params.id
    db.models.FingerPrint.find({ _id: req.params.id }, function (err, fingerPrint) {
        if (err) {
            console.error(err);
            res.send({error: err});
        } else {
            console.log('Fingerprint: ' + fingerPrint[0]);
            res.send(fingerPrint[0]);
        }
    });
}

function refreshFingerPrint(req, res, next) {
    var config,
        fingerPrint;

    db.models.FingerPrint.find({ _id: req.params.id }, function (err, fingerPrint) {
        if (err) {
            console.error(err);
            res.send({error: err});
        } else {
            fingerPrint = fingerPrint[0];

            db.models.Test.find({ _id: fingerPrint.testId }, function (err, test) {
                if (err) {
                    console.error(err);
                } else {
                    config = JSON.parse(test[0].config);
                    console.log('Refreshing fingerprint: ' + fingerPrint._id);
                    generator.createFingerPrint(config).then(function(response) {
                        console.log('Fingeprint generation finished ..');

                        fingerPrint.domTree = JSON.stringify(response.jsonFingerPrint);
                        fingerPrint.state   = 'DONE';

                        fingerPrint.save(function (err, fingerPrint) {
                            if (err) {
                                console.error(err);
                            } else {
                                console.log('Fingerprint saved ..');
                                fs.writeFile('public/images/fingerprints/'+ fingerPrint.id +'.png', response.imageFingerPrint, 'base64', function(error) {
                                    if (error) { console.log(error); }
                                    else {
                                        console.log('Screenshot saved ..');
                                    }
                                });
                            }
                        });
                    });
                    res.send(fingerPrint);
                }
            });


        }
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
            console.error(err);
        } else {
            // SHOULD CHECK IF THERE IS AN UNFINISHED FINGERPRINT
            // AND ABORT IF IT EXISTS
            console.log('Generating fingeprint for: ' + test[0]._id);
            config = JSON.parse(test[0].config);
            fingerPrint = new db.models.FingerPrint({ testId: test[0]._id, state: 'NEW' });

            fingerPrint.save(function (err, fingerPrint) {
                if (err) {
                    console.error(err);
                    res.send({error: err});
                } else {
                    console.log(fingerPrint);
                    generator.createFingerPrint(config).then(function(response) {
                        console.log('Fingeprint generation finished ..');

                        fingerPrint.domTree = JSON.stringify(response.jsonFingerPrint);
                        fingerPrint.state   = 'DONE';

                        fingerPrint.save(function (err, fingerPrint) {
                            if (err) {
                                console.error(err);
                            } else {
                                console.log('Fingerprint saved ..');
                                fs.writeFile('public/images/fingerprints/'+ fingerPrint.id +'.png', response.imageFingerPrint, 'base64', function(error) {
                                    if (error) { console.log(error); }
                                    else {
                                        console.log('Screenshot saved ..');
                                    }
                                });
                            }
                        });
                    });
                    res.send(fingerPrint);
                }
            });
        }
    });
}

function getDifference(req, res, next) {
    // - get the difference
    db.models.Difference.find({ _id: req.params.id }, function (err, difference) {
        if (err) {
            console.error(err);
            res.send({error: err});
        } else {
            console.log('Difference: ' + difference[0]);
            res.send(difference[0]);
        }
    });
}

function generateDifference(req, res, next) {
    var diff,
        a,
        b;

    db.models.Difference.find({ baselineId: req.params.baselineId, comparedId: req.params.targetId }, function (err, difference) {
         if (err) {
            console.error(err);
            res.send({error: err});
        } else {
            diff = difference[0];
            if (diff) {
                console.log('Difference: ' + difference[0]);
                res.send(difference[0]);
            } else {
                diff = new db.models.Difference({ baselineId: req.params.baselineId, comparedId: req.params.targetId });
                db.models.FingerPrint.find({ _id: req.params.baselineId }, function (err, fingerPrint) {
                    a = fingerPrint[0];
                    db.models.FingerPrint.find({ _id: req.params.targetId }, function (err, fingerPrint) {
                        b = fingerPrint[0];
                        if (a && b) {
                            console.log('Generate difference');
                            diff.diff = JSON.stringify(differ.diff(JSON.parse(a.domTree), JSON.parse(b.domTree)));
                            diff.save(function (err, diff) {
                                if (err) {
                                    console.error(err);
                                    res.send({error: err});
                                } else {
                                    console.log('DIFF saved: ' + diff._id);
                                    res.send(diff);
                                }
                            });
                        } else {
                            res.send({error: 'Missing fingerprint'});
                        }
                    });
                })
            }
        }
    });
}

app.use('/bower_components',  express.static(__dirname + '/../bower_components'));
app.use(express.static(__dirname + '/docs'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());


app.post('/tests', createTest);
app.get('/tests', getTests);
app.get('/tests/:id', getTest);
app.get('/tests/:id/fingerprints', getFingerPrints);
app.post('/tests/:id/fingerprints', createFingerPrint);
app.get('/fingerprints/:id', getFingerPrint);
app.get('/differences/:id', getDifference);
app.get('/differences/:baselineId/:targetId', generateDifference);

var server = app.listen(5555, function() {
    console.log('%s listening at %s', server.address().address, server.address().port);
    console.log('Database URI: %s', process.env.MONGO_DATABASE_URL);
    db.init(process.env.MONGO_DATABASE_URL);
});
