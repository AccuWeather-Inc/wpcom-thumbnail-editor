const defaults = require('@wordpress/scripts/config/webpack.config');
const DependencyExtractionWebpackPlugin = require( '@wordpress/dependency-extraction-webpack-plugin' );
const {
	defaultRequestToExternal: defaultRequestToExternalWP,
	defaultRequestToHandle: defaultRequestToHandleWP,
} = require( '@wordpress/dependency-extraction-webpack-plugin/lib/util' );
const path = require( 'path' );

const isProduction = process.env.NODE_ENV === 'production';

const explicitlyExtractPrefix = 'extracted/';

const requestToExternal = ( request ) => {
	// Externalized when explicitely asked for.
	if ( request.startsWith( explicitlyExtractPrefix ) ) {
		request = request.substr( explicitlyExtractPrefix.length );
		return defaultRequestToExternalWP( request );
	}
	const bundledPackages = [
		// Opt-out WordPress packages.
		'@wordpress/i18n',
		'@wordpress/element',
		'@wordpress/components',
	];
	if ( bundledPackages.includes( request ) ) {
		return false;
	}

	// Follow with the default behavior for any other.
	return undefined;
};

const requestToHandle = ( request ) => {
	// Externalized when explicitely asked for.
	if ( request.startsWith( explicitlyExtractPrefix ) ) {
		request = request.substr( explicitlyExtractPrefix.length );
		return defaultRequestToHandleWP( request );
	}
	// Follow with the default behavior for any other.
	return undefined;
};

const webpackConfig = {
	...defaults,
	resolve: {
		...defaults.resolve,
		alias: {
			'.~': path.resolve( process.cwd(), 'src/' ),
			extracted: path.resolve( __dirname, 'node_modules' ),
		},
		fallback: {
			'lodash-es': 'lodash',
		},
	},
	plugins: [
		...defaults.plugins.filter( ( plugin ) => {
			const filteredPlugins = [
				// Filter WP/DEWP, as we will replace it with Custom one.
				'DependencyExtractionWebpackPlugin',
			];
			return ! filteredPlugins.includes( plugin.constructor.name );
		} ),
		new DependencyExtractionWebpackPlugin( {
			externalizedReport: '../.externalized.json',
			requestToExternal,
			requestToHandle,
		} ),
	],
	externals: {
		react: 'React',
		'react-dom': 'ReactDOM',
	},
};

// const sassTest = /\.(sc|sa)ss$/;
// const updatedSassOptions = {
// 	sourceMap: ! isProduction,
// 	sassOptions: {
// 		includePaths: [ 'js/src/css/abstracts' ],
// 	},
// 	additionalData:
// 		'@use "sass:color";' +
// 		'@import "_colors"; ' +
// 		'@import "_variables"; ' +
// 		'@import "_mixins"; ' +
// 		'@import "_breakpoints"; ',
// };

// // Update sass-loader config to prepend imports automatically
// // like wc-admin, without rebuilding entire Rule config
// webpackConfig.module.rules.forEach( ( { test, use }, ruleIndex ) => {
// 	if ( test.toString() === sassTest.toString() ) {
// 		use.forEach( ( { loader }, loaderIndex ) => {
// 			if ( loader === require.resolve( 'sass-loader' ) ) {
// 				webpackConfig.module.rules[ ruleIndex ].use[
// 					loaderIndex
// 				].options = updatedSassOptions;
// 			}
// 		} );
// 	}
// } );

module.exports = webpackConfig;
