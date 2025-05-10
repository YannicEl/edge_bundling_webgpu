import { defineConfig, presetWind4, transformerDirectives } from 'unocss';

export default defineConfig({
	presets: [
		presetWind4({
			preflights: {
				reset: true,
			},
		}),
	],
	transformers: [
		transformerDirectives({
			applyVariable: ['--apply'],
		}),
	],
	theme: {
		font: {
			sans: 'Inter, sans-serif',
		},
	},
});
