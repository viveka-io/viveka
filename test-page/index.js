var express = require('express'),
    connect_handlebars = require('connect-handlebars'),
    app = express(),
    port = 5556;

app.use(express.static(__dirname + '/public'));

app.use('/bower_components', express.static(__dirname + '/../bower_components'));
app.use("/js/templates.js", connect_handlebars(__dirname + "/templates", {
    exts: ['hbs']
}));

app.listen(port, function() {
    console.log('Test page server is listening at %s', port);
});
