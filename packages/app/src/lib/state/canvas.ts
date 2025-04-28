import { ResponsiveCanvas } from '@bachelor/core/ResponsiveCanvas';
import { getContext, setContext } from 'svelte';

export type CanvasState = {
	canvas: ResponsiveCanvas;
	context: CanvasRenderingContext2D;
};

const key = Symbol('canvas-context');
export function setCanvasState(state: CanvasState) {
	return setContext(key, state);
}

export function getCanvasState() {
	return getContext(key) as CanvasState;
}
