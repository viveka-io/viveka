(function () {
    'use strict';

    var router = new Router(),
        header = {
            title: 'Test page',
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
            ]
        },
        activeView,
        activeTestCase;

    $('header').empty().append(Handlebars.templates.nav(header));

    function activateById(prevId, newId) {
        $('[href="#' + prevId + '"]').parent().removeClass('active');
        $('[href="#' + newId + '"]').parent().addClass('active');
    }

    function setTestCaseCaption(id) {
        $('header .test-case').text(_.result(_.find(header.testCases, 'id', id), 'name'));
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
    }
    
    function readCookie(name) {
        name = name.replace(/([.*+?^=!:${}()|[\]\/\\])/g, '\\$1');
    
        var regex = new RegExp('(?:^|;)\\s?' + name + '=(.*?)(?:;|$)','i'),
            match = document.cookie.match(regex);
    
        return match && unescape(match[1]);
    }
    
    function readView() {
        var mode = readCookie('mode');
        
        if (mode === 'baseline') {
            $('header').empty();
            return 'baseline-view';
        } else if (mode === 'latest') {
            $('header').empty();
            return 'current-view';
        }
        
        return 'side-by-side-view';
    }

    router.on('/:testCase', function (testCase) {
        render(testCase);
    });

    router.init('/element-added');
    
    $('.view-selector').on('click', function(event){
        event.preventDefault();
        setView($(event.target).attr('href').replace('#',''));
    });
    
    var checkCookie = function() {

        var lastCookie = document.cookie; // 'static' memory between function calls
    
        return function() {
    
            var currentCookie = document.cookie;
    
            if (currentCookie != lastCookie) {
    
                setView(readView());
    
                lastCookie = currentCookie; // store latest cookie
    
            }
        };
    }();
    
    window.setInterval(checkCookie, 100);
    
})();




