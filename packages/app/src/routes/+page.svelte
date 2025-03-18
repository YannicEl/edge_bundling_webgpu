<script lang="ts">
	import { Edge } from '@bachelor/core/Edge';
	import { Vertex } from '@bachelor/core/Vertex';
	import { Graph } from '@bachelor/core/Graph';
	import { dijkstra, greedySpanner } from '@bachelor/core/spanner';
	import { onMount } from 'svelte';
	import graphJSON from '$lib/data/graphs/example.json' assert { type: 'json' };

	const v1 = new Vertex(1, 1);
	const v2 = new Vertex(10, 1);
	const v3 = new Vertex(1300, 100);
	const v4 = new Vertex(1, 10);

	const e1 = new Edge(v1, v3);
	const e2 = new Edge(v3, v4);
	const e3 = new Edge(v3, v2);

	// const graph = new Graph([v1, v2, v3, v4], [e1, e2, e3]);
	const graph = Graph.fromJSON(graphJSON);
	console.log([...graph.edges]);

	console.log(graph);

	let canvas = $state<HTMLCanvasElement | null>();

	onMount(() => {
		if (!canvas) return;

		const { width, height } = canvas.getBoundingClientRect();
		canvas.width = width;
		canvas.height = height;

		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		drawGraph(ctx, graph);

		const spanner = greedySpanner(graph);
		console.log({ spanner });

		drawGraph(ctx, spanner);

		// let lastVertex: Vertex;
		// canvas.onclick = ({ clientX, clientY }) => {
		// 	const vertice = new Vertex(clientX, clientY);
		// 	graph.vertices.add(vertice);

		// 	if (lastVertex) {
		// 		const edge = new Edge(lastVertex, vertice);
		// 		graph.edges.add(edge);
		// 	}

		// 	drawGraph(ctx, graph);

		// 	lastVertex = vertice;
		// };
	});

	function drawGraph(ctx: CanvasRenderingContext2D, graph: Graph): void {
		ctx.clearRect(0, 0, ctx.canvas?.width, ctx.canvas?.height);

		graph.edges.forEach(({ start, end }) => {
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.moveTo(start.x, start.y);
			ctx.lineTo(end.x, end.y);
			ctx.stroke();
		});

		graph.vertices.forEach((vertice) => {
			ctx.fillStyle = 'blue';
			ctx.beginPath();
			ctx.arc(vertice.x, vertice.y, 5, 0, 2 * Math.PI);
			ctx.fill();
		});
	}

	// const shortestPath = dijkstra(graph, v1, v4);
	// console.log(shortestPath);
</script>

<canvas bind:this={canvas} class="flex flex-1"></canvas>
