<script lang="ts">
	import { onMount } from 'svelte';
	import { initWebGPU } from '@bachelor/core/webGpu';
	import { greedySpannerGpu } from '@bachelor/core/spannerGpu';
	import graphJSON from '$lib/data/graphs/airlines.json' with { type: 'json' };
	import { Graph } from '@bachelor/core/Graph';

	onMount(async () => {
		const { device } = await initWebGPU();

		const graph = Graph.fromJSON(graphJSON);

		console.time('greedySpannerGpu');
		const spanner = await greedySpannerGpu({ device, graph });
		console.timeEnd('greedySpannerGpu');
	});
</script>
