(function () {
    'use strict';

    var socket = io(),
        header = {
            title: 'Test page',
            views: [
                { id: 'side-by-side-view',  name: 'Side by side' },
                { id: 'baseline-view',      name: 'Baseline' },
                { id: 'current-view',       name: 'Current' },
            ]
        },
        router;
        
    $.getJSON('/test_cases.json').done(handleTestCasesLoad);
        
    function handleTestCasesLoad(testCases) {
        header.testCases = testCases;
        
        appendHeader();
        attachDiffSwitcherEvent();
        attachCreateDiffEvent();
        initRouter();
    }

    function appendHeader() {
        $('#header-container').html(Handlebars.templates.nav(header));
    }

    function attachDiffSwitcherEvent() {
        $('.diff-switcher li').on('click', function (event) {
            $(this).toggleClass('active');

            $('#wrapper').toggleClass($(this).data('diff'), $(this).is('.active'));
        });
    }

    function attachCreateDiffEvent() {
        $('#create-diff-by-fingerprints').on('click', function (event) {
            router.setRoute($('#baseline-id').val() + '/' + $('#target-id').val());
        });
    }
    
    function initRouter() {
        router = new Router();

        router.on('/:testCaseTextId', function (testCaseTextId) {
            setTestCaseCaption(testCaseTextId);
            prepareProcessing();
            showTestCaseDiff(testCaseTextId);
        });

        router.on('/:baselineId/:targetId', function (baselineId, targetId) {
            setFingerprintIds(baselineId, targetId);
            prepareProcessing();
            render(baselineId, targetId);
        });

        router.init(header.testCases[0].textId);
    }

    function setTestCaseCaption(testCaseTextId) {
        $('.test-case').text(getTestCaseNameByTextId(testCaseTextId));
    }

    function getTestCaseNameByTextId(testCaseTextId) {
        return _.result(_.find(header.testCases, 'textId', testCaseTextId), 'name');
    }

    function getTestCaseIdByTextId(testCaseTextId) {
        return _.result(_.find(header.testCases, 'textId', testCaseTextId), 'id');
    }

    function prepareProcessing() {
        $('#overlay').show();
        $('#wrapper').empty();
        $('#diff-inspector').empty();
    }
    
    function setFingerprintIds(baselineId, targetId) {
        $('#baseline-id').val(baselineId);
        $('#target-id').val(targetId);
    }
        
    function showTestCaseDiff(testCaseTextId) {
        var testId = getTestCaseIdByTextId(testCaseTextId),
            baselineId,
            targetId;
        
        console.log('Searching for baseline finerprint...');
        socket.emitAsync('fingerprints get baseline', { id: testId })
            .then(function (data) {
                if (data.result) {
                    baselineId = data.result._id;
                    console.log('Baseline fingerprint ' + baselineId + ' found.');
                    
                    return Promise.resolve();
                }
                
                console.log('Baseline fingerprint not found. Creating new fingerprint...');
                
                return socket.emitAsync('fingerprints create', { id: testId })
                    .then(function (data) {
                        console.log('Fingerprint created. Approving it...');
                        baselineId = data.result._id;
                        
                        return socket.emitAsync('fingerprints approve', { id: data.result._id });
                    });
            })
            .then(function () {
                console.log('Searching latest fingerprint...');
                
                return socket.emitAsync('fingerprints get latest', { id: testId });
            })
            .then(function (data) {
                if (data.result && data.result._id !== baselineId) {
                    targetId = data.result._id;
                    console.log('Latest fingerprint ' + targetId + ' found.');
                    
                    return Promise.resolve();
                }
                
                console.log('Latest fingerprint not found. Creating one');
                
                return socket.emitAsync('fingerprints create', { id: testId });
            })
            .then(function (data) {
                if (data && data.result) {
                    targetId = data.result._id;
                }
                
                console.log('Baseline and latest fingerprints are ready');
                render(baselineId, targetId);
            });
    }
    
    function render(baselineId, targetId) {
        console.log('Generating diff between ' + baselineId + ' and ' + targetId + ' ...');
        
        $('#wrapper').append(Handlebars.templates.containers({
            baselineId: baselineId,
            targetId: targetId
        }));

        $('#imgA, #imgB').one('load', handleImageLoading(baselineId, targetId));
    }
    
    function handleImageLoading(baselineId, targetId) {
        var loaded = 0;

        return function () {
            if (++loaded === 2) {
                getDiffs(baselineId, targetId);
            }
        };
    }

    function getDiffs(idA, idB) {
        var $imgA           = $('#imgA'),
            $imgB           = $('#imgB'),
            $contA          = $('#contA'),
            $contB          = $('#contB'),
            diffATemplate   = Handlebars.templates['diff-areas-a'],
            diffBTemplate   = Handlebars.templates['diff-areas-b'],
            widthA          = $imgA[0].naturalWidth,
            widthB          = $imgB[0].naturalWidth,
            heightA         = $imgA[0].naturalHeight,
            heightB         = $imgB[0].naturalHeight;

        socket.emitAsync('differences create json', {
            baselineId: idA,
            targetId: idB
        })
            .then(function (data) {
                appendDiffAreas($contA, diffATemplate, data.result);
                setDiffPositions($contA.find('.diff'), 'a', widthA, heightA, data.result);
                
                appendDiffAreas($contB, diffBTemplate, data.result);
                setDiffPositions($contB.find('.diff'), 'b', widthB, heightB, data.result);

                attachScrollToDiffEvent();
                
                appendDiffInspector(data.result);
                attachDiffInspectorHoverEvent(data.result, widthA, widthB, heightA, heightB);

                $('#overlay').hide();
            });
    }

    function appendDiffAreas(diffContainer, diffTemplate, diffResult) {
        diffContainer.append(diffTemplate(diffResult));
    }

    function setDiffPositions($diffs, item, width, height, diffResult) {
        $diffs.each(function (index) {
            setPosition($(this), diffResult[index][item] && diffResult[index][item].offset, width, height);
        });
    }

    function attachScrollToDiffEvent() {
        $('#contA .diff, #contB .diff').on('click', function (event) {
            var diffIndex = $(this).data('diff-index'),
                offset = $('#diff-inspector').find('li[data-diff-index="' + diffIndex + '"]').offset().top;
                    
            event.stopPropagation();
                
            $('#diff-inspector').scrollTop(offset);
        });
    }

    function appendDiffInspector(diffResult) {
        $('#diff-inspector').append(Handlebars.templates['diff-inspector'](diffResult));
    }

    function attachDiffInspectorHoverEvent(diffResult, widthA, widthB, heightA, heightB) {
        $('#diff-inspector li').on('mouseover', function () {
            var index = $(this).index(),
                offsetA = diffResult[index].a && diffResult[index].a.offset,
                offsetB = diffResult[index].b && diffResult[index].b.offset,
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

    Promise.promisifyAll(socket, { promisifier: promisifier });

    function promisifier(originalMethod) {
        return function promisified() {
            var args = [].slice.call(arguments),
                self = this;
                
            return new Promise(function (resolve, reject) {
                args.push(resolve);
                originalMethod.apply(self, args);
            });
        };
    }
})();
