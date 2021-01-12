const _ = require('lodash')
const path = require('path')

const debug = require('@ff0000-ad-tech/debug')
var log = debug('DM:webpack.config.js')

const PM = require('@ff0000-ad-tech/wp-process-manager')
const DM = require('@ff0000-ad-tech/wp-deploy-manager')
const IndexVariationResolvePlugin = require('@ff0000-ad-tech/wp-resolve-plugin-index-variation')

const execute = (config, scope) => {
	if (config) {
		config = JSON.parse(config)
	} else {
		config = {}
	}

	/** -- PROCESS MANAGEMENT -----------------------------------------------------------------------------------------------
	 *
	 * 	keep this script in sync with Creative Server
	 *
	 */
	PM.prepare(config.watch)
	PM.startWatching()

	/** -- DEPLOY SETTINGS -----------------------------------------------------------------------------------------------
	 *
	 *	these are unique to each deploy/size/index
	 *
	 *
	 */
	// deploy settings
	DM.deploy.prepare(
		_.merge(
			{
				// deploy profile
				profile: {
					name: 'default',
					// the ad's environment can be specified by the deploy.
					// by default, it will be determined by the settings loaded from [settings.source.path]
					adEnvironment: {
						id: 'debug',
						runPath: '',
						adPath: ''
					}
				},

				// source
				source: {
					context: './1-build',
					size: '300x250',
					index: 'index.html'
					// name: 'index' // if not specified, this will be derived from [source.index]
				},

				// output
				output: {
					debug: true,
					context: './2-debug'
					// folder: '' // if not specified, this will be derived from [source.size]__[source.name]
				}
			},
			config.deploy
		)
	)
	log('\nDeploy:')
	log(DM.deploy.get())

	/** -- AD SETTINGS -----------------------------------------------------------------------------------------------
	 *
	 *	these settings are unique to framework
	 *
	 *
	 */
	// ad settings
	DM.ad.prepare(
		_.merge(
			{
				settings: {
					// ** REQUIRED: where to load settings from
					source: {
						path: `${DM.deploy.get().source.context}/${DM.deploy.get().source.size}/${DM.deploy.get().source.index}`,
						type: 'hooks' // default, json
					},
					// discovered ad.settings are added/maintained here
					ref: {}
				},

				// ** AD STRUCTURE: common locations
				paths: {
					// the subpaths for these standard locations can be set
					ad: {
						context: `${DM.deploy.get().source.size}`,
						js: 'js',
						images: 'images',
						videos: 'videos'
					},
					common: {
						context: 'common',
						js: 'js',
						fonts: 'fonts'
					},
					// `index.html?debug=true` will cause the ad to load from this location
					debug: {
						domain: 'red.ff0000-cdn.net',
						path:
							`/_debug/${DM.deploy.get().profile.client}/${DM.deploy.get().profile.project}/` +
							`${DM.deploy.get().source.size}/${DM.deploy.get().source.index}`
					}
				},
				// ad.env is added here
				env: {}
			},
			config.ad
		)
	)
	// give deploy ability to override ad environment
	DM.ad.setAdEnvironment(DM.deploy.get().profile.adEnvironment, DM.deploy.get().output.debug)

	/*** LOAD EXTERNAL SETTINGS **/
	DM.ad.refresh()
	log('\nAd:')
	log(DM.ad.get())

	/** -- PAYLOAD SETTINGS -----------------------------------------------------------------------------------------------
	 *
	 *	these settings are unique to packaging-style
	 *
	 *
	 */
	// indicates whether to inline assets as base64 or bundle as single binary payload
	const base64Inline = !!config.deploy.profile.base64Inline

	// payload plugin watches index for settings & preloader changes
	DM.payload.prepare(
		_.merge(
			{
				// payload settings
				watchPaths: [path.resolve(`${scope}/${DM.ad.get().settings.source.path}`)],
				entries: [
					{
						name: 'inline',
						type: 'inline',
						assets: {
							get: () => {
								return DM.ad.get().settings.ref.assets.preloader.images.map(obj => {
									return obj.source
								})
							},
							importPath: `./${DM.ad.get().paths.ad.images}`,
							requestPath: `${DM.ad.get().paths.ad.images}`
						}
					}
				]
			},
			config.payload
		)
	)
	log('\nPayload:')
	log(DM.payload.get())

	/** -- WEBPACK RUNTIME -----------------------------------------------------------------------------------------------
	 *
	 *
	 *
	 */
	return {
		mode: DM.deploy.get().output.debug ? 'development' : 'production',
		entry: {
			// are injected into index.html, via wp-plugin-index
			initial: path.resolve(scope, `${DM.deploy.get().source.context}/node_modules/@ff0000-ad-tech/ad-entry/index.js`),
			inline: path.resolve(scope, `${DM.deploy.get().source.context}/${DM.deploy.get().source.size}/.inline-imports.js`),
			// is bundled & polite-loaded into index.html
			build: path.resolve(scope, `${DM.deploy.get().source.context}/${DM.deploy.get().source.size}/build.js`)
		},
		output: {
			path: path.resolve(scope, `${DM.deploy.get().output.context}/${DM.deploy.get().output.folder}`),
			filename: '[name].bundle.js'
		},
		resolve: {
			// mainFields: ['module', 'main', 'browser'],
			extensions: ['.js', '.jsx'],
			alias: Object.assign({
				AdData: path.resolve(scope, `${DM.deploy.get().source.context}/common/js/AdData`),
				FtData: path.resolve(scope, `${DM.deploy.get().source.context}/common/js/FtData`),
				GdcData: path.resolve(scope, `${DM.deploy.get().source.context}/common/js/GdcData`),
				'@common': path.resolve(scope, `${DM.deploy.get().source.context}/common`),
				'@size': path.resolve(scope, `${DM.deploy.get().source.context}/${DM.deploy.get().source.size}`)
			}),
			plugins: [new IndexVariationResolvePlugin(DM.deploy.get().source.index.replace('.html', ''))]
		},
		module: {
			rules: DM.babel.getBabel({ base64Inline })
		},
		plugins: DM.plugins.getPlugins({ scope, DM, PM, base64Inline }),
		externals: {
			'ad-global': 'window'
		},
		optimization: DM.optimization.getOptimization(),
		watch: DM.deploy.get().output.debug,
		devtool: DM.deploy.get().output.debug ? 'source-map' : false
	}
}

module.exports = {
	execute
}
