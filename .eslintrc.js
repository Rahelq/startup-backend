module.exports = {
	env: {
		node: true,
		es2021: true,
		jest: true,
	},
	extends: ["eslint:recommended"],
	parserOptions: {
		ecmaVersion: 12,
		sourceType: "module",
	},
	rules: {
		"no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
		"no-console": "off",
		indent: ["error", 2],
		"linebreak-style": ["error", "unix"],
		quotes: ["error", "double", { avoidEscape: true }],
		semi: ["error", "always"],
	},
};
