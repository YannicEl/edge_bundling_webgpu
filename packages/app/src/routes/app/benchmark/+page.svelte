<script lang="ts">
	import { onMount } from 'svelte';
	import { initWebGPU } from '@bachelor/core/webGpu';
	import { Graph } from '@bachelor/core/Graph';
	import Canvas from '$lib/components/Canvas.svelte';
	import { dijkstraGPU } from '@bachelor/core/dijkstraGPU';
	import { drawGraph } from '$lib/canvas';
	import { dijkstra } from '@bachelor/core/dijkstra';

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
		const path = await dijkstraGPU({
			device,
			graph,
			paths: [
				{ start: nodes[0]!, end: nodes[2]! },
				{ start: nodes[4]!, end: nodes[3]! },
				{ start: nodes[0]!, end: nodes[5]! },
				{ start: nodes[5]!, end: nodes[1]! },
				{ start: nodes[1]!, end: nodes[5]! },
				{ start: nodes[3]!, end: nodes[0]! },
				{ start: nodes[3]!, end: nodes[2]! },
			],
		});
		console.table(
			path.map((path) => ({
				distance: path?.length,
				path: path?.nodes.map((node) => nodes.indexOf(node)).join(', '),
			}))
		);
		console.timeEnd('dijkstraGPU');

		console.time('dijkstra');
		const path_2 = dijkstra(graph, nodes[0]!, nodes[2]!);
		console.timeEnd('dijkstra');
	});
</script>

<Canvas bind:this={canvas} class="h-full w-full" />
