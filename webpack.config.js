const defaults = require('@wordpress/scripts/config/webpack.config');
const path = require( 'path' );

const isProduction = process.env.NODE_ENV === 'production';

const webpackConfig = {
	...defaults,
	externals: {
		react: 'React',
		'react-dom': 'ReactDOM',
	},
};

module.exports = webpackConfig;
