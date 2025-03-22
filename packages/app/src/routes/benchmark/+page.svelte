<script lang="ts">
	import { onMount } from 'svelte';
	import { initWebGPU } from '@bachelor/core/webGpu';
	import { greedySpannerGpu } from '@bachelor/core/spannerGpu';
	import { Graph } from '@bachelor/core/Graph';

	onMount(async () => {
		const { device } = await initWebGPU();

		const graphJSON = await import('$lib/data/graphs/airlines.json');
		const graph = Graph.fromJSON(graphJSON);

		console.time('greedySpannerGpu');
		const spanner = await greedySpannerGpu({ device, graph });
		console.timeEnd('greedySpannerGpu');
	});
</script>
