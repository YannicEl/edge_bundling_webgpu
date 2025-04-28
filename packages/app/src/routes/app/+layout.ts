import {
	initWebGPU,
	WebGPUAdapterRequestError,
	WebGPUNotSupportedError,
} from '@bachelor/core/webGpu';
import { redirect } from '@sveltejs/kit';

export const load = async () => {
	try {
		const webGPU = await initWebGPU({
			deviceOptions: (adapter) => ({
				requiredLimits: {
					maxBufferSize: adapter.limits.maxBufferSize,
					maxStorageBufferBindingSize: adapter.limits.maxStorageBufferBindingSize,
				},
			}),
		});

		return {
			webGPU,
		};
	} catch (error) {
		if (error instanceof WebGPUNotSupportedError) {
			redirect(302, '/web-gpu-not-supported');
		} else if (error instanceof WebGPUAdapterRequestError) {
			alert(`${error.message}, please reload/reopen your browser and try again`);
		} else {
			alert(error);
		}

		redirect(302, '/');
	}
};
