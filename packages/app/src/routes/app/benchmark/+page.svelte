<script lang="ts">
	import { onMount } from 'svelte';
	import { Graph } from '@bachelor/core/Graph';
	import { drawGraph } from '$lib/canvas';
	import { dijkstra } from '@bachelor/core/shortest-path/dijkstra/cpu';
	import { getCanvasState } from '$lib/state/canvas';
	import { getWebGPUState } from '$lib/state/webGPU';
	import { dijkstraGPU } from '@bachelor/core/shortest-path/dijkstra/gpu';

	const { context } = getCanvasState();
	const { device } = getWebGPUState();

	onMount(async () => {
		const graphJSON = await import('$lib/data/graphs/simple.json');
		const graph = Graph.fromJSON(graphJSON);

		drawGraph(context, graph);

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
