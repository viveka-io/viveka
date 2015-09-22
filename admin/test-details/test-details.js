/* global window $ Handlebars componentHandler Router */

import { emitOnSocket } from '/script/common.js';

var router,
    testId,
    baselineId,
    firstFingerprintId,
    browsers = [
        { name: 'Firefox' }, { name: 'Chrome' },  { name: 'Safari' }, { name: 'PhantomJS' }
    ];

function init() {
    initRouter();
    loadTestDetails();

    if (testId) {
        loadFingerprints();
    }
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
    return emitOnSocket('tests get', {
        id: testId
    });
}

function renderTestDetailsView(testDetails) {
    var testData,
        isNewTest = Boolean(testDetails.error);

    if (isNewTest) {
        testData = {
            browsers: mapBrowsers()
        };
        $('#test-title .url').removeClass('hidden');
    } else {
        testData = testDetails.result;
        testData.browsers = mapBrowsers(testData.config.browser);
        testData.queryParameters = getQueryParameters(testData.config.url);
        $('#test-title').html(testData.name);
        $('#test-details-container')
            .removeClass('mdl-cell--12-col')
            .addClass('mdl-cell--4-col');
    }

    $('#test-details-container').html(Handlebars.templates.testDetails(testData));
    $('#add-test').toggleClass('hidden', !isNewTest);
    componentHandler.upgradeAllRegistered();
    attachTestDetailsEventHandlers();

    if (testData.queryParameters) {
        attachQueryParametersTogglerEvent();
    }
}

function mapBrowsers(testBrowser) {
    return browsers.map(function (browser) {
        return {
            name: browser.name,
            iconname: browser.name.toLowerCase(),
            value: browser.name.toUpperCase(),
            selected: testBrowser && browser.name.toUpperCase() === testBrowser.toUpperCase()
        };
    });
}

function getQueryParameters(url) {
    var queryParametersDividerIndex = url.indexOf('?'),
        queryParameters;
    
    if (queryParametersDividerIndex !== -1) {
        queryParameters = url.slice(queryParametersDividerIndex + 1).split('&').map(function (param) {
            var keyValue = param.split('=');
            return {
                key: keyValue[0],
                value: keyValue[1]
            };
        });
    }

    return queryParameters;
}

function attachQueryParametersTogglerEvent() {
    $('#query-parameter').off('click').on('change', toggleQueryParameters);
}

function toggleQueryParameters() {
    $('#query-parameters-container').stop().slideToggle();
}

function attachTestDetailsEventHandlers() {
    $('#add-test').off('click').on('click', createTest);
}

function createTest() {
    var details =
        {
            name: $('#name').val(),
            config: {
                url: $('#url').val(),
                browserWidth: $('#browser-width').val(),
                browserHeight: $('#browser-height').val(),
                browser: $('input[name="browser"]').val(),
                generator: 'SENSE'
            }
        };

    emitOnSocket('tests create', details)
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
    return emitOnSocket('fingerprints list', {
        id: testId
    });
}

function setBaselineIdAsync() {
    return emitOnSocket('fingerprints get baseline', { id: testId })
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
    setFingerprintsStatus(testFingerprints.result);
    $('#fingerprints-list-container').html(Handlebars.templates.fingerprintList(testFingerprints.result));
    componentHandler.upgradeAllRegistered();
    attachFingerprintListEventHandlers();
}

function setFingerprintsStatus(fingerprints) {
    fingerprints.forEach(function (fingerprint) {
        if (fingerprint._id === baselineId) {
            fingerprint.status = {
                name: 'baseline',
                baseline: true
            };
        } else if (fingerprint.approved === true) {
            fingerprint.status = {
                name: 'approved',
                approved: true
            };
        } else if (fingerprint.approved === false) {
            fingerprint.status = {
                name: 'unapproved',
                unapproved: true
            };
        }
    });
}

function attachFingerprintListEventHandlers() {
    $('#add-fingerprint').off('click').on('click', createFingerprint);
}

function createFingerprint() {
    $('.fingerprint-list').toggleClass('disabled');
    $('#add-fingerprint').attr('disabled', true);
    emitOnSocket('fingerprints create', { id: testId })
        .then(loadFingerprints);
}

Handlebars.registerHelper('compareToFingerprintId', function () {
    return baselineId || firstFingerprintId;
});

init();
