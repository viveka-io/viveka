var socket = io();

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

function getTests() {
    socket.emitAsync('tests list', {})
        .then(function(data){
            var $tests = $(Handlebars.templates.tests(data));

            console.log(data);
            $tests.prependTo('#view');
            componentHandler.upgradeAllRegistered();
        });
}

getTests();
