<script lang="ts">
	import { clearCanvas, drawBundledEdges, drawGraph } from '$lib/_canvas';
	import { getCanvasState } from '$lib/state/canvas';
	import { getWebGPUState } from '$lib/state/webGPU';
	import ControlPanel from '$lib/components/ControlPanel.svelte';
	import { DATASET_NAMES, loadGraph } from '@bachelor/core/datasets/load';
	import RangeInput from '$lib/components/RangeInput.svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { EdgePathBundlingGPUFloydWarshall } from '@bachelor/core/edge-path-bundling/floyd-warshall/gpu';
	import { onMount } from 'svelte';
	import { ThetaSpanner } from '@bachelor/core/spanner/theta/gpu';
	import { GreedySpanner } from '@bachelor/core/spanner/greedy/gpu';
	import { exportBundling } from '@bachelor/core/AdjacencyList';

	const { device } = getWebGPUState();
	const { canvas, context } = getCanvasState();

	let selectedGraph = $state<string>(page.url.searchParams.get('graph') ?? 'simple');
	$effect(() => {
		goto(`?graph=${selectedGraph}&spannerAlgorithm=${spannerAlgorithm}`);
	});

	let maxDistortion = $state<number>(2);
	let edgeWeightFactor = $state<number>(2);
	let spannerAlgorithm = $state<string>(page.url.searchParams.get('spannerAlgorithm') ?? 'theta');
	let epb: EdgePathBundlingGPUFloydWarshall;
	let graph: any; // Store graph for use in drawBundledEdges

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

	$effect(() => {
		if (!epb) return;

		epb = new EdgePathBundlingGPUFloydWarshall({
			device,
			graph,
			maxDistortion,
			edgeWeightFactor,
			spannerAlgorithm: spannerAlgorithm === 'theta' ? ThetaSpanner : GreedySpanner,
		});
	});

	$effect(() => {
		if (!epb) return;
		epb = new EdgePathBundlingGPUFloydWarshall({
			device,
			graph,
			maxDistortion,
			edgeWeightFactor,
			spannerAlgorithm: spannerAlgorithm === 'theta' ? ThetaSpanner : GreedySpanner,
		});
	});

	onMount(async () => {
		graph = await loadGraph(selectedGraph);
		// const spannerControl = await loadSpanner(selectedGraph);

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
			spannerAlgorithm: spannerAlgorithm === 'theta' ? ThetaSpanner : GreedySpanner,
		});

		runGPU();
	});

	async function sleep(ms: number) {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	async function runGPU() {
		if (!epb) return;

		const t1 = performance.now();
		const bundeledEdges = await epb.bundle();
		const t2 = performance.now();
		console.log(`EPB: ${t2 - t1}ms`);

		// const cache = localStorage.getItem(`${selectedGraph}_greedy`);
		// if (cache) {
		// 	localStorage.setItem(`${selectedGraph}_greedy`, `${cache};${t2 - t1}`);
		// } else {
		// 	localStorage.setItem(`${selectedGraph}_greedy`, `${t2 - t1}`);
		// }

		// await sleep(2000);

		// const length = cache?.split(';').length ?? 0;
		// console.log({ length });
		// if (length < 24) {
		// 	location.reload();
		// }

		console.time('Draw');
		clearCanvas(context, 'white');
		// drawGraph({ ctx: context, graph, drawLabels: false, drawNodes: false });
		drawBundledEdges({ ctx: context, bundeledEdges });
		console.timeEnd('Draw');

		// const exported = exportBundling(epb.graph, bundeledEdges);
		// console.log(JSON.stringify(exported, undefined, 2));
	}

	function downloadCanvas() {
		const canvasElement = canvas.element;
		const link = document.createElement('a');
		link.download = `PEPB_${spannerAlgorithm}_${selectedGraph}_d_${maxDistortion}_w_${edgeWeightFactor}.png`;
		link.href = canvasElement.toDataURL('image/png');
		link.click();
	}

	function downloadBundling() {
		if (!epb || !graph) return;

		// Get the bundled edges from the last run
		epb.bundle().then((bundledEdges) => {
			const exported = exportBundling(graph, bundledEdges);
			const dataStr = JSON.stringify(exported, null, 2);
			const dataBlob = new Blob([dataStr], { type: 'application/json' });

			const link = document.createElement('a');
			link.download = `${selectedGraph}_${spannerAlgorithm}_bundling.json`;
			link.href = URL.createObjectURL(dataBlob);
			link.click();

			// Clean up the object URL
			URL.revokeObjectURL(link.href);
		});
	}
</script>

<ControlPanel>
	<label class="flex items-center justify-between gap-2">
		Graph
		<select name="graph" bind:value={selectedGraph}>
			<option value="simple">Simple</option>
			<option value="example">Example</option>
			{#each DATASET_NAMES as datasetName}
				<option value={datasetName}>{datasetName}</option>
			{/each}
		</select>
	</label>

	<label class="flex items-center justify-between gap-2">
		Graph
		<select name="graph" bind:value={spannerAlgorithm}>
			<option value="theta">Theta</option>
			<option value="greedy">Greedy</option>
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

	<button onclick={downloadCanvas}>Download Canvas</button>

	<button onclick={downloadBundling}>Download Bundling</button>

	<a href="/">back</a>
</ControlPanel>
