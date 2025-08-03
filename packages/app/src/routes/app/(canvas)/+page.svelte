<script lang="ts">
	import { clearCanvas, drawBundledEdges } from '$lib/_canvas';
	import { getCanvasState } from '$lib/state/canvas';
	import { getWebGPUState } from '$lib/state/webGPU';
	import ControlPanel from '$lib/components/ControlPanel.svelte';
	import { loadGraph, loadSpanner } from '$lib/_loadGraph';
	import RangeInput from '$lib/components/RangeInput.svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { EdgePathBundlingGPUFloydWarshall } from '@bachelor/core/edge-path-bundling/floyd-warshall/gpu';
	import { onMount } from 'svelte';
	import { ThetaSpanner } from '@bachelor/core/spanner/theta/gpu';
	import { GreedySpanner } from '@bachelor/core/spanner/greedy/gpu';

	const { device } = getWebGPUState();
	const { canvas, context } = getCanvasState();

	let selectedGraph = $state<string>(page.url.searchParams.get('graph') ?? 'simple');
	$effect(() => {
		goto(`?graph=${selectedGraph}`);
	});

	let maxDistortion = $state<number>(2);
	let edgeWeightFactor = $state<number>(2);
	let epb: EdgePathBundlingGPUFloydWarshall;

	canvas.onResize = () => runGPU();

	// $effect(() => {
	// 	console.log({ maxDistortion, edgeWeightFactor });
	// 	runGPU();
	// });

	// $effect(() => {
	// 	console.log({ edgeWeightFactor });
	// 	if (!epb) return;
	// 	epb.setEdgeWeightFactor(edgeWeightFactor).then(() => runGPU());
	// });

	onMount(async () => {
		const graph = await loadGraph(selectedGraph);

		// console.time('greedy');
		// const greedySpanner = new GreedySpanner({ graph, device, maxDistortion });
		// const greedySpannerGraph = await greedySpanner.compute();
		// console.timeEnd('greedy');

		// console.time('theta');
		// const thetaSpanner = new ThetaSpanner({ graph, device, k: 100 });
		// const thetaSpannerGraph = await thetaSpanner.compute();
		// console.timeEnd('theta');

		epb = new EdgePathBundlingGPUFloydWarshall({
			device,
			graph,
			maxDistortion,
			edgeWeightFactor,
			spannerAlgorithm: GreedySpanner,
		});

		runGPU();
	});

	async function runGPU() {
		if (!epb) return;

		console.time('EPB');
		const bundeledEdges = await epb.bundle();
		console.timeEnd('EPB');

		console.time('Draw');
		clearCanvas(context);
		drawBundledEdges({ ctx: context, bundeledEdges });
		console.timeEnd('Draw');
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
