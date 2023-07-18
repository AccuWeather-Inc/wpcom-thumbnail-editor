const defaults = require( '@wordpress/scripts/config/webpack.config' );

const webpackConfig = {
	...defaults,
	externals: {
		react: 'React',
		jquery: '$',
		'react-dom': 'ReactDOM',
	},
};

module.exports = webpackConfig;
