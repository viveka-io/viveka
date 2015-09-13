/*global $ Handlebars _ Router componentHandler*/

import { emitOnSocket } from '/script/common.js';

var header = {
        title: 'Test page',
        views: [
            { id: 'side-by-side-view',  name: 'Side by side' },
            { id: 'baseline-view',      name: 'Baseline' },
            { id: 'current-view',       name: 'Current' }
        ]
    },
    router;

$.getJSON('/dev-section/test-cases.json').done(handleTestCasesLoad);

function handleTestCasesLoad(testCases) {
    header.testCases = testCases;

    appendHeader();
    attachDiffSwitcherEvent();
    attachCreateDiffEvent();
    initRouter();
    componentHandler.upgradeAllRegistered();
}

function appendHeader() {
    $('#header-container').append(Handlebars.templates.nav(header));
}

function attachDiffSwitcherEvent() {
    $('.diff-switcher').on('click', function () {
        $('#wrapper').toggleClass($(this).data('diff'), $(this).is('.is-checked'));
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
    $('#overlay .caption').text('Looking for differences...');
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
        targetId,
        overlayCaption = $('#overlay .caption');

    overlayCaption.append('<br>Searching for baseline fingerprint...');
    emitOnSocket('fingerprints get baseline', { id: testId })
        .then(function (data) {
            if (data.result) {
                baselineId = data.result._id;
                overlayCaption.append('<br>Baseline fingerprint ' + baselineId + ' found.');

                return Promise.resolve();
            }

            overlayCaption.append('<br>Baseline fingerprint not found. Creating new fingerprint...');

            return emitOnSocket('fingerprints create', { id: testId })
                .then(function (fingerprint) {
                    overlayCaption.append('<br>Fingerprint created. Approving it...');
                    baselineId = fingerprint.result._id;

                    return emitOnSocket('fingerprints approve', { id: fingerprint.result._id });
                });
        })
        .then(function () {
            overlayCaption.append('<br>Searching latest fingerprint...');

            return emitOnSocket('fingerprints get latest', { id: testId });
        })
        .then(function (data) {
            if (data.result && data.result._id !== baselineId) {
                targetId = data.result._id;
                overlayCaption.append('<br>Latest fingerprint ' + targetId + ' found.');

                return Promise.resolve();
            }

            overlayCaption.append('<br>Latest fingerprint not found. Creating one');

            return emitOnSocket('fingerprints create', { id: testId });
        })
        .then(function (data) {
            if (data && data.result) {
                targetId = data.result._id;
            }

            overlayCaption.append('<br>Baseline and latest fingerprints are ready');
            render(baselineId, targetId);
        });
}

function render(baselineId, targetId) {
    $('#overlay .caption').append('<br>Generating diff between ' + baselineId + ' and ' + targetId + ' ...');

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

    emitOnSocket('differences create json', {
        baselineId: idA,
        targetId: idB
    })
        .then(function (data) {
            appendDiffAreas($contA, diffATemplate, data.result);
            setDiffPositions($contA.find('.diff'), 'a', widthA, heightA, data.result);

            appendDiffAreas($contB, diffBTemplate, data.result);
            setDiffPositions($contB.find('.diff'), 'b', widthB, heightB, data.result);

            appendDiffInspector(data.result);
            attachDiffInspectorHoverEvent(data.result, widthA, widthB, heightA, heightB);

            attachScrollToDiffEvent();

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
    $('[data-diff-target]').on('click', function (event) {
        var $diffInspector = $('#diff-inspector'),
            diffTargetIndex = $(this).data('diff-target'),
            $diffTarget = $diffInspector.find('[data-diff-index="' + diffTargetIndex + '"]'),
            offset = $diffInspector.scrollTop() + $diffTarget.position().top;

        event.stopPropagation();

        $diffInspector.stop(true, true).animate({ scrollTop: offset }, 200, function() {
            $diffTarget.addClass('selected');
            setTimeout(function() {
                $diffTarget.removeClass('selected');
            }, 500);
        });
    });
}

function appendDiffInspector(diffResult) {
    $('#diff-inspector').append(Handlebars.templates['diff-inspector'](diffResult));
}

function attachDiffInspectorHoverEvent(diffResult, widthA, widthB, heightA, heightB) {
    $('#diff-inspector .diff-item').on('mouseover', function () {
        var index = $(this).data('diff-index'),
            offsetA = diffResult[index].a && diffResult[index].a.offset,
            offsetB = diffResult[index].b && diffResult[index].b.offset,
            $markerA = $('#contA .diffmarker'),
            $markerB = $('#contB .diffmarker');

        if (offsetA) {
            setPosition($markerA, offsetA, widthA, heightA);
        } else {
            $markerA.css('top', '-100%');
        }

        if (offsetB) {
            setPosition($markerB, offsetB, widthB, heightB);
        } else {
            $markerB.css('top', '-100%');
        }
    });

    $('#diff-inspector').on('mouseout', function () {
        $('.diffmarker').css('height', 0);
    });
}

function setPosition($marker, offset, imgWidth, imgHeight) {
    if (offset) {
        $marker.css({
            top: offset.top / imgHeight * 100 + '%',
            left: offset.left / imgWidth * 100 + '%',
            width: offset.width / imgWidth * 100 + '%',
            height: offset.height / imgHeight * 100 + '%'
        });
    }
}
