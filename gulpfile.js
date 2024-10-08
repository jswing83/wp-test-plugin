import pkg from './package.json' assert { type: 'json' };
import vinylPaths from 'vinyl-paths';
import gulp from 'gulp';
import minifycss from 'gulp-uglifycss'; // Minifies CSS files.
import * as compiler from 'sass'; // Gulp pluign for Sass compilation.
import gsass from 'gulp-sass'; // Gulp pluign for Sass compilation.
import autoprefixer from 'gulp-autoprefixer'; // Autoprefixing magic.
import mmq from 'gulp-merge-media-queries'; // Combine matching media queries into one media query definition.

// JavaScript-related plugins.
import concat from 'gulp-concat'; // Concatenates JS files
import uglify from 'gulp-uglify'; // Minifies JS files

// Utility related plugins.
import rename from 'gulp-rename'; // Renames files (ex: style.css -> style.min.css)
import replace from 'gulp-batch-replace'; // Replace strings inside files
import lineec from 'gulp-line-ending-corrector'; // Consistent Line Endings for non UNIX systems. Gulp Plugin for Line Ending Corrector (A utility that makes sure your files have consistent line endings)
import filter from 'gulp-filter'; // Enables you to work on a subset of the original files by filtering them using globbing.
import sourcemaps from 'gulp-sourcemaps'; // Maps code in a compressed file (E.g. style.css) back to it’s original position in a source file (E.g. structure.scss, which was later combined with other css files to generate style.css)
import notify from 'gulp-notify'; // Displays notification message
import batchRename from 'gulp-simple-rename'; // Rename files with wildcard
import { deleteSync } from 'del'; // Delete files that are renamed
import plumber from  'gulp-plumber'; // Prevent pipe breaking caused by errors from gulp plugins.

// initialize
const sass = gsass(compiler);

/**
 * Gulpfile heavily adapted from {@link https://github.com/ahmadawais/WPGulp WPGulp}
 * Implements:
 *      1. CSS: Sass to CSS conversion, error catching, autoprefixing, sourcemaps,
 *         CSS minification, and merge media queries.
 *      2. JS: Concatenates & uglifies JS files.
 *      3. Watches files for changes in CSS or JS.
 *      4. Corrects the line endings {@link https://www.npmjs.com/package/gulp-line-ending-corrector}.
 *
 * @author Daniel M. Hendricks (@danielhendricks)
 * @since 0.3.0
 */

//var pkg = require('./package.json');

/**
 * Configuration
 *
 * In paths you can add <<glob or array of globs>>. Edit the variables as per your project requirements.
 */
var project             = pkg.name; // Project slug
var cssOutputStyle      = 'expanded'; // Values: compact, compressed, nested, expanded
var cssOutputComments   = false; // Output SASS source/line numbers in compiled CSS files

var styleSourcePath     = './src/scss/'; // Path to source SASS files
var jsSourcePath        = './src/js/'; // Path to source JavaScript files
var styleDestination    = './assets/css/'; // Path to place the compiled CSS file
var jsDestination       = './assets/js/'; // Path to place the compiled CSS file
var styleMapPath        = './'; // Path to place the map files
var distZipFile         = project + '.zip'; // The destination file for the ZIP task

/* Define the main CSS files to watch */
var styleTasks = [
  {
    name: 'plugin',
    suffix: false, // Can be a string value, false for none, else uses 'name' value
    source: 'plugin.scss' // The filename located in the styleSourcePath directory
  },
  {
    name: 'admin',
    source: 'admin.scss'
  }
];

/* Define the JavaScript files to watch */
var jsTasks = [
  {
    name: 'frontend',
    suffix: false,
    include: [ jsSourcePath + 'common/**/*.js' ],
    //source: jsSourcePath + 'frontend', // Optional subdirectory to search for *.js. Defaults to 'name' value
    //dest: jsDestination // Optionally, specfy alternate destination
  },
  {
    name: 'admin',
    include: [ jsSourcePath + 'common/**/*.js' ],
  },
  {
    name: 'vendor',
  }
];

/* Define strings to replace using 'gulp rename', defined in the config section of package.json */
var renameStrings = [
  [ 'jswing83\/wp-test-plugin', pkg.config.username + '/' + pkg.name ], // Git/Composer identifier
  [ 'JasonSwing\\TestPlugin', pkg.config.php_namespace ], // PHP namespace for your plugin
  [ 'JasonSwing\\\\TestPlugin', pkg.config.php_namespace.replace( /\\/g, '\\\\' ) ], // Rename Composer namespace
  [ 'wp-test-plugin', pkg.name ], // Plugin slug
  [ 'wp_test_plugin', pkg.name.replace( /-/g, '_' ) ], // Plugin underscored slug
  [ 'WTP', pkg.config.prefix.toUpperCase() ], // Unique JavaScript object for your plugin
  [ 'wtp', pkg.config.prefix ], // Replace remaining plugin prefixes
  [ 'WP Test Plugin', pkg.config.plugin_name ], // Replace plugin long name
  [ 'Test Plugin', pkg.config.plugin_short_name ] // Replace plugin short name
];

/**
 * Browsers for which you want to enable autoprefixing.
 *
 * @see https://github.com/ai/browserslist
 */
const AUTOPREFIXER_BROWSERS = [
  'last 2 version',
  '> 1%',
  'ie >= 9',
  'ie_mob >= 10',
  'ff >= 30',
  'chrome >= 34',
  'safari >= 7',
  'opera >= 23',
  'ios >= 7',
  'android >= 4',
  'bb >= 10'
];

