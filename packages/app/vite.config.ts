import { sveltekit } from '@sveltejs/kit/vite';
import postcssNesting from 'postcss-nesting';
import unocss from 'unocss/vite';
import icons from 'unplugin-icons/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit(), unocss(), icons({ compiler: 'svelte' })],
	css: {
		postcss: {
			plugins: [postcssNesting],
		},
	},
});
