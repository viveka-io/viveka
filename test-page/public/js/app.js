(function () {
    'use strict';

    var router = new Router(),
        header = {
        title: 'Viveka test page',
        views: [
            {id: 'side-by-side-view', name: 'Side by side'},
            {id: 'baseline-view', name: 'Baseline'},
            {id: 'current-view', name: 'Current'},
        ],
        testCases:[
            {id: 'element-added', name: 'Element added'},
            {id: 'element-removed', name: 'Element removed'},
            {divider: true},
            {id: 'floated-element-added', name: 'Floated element added'},
            {id: 'floated-element-removed', name: 'Floated element removed'},
            {divider: true},
            {id: 'fixed-position-element-added', name: 'Fixed position element added'},
            {id: 'fixed-position-element-removed', name: 'Fixed position element removed'},
            {divider: true},
            {id: 'relative-positioned-element-added', name: 'Relative positioned element added'},
            {id: 'relative-positioned-element-removed', name: 'Relative positioned element removed'},
            {divider: true},
            {id: 'margin-changed', name: 'Margin changed'},
            {id: 'border-changed', name: 'Border changed'},
            {id: 'padding-changed', name: 'Padding changed'},
            {divider: true},
            {id: 'background-color-changed', name: 'Background color changed'},
            {id: 'color-changed', name: 'Color changed'},
            {divider: true},
            {id: 'multiple-changes', name: 'Multiple changes'}
        ]},
        activeView,
        activeTestCase;

    $('header').empty().append(Handlebars.templates.nav(header));

    function activateById(prevId, newId) {
        $('[href="#' + prevId + '"]').parent().removeClass('active');
        $('[href="#' + newId + '"]').parent().addClass('active');
    }

    router.on('/:param', function(param) {
        if (param.indexOf('-view') !== -1) {
            router.setRoute('/' + activeTestCase + '/' + param);

        } else {
            router.setRoute('/' + param + '/' + activeView);
        }
    });

    router.on('/:testCase/:view', function (testCase, view) {
        $('#view').empty().append(Handlebars.templates[view](header));
        $('.baseline').append(Handlebars.templates[testCase + '-baseline']());
        $('.current').append(Handlebars.templates[testCase + '-current']());
        activateById(activeTestCase, testCase);
        activateById(activeView, view);
        activeTestCase = testCase;
        activeView = view;
    });

    router.init();

    router.setRoute('/element-added/side-by-side-view');
})();

