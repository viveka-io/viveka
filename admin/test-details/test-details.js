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
        testData.hasParameters = Boolean(testData.config.url.queryParameters) || Boolean(testData.config.cookies);
        $('#test-title').html(testData.name);
        $('#test-details-container')
            .removeClass('mdl-cell--12-col')
            .addClass('mdl-cell--4-col');
    }

    testData.isNewTest = isNewTest;
    $('#test-details-container').html(Handlebars.templates.testDetails(testData));
    componentHandler.upgradeAllRegistered();

    if (testData.hasParameters) {
        attachQueryParametersTogglerEvent();
        attachParameterZoomEvent();
    }

    if (isNewTest) {
        attachTestDetailsEventHandlers();
        attachCookieButtonsEvents();
        attachCookieSuggestEvents();
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

function attachQueryParametersTogglerEvent() {
    $('#query-parameter').off('click').on('change', toggleQueryParameters);
}

function toggleQueryParameters() {
    $('#query-parameters-container').stop(true, true).slideToggle();
}

function attachParameterZoomEvent() {
    $('.mdlext-label').off('click').on('click', toggleZoomedClass);
}

function toggleZoomedClass() {
    $(this)
        .parent('.query-parameters')
        .andSelf()
        .toggleClass('zoomed');
}

function attachCookieButtonsEvents() {
    $('#new-cookie').off('click').on('click', addCookieInput);
    $('.remove-cookie').off('click').on('click', removeCookieInput);
}

function addCookieInput() {
    var $cookieInputs = $('.cookie-inputs-container');

    $cookieInputs
        .last()
        .after(Handlebars.templates.cookieInput({
            index: $cookieInputs.length + 1
        }));

    $('.remove-cookie').prop('disabled', false);
    attachCookieButtonsEvents();
    attachCookieSuggestEvents();
    componentHandler.upgradeAllRegistered();
}

function removeCookieInput() {
    $(this).parent('.cookie-inputs-container').remove();

    if ($('.cookie-inputs-container').length === 1) {
        $('.remove-cookie').prop('disabled', true);
    }
}

function attachCookieSuggestEvents() {
    $('.cookie-input-name input')
        .off('keyup')
        .on('change', suggestCookieName)
        .on('keyup', suggestCookieName)
        .on('focus', showSuggestionContainer)
        .on('blur', hideSuggestionContainer);
    
    $('.cookie-input-value input')
        .off('keyup')
        .on('change', suggestCookieValue)
        .on('keyup', suggestCookieValue)
        .on('focus', showSuggestionContainer)
        .on('blur', hideSuggestionContainer);
}

function suggestCookieName() {
    var cookieName = $(this).val(),
        $input = $(this);

    if (cookieName) {
        emitOnSocket('cookies suggest name', { cookieName: cookieName })
            .then(showCookieNameSuggestions.bind(null, $input));
    } else {
        $('.suggestions-container[for="' + $input.attr('id') + '"]').empty();
    }
}

function showCookieNameSuggestions($input, suggestions) {
    var $suggestionsContainer = $('.suggestions-container[for="' + $input.attr('id') + '"]');

    if (suggestions.length) {
        $suggestionsContainer.html(Handlebars.templates.suggestions({
            suggestions: suggestions,
            inputId: 'cookie-name',
            inputIndex: $input.data('cookie-index')
        }));
        attachSuggestionClickEvent();
    } else {
        $suggestionsContainer.empty();
    }
}

function suggestCookieValue() {
    var cookieIndex = $(this).data('cookie-index'),
        cookieName = $('.cookie-name[data-cookie-index="' + cookieIndex + '"]').val(),
        cookieValue = $(this).val(),
        $input = $(this);

    if (cookieName && cookieValue) {
        emitOnSocket('cookies suggest value', { cookieName: cookieName, cookieValue: cookieValue })
            .then(showCookieValueSuggestions.bind(null, $input));
    }
}

function showCookieValueSuggestions($input, suggestions) {
    var $suggestionsContainer = $('.suggestions-container[for="' + $input.attr('id') + '"]');

    if (suggestions.length) {
        $suggestionsContainer.html(Handlebars.templates.suggestions({
            suggestions: suggestions,
            inputId: 'cookie-value',
            inputIndex: $input.data('cookie-index')
        }));
        attachSuggestionClickEvent();
    } else {
        $suggestionsContainer.empty();
    }
}

function showSuggestionContainer() {
    $('.suggestions-container[for="' + $(this).attr('id') + '"]').show();
}

function hideSuggestionContainer() {
    $('.suggestions-container[for="' + $(this).attr('id') + '"]').hide();
}

function attachSuggestionClickEvent() {
    $('.suggestions li')
        .off('mousedown')
        .on('mousedown', fillInputWithSuggestion);
}

function fillInputWithSuggestion() {
    var $clickedSuggestion = $(this),
        inputId = $clickedSuggestion.parent('.suggestions').attr('for'),
        suggestion = $clickedSuggestion.html();

    $('#' + inputId).val(suggestion).trigger('change');
}

function attachTestDetailsEventHandlers() {
    $('#add-test').off('click').on('click', createTest);
}

function createTest() {
    var details = {
        name: $('#name').val(),
        config: {
            url: $('#url').val(),
            cookies: getCookies(),
            browserWidth: $('#browser-width').val(),
            browserHeight: $('#browser-height').val(),
            browser: $('input[name="browser"]').val(),
            generator: 'SENSE'
        }
    };

    emitOnSocket('tests create', details)
        .then(reloadAfterCreateTest);
}

function getCookies() {
    var cookies = [];

    $('.cookie-inputs-container').each(function (index, cookieContainer) {
        var cookieName = $(cookieContainer).find('.cookie-input-name input').val(),
            cookieValue = $(cookieContainer).find('.cookie-input-value input').val();
        
        if (cookieName && cookieValue) {
            cookies.push({
                name: cookieName,
                value: cookieValue
            });
        }
    });

    if (cookies.length) {
        return cookies;
    }
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

Handlebars.registerPartial('cookieInput', Handlebars.templates.cookieInput);
Handlebars.registerPartial('suggestions', Handlebars.templates.suggestions);
Handlebars.registerPartial('materialInput', Handlebars.templates.materialInput);

init();
