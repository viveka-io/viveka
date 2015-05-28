$('body').on('click', '.url', function () {
    $(this).parent().find('.content').toggle();
});

$('body').on('click', '.submit:not("missing")', function () {
    var $t     = $(this).parent().parent(),
        method = $t.attr('class').replace('request', ' ').trim().toUpperCase(),
        url    = $t.find('.url').html(),
        $c     = $t.find('.content pre');

    $.ajax({
        method: method,
        url: replaceUrl(url, $t.find('.content')),
        data: {}
    }).done(function (data) {
        $c.html(JSON.stringify(data, undefined, 4));
    });
});

function replaceUrl(url, content) {
    var matches = url.match(/{.*}/g);

    if(matches && matches.length > 0) {
        $.each(matches, function(i, match) {
            var input = content.find('input[name="'+match.substr(1, match.length-2)+'"]');
            url = url.replace(match, input.val());
        })
    }
    console.log(url);
    return url;
}
