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

function panzoomify() {
    var $panzoom = $('.panzoom');

    $panzoom.each(function () {
        $(this).panzoom({
            startTransform: 'scale(1)',
            increment: 0.01,
            minScale: 0.2,
            maxScale: 1,
            $zoomIn: $('#zoom-in'),
            $zoomOut: $('#zoom-out'),
            $zoomRange: $('#zoom'),
            $reset: $('#zoom-reset'),
            $set: $panzoom,
            onZoom: function (e, panzoom, scale) {
                $('#zoom')[0].MaterialSlider.change(scale);
            },
            onReset: function () {
                $('#zoom')[0].MaterialSlider.change(1);
            }
        });
    });

    $(window).on('resize', function () {
        $panzoom.panzoom('resetDimensions');
    });
}

function loadDifferences() {
    getDifferencesAsync()
        .then(renderDifferencesView);
}

function getDifferencesAsync() {
    return emitOnSocket('differences create json', {
        baselineId: baselineId,
        targetId: currentId
    });
}

function renderDifferencesView(differencesData) {
    $('#diff-tool-container').html(Handlebars.templates.diffTool(differencesData));
    panzoomify();
    componentHandler.upgradeAllRegistered();
}

init();
