<script lang="ts">
	import { setCanvasState } from '$lib/state/canvas';
	import { onDestroy, onMount } from 'svelte';
	import type { LayoutProps } from '../$types';
	import { ResponsiveCanvas } from '@bachelor/core/ResponsiveCanvas';

	const { children, data }: LayoutProps = $props();

	let canvas = $state<HTMLCanvasElement | null>();
	let canvasSet = $state(false);

	onMount(async () => {
		if (!canvas) {
			console.warn("Couldn't mount canvas");
			return;
		}

		const context = canvas.getContext('2d');
		if (!context) {
			console.warn("Couldn't init canvas context");
			return;
		}

		const { maxTextureDimension2D } = data.webGPU?.device.limits;
		const canvasWidth = Math.min(window.innerWidth * 1.5, maxTextureDimension2D);
		const canvasHeight = Math.min(window.innerHeight * 1.5, maxTextureDimension2D);

		// Set initial canvas size
		canvas.width = canvasWidth;
		canvas.height = canvasHeight;

		const responsiveCanvas = new ResponsiveCanvas(canvas, {
			maxWidth: maxTextureDimension2D,
			maxHeight: maxTextureDimension2D,
			scaleFactor: 1.5,
		});

		onDestroy(() => {
			responsiveCanvas.disconnect();
		});

		setCanvasState({
			canvas: responsiveCanvas,
			context,
		});

		canvasSet = true;
	});
</script>

<main class="h-dvh w-dvw overflow-hidden">
	<canvas
		bind:this={canvas}
		class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transform"
		width={window.innerWidth * 1.5}
		height={window.innerHeight * 1.5}
	></canvas>

	{#if canvasSet}
		{@render children()}
	{/if}
</main>
