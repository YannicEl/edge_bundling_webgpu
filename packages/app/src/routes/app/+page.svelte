<script lang="ts">
	import { Graph } from '@bachelor/core/Graph';
	import { edgePathBundling } from '@bachelor/core/edgePathBundling';
	import { edgePathBundlingGPU } from '@bachelor/core/edgePathBundlingGPU';
	import { drawBezierCurve } from '@bachelor/core/canvas';
	import { drawGraph } from '$lib/canvas';
	import type { Edge } from '@bachelor/core/Edge';

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

		const spannerJSON = await import(`$lib/data/graphs/spanners/${name}.json`);
		const spanner = Graph.fromJSON(spannerJSON);

		console.log(`${name} graph loaded, ${graph.nodes.size} nodes, ${graph.edges.size} edges`);
		console.log(`${name} spanner loaded, ${spanner.nodes.size} nodes, ${spanner.edges.size} edges`);

		return { graph, spanner };
	}

	function drawGraphAndBundledEdges(
		graph: Graph,
		bundeledEdges: { edge: Edge; controlPoints: { x: number; y: number }[] }[]
	) {
		const ctx = getCanvasContext();
		if (!ctx) return;

		ctx.clearRect(0, 0, ctx.canvas?.width, ctx.canvas?.height);

		console.time('Draw');
		drawGraph(ctx, graph, false);

		bundeledEdges.forEach(({ edge, controlPoints }, i) => {
			drawBezierCurve(ctx, edge.start.x, edge.start.y, edge.end.x, edge.end.y, controlPoints, {
				width: 1,
				color: 'color(srgb 1 0 0 / 0.2)',
			});
		});
		console.timeEnd('Draw');
	}

	async function runCPU() {
		const { graph, spanner } = await loadGraph(selectedGraph);

		console.time('EPB');
		const { bundeledEdges } = await edgePathBundling(graph, {
			spanner,
			maxDistortion: 2,
			edgeWeightFactor: 1,
		});
		console.timeEnd('EPB');

		drawGraphAndBundledEdges(spanner, bundeledEdges);
	}

	async function runGPU() {
		const { graph, spanner } = await loadGraph(selectedGraph);

		console.time('EPB GPU');
		const { bundeledEdges } = await edgePathBundlingGPU(graph, {
			spanner,
			maxDistortion: 2,
			edgeWeightFactor: 1,
		});
		console.timeEnd('EPB GPU');

		drawGraphAndBundledEdges(spanner, bundeledEdges);
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
		</select>

		<button onclick={runCPU}>Run CPU</button>
		<button onclick={runGPU}>Run GPU</button>
	</div>

	<canvas bind:this={canvas} class="flex flex-1"></canvas>
</div>
