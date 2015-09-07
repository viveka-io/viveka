var path = require('path');
var gulp = require('gulp');
var $ = require('gulp-load-plugins')({
    pattern: ['gulp-*', 'rimraf']
});
var merge = require('merge-stream');
var runSequence = require('run-sequence');
var browserSync = require('browser-sync');
var cp = require('child_process');
var node;
//--------------------------- CONFIGURATION ----------------------------------
var paths = {
    src: {
        server: {
            root: path.join(__dirname, 'lib'),
            all: ['lib/**/*.js', 'developers/test-cases/test-cases.js']
        },
        style: 'developers/**/*.scss',
        script: 'developers/**/*.js',
        template: [
            'developers/test-cases/**/*.hbs',
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
                'test-cases.js',
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
gulp.task('server:babel', function() {
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

gulp.task('startServer', ['server:babel', 'stopServer'], function(done) {
    node = cp.spawn('node', [paths.tmp.server.index], { stdio: ['ipc', process.stdout, process.stderr] });
    node.on('close', function(code) {
        if (code === 8) {
            $.util.log('Error detected, waiting for changes...');
        }
    });
    node.on('message', function(message) {
        if (message === 'started') {
            done();
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
        .pipe(gulp.dest(paths.tmp.script))
        .pipe(browserSync.stream());
});
//---------------------------- STYLE TASK -----------------------------------
gulp.task('style', function() {
    return gulp.src(paths.src.style)
        .pipe($.sourcemaps.init())
        .pipe($.cached('Sass'))
        .pipe($.sass().on('error', errorHandler('Sass')))
        .pipe($.flatten())
        .pipe($.sourcemaps.write('.'))
        .pipe(gulp.dest(paths.tmp.style))
        .pipe(browserSync.stream());
});
//---------------------------- TEMPLATE TASK ------------------------------
gulp.task('template', function(){
    var tasks = paths.src.template.map(function (template, index) {
        return gulp.src(template)
            .pipe($.handlebars())
            .pipe($.wrap('Handlebars.template(<%= contents %>)'))
            .pipe($.declare({
                namespace: 'Handlebars.templates',
                noRedeclare: true
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
gulp.task('browser-sync', function() {
    browserSync({
        proxy: 'localhost:5555'
    });
});

gulp.task('watch', function() {
    gulp.watch(paths.src.server.all, ['startServer']);
    gulp.watch(paths.src.script, ['script']);
    gulp.watch(paths.src.style, ['style']);
    gulp.watch(paths.src.template, ['template', browserSync.reload]);
    gulp.watch(paths.src.markup, ['markup', browserSync.reload]);
});
//---------------------------- CLEAN TASK -----------------------------------
gulp.task('clean', function () {
    var files = [];

    files.push(paths.tmp.server.root);
    files.push(paths.tmp.script);
    files.push(paths.tmp.style);
    files.push(paths.tmp.template.root);

    paths.tmp.markup.name.forEach(function(name){
        files.push(paths.tmp.markup.root + '/' + name);
    });

    files.forEach(function(file) {
        $.rimraf.sync(file);
    });
});
//---------------------------- DEFAULT TASK -----------------------------------
gulp.task('build', function(done) {
    runSequence('clean', ['server:babel', 'script', 'style', 'template', 'markup'], done);
});
gulp.task('default', function (done) {
    runSequence('build', 'startServer', 'browser-sync', 'watch', done);
});
//---------------------------- ERROR HANDLER -----------------------------------
function errorHandler(title) {
    'use strict';

    return function(err) {
        $.util.log($.util.colors.red('[' + title + ']'), err.toString());
        this.emit('end');
    };
}
