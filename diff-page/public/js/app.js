(function () {
    'use strict';

    var socket = io();

    function getFormattedJSON(node) {
        var htmlFragment = '';

        htmlFragment += '<dl>';
        htmlFragment += '<dt>name:</dt><dd>' + node.name + '</dd>';
        htmlFragment += '<dt>path:</dt><dd>' + node.path + '</dd>';
        htmlFragment += '<dt>offset:</dt><dd> top: ' + node.offset.top + ' / left: ' + node.offset.left + ' / width: ' + node.offset.width + ' / height: ' + node.offset.height + '</dd>';
        htmlFragment += '<dt>hash:</dt><dd>' + node.hash + '</dd>';
        htmlFragment += '</dl>';

        return htmlFragment;
    }

    function getDiffs(idA, idB) {
        var $A      = $('#contA'),
            $B      = $('#contB'),
            $imgA   = $('#imgA'),
            $imgB   = $('#imgB'),
            widthA  = $imgA[0].naturalWidth,
            widthB  = $imgB[0].naturalWidth,
            heightA = $imgA[0].naturalHeight,
            heightB = $imgB[0].naturalHeight;

        socket.on('differences create json', function(data) {

            var $data = $(data),
                $listItems,
                formattedJSON = '<ul>';

            $data.each(function(index, item) {
                var area,
                    classNames = item.differences.join(' ').toLowerCase();

                formattedJSON += '<li>' + index;

                if (item.a) {
                    area = $('<div title="' + item.a.name + '" class="diff ' + classNames + '"><span><b><i></i></b></span></div>').appendTo($A);
                    area.css({
                        top: (item.a.offset.top / heightA * 100) + '%',
                        left: (item.a.offset.left / widthA * 100) + '%',
                        width: (item.a.offset.width / widthA * 100) + '%',
                        height: (item.a.offset.height / heightA * 100) + '%'
                    });

                    formattedJSON += '<strong'+ (item.deleteA ? ' class="delete"' : '') + '>A</strong>';
                    formattedJSON += getFormattedJSON(item.a);

                }
                if (item.b) {
                    area = $('<div title="' + item.b.name + '" class="diff ' + classNames + '"><span><b><i></i></b></span></div>').appendTo($B);
                    area.css({
                        top: (item.b.offset.top / heightB * 100) + '%',
                        left: (item.b.offset.left / widthB * 100) + '%',
                        width: (item.b.offset.width / widthB * 100) + '%',
                        height: (item.b.offset.height / heightB * 100) + '%'
                    });

                    formattedJSON += '<strong'+ (item.deleteB ? ' class="delete"' : '') + '>B</strong>';
                    formattedJSON += getFormattedJSON(item.b);

                }

                formattedJSON += '<dl><dt>A Copy:</dt><dd>' + item.aHasCopy + '</dd></dl>';
                formattedJSON += '<dl><dt>B Copy:</dt><dd>' + item.bHasCopy + '</dd></dl>';
                formattedJSON += '<dl><dt>delete A:</dt><dd>' + item.deleteA + '</dd></dl>';
                formattedJSON += '<dl><dt>delete B:</dt><dd>' + item.deleteB + '</dd></dl>';
                formattedJSON += '<dl><dt>DIFFS:</dt><dd>' + item.differences.join('<br>') + '</dd></dl>';

                formattedJSON += '</li>';

            });

            formattedJSON += '</ul>';

            $('#json').html(formattedJSON);

            $listItems = $('#json li');

            $listItems.on('mouseover', function() {
                var index = $listItems.index(this),
                    offsetA = $data[index].a && $data[index].a.offset,
                    offsetB = $data[index].b && $data[index].b.offset,
                    $markerA = $('.diffmarker', $A),
                    $markerB = $('.diffmarker', $B);

                if (offsetA) {
                    $markerA.css({
                        top: (offsetA.top / heightA * 100) + '%',
                        left: (offsetA.left / widthA * 100) + '%',
                        width: (offsetA.width / widthA * 100) + '%',
                        height: (offsetA.height / heightA * 100) + '%'
                    });
                } else {
                    $markerA.css('top', '300%');
                }

                if (offsetB) {
                    $markerB.css({
                        top: (offsetB.top / heightB * 100) + '%',
                        left: (offsetB.left / widthB * 100) + '%',
                        width: (offsetB.width / widthB * 100) + '%',
                        height: (offsetB.height / heightB * 100) + '%'
                    });
                } else {
                    $markerB.css('top', '300%');
                }

            });

            $('#overlay').hide();
        });

        socket.emit('differences create json', {
            baselineId: idA,
            targetId: idB
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

        $('button').on('click', function() {
            var $button = $(this),
                $class = $button.attr('class'),
                isDisabled = $button.attr('data-pushed') === "true";

            $button.attr('data-pushed', !isDisabled);

            $('#wrapper').toggleClass($class);

            return false;
        });
    }

    $(function(){
        var router = new Router();

        router.on('/:baselineId/:targetId', function (baselineId, targetId) {
            render(baselineId, targetId);
        });

        router.init();
    });


})();

