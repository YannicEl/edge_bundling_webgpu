<script lang="ts">
	import { Graph } from '@bachelor/core/Graph';
	import { edgePathBundling } from '@bachelor/core/edgePathBundling';
	import { drawLine, drawCircle, drawBezierCurve } from '@bachelor/core/canvas';
	import { onMount } from 'svelte';
	import { drawGraph } from '$lib/canvas';

	let canvas = $state<HTMLCanvasElement | null>();

	onMount(async () => {
		const graphJSON = await import('$lib/data/graphs/airlines.json');
		const graph = Graph.fromJSON(graphJSON);

		if (!canvas) return;

		const { width, height } = canvas.getBoundingClientRect();
		canvas.width = width;
		canvas.height = height;

		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		console.time('EPB');
		const { bundeledEdges, spanner } = edgePathBundling(graph, {
			maxDistortion: 2,
			edgeWeightFactor: 1,
		});
		console.timeEnd('EPB');

		console.time('Draw');
		drawGraph(ctx, spanner);

		bundeledEdges.forEach(({ edge, controlPoints }, i) => {
			drawBezierCurve(ctx, edge.start.x, edge.start.y, edge.end.x, edge.end.y, controlPoints, {
				width: 1,
				color: 'color(srgb 1 0 0 / 0.2)',
			});
		});
		console.timeEnd('Draw');
	});
</script>

<canvas bind:this={canvas} class="flex flex-1"></canvas>
