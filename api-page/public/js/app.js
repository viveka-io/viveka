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

features.forEach(function (feature) {
    var html = Handlebars.templates.feature(feature);

    $('#side-menu').append(html);
});

$('body').on('click', '.message', function () {
    $(this).closest('.request').toggleClass('opened').find('.content').slideToggle(300);
});

$('body').on('click', '.submit:not("missing")', function () {
    var $t = $(this).closest('.request'),
        message = $t.find('.message').text();

    socket.emitAsync(message, collectData($t.find('.content')))
        .then(function(data){
            var $message,
                jsonString,
                jsonStringWithoutStyle;

            if (data.error || data.info) {
                $message =  $(Handlebars.templates.message(data));
            } else {
                jsonString = JSON.stringify(data.result, undefined, 4);
                jsonStringWithoutStyle = jsonString.replace(/"style":.*[^}]*}/igm, 'style: "..."');

                $message = $(Handlebars.templates.message({
                    content: jsonStringWithoutStyle,
                    screenshot: data.result.screenshot,
                    title: data.title
                }));
            }

            $message
                .hide()
                .prependTo('#messages')
                .slideDown(200);
        });
});

function collectData(content) {
    var data = {};

    $.each(content.find('input'), function () {
        data[$(this).attr('name')] = $(this).val();
    });

    return data;
}
