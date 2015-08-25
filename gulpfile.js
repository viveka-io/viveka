var gulp = require('gulp');
var gutil = require('gulp-util');
var sourcemaps = require('gulp-sourcemaps');
var babel = require('gulp-babel');
var cache = require('gulp-cached');
var spawn = require('child_process').spawn;
var sass = require('node-sass-middleware');
var node;
var bunyan;

var path = require('path');

var paths = {
    src: ['lib/**/*.js'],
    dest: 'dist',
    sourceRoot: path.join(__dirname, 'lib'),
};

paths.server = path.join(paths.dest, 'index.js');

gulp.task('babel', ['stopServer'], function() {
    return gulp.src(paths.src)
        .pipe(sourcemaps.init())
        .pipe(cache('babel'))//Transpile only changed files
        .pipe(babel({
          optional: ['es7.asyncFunctions']
        }))
        .pipe(sourcemaps.write('.', { sourceRoot: paths.sourceRoot }))
        .pipe(gulp.dest(paths.dest));
});

gulp.task('stopServer', function() {
    if (node) {
        node.kill();
    }

    if (bunyan) {
        bunyan.kill();
    }
});

gulp.task('startServer', ['babel'], function() {
    node = spawn('node', [paths.server]);
    bunyan = spawn('node', ['./node_modules/bunyan/bin/bunyan', '-o', 'short']);

    node.stdout.pipe(bunyan.stdin);
    node.stderr.pipe(bunyan.stdin);

    bunyan.stdout.pipe(process.stdout);
    bunyan.stderr.pipe(process.stderr);

    node.on('close', function(code) {
        if (code === 8) {
            gutil.log('Error detected, waiting for changes...');
        }
    });
});

gulp.task('styles', function() {
    return gulp.src('styles/**/*.scss')
        .pipe(sass().on('error', sass.logError))
        .pipe(gulp.dest('./public/css/'));
});

gulp.task('watch', function() {
    gulp.watch(paths.src, ['startServer']);
    gulp.watch('styles/**/*.scss',['styles']);
});

gulp.task('default', ['startServer', 'watch']);

process.on('exit', function() {
    if (node) {
        node.kill();
    }
});
