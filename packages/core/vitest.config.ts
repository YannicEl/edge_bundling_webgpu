import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		browser: {
			enabled: true,
			ui: false,
			headless: false,
			screenshotFailures: false,
			provider: 'playwright',
			// https://vitest.dev/guide/browser/playwright
			instances: [
				{
					browser: 'chromium',
					launch: {
						args: ['--enable-unsafe-webgpu'], //'--window-position=-10000,-10000'],
					},
				},
			],
		},
	},
});
