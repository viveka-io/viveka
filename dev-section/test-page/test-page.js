(function () {
    'use strict';

    var header = {
            title: 'Test page',
            views: [
                {id: 'side-by-side-view', name: 'Side by side', active: true},
                {id: 'baseline-view', name: 'Baseline'},
                {id: 'current-view', name: 'Current'}
            ]
        },
        activeView = readView(),
        activeTestCase;

    $.getJSON('/test-cases.json')
        .done(init);

    function init(testCases) {
        var router = new Router();

        header.testCases = testCases;

        if(activeView === 'side-by-side-view') {
            $('header').append(Handlebars.templates.nav(header));
        }

        router.on('/:testCase', function (testCase) {
            render(testCase);
        });

        router.init('/' + testCases[0].textId);

        $('.view-selector').on('click', function(event){
            event.preventDefault();
            setView($(event.target).attr('href').replace('#',''));
        });
    }

    function activateById(prevId, newId) {
        $('[href="#' + prevId + '"]').parent().removeClass('active');
        $('[href="#' + newId + '"]').parent().addClass('active');
    }

    function setTestCaseCaption(id) {
        $('header .test-case').text(_.result(_.find(header.testCases, 'textId', id), 'name'));
    }

    function setView(view) {
        activateById(activeView, view);
        activeView = view;

        if (activeTestCase) {
            render(activeTestCase);
        }
    }

    function render(testCase) {
        $('#view').empty().append(Handlebars.templates[activeView](header));
        $('.baseline').append(Handlebars.templates[testCase + '-baseline']()).removeClass('baseline');
        $('.current').append(Handlebars.templates[testCase + '-current']()).removeClass('current');
        setTestCaseCaption(testCase);
        activeTestCase = testCase;

        componentHandler.upgradeAllRegistered();
    }

    function getQueryParam(name) {
        name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
        var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
            results = regex.exec(location.search);
        return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
    }

    function readView() {
        var mode = getQueryParam('viveka_mode');

        if (mode === 'baseline') {
            return 'baseline-view';
        } else if (mode === 'latest') {
            return 'current-view';
        }

        return 'side-by-side-view';
    }

})();
