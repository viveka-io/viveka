(function () {
    'use strict';

    var socket = io(),
        header = {
            title: 'Test page',
            views: [
                {id: 'side-by-side-view', name: 'Side by side'},
                {id: 'baseline-view', name: 'Baseline'},
                {id: 'current-view', name: 'Current'},
            ]
        };
        
    Promise.promisify(socket.emit, {promisifier: function (originalMethod) {
        return function promisified() {
            var args = [].slice.call(arguments),
                self = this;
                
            return new Promise(function(resolve, reject) {
                args.push(resolve);
                originalMethod.apply(self, args);
            });
        };
    }});
    
    $.getJSON('/test_cases.json')
        .done(init);
        
    function init(testCases) {
        var router = new Router();
            
         header.testCases = testCases;
         $('header').empty().append(Handlebars.templates.nav(header));
         
        router.on('/:testCase', function (testCase) {
            showTestCaseDiff(testCase);
        });

        router.on('/:baselineId/:targetId', function (baselineId, targetId) {
            render(baselineId, targetId);
        });

        router.init('/' + testCases[0].id);
    }
    
    function showTestCaseDiff(testCase) {
        socket.emit('fingerprints get baseline');
    }
    
    function setPosition($marker, offset, imgWidth, imgHeight) {   
        if (offset) {
            $marker.css({
                top: (offset.top / imgHeight * 100) + '%',
                left: (offset.left / imgWidth * 100) + '%',
                width: (offset.width / imgWidth * 100) + '%',
                height: (offset.height / imgHeight * 100) + '%'
            });
        }
    }

    function getDiffs(idA, idB) {
        var $imgA   = $('#imgA'),
            $imgB   = $('#imgB'),
            widthA  = $imgA[0].naturalWidth,
            widthB  = $imgB[0].naturalWidth,
            heightA = $imgA[0].naturalHeight,
            heightB = $imgB[0].naturalHeight;

        socket.emitAsync('differences create json', {
            baselineId: idA,
            targetId: idB
        })
            .then(function(data) {
                var $listItems;
                 
                $('#contA').append(Handlebars.templates['diff-areas-a'](data.result));
                $('#contA').find('.diff').each(function(index){
                    setPosition($(this), data.result[index].a && data.result[index].a.offset, widthA, heightA);
                });
                
                $('#contB').append(Handlebars.templates['diff-areas-b'](data.result));
                $('#contB').find('.diff').each(function(index){
                    setPosition($(this), data.result[index].b && data.result[index].b.offset, widthB, heightB);
                });
                
                $('#diff-inspector').append(Handlebars.templates['diff-inspector'](data.result));
                $listItems = $('#diff-inspector li');
                $listItems.on('mouseover', function() {
                    var index = $listItems.index(this),
                        offsetA = data.result[index].a && data.result[index].a.offset,
                        offsetB = data.result[index].b && data.result[index].b.offset,
                        $markerA = $('#contA .diffmarker'),
                        $markerB = $('#contB .diffmarker');
    
                    if (offsetA) {
                        setPosition($markerA, offsetA, widthA, heightA);
                    } else {
                        $markerA.css('top', '300%');
                    }
    
                    if (offsetB) {
                        setPosition($markerB, offsetB, widthB, heightB);
                    } else {
                        $markerB.css('top', '300%');
                    }
    
            });

            $('#overlay').hide();
        });
    }

    function render(baselineId, targetId) {
        var $imgA   = $('#imgA'),
            $imgB   = $('#imgB'),
            loaded  = 0;

        $imgA.one('load', function() {
            loaded++;
            if (loaded == 2) getDiffs(baselineId, targetId);
        })
            .attr('src', '/images/fingerprints/' + baselineId + '.png')
            .each(function() {
                //Cache fix for browsers that don't trigger .load()
                if(this.complete) $(this).trigger('load');
            });
        $imgB.one('load', function() {
            loaded++;
            if (loaded == 2) getDiffs(baselineId, targetId);
        })
            .attr('src','/images/fingerprints/' + targetId + '.png')
            .each(function() {
                //Cache fix for browsers that don't trigger .load()
                if(this.complete) $(this).trigger('load');
            });

        $('.diff-switcher a').on('click', function(event) {
            var $button = $(this).closest('li'),
                $class = $button.data('diff');
                
            event.preventDefault();

            $button.toggleClass('active');
            $('#wrapper').toggleClass($class, $button.is('.active'));
        });
    }
})();

