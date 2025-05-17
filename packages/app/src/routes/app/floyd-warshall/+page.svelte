<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { drawGraph } from '$lib/canvas';
	import ControlPanel from '$lib/components/ControlPanel.svelte';
	import { getCanvasState } from '$lib/state/canvas';
	import { getWebGPUState } from '$lib/state/webGPU';
	import type { Edge } from '@bachelor/core/Edge';
	import { Graph } from '@bachelor/core/Graph';
	import { drawBezierCurve } from '@bachelor/core/canvas';
	import { edgePathBundlingGPUFloydWarshall } from '@bachelor/core/edge-path-bundling/floyd-warshall/gpu';
	import { FloydWarshall } from '@bachelor/core/shortest-path/floyd-warshall/FloydWarshall';

	const { canvas, context } = getCanvasState();
	const { device } = getWebGPUState();

	let selectedGraph = $state<string>(page.url.searchParams.get('graph') ?? 'simple');

	$effect(() => {
		goto(`?graph=${selectedGraph}`);
	});

	async function loadGraph(name: string) {
		const graphJSON = await import(`$lib/data/graphs/${name}.json`);
		const graph = Graph.fromJSON(graphJSON);

		const spannerJSON = await import(`$lib/data/graphs/spanners/${name}.json`);
		const spanner = Graph.fromJSON(spannerJSON);

		return { graph, spanner };
	}

	function drawGraphAndBundledEdges(
		graph: Graph,
		bundeledEdges?: { edge: Edge; controlPoints: { x: number; y: number }[] }[]
	) {
		context.clearRect(0, 0, canvas.element.width, canvas.element.height);

		console.time('Draw');
		drawGraph(context, graph, false);

		bundeledEdges?.forEach(({ edge, controlPoints }, i) => {
			drawBezierCurve(context, edge.start.x, edge.start.y, edge.end.x, edge.end.y, controlPoints, {
				width: 1,
				color: 'color(srgb 1 0 0 / 0.2)',
			});
		});
		console.timeEnd('Draw');
	}

	async function run() {
		const { graph, spanner } = await loadGraph(selectedGraph);

		console.time('Floy Warshall');
		const floydWarshall = new FloydWarshall({ graph, device });
		await floydWarshall.init();
		await floydWarshall.compute();
		console.timeEnd('Floy Warshall');

		const bundeledEdges = await edgePathBundlingGPUFloydWarshall(graph, {
			device,
			spanner,
		});

		drawGraphAndBundledEdges(graph, bundeledEdges);
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
