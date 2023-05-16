const defaults = require('@wordpress/scripts/config/webpack.config');
const path = require( 'path' );

const isProduction = process.env.NODE_ENV === 'production';

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
	externals: {
		react: 'React',
		'react-dom': 'ReactDOM',
	},
};

module.exports = webpackConfig;
