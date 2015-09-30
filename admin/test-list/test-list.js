/* global window $ Handlebars componentHandler */

import { emitOnSocket } from '/script/common.js';

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
    return emitOnSocket('tests list', {});
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
    emitOnSocket('tests delete', { id: testId })
        .then(loadTests());
}

Handlebars.registerPartial('materialInput', Handlebars.templates.materialInput);

init();
