var express = require('express');
    app = express(),
    port = 5556;

app.use(express.static(__dirname + '/public'));

app.use('/bower_components',  express.static(__dirname + '/../bower_components'));
app.listen(port, function() {
    console.log('Test page server is listening at %s', port);
});
