var fs          = require('fs'),
    restify     = require('restify'),
    generator   = require('viveka-fingerprint-generator'),
    differ      = require('viveka-difference-tool'),
    server      = restify.createServer({ name: 'Viveka server', version: '0.0.1' }),
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
            console.log('Tests size:' + tests.length);
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

                        fingerPrint.domTree = response.jsonFingerPrint;
                        fingerPrint.image   = response.imageFingerPrint;
                        fingerPrint.state   = 'DONE';

                        fingerPrint.save(function (err, fingerPrint) {
                            if (err) {
                                console.error(err);
                            } else {
                                console.log('Fingerprint saved ..');
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
    res.send({'TODO': 'IMPLEMENT ME'});
}

server.use(restify.acceptParser(server.acceptable));
server.use(restify.jsonp());
server.use(restify.bodyParser({ mapParams: false }));


server.post('/tests', createTest);
server.get('/tests', getTests);
server.get('/tests/:id', getTest);
server.get('/tests/:id/fingerprints', getFingerPrints);
server.post('/tests/:id/fingerprints', createFingerPrint);
server.get('/fingerprints/:id', getFingerPrint);
server.get('/differences/:id', getDifference);
server.get('/differences/:baselineId/:targetId', generateDifference);
server.get(/.*/, restify.serveStatic({
    directory: './public',
    default: 'index.html'
}));

server.listen(5555, function() {
    console.log('%s listening at %s', server.name, server.url);
    db.init('MONGO_DATABASE_URL');
});
