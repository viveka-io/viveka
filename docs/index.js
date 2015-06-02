var source      = $("#request-template").html(),
    template    = Handlebars.compile(source),
    requests    = [
        {
            type: 'get',
            url: '/tests'
        },
        {
            type: 'post',
            url: '/tests',
            inputs: [
                { name: 'browserWidth',     value: 1280, additionalClasses: 'data' },
                { name: 'browserHeight',    value: 720, additionalClasses: 'data' },
                { name: 'url',              value: 'http://testpage:5556/', additionalClasses: 'data' },
                { name: 'generator',        value: 'SENSE', additionalClasses: 'data' },
                { name: 'browser',          value: 'FIREFOX', additionalClasses: 'data' }
            ]
        },
        {
            type: 'get',
            url: '/tests/{testId}',
            inputs : [ { name: 'testId'} ]
        },
        {
            type: 'delete',
            url: '/tests/{testId}',
            inputs : [ { name: 'testId'} ]
        },
        {
            type: 'put',
            url: '/tests/{testId}',
            additionalClasses: 'missing'
        },
        {
            type: 'get',
            url: '/tests/{testId}/fingerprints',
            inputs : [ { name: 'testId'} ]
        },
        {
            type: 'post',
            url: '/tests/{testId}/fingerprints',
            inputs : [ { name: 'testId'} ]
        },
        {
            type: 'get',
            url: '/fingerprints/{fingerPrintId}',
            inputs : [ { name: 'fingerPrintId'} ]
        },
        {
            type: 'put',
            url: '/fingerprints/{fingerPrintId}',
            inputs : [ { name: 'fingerPrintId'} ]
        },
        {
            type: 'get',
            url: '/differences/{differenceId}',
            inputs : [ { name: 'differenceId'} ]
        },
        {
            type: 'get',
            url: '/differences/{baselineFingerPrintId}/{targetFingerPrintId}',
            inputs : [
                { name: 'baselineFingerPrintId'},
                { name: 'targetFingerPrintId'}
            ]
        }
    ];

$.each(requests, function (i, request) {
    var html = template(request);

    $('body').append(html);
})

$('body').on('click', '.url', function () {
    $(this).parent().find('.content').toggle();
});

$('body').on('click', '.submit:not("missing")', function () {
    var $t     = $(this).parent().parent(),
        method = $t.attr('class').replace('request', ' ').trim().toUpperCase(),
        url    = $t.find('.url').html(),
        $c     = $t.find('.content pre'),
        $img   = $t.find('.content img');

    $.ajax({
        method: method,
        url: replaceUrl(url, $t.find('.content')),
        data: collectData($t.find('.content'))
    }).done(function (data) {
        if (data.domTree) data.domTree = JSON.parse(data.domTree);
        $c.html(JSON.stringify(data, undefined, 4));
        if (data.screenshot) {
            $img.attr('src', data.screenshot);
        }
    });
});

function collectData(content) {
    var data = {};

    $.each(content.find('input.data'), function () {
        data[$(this).attr('name')] = $(this).val();
    });

    return data;
}

function replaceUrl(url, content) {
    var matches = url.match(/{.*}/g);

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

