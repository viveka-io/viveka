/* global componentHandler */
(function () {
    'use strict';
    
    var socket = io();

    function init() {
        attachAddTestRedirectEvent();
        loadTests();
    }

    function attachAddTestRedirectEvent() {
        $('#add-test').on('click', addTestRedirect);
    }

    function addTestRedirect() {
        window.location.href = '/test-details.html';
    }

    function loadTests() {
        getTestsAsync()
            .then(renderTestsView);
    }

    function getTestsAsync() {
        return socket.emitAsync('tests list', {});
    }

    function renderTestsView(tests) {
        $('#view').html(Handlebars.templates.tests(tests));
        componentHandler.upgradeAllRegistered();
        attachDeleteTestEvent();
    }

    function attachDeleteTestEvent() {
        $('.test-delete').on('click', function (jQueryEvent) {
            if (window.confirm('Are you sure?')) {
                deleteTest(jQueryEvent);
            }
        });
    }

    function deleteTest(jQueryEvent) {
        var $deleteButton   = $(jQueryEvent.currentTarget),
            $testRow        = $deleteButton.parents('.test-row'),
            testId          = $deleteButton.data('test-id');

        $testRow.toggleClass('disabled');
        socket.emitAsync('tests delete', { id: testId })
            .then(loadTests());
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
