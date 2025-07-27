<script lang="ts">
	import { getWebGPUState } from '$lib/state/webGPU';
	import { loadGraphs } from '$lib/_loadGraph';
	import { EdgePathBundlingGPUFloydWarshall } from '@bachelor/core/edge-path-bundling/floyd-warshall/gpu';
	import { onMount } from 'svelte';
	import { getRuntime } from '@bachelor/core/metrics/runtime';

	const { device } = getWebGPUState();

	onMount(async () => {
		const graphs = await loadGraphs(['airlines', 'airtraffic', 'migration']);

		const runtimes = await getRuntime({
			device,
			graph: graphs.migration,
			iterations: 5,
		});

		console.log(runtimes);
	});
</script>

<h1>Metrics</h1>
