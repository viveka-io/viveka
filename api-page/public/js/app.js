var socket = io(),
    source      = $("#request-template").html(),
    features = [
        {
            message: 'tests list'
        },
        {
            message: 'tests create',
            inputs: [
                { name: 'browserWidth',     value: 1280, additionalClasses: 'data' },
                { name: 'browserHeight',    value: 720, additionalClasses: 'data' },
                { name: 'url',              value: 'http://localhost:5555/testpage', additionalClasses: 'data' },
                { name: 'generator',        value: 'SENSE', additionalClasses: 'data' },
                { name: 'browser',          value: 'FIREFOX', additionalClasses: 'data' }
            ]
        },
        {
            message: 'tests get',
            inputs : [ { name: 'id'} ]
        },
        {
            message: 'tests delete',
            inputs : [ { name: 'id'} ]
        },
        {
            message: 'fingerprints list',
            inputs : [ { name: 'id'} ]
        },
        {
            message: 'fingerprints create',
            inputs : [ { name: 'id'} ]
        },
        {
            message: 'fingerprints get',
            inputs : [ { name: 'id'} ]
        },
        {
            message: 'fingerprints get baseline',
            inputs : [ { name: 'id'} ]
        },
        {
            message: 'fingerprints get latest',
            inputs : [ { name: 'id'} ]
        },
        {
            message: 'fingerprints update',
            inputs : [ { name: 'id'} ]
        },
        {
           message: 'fingerprints approve',
           inputs : [ { name: 'id'} ]
        },
        {
           message: 'fingerprints unapprove',
           inputs : [ { name: 'id'} ]
        },
        {
            message: 'differences get',
            inputs : [ { name: 'id'} ]
        },
        {
            message: 'differences create',
            inputs : [
                { name: 'baselineId'},
                { name: 'targetId'}
            ]
        },
        {
            message: 'differences create json',
            inputs : [
                { name: 'baselineId'},
                { name: 'targetId'}
            ]
        }
    ];

features.forEach(function (feature) {
    var html = Handlebars.templates.feature(feature);

    $('#side-menu').append(html);

    socket.on(feature.message, function(data){        
        if (data.domTree) data.domTree = data.domTree;
        if (data.diff) data.diff = data.diff;

        $('#messages').prepend(Handlebars.templates.message({
            content: JSON.stringify(data, undefined, 4),
            screenshot: data.screenshot
        }));
    });
});

socket.on('verror', function(error){
    $('#messages').prepend(Handlebars.templates.message({
        error: error
    }));
});

socket.on('info', function(info){
    $('#messages').prepend(Handlebars.templates.message({
        info: info
    }));
});

$('body').on('click', '.message', function () {
    $(this).closest('.request').find('.content').toggle();
});

$('body').on('click', '.submit:not("missing")', function () {
    var $t = $(this).closest('.request'),
        message = $t.find('.message').text();

    socket.emit(message, collectData($t.find('.content')));
});

function collectData(content) {
    var data = {};

    $.each(content.find('input'), function () {
        data[$(this).attr('name')] = $(this).val();
    });

    return data;
}

function replaceUrl(url, content) {
    var matches = url.match(/{.*?}/g);

    if(matches && matches.length > 0) {
        $.each(matches, function(i, match) {
            var input = content.find('input[name="'+match.substr(1, match.length-2)+'"]');
            if (input.val()) {
                url = url.replace(match, input.val());
            }
        })
    }
    console.log(url);
    return url;
}

