/* global componentHandler */
(function () {
    'use strict';

    var socket = io(),
        router,
        testId,
        baselineId,
        currentId;

    function init() {
        initRouter();
    }

    function initRouter() {
        router = new Router();
        baselineId = router.getRoute()[0];
        currentId = router.getRoute()[1];
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


$(function() {
    var $panzoom = $('.panzoom');

    $panzoom.panzoom({
        startTransform: 'scale(1)',
        increment: 0.01,
        minScale: 0.2,
        maxScale: 1,
        $zoomIn: $('#zoom-in'),
        $zoomOut: $('#zoom-out'),
        $zoomRange: $('#zoom'),
        $reset: $('#zoom-reset'),
        $set: $panzoom,
        onZoom: function(e, panzoom, scale) {
            $("#zoom")[0].MaterialSlider.change(scale);
        },
        onReset: function(e, panzoom, matrix) {
            $("#zoom")[0].MaterialSlider.change(1);
        }
    });

    $(window).on('resize', function() {
        $panzoom.panzoom('resetDimensions');
    });
});
