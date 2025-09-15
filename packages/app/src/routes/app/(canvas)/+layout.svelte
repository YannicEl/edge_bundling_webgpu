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
		const responsiveCanvas = new ResponsiveCanvas(canvas, {
			maxWidth: maxTextureDimension2D,
			maxHeight: maxTextureDimension2D,
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

<main class="h-dvh w-dvw">
	<canvas
		bind:this={canvas}
		class="h-full w-full"
		width={window.innerWidth}
		height={window.innerHeight}
	></canvas>

	{#if canvasSet}
		{@render children()}
	{/if}
</main>
