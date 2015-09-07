const winston = require('winston');
const colors = require('colors/safe');
const dateformat = require('dateformat');

function getLogger(name, color) {
    return winston.loggers.add(name, {
        console: {
            formatter: formatter(name, color)
        }
    });
}

function formatter(name, color) {
    const colorize = color && colors[color] || (label => label);

    return function(options) {
        const timestamp = '[' + colors.gray(dateformat(new Date(), 'HH:MM:ss')) + ']';
        const label = colorize('[' + name + ']');

        return [timestamp, label, options.message].join(' ');
    }
}

module.exports = getLogger;
