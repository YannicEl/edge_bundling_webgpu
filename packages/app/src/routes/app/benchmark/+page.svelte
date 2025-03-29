<script lang="ts">
	import { onMount } from 'svelte';
	import { initWebGPU } from '@bachelor/core/webGpu';
	import { Graph } from '@bachelor/core/Graph';
	import Canvas from '$lib/components/Canvas.svelte';
	import { dijkstraGPU } from '@bachelor/core/dijkstraGPU';
	import { drawGraph } from '$lib/canvas';

	let canvas: Canvas;

	onMount(async () => {
		const ctx = canvas.getContext();
		if (!ctx) return;

		const { device } = await initWebGPU();

		const graphJSON = await import('$lib/data/graphs/simple.json');
		const graph = Graph.fromJSON(graphJSON);

		drawGraph(ctx, graph);

		const nodes = [...graph.nodes];

		console.time('dijkstraGPU');
		const path = await dijkstraGPU({ device, graph, start: nodes[0]!, end: nodes[2]! });
		console.timeEnd('dijkstraGPU');
	});
</script>

<Canvas bind:this={canvas} class="h-full w-full" />
