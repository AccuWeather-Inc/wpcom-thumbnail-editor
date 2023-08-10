const eslintConfig = {
	root: true,
	env: {
		browser: true,
		node: true,
		jquery: true,
	},
	extends: [ 'plugin:@wordpress/eslint-plugin/recommended' ],
	rules: {
		'import/no-extraneous-dependencies': [
			0,
			{
				peerDependencies: false,
			},
		],
	},
	settings: {
		react: {
			version: 'detect',
		},
		'import/resolver': {
			node: {
				extensions: [ '.js', '.jsx', '.ts', '.tsx', '.json' ],
			},
		},
	},
	overrides: [
		{
			// Unit test files and their helpers only.
			files: [ '**/@(test|__tests__)/**/*.js', '**/?(*.)test.js' ],
			extends: [ 'plugin:@wordpress/eslint-plugin/test-unit' ],
		},
	],
};

module.exports = eslintConfig;
