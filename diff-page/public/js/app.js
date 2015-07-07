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
        
    Promise.promisifyAll(socket, {promisifier: function (originalMethod) {
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
        
    function prepareProcessing() {
        $('#overlay').show();
        $('#wrapper').empty();
        $('#diff-inspector').empty();
    }
    
    function setTestCaseCaption(id) {
        $('header .test-case').text(_.result(_.find(header.testCases, 'textId', id), 'name'));
    }
    
    function setFingerprintIds(baselineId, targetId) {
        $('#baseline-id').val(baselineId);
        $('#target-id').val(targetId);
    }
        
    function init(testCases) {
        var router = new Router();
            
         header.testCases = testCases;
         $('body').prepend(Handlebars.templates.nav(header));
         
         $('.diff-switcher a').on('click', function(event) {
            var $button = $(this).closest('li'),
                $class = $button.data('diff');
                
            event.preventDefault();

            $button.toggleClass('active');
            $('#wrapper').toggleClass($class, $button.is('.active'));
        });
         
         $('#create-diff-by-fingerprints').on('click', function(event) {
             event.preventDefault();
             router.setRoute($('#baseline-id').val() + '/' + $('#target-id').val());
         });
         
        router.on('/:testCase', function (testCase) {
            setTestCaseCaption(testCase);
            prepareProcessing();
            showTestCaseDiff(testCase);
            
        });

        router.on('/:baselineId/:targetId', function (baselineId, targetId) {
            setFingerprintIds(baselineId, targetId);
            prepareProcessing();
            render(baselineId, targetId);
        });

        router.init('/' + testCases[0].textId);
        setTestCaseCaption(testCases[0].textId);
    }
    
    function showTestCaseDiff(testCase) {
        var testId = _.result(_.find(header.testCases, 'textId', testCase), 'id'),
            baselineId,
            targetId;
        
        console.log('Searching for baseline finerprint...');
        socket.emitAsync('fingerprints get baseline', {id: testId})
            .then(function(data){
                if (data.result) {
                    baselineId = data.result._id;
                    console.log('Baseline fingerprint ' + baselineId + ' found.');
                    return Promise.resolve();
                }
                
                console.log('Baseline fingerprint not found. Creating new fingerprint...');
                return socket.emitAsync('fingerprints create', {id: testId})
                    .then(function(data){
                        console.log('Fingerprint created. Approving it...');
                        baselineId = data.result._id;
                        return socket.emitAsync('fingerprints approve', {id: data.result._id});
                    });
            })
            .then(function(){
                console.log('Searching latest fingerprint...');
                return socket.emitAsync('fingerprints get latest', {id: testId});
            })
            .then(function(data){
                if (data.result && data.result._id !== baselineId) {
                    targetId = data.result._id;
                    console.log('Latest fingerprint ' + targetId + ' found.');
                    return Promise.resolve();
                }
                
                console.log('Latest fingerprint not found. Creating one');
                return socket.emitAsync('fingerprints create', {id: testId});
            })
            .then(function(data){
                if (data && data.result) {
                    targetId = data.result._id;
                }
                
                console.log('Baseline and latest fingerprints are ready');
                render(baselineId, targetId);
            });
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
                $('#contA .diff, #contB .diff').on('click', function(event){
                    var diffIndex = $(event.target).closest('.diff').data('diff-index'),
                        offset = $('#diff-inspector').find('li[data-diff-index="' + diffIndex + '"]').offset().top;
                            
                    event.stopPropagation();
                        
                    $('#diff-inspector').scrollTop(offset);
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

    function handleImageLoading(baselineId, targetId) {
        var loaded = 0;
        return function() {
            loaded++;
            if (loaded == 2) getDiffs(baselineId, targetId);
        };
    }

    function render(baselineId, targetId) {
        console.log('Generating diff between ' + baselineId + ' and ' + targetId + ' ...');
        
        $('#wrapper').append(Handlebars.templates['containers']({
            baselineId: baselineId,
            targetId: targetId
        }));

        $('#imgA, #imgB').one('load', handleImageLoading(baselineId, targetId));
    }
})();

