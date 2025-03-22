<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import type { SvelteHTMLElements } from 'svelte/elements';

	type Props = {
		onResize?: () => void;
	} & SvelteHTMLElements['canvas'];
	let { onResize, ...rest }: Props = $props();

	let canvas = $state<HTMLCanvasElement | null>();

	const resizeObserver = new ResizeObserver((entries) => {
		for (const entry of entries) {
			if (entry.target instanceof HTMLCanvasElement && canvas) {
				canvas.width = entry.contentBoxSize[0].inlineSize;
				canvas.height = entry.contentBoxSize[0].blockSize;

				onResize?.();
			}
		}
	});

	export function lol(): string {
		return 'lol';
	}

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
