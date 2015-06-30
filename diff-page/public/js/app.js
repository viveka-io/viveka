(function () {
    'use strict';

    var socket = io();
    
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

        socket.on('differences create json', function(data) {
            var $listItems;
             
            $('#contA').append(Handlebars.templates['diff-areas-a'](data));
            $('#contA').find('.diff').each(function(index){
                setPosition($(this), data[index].a && data[index].a.offset, widthA, heightA);
            });
            $('#contB').append(Handlebars.templates['diff-areas-b'](data));
            $('#contB').find('.diff').each(function(index){
                setPosition($(this), data[index].b && data[index].b.offset, widthB, heightB);
            });
            $('#diff-inspector').append(Handlebars.templates['diff-inspector'](data));

            $listItems = $('#diff-inspector li');

            $listItems.on('mouseover', function() {
                var index = $listItems.index(this),
                    offsetA = data[index].a && data[index].a.offset,
                    offsetB = data[index].b && data[index].b.offset,
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

