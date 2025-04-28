<script lang="ts">
	import { drawGraph } from '$lib/canvas';
	import ControlPanel from '$lib/components/ControlPanel.svelte';
	import { getCanvasState } from '$lib/state/canvas';
	import { getWebGPUState } from '$lib/state/webGPU';
	import type { Edge } from '@bachelor/core/Edge';
	import { Graph } from '@bachelor/core/Graph';
	import { drawBezierCurve } from '@bachelor/core/canvas';
	import { FloydWarshall } from '@bachelor/core/floydWarshall';

	const { canvas, context } = getCanvasState();
	const { device } = getWebGPUState();

	let selectedGraph = $state<string>('simple');

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
		context.clearRect(0, 0, canvas.element.width, canvas.element.height);

		console.time('Draw');
		drawGraph(context, graph, true);

		bundeledEdges?.forEach(({ edge, controlPoints }, i) => {
			drawBezierCurve(context, edge.start.x, edge.start.y, edge.end.x, edge.end.y, controlPoints, {
				width: 1,
				color: 'color(srgb 1 0 0 / 0.2)',
			});
		});
		console.timeEnd('Draw');
	}

	async function run() {
		const { graph } = await loadGraph(selectedGraph);

		console.time('Floy Warshall');
		const floydWarshall = new FloydWarshall({ graph, device });
		await floydWarshall.init();
		await floydWarshall.compute();
		console.timeEnd('Floy Warshall');

		const nodes = [...graph.nodes];
		const paths = floydWarshall.shortestPaths([{ start: nodes[0], end: nodes[5] }]);
		console.log(paths);

		drawGraphAndBundledEdges(graph);
	}
</script>

<ControlPanel>
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
</ControlPanel>
