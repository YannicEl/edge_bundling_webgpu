import { sveltekit } from '@sveltejs/kit/vite';
import postcssNesting from 'postcss-nesting';
import unocss from 'unocss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit(), unocss()],
	css: {
		postcss: {
			plugins: [postcssNesting],
		},
	},
});
