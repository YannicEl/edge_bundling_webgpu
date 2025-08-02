<script lang="ts">
	import { getCanvasState } from '$lib/state/canvas';
	import { getWebGPUState } from '$lib/state/webGPU';
	import ControlPanel from '$lib/components/ControlPanel.svelte';
	import { loadGraph, loadSpanner } from '$lib/_loadGraph';
	import RangeInput from '$lib/components/RangeInput.svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { GreedySpanner } from '@bachelor/core/spanner/greedy/gpu';
	import { ThetaSpanner } from '@bachelor/core/spanner/theta/gpu';
	import { onMount } from 'svelte';
	import { drawGraph } from '$lib/_canvas';

	const { device } = getWebGPUState();
	const { canvas, context } = getCanvasState();

	let selectedGraph = $state<string>(page.url.searchParams.get('graph') ?? 'simple');
	$effect(() => {
		goto(`?graph=${selectedGraph}`);
	});

	let greedy: GreedySpanner;
	let theta: ThetaSpanner;
	let maxDistortion = $state<number>(2);

	canvas.onResize = () => runGPU();

	$effect(() => {
		console.log(maxDistortion);
		if (!theta) return;

		theta.maxDistortion = maxDistortion;
		runGPU();
	});

	onMount(async () => {
		const graph = await loadGraph(selectedGraph);

		greedy = new GreedySpanner({ graph, device, maxDistortion: 2 });
		theta = new ThetaSpanner({ graph, device, maxDistortion: 128 });

		runGPU();
	});

	async function runGPU() {
		if (!greedy || !theta) return;

		// console.time('greedy');
		// const greedySpanner = await greedy.compute();
		// console.timeEnd('greedy');

		console.time('theta');
		const thetaSpanner = await theta.compute();
		console.timeEnd('theta');

		const graphControl = await loadGraph(selectedGraph);
		const spannerControl = await loadSpanner(selectedGraph);
		// console.log(spannerControl);
		// console.log(JSON.stringify(spannerControl.toJSON()));

		// console.log(lol);
		// console.log(JSON.stringify(lol.toJSON()));

		// const isSame = JSON.stringify(spannerControl.toJSON()) === JSON.stringify(lol.toJSON());
		// console.log({ isSame });

		console.log(thetaSpanner);
		drawGraph({ ctx: context, graph: thetaSpanner, drawLabels: false });
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
