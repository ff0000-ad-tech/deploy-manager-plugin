const hooksRegex = require('hooks-regex');
const requireFromString = require('require-from-string');

const debug = require('debug');
var log = debug('red-hooks');


// define expected model with the hook-ids
var hooks = {
	adParams: 'ad_params',
	assets: 'assets',
	environments: 'environments',
	includes: 'includes',
	externalIncludes: 'external_includes',
	runtimeIncludes: 'runtime_includes'
};

function readSettings(source, deploy) {
	var settings = {};
	for (var key in hooks) {
		var matches = source.match(
			hooksRegex.get('Red', 'Settings', hooks[key])
		);
		if (matches) {
			// :( runtime-includes require special parsing
			if (key == 'runtimeIncludes') {
				settings[key] = matches.groups.content;
			}

			// all other hooks can be parsed with a little node-require trickery
			else {
				settings[key] = requireFromString(
					`${matches.groups.content} module.exports = ${key};`
				);
			}
		}
	}
	return settings;
}



module.exports = {
	readSettings
};