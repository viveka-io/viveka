const winston = require('winston');

function getLogger(name) {
    return winston.loggers.add(name, {
        console: {
          colorize: true,
          label: name
        }
    });
}

module.exports = getLogger;
