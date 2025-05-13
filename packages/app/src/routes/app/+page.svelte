<script lang="ts">
	import { Graph } from '@bachelor/core/Graph';
	import { edgePathBundlingFloydGPU } from '@bachelor/core/edgePathBundlingFloydGPU';
	import { drawBezierCurve } from '@bachelor/core/canvas';
	import { drawGraph } from '$lib/canvas';
	import type { Edge } from '@bachelor/core/Edge';
	import { getCanvasState } from '$lib/state/canvas';
	import { getWebGPUState } from '$lib/state/webGPU';
	import ControlPanel from '$lib/components/ControlPanel.svelte';
	import { loadGraph } from '$lib/loadGraph';
	import { loadSpanner } from '$lib/loadGraph';
	import RangeInput from '$lib/components/RangeInput.svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';

	const { device } = getWebGPUState();
	const { canvas, context } = getCanvasState();

	let selectedGraph = $state<string>(page.url.searchParams.get('graph') ?? 'simple');
	$effect(() => {
		goto(`?graph=${selectedGraph}`);
	});

	let maxDistortion = $state<number>(2);
	let edgeWeightFactor = $state<number>(1);

	canvas.onResize = () => runGPU();

	$effect(() => {
		console.log(selectedGraph, maxDistortion, edgeWeightFactor);
		runGPU();
	});

	function drawGraphAndBundledEdges(
		graph: Graph,
		bundeledEdges: { edge: Edge; controlPoints: { x: number; y: number }[] }[]
	) {
		console.time('Draw');
		drawGraph({ ctx: context, graph, drawLabels: false, drawNodes: false, drawEdges: false });

		bundeledEdges.forEach(({ edge, controlPoints }, i) => {
			if (controlPoints.length === 0) return;
			drawBezierCurve(context, edge.start.x, edge.start.y, edge.end.x, edge.end.y, controlPoints, {
				width: 1,
				color: 'color(srgb 1 0 0 / 0.2)',
			});
		});
		console.timeEnd('Draw');
	}

	async function runGPU() {
		const graph = await loadGraph(selectedGraph);
		const spanner = await loadSpanner(selectedGraph);

		console.time('EPB');
		const { bundeledEdges } = await edgePathBundlingFloydGPU(graph, {
			device,
			spanner,
			maxDistortion,
			edgeWeightFactor,
		});
		console.timeEnd('EPB');

		drawGraphAndBundledEdges(spanner, bundeledEdges);
	}
</script>

<ControlPanel>
	<label class="flex items-center justify-between gap-2">
		Graph
		<select name="graph" bind:value={selectedGraph}>
			<option value="simple">Simple</option>
			<option value="example">Example</option>
			<option value="airlines">Airlines</option>
			<option value="migration">Migration</option>
			<option value="airtraffic">Airtraffic</option>
		</select>
	</label>

	<label>
		Max distortion
		<RangeInput min={0} max={10} step={0.1} bind:value={maxDistortion} />
	</label>

	<label>
		Edge weight factor
		<RangeInput min={0.01} max={2} step={0.01} bind:value={edgeWeightFactor} />
	</label>

	<button onclick={runGPU}>Run GPU</button>

	<a href="/">back</a>
</ControlPanel>
