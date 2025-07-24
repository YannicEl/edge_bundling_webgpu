<script lang="ts">
	import { drawGraphAndBundledEdges } from '$lib/_canvas';
	import { getCanvasState } from '$lib/state/canvas';
	import { getWebGPUState } from '$lib/state/webGPU';
	import ControlPanel from '$lib/components/ControlPanel.svelte';
	import { loadGraph, loadSpanner } from '$lib/_loadGraph';
	import RangeInput from '$lib/components/RangeInput.svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { GreedySpanner } from '@bachelor/core/spanner/gpu';
	import { onMount } from 'svelte';
	import { drawGraph } from '$lib/_canvas';

	const { device } = getWebGPUState();
	const { canvas, context } = getCanvasState();

	let selectedGraph = $state<string>(page.url.searchParams.get('graph') ?? 'simple');
	$effect(() => {
		goto(`?graph=${selectedGraph}`);
	});

	let spanner: GreedySpanner;
	let maxDistortion = $state<number>(2);

	canvas.onResize = () => runGPU();

	onMount(async () => {
		const graph = await loadGraph(selectedGraph);

		spanner = new GreedySpanner({ graph, device });

		runGPU();
	});

	async function runGPU() {
		if (!spanner) return;

		console.time('Spanner');
		const graph = await spanner.compute();
		console.timeEnd('Spanner');

		const graphControl = await loadGraph(selectedGraph);
		const spannerControl = await loadSpanner(selectedGraph);
		// console.log(spannerControl);
		// console.log(JSON.stringify(spannerControl.toJSON()));

		// console.log(lol);
		// console.log(JSON.stringify(lol.toJSON()));

		// const isSame = JSON.stringify(spannerControl.toJSON()) === JSON.stringify(lol.toJSON());
		// console.log({ isSame });

		drawGraph({ ctx: context, graph: spannerControl, drawLabels: false });
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
		<RangeInput min={0.01} max={2} step={0.01} bind:value={maxDistortion} />
	</label>

	<button onclick={runGPU}>Run GPU</button>

	<a href="/">back</a>
</ControlPanel>
