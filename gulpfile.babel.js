/* jshint node: true */
/* global $: true */
'use strict';

import babelify from 'babelify';
import gulp from 'gulp';
import fs from 'fs';
import gulpLoadPlugins from 'gulp-load-plugins';
import rimraf from 'rimraf';
import browserify from "browserify";
import vsource from "vinyl-source-stream";
import vbuffer from "vinyl-buffer";
import runSequence from 'run-sequence';
import webpack from 'webpack-stream';
import debounce  from 'lodash.debounce';
import through from 'through2';
import eslint from 'gulp-eslint';
var browserSync = require('browser-sync').create();
var Metalsmith = require('metalsmith');

const imageminPngquant = require('imagemin-pngquant');

const $ = gulpLoadPlugins();

let envProd = false;

const staticSrc = 'src/**/*.{eot,ttf,woff,woff2,otf,pdf,txt,html}';

const dist = 'dist/';

// Clean
gulp.task('clean', () => {
	return rimraf.sync('dist');
});

gulp.task('cacheclear', () => {
	$.cache.clearAll();
});

// Copy staticSrc
gulp.task('copy', () => {
	return gulp.src(staticSrc, {
		base: 'src'
	}).pipe(gulp.dest(dist));
});



// Compile Partials
gulp.task('html', function() {
	gulp.src(['src/*.html'])
		.pipe($.fileInclude({
			prefix: '@@',
			basepath: 'src/partials/'
		}))
		.pipe($.htmlmin({
		// Editable - see https://www.npmjs.com/package/gulp-minify-html#options for details
			minifyJS: true
		}))
		.pipe(gulp.dest('dist/'));
});




gulp.task("revreplace", function () {
	var manifest = gulp.src(dist + 'manifest.json');

	return gulp.src(dist + '**/*.html')
		.pipe($.revReplace({
			manifest: manifest
		}))
		.pipe(gulp.dest(dist));
});

// JSHint
gulp.task('jshint', () => {
	return gulp.src(['src/js/**/*.js'])
		.pipe($.jshint())
		.pipe($.jshint.reporter('jshint-stylish'))
		.pipe($.jshint.reporter('fail'))
		.on('error', function (e) {
			if (!envProd) {
				$.notify().write(e);
			}
		});
});


// ESLint
gulp.task('eslint', () => {
	return gulp.src(['src/js/**/*.js'])
        .pipe(eslint())
        .pipe(eslint.format())
        .pipe(eslint.failAfterError())
		.on('error', function (e) {
			if (!envProd) {
				$.notify().write(e);
			}
		});
});

/** Compile Javascript */
gulp.task('javascript', ['eslint'], function () {
	var out = gulp.src('./src/js/main.js')
		.pipe(webpack(require('./webpack.config.js')))
		.on('error', function (e) {
			$.notify().write(e);
		});

	if (envProd) {
		return out
			.pipe(through.obj(function (file, enc, cb) {
				// Dont pipe through any source map files
				var isSourceMap = /\.map$/.test(file.path);
				if (!isSourceMap) this.push(file);
				cb();
			}))
			.pipe($.uglify())
			.pipe($.rev())
			.pipe(gulp.dest(dist + 'js'))
			.pipe($.rev.manifest(dist + 'manifest.json', {
				merge: true,
				base: '',
			}))
			.pipe(gulp.dest(''));
	} else {
		return out.pipe(gulp.dest(dist + 'js'));
	}
});


// Images
gulp.task("images", function (cb) {
	return gulp.src('src/img/**/*.{jpg,png,gif,svg,ico}')
		.pipe($.cache(
			$.imagemin([
				imageminPngquant(),
				$.imagemin.gifsicle(),
				$.imagemin.svgo({
					svgoPlugins: [{
						removeViewBox: true,
					}, ],
				}),
			], {
				verbose: true,
			})
		))
		.pipe(gulp.dest(dist + 'img'));
});

// Stylesheets
gulp.task('stylesheets', ['javascript'], (done) => {
	var paths = [
	];
	var out = gulp.src('src/css/main.scss')
		.pipe($.sourcemaps.init())
		.pipe($.sassGlob())
		.pipe($.sass({
			style: 'expanded',
			includePaths: paths 
			
			.concat(require('node-normalize-scss').includePaths)
			
			
		}))
		.on('error', $.sass.logError)
		.on('error', function (e) {
			if (!envProd) {
				$.notify().write(e);
			}
		})
		.pipe($.autoprefixer({
			browsers: ['last 3 versions'],
			cascade: false
		}));

	if (envProd) {
		return out.pipe($.csso())
			.pipe($.rev())
			.pipe(gulp.dest(dist + 'css'))
			.pipe($.rev.manifest(dist + 'manifest.json', {
				merge: true,
				base: '',
			}))
			.pipe(gulp.dest(''));
	} else {
		return out.pipe($.sourcemaps.write())
			.pipe(gulp.dest(dist + 'css'));
	}
});

// Set Production Environment
gulp.task('production_env', () => {
	envProd = true;
});

// Serve
gulp.task('serve', ['clean', 'stylesheets', 'javascript', 'images', 'copy','html'], function () {
	browserSync.init({
		ghostMode: false,
		open: false,
		server: {
			baseDir: dist,
			serveStaticOptions: {
				extensions: ['html'] // pretty urls
			}
		}
	});
	gulp.watch(staticSrc, ['copy']);
	gulp.watch('src/css/**/*.scss', ['stylesheets']);
	gulp.watch('src/js/**/*.js', ['javascript']);
	gulp.watch("src/**/*.{html,njk}", ["html"]);
	gulp.watch(dist + '/**/*.{jpg,png,svg,webp,js,copy}').on('change', debounce(browserSync.reload, 300));
});

// Deploy
gulp.task("deploy", function (callback) {
	runSequence(
		'build',
		'publish',
		callback)
});

// Build
gulp.task("build", function (callback) {
	runSequence(
		"production_env",
		"clean",
		"stylesheets",
		"javascript",
		"images",
		"copy",
		"html",
		"revreplace",
		callback)
});


// Publish to whatever here
gulp.task('publish', function () {

});

