var path = require('path');
var gulp = require('gulp');
var $ = require('gulp-load-plugins')({
    pattern: ['gulp-*', 'del']
});
var browserSync = require('browser-sync').create();
var spawn = require('child_process').spawn;
var node;
//--------------------------- CONFIGURATION ----------------------------------
var paths = {
    src: {
        server: {
            root: path.join(__dirname, 'lib'),
            all: 'lib/**/*.js'
        },
        style: 'developers/**/*.scss'
    },
    tmp: {
        server: {
            index: 'tmp/server/index.js',
            root: 'tmp/server'
        },
        style: 'tmp/public/style'
    }
};
//---------------------------- SERVER TASKS -----------------------------------
gulp.task('babel', ['stopServer'], function() {
    return gulp.src(paths.src.server.all)
        .pipe($.sourcemaps.init())
        .pipe($.cached('Server:Babel'))
        .pipe($.babel({
          optional: ['es7.asyncFunctions']
        }).on('error', errorHandler('Server:Babel')))
        .pipe($.sourcemaps.write('.', { sourceRoot: paths.src.server.root }))
        .pipe(gulp.dest(paths.tmp.server.root));
});

gulp.task('stopServer', function() {
    if (node) {
        node.kill();
    }
});

gulp.task('startServer', ['babel'], function() {
    node = spawn('node', [paths.tmp.server.index], { stdio: 'inherit' });
    node.on('close', function(code) {
        if (code === 8) {
            $.util.log('Error detected, waiting for changes...');
        }
    });
});

process.on('exit', function() {
    if (node) {
        node.kill();
    }
});
//---------------------------- STYLE TASKS -----------------------------------
gulp.task('sass', function() {
    return gulp.src(paths.src.style)
        .pipe($.cached('Sass'))
        .pipe($.sass().on('error', errorHandler('Sass')))
        .pipe(gulp.dest(paths.tmp.style));
});
//---------------------------- WATCH TASK -----------------------------------
gulp.task('watch', function() {
    gulp.watch(paths.src.server.all, ['startServer']);
    gulp.watch(paths.src.style, ['sass']);
});
//---------------------------- DEFAULT TASK -----------------------------------
gulp.task('default', ['startServer', 'watch']);
//---------------------------- ERROR HANDLER -----------------------------------
function errorHandler(title) {
    'use strict';

    return function(err) {
        $.util.log($.util.colors.red('[' + title + ']'), err.toString());
        this.emit('end');
    };
}
