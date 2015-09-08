/* global componentHandler */
(function () {
    'use strict';

    var socket = io(),
        router,
        testId,
        browsers = [
            { name: 'Firefox' }, { name: 'Chrome' },  { name: 'Safari' }, { name: 'PhantomJS' }
        ];

    function init() {
        initRouter();

        getTestDetailsAsync()
            .then(loadTestDetailsView);

        loadFingerprints();

        attachEventHandlers();
    }

    function initRouter() {
        router = new Router();
        testId = router.getRoute()[0];
    }

    function getTestDetailsAsync() {
        return socket.emitAsync('tests get', {
            id: testId
        });
    }

    function loadFingerprints() {
        getFingerprintsListAsync()
            .then(renderFingerprintsListView);
    }

    function getFingerprintsListAsync() {
        return socket.emitAsync('fingerprints list', {
            id: testId
        });
    }

    function loadTestDetailsView(testDetails) {
        var testData;

        if (testDetails.error) {
            testData = { browsers: browsers };
        } else {
            testData = testDetails.result;
            setSelectedBrowser(testData.config.browser);
            testData.browsers = browsers;
            $('#test-title').html(testData.name);
        }

        $('#test-details-container').html(Handlebars.templates.testDetails(testData));
        componentHandler.upgradeAllRegistered();
    }

    function renderFingerprintsListView(testFingerprints) {
        console.log(testFingerprints);
        $('#fingerprints-list-container').html(Handlebars.templates.fingerprintList(testFingerprints.result));
        componentHandler.upgradeAllRegistered();
    }

    function setSelectedBrowser(testBrowser) {
        browsers.forEach(function (browser) {
            if (browser.name.toUpperCase() === testBrowser.toUpperCase()) {
                browser.selected = true;
            }
        });
    }

    function attachEventHandlers() {
        $('#add-fingerprint').on('click', createFingerprint);
    }

    function createFingerprint() {
        socket.emitAsync('fingerprints create', { id: testId })
                .then(loadFingerprints);
    }

    Promise.promisifyAll(socket, {
        promisifier: function (originalMethod) {
            return function promisified() {
                var args = [].slice.call(arguments),
                    self = this;

                return new Promise(function (resolve, reject) {
                    args.push(resolve);
                    originalMethod.apply(self, args);
                });
            };
        }
    });

    init();
})();
