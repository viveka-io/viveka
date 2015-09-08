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
