<script lang="ts">
	import { drawGraphAndBundledEdges } from '$lib/_canvas';
	import { getCanvasState } from '$lib/state/canvas';
	import { getWebGPUState } from '$lib/state/webGPU';
	import ControlPanel from '$lib/components/ControlPanel.svelte';
	import { loadGraph, loadSpanner } from '$lib/_loadGraph';
	import RangeInput from '$lib/components/RangeInput.svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { edgePathBundlingGPUFloydWarshall } from '@bachelor/core/edge-path-bundling/floyd-warshall/_gpu';

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
		console.log({ maxDistortion, edgeWeightFactor });

		runGPU();
	});

	async function runGPU() {
		const graph = await loadGraph(selectedGraph);
		const spanner = await loadSpanner(selectedGraph);

		console.time('EPB');
		const { bundeledEdges } = await edgePathBundlingGPUFloydWarshall(graph, {
			device,
			spanner,
			maxDistortion,
			edgeWeightFactor,
		});
		console.timeEnd('EPB');

		drawGraphAndBundledEdges({ ctx: context, graph: spanner, bundeledEdges });
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
	<a href="/app?graph=migration">old</a>
	<a href="/app/new?graph=migration">new</a>
</ControlPanel>
