/** @type {import("prettier").Options} */
const config = {
	useTabs: true,
	tabWidth: 2,
	singleQuote: true,
	printWidth: 100,
	trailingComma: 'es5',
	plugins: [
		'prettier-plugin-svelte',
		'prettier-plugin-organize-imports',
		'prettier-plugin-tailwindcss',
	],
	overrides: [{ files: '*.svelte', options: { parser: 'svelte' } }],
};

export default config;
