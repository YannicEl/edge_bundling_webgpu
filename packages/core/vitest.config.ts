import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		retry: process.env.CI ? 10 : 0,
		testTimeout: 120_000,
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
						args: ['--enable-unsafe-webgpu'],
					},
				},
			],
		},
	},
});
