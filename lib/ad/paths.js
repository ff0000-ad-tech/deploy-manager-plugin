const _ = require('lodash');
const path = require('path');
const prependHttp = require('prepend-http');
const objectPath = require('object-path');


const debug = require('debug');
var log = debug('DM:ad:paths');
// more verbosity
var _log = debug('DM:ad:paths:+');
debug.disable('DM:ad:paths:+');


// build an env based on selected ad-environment
function refresh(ad) {
	// paths to standard locations
	return _.extend({
		ad: {
			context: '300x250',
			js: 'js',
			images: 'images',
			videos: 'videos'
		},
		core: {
			context: '_adlib/core',
			js: 'js'
		},
		common: {
			context: '_adlib/common',
			js: 'js',
			fonts: 'fonts'
		},
		// `index.html?debug=true` will cause the ad to load from this location
		debug: {
			domain: 'red.ff0000-cdn.net',
			path: '/_debug/[profile.client]/[profile.project]/[profile.name]'
		}					
	}, ad.paths);
}



module.exports = {
	refresh
};