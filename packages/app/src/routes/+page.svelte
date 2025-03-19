<script lang="ts">
	import { Edge } from '@bachelor/core/Edge';
	import { Vertex } from '@bachelor/core/Vertex';
	import { Graph } from '@bachelor/core/Graph';
	import { edgePathBundling } from '@bachelor/core/edgePathBundling';
	import { drawLine, drawCircle, drawBezierCurve } from '@bachelor/core/canvas';
	import { onMount } from 'svelte';
	import graphJSON from '$lib/data/graphs/example.json' assert { type: 'json' };

	const v1 = new Vertex(1, 1);
	const v2 = new Vertex(10, 1);
	const v3 = new Vertex(10, 10);
	const v4 = new Vertex(1, 10);

	const e1 = new Edge(v1, v3);
	const e2 = new Edge(v3, v4);
	const e3 = new Edge(v3, v2);

	// const graph = new Graph([v1, v2, v3, v4], [e1, e2, e3]);
	const graph = Graph.fromJSON(graphJSON);

	let canvas = $state<HTMLCanvasElement | null>();

	onMount(() => {
		if (!canvas) return;

		const { width, height } = canvas.getBoundingClientRect();
		canvas.width = width;
		canvas.height = height;

		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		const { bundeledEdges, spanner } = edgePathBundling(graph, {
			maxDistortion: 1.3,
			edgeWeightFactor: 1,
		});
		console.log(bundeledEdges);

		drawGraph(ctx, spanner);

		bundeledEdges.forEach(({ edge, controlPoints }, i) => {
			drawBezierCurve(ctx, edge.start.x, edge.start.y, edge.end.x, edge.end.y, controlPoints, {
				width: 2,
				color: 'red',
			});
		});
	});

	function drawGraph(ctx: CanvasRenderingContext2D, graph: Graph): void {
		ctx.clearRect(0, 0, ctx.canvas?.width, ctx.canvas?.height);

		graph.edges.forEach(({ start, end }) => {
			drawLine(ctx, start.x, start.y, end.x, end.y, { width: 1, color: 'black' });
		});

		graph.vertices.forEach((vertice) => {
			drawCircle(ctx, vertice.x, vertice.y, { radius: 5, color: 'blue' });
		});
	}
</script>

<canvas bind:this={canvas} class="flex flex-1"></canvas>
