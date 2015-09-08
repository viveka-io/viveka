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

        getFingerprintsListAsync()
            .then(loadFingerprintsListView);
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

    function getFingerprintsListAsync() {
        return socket.emitAsync('fingerprints list', {
            id: testId
        });
    }

    function loadTestDetailsView(testDetails) {
        console.log(testDetails.result);
        setSelectedBrowser(testDetails.result.config.browser);
        testDetails.result.config.browsers = browsers;
        $('#test-details-container').html(Handlebars.templates.testDetails(testDetails.result));
        $('#test-title').html(testDetails.result.name);
        componentHandler.upgradeAllRegistered();
    }

    function loadFingerprintsListView(testFingerprints) {
        console.log(testFingerprints.result);
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
