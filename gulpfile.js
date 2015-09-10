var path = require('path');
var gulp = require('gulp');
var $ = require('gulp-load-plugins')({
    pattern: ['gulp-*']
});
var rimraf = require('rimraf');
var glob = require('glob');
var merge = require('merge-stream');
var runSequence = require('run-sequence');
var browserSync = require('browser-sync');
var cp = require('child_process');
var node;
//--------------------------- CONFIGURATION ----------------------------------
var sections = {
    'dev-section': {
        'index': 'dev-section-main-page.html'
    },
    'admin': {
        'index': 'test-list.html'
    }
};
var server = {
    src: {
        root: path.join(__dirname, 'lib'),
        all: ['lib/**/*.js', 'dev-section/test-cases/test-cases.js']
    },
    tmp: {
        index: 'tmp/server/index.js',
        root: 'tmp/server'
    }
};
//---------------------------- SERVER TASKS -----------------------------------
gulp.task('server:babel', function () {
    return gulp.src(server.src.all)
        .pipe($.sourcemaps.init())
        .pipe($.cached('Server:Babel'))
        .pipe($.babel({
            optional: ['es7.asyncFunctions']
        }).on('error', errorHandler('Server:Babel')))
        .pipe($.sourcemaps.write('.', { sourceRoot: server.src.root }))
        .pipe(gulp.dest(server.tmp.root));
});

gulp.task('stopServer', function () {
    if (node) {
        node.kill();
    }
});

gulp.task('startServer', ['server:babel', 'stopServer'], function (done) {
    node = cp.spawn('node', [server.tmp.index], { stdio: ['ipc', process.stdout, process.stderr] });
    node.on('close', function (code) {
        if (code === 8) {
            $.util.log('Error detected, waiting for changes...');
        }
    });
    node.on('message', function (message) {
        if (message === 'started') {
            done();
        }
    });
});

process.on('exit', function () {
    if (node) {
        node.kill();
    }
});
Object.keys(sections).map(function (section) {
    //---------------------------- SCRIPT TASK ----------------------------------
    gulp.task(section + ':script', function () {
        return gulp.src(section + '/**/*.js')
            .pipe($.sourcemaps.init())
            .pipe($.cached('Client:Babel'))
            .pipe($.babel({
                optional: ['es7.asyncFunctions']
            }).on('error', errorHandler('Client:Babel')))
            .pipe($.flatten())
            .pipe($.sourcemaps.write('.'))
            .pipe(gulp.dest('tmp/public/' + section + '/script'))
            .pipe(browserSync.stream());
    });
    //---------------------------- STYLE TASK -----------------------------------
    gulp.task(section + ':style', function () {
        return gulp.src(section + '/**/*.scss')
            .pipe($.sourcemaps.init())
            .pipe($.cached('Sass'))
            .pipe($.sass().on('error', errorHandler('Sass')))
            .pipe($.flatten())
            .pipe($.sourcemaps.write('.'))
            .pipe(gulp.dest('tmp/public/' + section + '/style'))
            .pipe(browserSync.stream());
    });
    //---------------------------- TEMPLATE TASK ------------------------------
    gulp.task(section + ':template', function () {
        var templatesFolders = glob.sync(section + '/**/*.hbs').reduce(function (list, item) {
            var folder = path.resolve(path.dirname(item), '..');

            if (list.indexOf(folder) === -1) {
                list.push(folder);
            }

            return list;
        }, []);

        var tasks = templatesFolders.map(function (templateFolder) {
            return gulp.src(templateFolder + '/**/*.hbs')
                .pipe($.handlebars())
                .pipe($.wrap('Handlebars.template(<%= contents %>)'))
                .pipe($.declare({
                    namespace: 'Handlebars.templates',
                    noRedeclare: true
                }))
                .pipe($.concat(path.basename(templateFolder) + '.js'))
                .pipe(gulp.dest('tmp/public/' + section + '/template'));
        });

        return merge(tasks);
    });
    //---------------------------- MARKUP TASK ----------------------------------
    gulp.task(section + ':markup', function () {
        var indexFilter = $.filter(sections[section].index, { restore: true });

        return gulp.src(section + '/**/*.html')
            .pipe($.flatten())
            .pipe(indexFilter)
            .pipe($.rename('index.html'))
            .pipe(indexFilter.restore)
            .pipe(gulp.dest('tmp/public/' + section));
    });
});
//---------------------------- WATCH TASK -----------------------------------
gulp.task('browser-sync', function () {
    browserSync({
        proxy: 'localhost:5555'
    });
});

gulp.task('watch', function () {
    gulp.watch(server.src.all, ['startServer']);
    Object.keys(sections).forEach(function (section) {
        gulp.watch(section + '/**/*.js', [section + ':script']);
        gulp.watch(section + '/**/*.scss', [section + ':style']);
        gulp.watch(section + '/**/*.hbs', [section + ':template', browserSync.reload]);
        gulp.watch(section + '/**/*.html', [section + ':markup', browserSync.reload]);
    });
});
//---------------------------- CLEAN TASK -----------------------------------
gulp.task('clean', function () {
    var folders = Object.keys(sections).map(function (section) {
        return 'tmp/public/' + section;
    });

    folders.push(server.tmp.root);

    folders.forEach(function (folder) {
        rimraf.sync(folder);
    });
});
//---------------------------- DEFAULT TASK -----------------------------------
gulp.task('default', function (done) {
    var tasks = Object.keys(sections).reduce(function (list, section) {
        list.push(section + ':script');
        list.push(section + ':style');
        list.push(section + ':template');
        list.push(section + ':markup');
        return list;
    }, ['server:babel']);

    tasks.push('startServer');

    runSequence('clean', tasks, ['browser-sync', 'watch'], done);
});
//---------------------------- ERROR HANDLER -----------------------------------
function errorHandler(title) {
    'use strict';

    return function (err) {
        $.util.log($.util.colors.red('[' + title + ']'), err.toString());
        this.emit('end');
    };
}
