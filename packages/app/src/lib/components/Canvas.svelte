<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import type { SvelteHTMLElements } from 'svelte/elements';

	type Props = {
		onResize?: () => void;
	} & SvelteHTMLElements['canvas'];
	let { onResize, ...rest }: Props = $props();

	let canvas = $state<HTMLCanvasElement>();

	export function getContext(): CanvasRenderingContext2D | undefined | null {
		return canvas?.getContext('2d');
	}

	const resizeObserver = new ResizeObserver((entries) => {
		for (const entry of entries) {
			if (entry.target instanceof HTMLCanvasElement && canvas) {
				canvas.width = entry.contentBoxSize[0].inlineSize;
				canvas.height = entry.contentBoxSize[0].blockSize;

				onResize?.();
			}
		}
	});

	onMount(() => {
		if (canvas) {
			resizeObserver.observe(canvas);
		}
	});

	onDestroy(() => {
		resizeObserver.disconnect();
	});
</script>

<canvas bind:this={canvas} {...rest}></canvas>
