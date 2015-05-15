var fs          = require('fs'),
    restify     = require('restify'),
    generator   = require('viveka-fingerprint-generator'),
    differ      = require('viveka-difference-tool'),
    server      = restify.createServer({ name: 'Viveka server', version: '0.0.1' });

server.use(restify.acceptParser(server.acceptable));
server.use(restify.jsonp());
server.use(restify.bodyParser({ mapParams: false }));

if (!fs.existsSync('fingerprints')) {
    fs.mkdirSync('fingerprints');
}

function createTest(req, res, next) {
    // - create test with given config
}

function getTests(req, res, next) {
    // - get the tests
}

function getTest(req, res, next) {
    // - get test data (req.params.id)
}

function getFingerPrints(req, res, next) {
    // - get the fingerprints associated with the test
}

function getFingerPrint(req, res, next) {
    // - req.params.id
}

function createFingerPrint(req, res, next) {
    // - get test data (req.params.id)
    // - generate id for fingerprint
    // - create new fingerprint entry
    // - set it to pending
    // generator.createFingerPrint(config)
}

server.post('/tests', createTest);
server.get('/tests', getTests);
server.get('/tests/:id', getTest);
server.get('/tests/:id/fingerprints', getFingerPrints);
server.post('/tests/:id/fingerprints', createFingerPrint);
server.get('/fingerprints/:id', getFingerPrint);

server.listen(5555, function() {
  console.log('%s listening at %s', server.name, server.url);
});
