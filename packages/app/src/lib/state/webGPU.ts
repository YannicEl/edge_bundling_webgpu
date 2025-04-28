import type { WebGPU } from '@bachelor/core/webGpu';
import { getContext, setContext } from 'svelte';

export type WebGPUState = WebGPU;

const key = Symbol('web-gpu-context');
export function setWebGPUState(state: WebGPUState) {
	return setContext(key, state);
}

export function getWebGPUState() {
	return getContext(key) as WebGPUState;
}
