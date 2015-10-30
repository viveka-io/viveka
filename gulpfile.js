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
var browserSyncInstance;
var cp = require('child_process');
var node;

//--------------------------- CONFIGURATION ----------------------------------
var sections = {
    'dev-section': {
        index: 'dev-section-main-page.html'
    },
    'admin': {
        root: true,
        index: 'test-list.html'
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

gulp.task('startServer', function (done) {
    var args = [server.tmp.index];

    if (process.argv.indexOf('--populate-tests') > -1) { args.push('--populate-tests'); }
    if (process.argv.indexOf('--no-env-check') > -1) { args.push('--no-env-check'); }

    node = cp.spawn('node', args, { stdio: ['ipc', process.stdout, process.stderr] });
    node.on('close', function (code) {
        if (code) {
            $.util.log('Server crashed, waiting for changes...');
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

//---------------------------- SCRIPT TASK ----------------------------------
gulp.task('common:script', function () {
    return gulp.src('common/**/*.js')
        .pipe($.sourcemaps.init())
        .pipe($.cached('Client:Babel'))
        .pipe($.babel({
            modules: 'system',
            optional: ['es7.asyncFunctions']
        }).on('error', errorHandler('Client:Babel')))
        .pipe($.flatten())
        .pipe($.sourcemaps.write('.'))
        .pipe(gulp.dest('tmp/public/script'))
        .pipe(browserSync.stream());
});

Object.keys(sections).map(function (section) {
    gulp.task(section + ':script', function () {
        var dest = path.join('tmp', 'public', sections[section].root ? '' : section, 'script');

        return gulp.src(section + '/**/*.js')
            .pipe($.sourcemaps.init())
            .pipe($.cached('Client:Babel'))
            .pipe($.babel({
                modules: 'system',
                optional: ['es7.asyncFunctions']
            }).on('error', errorHandler('Client:Babel')))
            .pipe($.flatten())
            .pipe($.sourcemaps.write('.'))
            .pipe(gulp.dest(dest));
    });
    //---------------------------- STYLE TASK -----------------------------------
    gulp.task(section + ':style', function () {
        var dest = path.join('tmp', 'public', sections[section].root ? '' : section, 'style');
        return gulp.src(section + '/**/*.scss')
            .pipe($.sourcemaps.init())
            .pipe($.cached('Sass'))
            .pipe($.sass().on('error', errorHandler('Sass')))
            .pipe($.flatten())
            .pipe($.sourcemaps.write('.'))
            .pipe(gulp.dest(dest));
    });
    //---------------------------- TEMPLATE TASK ------------------------------
    gulp.task(section + ':template', function () {
        var dest = path.join('tmp', 'public', sections[section].root ? '' : section, 'template');
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
                .pipe(gulp.dest(dest));
        });

        return merge(tasks);
    });
    //---------------------------- MARKUP TASK ----------------------------------
    gulp.task(section + ':markup', function () {
        var dest = path.join('tmp', 'public', sections[section].root ? '' : section);
        var indexFilter = $.filter(sections[section].index || 'index.html', { restore: true });

        return gulp.src(section + '/**/*.html')
            .pipe($.flatten())
            .pipe(indexFilter)
            .pipe($.rename('index.html'))
            .pipe(indexFilter.restore)
            .pipe(gulp.dest(dest));
    });
});
//---------------------------- WATCH TASK -----------------------------------
gulp.task('browser-sync', ['default'], function () {

    if (browserSyncInstance) {
        browserSyncInstance.exit();
    }

    browserSyncInstance = browserSync.create();
    browserSyncInstance.init({
        proxy: 'localhost:5555'
    });
});

function browserSyncReload() {
    if (browserSyncInstance) {
        browserSyncInstance.reload();
    }
}

gulp.task('watch', function () {
    gulp.watch(server.src.all, function(){
        runSequence('stopServer', 'server:babel', 'startServer');
    });
    gulp.watch('common/**/*.js', ['common:script']);
    Object.keys(sections).forEach(function (section) {
        gulp.watch(section + '/**/*.js', [section + ':script', browserSyncReload]);
        gulp.watch(section + '/**/*.scss', [section + ':style', browserSyncReload]);
        gulp.watch(section + '/**/*.hbs', [section + ':template', browserSyncReload]);
        gulp.watch(section + '/**/*.html', [section + ':markup', browserSyncReload]);
    });
});
//---------------------------- CLEAN TASK -----------------------------------
gulp.task('clean', function (done) {
    rimraf('tmp/public', done);
});
//---------------------------- DEFAULT TASK -----------------------------------
gulp.task('default', function (done) {
    var tasks = Object.keys(sections).reduce(function (list, section) {
        list.push(section + ':script');
        list.push(section + ':style');
        list.push(section + ':template');
        list.push(section + ':markup');
        return list;
    }, ['common:script']);

    runSequence('clean', 'server:babel', tasks, ['startServer', 'watch'], done);
});
//---------------------------- ERROR HANDLER -----------------------------------
function errorHandler(title) {
    'use strict';

    return function (err) {
        $.util.log($.util.colors.red('[' + title + ']'), err.toString());
        this.emit('end');
    };
}