/**
 * Custom Error Handler.
 *
 * @param Mixed err
 */
const errorHandler = r => {
	notify.onError( '\n\n ===> ERROR: <%= error.message %>\n' )( r );
	beep();
};

/* Arrays to hold created task info */
var tasks_css = [];
var tasks_js = [];

/**
 * Style tasks
 *
 * Compile SASS, autoprefixes and minifies.
 */
styleTasks.forEach( function( task ) {

  var basename_suffix = ( typeof task.suffix === 'string' ? '-' + task.suffix : '' );
  if( !( typeof task.suffix === 'boolean' && task.suffix === false ) ) basename_suffix = '-' + task.name;

  tasks_css.push( task.name + 'CSS' );

  gulp.task( task.name + 'CSS', (done) => {
    gulp.src( styleSourcePath + task.source )
      .pipe( plumber( errorHandler ) )
      .pipe( sourcemaps.init() )
      .pipe( sass( {
        sourceComments: cssOutputComments ? 'map' : null,
        errLogToConsole: true,
        outputStyle: cssOutputStyle,
        precision: 10
    } ) )
    .on( 'error', console.error.bind( console ) )
    .pipe( sourcemaps.write( { includeContent: false } ) )
    .pipe( sourcemaps.init( { loadMaps: true } ) )
    .pipe( autoprefixer( AUTOPREFIXER_BROWSERS ) )

    .pipe( sourcemaps.write ( styleMapPath ) )
    .pipe( rename( {
      basename: project + basename_suffix
    }))
    .pipe( lineec() ) // Consistent Line Endings for non UNIX systems.
    .pipe( gulp.dest( styleDestination ) )

    .pipe( filter( '**/*.css' ) ) // Filtering stream to only css files
    .pipe( mmq( { log: true } ) ) // Merge Media Queries only for .min.css version.

    .pipe( rename( {
      basename: project + basename_suffix,
      suffix: '.min'
    }))
    .pipe( minifycss() )
    .pipe( lineec() ) // Consistent line endings for non-UNIX systems.
    .pipe( gulp.dest( styleDestination ) )

    .pipe( filter( '**/*.css' ) ) // Filtering stream to only css files
    .pipe( notify( { message: 'TASK: "' + task.name + 'CSS" completed.', onLast: true } ) );
    done();
  });

});

/**
 * Style tasks
 *
 * Concatenate, uglify and rename JavaScripts.
 */

jsTasks.forEach( function( task ) {

  // Set base filename suffix (example '-admin'), if specified
  var basename_suffix = ( typeof task.suffix === 'string' ? '-' + task.suffix : '' );
  if( !( typeof task.suffix === 'boolean' && task.suffix === false ) ) basename_suffix = '-' + task.name;

  // Set base filename suffix (example '-admin'), if specified
  var jsSources = [ ( task.source ? task.source : jsSourcePath + task.name ) + '/*.js' ];

  // Set JavaScript source paths
  if( task.include ) {
    task.include.forEach( function( item ) {
      jsSources.push( item );
    });
  }

  tasks_js.push( { id: task.name + 'JS', name: task.name, watch: jsSources } );

  gulp.task( task.name + 'JS', (done) => {

    gulp.src( jsSources )
    .pipe( plumber( errorHandler ) )
    .pipe( concat( task.source + '.js' ) )
    .pipe( rename( {
      basename: project + basename_suffix,
    }))
    .pipe( lineec() ) // Consistent Line Endings for non UNIX systems.
    .pipe( gulp.dest( jsDestination ) )
    .pipe( rename( {
      basename: project + basename_suffix,
      suffix: '.min'
    }))
    .pipe( uglify() )
    .pipe( lineec() ) // Consistent Line Endings for non UNIX systems.
    .pipe( gulp.dest( jsDestination ) )
    .pipe( notify( { message: 'TASK: "' + task.name + 'JS" completed.', onLast: true } ) );
    done();
  });

});

/**
 * Watches for file changes and runs specified tasks.
 */
gulp.task(
	'default',
  gulp.series(
    gulp.parallel(
      object_property_to_array( tasks_js, 'id', tasks_css )
    ),
    () => {
      gulp.watch( styleSourcePath + '**/*.scss', gulp.parallel( tasks_css ) );
      tasks_js.forEach( function( task ) {
        gulp.watch( task.watch, gulp.series( task.id ) );
      });
    }
  )
);

/**
 * Task to rename files and variables
 */
gulp.task( 'rename', () => {

  return gulp.src( [ './**/*.php', './*.json', './**/*.js', './**/*.scss', './*.txt', './*.md', '!./node_modules/**', '!./vendor/**', '!./.git/**', '!./languages/**', '!./*lock*', '!./gulpfile.js' ] )
    .pipe( plumber( errorHandler ) )
    .pipe( replace( renameStrings ) )
    .pipe( vinylPaths ( deleteSync ) )
    .pipe( batchRename( function (path) {
      return path.replace( /wordpress-base-plugin/, pkg.name );
    } ) )
    .pipe( gulp.dest( './' ) )
    .pipe( notify( { message: 'TASK: "rename" completed.', onLast: true } ) );

});

/**
 * Helper functions
 */
function object_property_to_array( obj, id, arr ) {
  var result = [];
  obj.forEach( function( item ) {
    for( let key in item ) {
      if(item.hasOwnProperty(key)) {
        if( key == id ) result.push( item[id] );
      }
    }
  });
  if( arr ) result = arr.concat( result );
  return result;
}
