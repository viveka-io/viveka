/* global window $ Handlebars componentHandler Router */

import { emitOnSocket } from '/script/common.js';

var router,
    testId,
    baselineId,
    currentId;

function init() {
    initRouter();
    loadTestDetails();
    loadDifferences();
}

function initRouter() {
    router = new Router();
    testId = router.getRoute()[0];
    baselineId = router.getRoute()[1];
    currentId = router.getRoute()[2];
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
    testDetails.result.config.browser = testDetails.result.config.browser.toLowerCase();
    $('#test-details-container').html(Handlebars.templates.testDetails(testDetails.result));
    attachApprovingEvents();
    componentHandler.upgradeAllRegistered();
}

function attachApprovingEvents() {
    $('#approve').on('click', approveFingerprint);
    $('#decline').on('click', declineFingerprint);
}

function approveFingerprint(jQueryEvent) {
    var $approveButton = $(jQueryEvent.currentTarget);

    $approveButton.attr('disabled', true);
    emitOnSocket('fingerprints approve', { id: currentId })
        .then(function () {
            $approveButton.attr('disabled', false);
        });
}

function declineFingerprint(jQueryEvent) {
    var $declineButton = $(jQueryEvent.currentTarget);

    $declineButton.attr('disabled', true);
    emitOnSocket('fingerprints unapprove', { id: currentId })
        .then(function () {
            $declineButton.attr('disabled', false);
        });
}

function loadDifferences() {
    getDifferencesAsync()
        .then(renderDifferencesView);
}

function getDifferencesAsync() {
    return emitOnSocket('differences create json', {
        testId: testId,
        baselineId: baselineId,
        targetId: currentId,
        persist: true
    });
}

function initLeaflet() {

}

function renderDifferencesView(differencesData) {
    $('#diff-tool-container').html(Handlebars.templates.diffTool(differencesData));
    componentHandler.upgradeAllRegistered();
    initLeaflet();
}

init();
