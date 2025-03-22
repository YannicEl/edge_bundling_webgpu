import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		browser: {
			enabled: true,
			ui: false,
			headless: true,
			provider: 'playwright',
			// https://vitest.dev/guide/browser/playwright
			instances: [
				{
					browser: 'chromium',
				},
			],
		},
	},
});
