/* global window $ Handlebars componentHandler Router Promise L */

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

function renderDifferencesView(differencesData) {
    $('#diff-tool-container').html(Handlebars.templates.diffTool(differencesData));
    componentHandler.upgradeAllRegistered();
    initLeaflet(differencesData);
}

function initLeaflet(differencesData) {
    try {
        Promise.all([
            createMap('baseline-container', differencesData.screenshotA),
            createMap('current-container', differencesData.screenshotB)
        ]).then(function(maps) {
            //maps[0].sync(maps[1]);
            //maps[1].sync(maps[0]);
        });
    } catch (err) {
        console.log(err);
    }
}

function createMap(containerId, imageUrl) {
    return new Promise(function(resolve) {
            $('<img/>').attr('src', imageUrl).one('load', function () {
                var w = this.width,
                    h = this.height,
                    map;

                // create the map
                map = L.map(containerId, {
                    minZoom: 0.1,
                    maxZoom: 1,
                    center: [0, 0],
                    zoom: 1,
                    crs: L.CRS.Simple,
                    bounceAtZoomLimits: false,
                    zoomControl: containerId === 'baseline-container'
                });

                // calculate the edges of the image, in coordinate space
                var southWest = map.unproject([0, h], map.getMaxZoom());
                var northEast = map.unproject([w, 0], map.getMaxZoom());
                var bounds = new L.LatLngBounds(southWest, northEast);

                // add the image overlay, so that it covers the entire map
                L.imageOverlay(imageUrl, bounds).addTo(map);

                // tell leaflet that the map is exactly as big as the image
                map.setMaxBounds(bounds);

                resolve(map);
            });
        }
    );
}

init();
