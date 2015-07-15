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

        //setTestCaseCaption(testCases[0].textId); // my best guess is that this runs twice
    }

    function appendHeader() {
        $('#header-container').html(Handlebars.templates.nav(header));
        $.material.init();
    }

    function attachDiffSwitcherEvent() {
        $('.diff-switcher li').on('click', function (event) {
            $(this).toggleClass('active');

            $('#wrapper').toggleClass($(this).data('diff'), $(this).is('.active'));
        });
    }

    function attachCreateDiffEvent() {
        $('#create-diff-by-fingerprints').on('click', function (event) {
            event.preventDefault();
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

        router.init('/' + header.testCases[0].textId);
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
                /*********************************************************************/
                /*                                                                   */
                /*                                                                   */
                /*                                                                   */
                /*                                                                   */
                /* THIS IS WHERE I GAVE UP AND KILLED THE PERSON WHO WROTE THIS CODE */
                /*                                                                   */
                /*                                                                   */
                /*                                                                   */
                /*                                                                   */
                /*********************************************************************/
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
            if (++loaded == 2) {
                getDiffs(baselineId, targetId);
            }
        };
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
            .then(function (data) {
                var $listItems;

                $('#contA').append(Handlebars.templates['diff-areas-a'](data.result));
                $('#contA').find('.diff').each(function (index) {
                    setPosition($(this), data.result[index].a && data.result[index].a.offset, widthA, heightA);
                });

                $('#contB').append(Handlebars.templates['diff-areas-b'](data.result));
                $('#contB').find('.diff').each(function (index) {
                    setPosition($(this), data.result[index].b && data.result[index].b.offset, widthB, heightB);
                });
                $('#contA .diff, #contB .diff').on('click', function (event) {
                    var diffIndex = $(event.target).closest('.diff').data('diff-index'),
                        offset = $('#diff-inspector').find('li[data-diff-index="' + diffIndex + '"]').offset().top;

                    event.stopPropagation();

                    $('#diff-inspector').scrollTop(offset);
                });

                $('#diff-inspector').append(Handlebars.templates['diff-inspector'](data.result));
                $listItems = $('#diff-inspector li');
                $listItems.on('mouseover', function () {
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
