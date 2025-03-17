<script lang="ts">
	import { Edge } from '@bachelor/core/Edge';
	import { Vertice } from '@bachelor/core/Vertice';
	import { Graph } from '@bachelor/core/Graph';
	import { dijkstra, greedySpanner } from '@bachelor/core/spanner';
	import { onMount } from 'svelte';

	const v1 = new Vertice(1, 1);
	const v2 = new Vertice(10, 1);
	const v3 = new Vertice(10, 10);
	const v4 = new Vertice(1, 10);

	const e1 = new Edge(v1, v3);
	const e2 = new Edge(v3, v4);
	const e3 = new Edge(v3, v2);

	const graph = new Graph([v1, v2, v3, v4], [e1, e2, e3]);

	console.log(graph);

	let canvas = $state<HTMLCanvasElement | null>();

	onMount(() => {
		if (!canvas) return;

		const { width, height } = canvas.getBoundingClientRect();
		canvas.width = width;
		canvas.height = height;

		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		ctx.scale(100, 100);

		graph.edges.forEach(({ start, end }) => {
			ctx.lineWidth = 0.5;
			ctx.beginPath();
			ctx.moveTo(start.x, start.y);
			ctx.lineTo(end.x, end.y);
			ctx.stroke();
		});

		graph.vertices.forEach((vertice) => {
			ctx.fillStyle = 'blue';
			ctx.beginPath();
			ctx.arc(vertice.x, vertice.y, 0.75, 0, 2 * Math.PI);
			ctx.fill();
		});
	});

	const spanner = greedySpanner(graph);
	console.log({ spanner });

	const shortestPath = dijkstra(graph, v1, v4);
	console.log(shortestPath);
</script>

<canvas bind:this={canvas} class="flex flex-1"></canvas>
