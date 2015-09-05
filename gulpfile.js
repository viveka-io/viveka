var path = require('path');
var gulp = require('gulp');
var $ = require('gulp-load-plugins')({
    pattern: ['gulp-*', 'del']
});
var merge = require('merge-stream');
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
        style: 'developers/**/*.scss',
        script: 'developers/**/*.js',
        template: [
            'developers/api-page/**/*.hbs',
            'developers/diff-page/**/*.hbs',
            'developers/main-page/**/*.hbs',
            'developers/test-page/**/*.hbs'
        ],
        markup: [
            'developers/api-page/api-page.html',
            'developers/diff-page/diff-page.html',
            'developers/main-page/developers-main-page.html',
            'developers/test-page/test-page.html'
        ]
    },
    tmp: {
        server: {
            index: 'tmp/server/index.js',
            root: 'tmp/server'
        },
        style: 'tmp/public/style',
        script: 'tmp/public/script',
        template: {
            root: 'tmp/public/template',
            name: [
                'api-page.js',
                'diff-page.js',
                'main-page.js',
                'test-page.js'
            ]
        },
        markup: {
            root: 'tmp/public',
            name: [
                'api-page.html',
                'diff-page.html',
                'index.html',
                'test-page.html'
            ]
        }
    }
};
//---------------------------- SERVER TASKS -----------------------------------
gulp.task('server:babel', ['stopServer'], function() {
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

gulp.task('startServer', ['server:babel'], function() {
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
//---------------------------- SCRIPT TASK ----------------------------------
gulp.task('script', function() {
    return gulp.src(paths.src.script)
        .pipe($.sourcemaps.init())
        .pipe($.cached('Client:Babel'))
        .pipe($.babel({
          optional: ['es7.asyncFunctions']
        }).on('error', errorHandler('Client:Babel')))
        .pipe($.flatten())
        .pipe($.sourcemaps.write('.'))
        .pipe(gulp.dest(paths.tmp.script));
});
//---------------------------- STYLE TASK -----------------------------------
gulp.task('style', function() {
    return gulp.src(paths.src.style)
        .pipe($.sourcemaps.init())
        .pipe($.cached('Sass'))
        .pipe($.sass().on('error', errorHandler('Sass')))
        .pipe($.flatten())
        .pipe($.sourcemaps.write('.'))
        .pipe(gulp.dest(paths.tmp.style));
});
//---------------------------- TEMPLATE TASK ------------------------------
gulp.task('template', function(){
    var tasks = paths.src.template.map(function (template, index) {
        return gulp.src(template)
            .pipe($.handlebars())
            .pipe($.wrap('Handlebars.template(<%= contents %>)'))
            .pipe($.declare({
                namespace: 'Handlebars.templates',
                noRedeclare: true, // Avoid duplicate declarations
            }))
            .pipe($.concat(paths.tmp.template.name[index]))
            .pipe(gulp.dest(paths.tmp.template.root));
    });

    return merge(tasks);
});
//---------------------------- MARKUP TASK ----------------------------------
gulp.task('markup', function(){
    var tasks = paths.src.markup.map(function (markup, index) {
        return gulp.src(markup)
            .pipe($.rename(paths.tmp.markup.name[index]))
            .pipe(gulp.dest(paths.tmp.markup.root));
    });

    return merge(tasks);
});
//---------------------------- WATCH TASK -----------------------------------
gulp.task('watch', function() {
    gulp.watch(paths.src.server.all, ['startServer']);
    gulp.watch(paths.src.script, ['script']);
    gulp.watch(paths.src.style, ['style']);
    gulp.watch(paths.src.template, ['template']);
});
//---------------------------- DEFAULT TASK -----------------------------------
gulp.task('default', ['startServer', 'script', 'style', 'template', 'markup', 'watch']);
//---------------------------- ERROR HANDLER -----------------------------------
function errorHandler(title) {
    'use strict';

    return function(err) {
        $.util.log($.util.colors.red('[' + title + ']'), err.toString());
        this.emit('end');
    };
}
