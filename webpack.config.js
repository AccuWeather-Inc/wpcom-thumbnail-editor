const path = require( 'path' );
const defaults = require( '@wordpress/scripts/config/webpack.config' );
const webpack = require( 'webpack' );

if ( defaults.mode === 'development' ) {
	defaults.optimization.runtimeChunk = 'single';
}

const webpackConfig = {
	...defaults,
	plugins: [
		...defaults.plugins,
		new webpack.ProvidePlugin( {
			$: 'jquery',
		} ),
	],
	resolve: {
		...defaults.resolve,
		modules: [ path.resolve( __dirname, 'node_modules' ) ],
	},
	devtool:
		defaults.mode === 'development'
			? 'eval-cheap-module-source-map'
			: defaults.devTool,
	devServer:
		defaults.mode === 'development'
			? {
					...defaults.devServer,
					headers: {
						'X-ProxiedBy-Webpack': true,
						'Access-Control-Allow-Origin': '*',
					},
					host: '0.0.0.0',
					hot: true,
					static: {
						directory: path.resolve( __dirname ),
					},
					allowedHosts: [
						'awx-thumbnail-editor.vipdev.lndo.site',
						'localhost',
						'127.0.0.1',
					],
			  }
			: {},
};

module.exports = webpackConfig;
