/* global componentHandler */
(function () {
    'use strict';

    var socket = io(),
        router,
        testId,
        baselineId,
        firstFingerprintId,
        browsers = [
            { name: 'Firefox' }, { name: 'Chrome' },  { name: 'Safari' }, { name: 'PhantomJS' }
        ];

    function init() {
        initRouter();
        loadTestDetails();
        loadFingerprints();
    }

    function initRouter() {
        router = new Router();
        testId = router.getRoute()[0];
    }

    function loadTestDetails() {
        getTestDetailsAsync()
            .then(renderTestDetailsView);
    }

    function getTestDetailsAsync() {
        return socket.emitAsync('tests get', {
            id: testId
        });
    }

    function renderTestDetailsView(testDetails) {
        var testData,
            isNewTest = !!testDetails.error;

        if (isNewTest) {
            testData = {
                browsers: mapBrowsers()
            };
        } else {
            testData = testDetails.result;
            testData.browsers = mapBrowsers(testData.config.browser);
            $('#test-title').html(testData.name);
        }

        $('#add-fingerprint').attr('disabled', isNewTest);
        $('#test-details-container').html(Handlebars.templates.testDetails(testData));
        $('#add-test').toggleClass('hidden', !isNewTest);
        $('#save-test').toggleClass('hidden', isNewTest);
        componentHandler.upgradeAllRegistered();
        attachTestDetailsEventHandlers();
    }

    function mapBrowsers(testBrowser) {
        return browsers.map(function (browser) {
            return {
                name: browser.name,
                iconname: browser.name.toLowerCase(),
                value: browser.name.toUpperCase(),
                selected: testBrowser && (browser.name.toUpperCase() === testBrowser.toUpperCase())
            };
        });
    }

    function attachTestDetailsEventHandlers() {
        $('#add-test').off('click').on('click', createTest);
    }

    function createTest() {
        var details = {
                name: $('#name').val(),
                config: {
                    url: $('#url').val(),
                    browserWidth: $('#browser-width').val(),
                    browserHeight: $('#browser-height').val(),
                    browser: $('input[name="browser"]').val(),
                    generator: 'SENSE'
                }
            };

        socket.emitAsync('tests create', details)
            .then(reloadAfterCreateTest);
    }

    function reloadAfterCreateTest(newTestData) {
        window.location.href = '/test-details.html#' + newTestData.result._id;
        window.location.reload();
    }

    function loadFingerprints() {
        getFingerprintsListAsync()
            .then(function (testFingerprints) {
                setBaselineIdAsync()
                    .then(function () {
                        if (testFingerprints.result.length) {
                            setFirstFingerprintId(testFingerprints);
                        }

                        renderFingerprintsListView(testFingerprints);
                    });
            });
    }

    function getFingerprintsListAsync() {
        return socket.emitAsync('fingerprints list', {
            id: testId
        });
    }

    function setBaselineIdAsync() {
        return socket.emitAsync('fingerprints get baseline', { id: testId })
            .then(function (baselineData) {
                var hasBaseline = !baselineData.info;
                
                if (hasBaseline) {
                    baselineId = baselineData.result._id;
                }
            });
    }

    function setFirstFingerprintId(testFingerprints) {
        firstFingerprintId = testFingerprints.result[testFingerprints.result.length - 1]._id;
    }

    function renderFingerprintsListView(testFingerprints) {
        $('#fingerprints-list-container').html(Handlebars.templates.fingerprintList(testFingerprints.result));
        componentHandler.upgradeAllRegistered();
        attachFingerprintListEventHandlers();
    }

    function attachFingerprintListEventHandlers() {
        $('#add-fingerprint').off('click').on('click', createFingerprint);
    }

    function createFingerprint() {
        $('.fingerprint-list').toggleClass('disabled');
        $('#add-fingerprint').attr('disabled', true);
        socket.emitAsync('fingerprints create', { id: testId })
            .then(loadFingerprints);
    }

    Handlebars.registerHelper('compareToFingerprintId', function () {
        return baselineId || firstFingerprintId;
    });

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
