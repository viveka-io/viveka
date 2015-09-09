/* global componentHandler */
(function () {
    'use strict';

    var socket = io(),
        router,
        testId,
        baselineId,
        currentId,
        fingerprintA,
        fingerprintB;

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
        return socket.emitAsync('tests get', {
            id: testId
        });
    }

    function renderTestDetailsView(testDetails) {
        $('#test-details-container').html(Handlebars.templates.testDetails(testDetails.result));
        componentHandler.upgradeAllRegistered();
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
                onReset: function (e, panzoom, matrix) {
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
        return socket.emitAsync('differences create json', {
            baselineId: baselineId,
            targetId: currentId
        });
    }

    function renderDifferencesView(differencesData) {
        console.log(differencesData);
        $('#diff-tool-container').html(Handlebars.templates.diffTool(differencesData));
        panzoomify();
        componentHandler.upgradeAllRegistered();
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
