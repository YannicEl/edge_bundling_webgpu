<script lang="ts">
	import { drawGraph } from '$lib/canvas';
	import type { Edge } from '@bachelor/core/Edge';
	import { Graph } from '@bachelor/core/Graph';
	import { drawBezierCurve } from '@bachelor/core/canvas';
	import { FloydWarshall, floydWarshall } from '@bachelor/core/floydWarshall';
	import { onMount } from 'svelte';

	let canvas = $state<HTMLCanvasElement | null>();

	let selectedGraph = $state<string>('simple');

	function getCanvasContext() {
		if (!canvas) return;

		const { width, height } = canvas.getBoundingClientRect();
		canvas.width = width;
		canvas.height = height;

		const ctx = canvas.getContext('2d');
		return ctx;
	}

	async function loadGraph(name: string) {
		const graphJSON = await import(`$lib/data/graphs/${name}.json`);
		const graph = Graph.fromJSON(graphJSON);

		console.log(`${name} graph loaded, ${graph.nodes.size} nodes, ${graph.edges.size} edges`);

		return { graph };
	}

	function drawGraphAndBundledEdges(
		graph: Graph,
		bundeledEdges?: { edge: Edge; controlPoints: { x: number; y: number }[] }[]
	) {
		const ctx = getCanvasContext();
		if (!ctx) return;

		ctx.clearRect(0, 0, ctx.canvas?.width, ctx.canvas?.height);

		console.time('Draw');
		drawGraph(ctx, graph, true);

		bundeledEdges?.forEach(({ edge, controlPoints }, i) => {
			drawBezierCurve(ctx, edge.start.x, edge.start.y, edge.end.x, edge.end.y, controlPoints, {
				width: 1,
				color: 'color(srgb 1 0 0 / 0.2)',
			});
		});
		console.timeEnd('Draw');
	}

	async function run() {
		const { graph } = await loadGraph(selectedGraph);

		console.time('Floy Warshall');

		const floydWarshall = new FloydWarshall({ graph });
		await floydWarshall(graph);
		console.timeEnd('Floy Warshall');

		drawGraphAndBundledEdges(graph);
	}
</script>

<div class="flex flex-1 flex-col">
	<div class="flex gap-4">
		<select name="graph" bind:value={selectedGraph}>
			<option value="simple">Simple</option>
			<option value="example">Example</option>
			<option value="airlines">Airlines</option>
			<option value="migration">Migration</option>
			<option value="airtraffic">Airtraffic</option>
			<option value="amazon200k">Amazon 200k</option>
			<option value="panama">Panam</option>
		</select>

		<button onclick={run}>Run</button>
	</div>

	<canvas bind:this={canvas} class="flex flex-1"></canvas>
</div>
