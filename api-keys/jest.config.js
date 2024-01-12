const { defaults } = require('jest-config');

module.exports = {
	testEnvironment: 'miniflare', // ✨
	// Tell Jest to look for tests in .mjs files too
	testMatch: ['**/?(*.)+(spec|test).?(m)[tj]s?(x)'],
	moduleFileExtensions: ['mjs', 'ts', ...defaults.moduleFileExtensions],
	// Use test config for typescript
	transform: {
		'^.+\\.tsx?$': [
			'ts-jest',
			{
				tsconfig: 'tsconfig.test.json',
				useESM: true,
			},
		],
	},
};
