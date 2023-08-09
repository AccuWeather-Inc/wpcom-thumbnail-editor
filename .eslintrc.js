module.exports = {
	env: {
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
};
