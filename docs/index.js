$('body').on('click', '.request:not(".missing")', function () {
    var $t     = $(this),
        $c     = $t.find('.content'),
        method = $t.attr('class').replace('request', ' ').trim().toUpperCase(),
        url    = $t.find('.url').html();

    $c.toggle();

    if ($c.is(':visible')) {
        $.ajax({
            method: method,
            url: url,
            data: {}
        }).done(function (data) {
            $c.html(JSON.stringify(data));
        });
    }
});
