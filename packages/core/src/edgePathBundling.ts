import { dijkstra } from './dijkstra';
import type { Edge } from './Edge';
import type { Graph } from './Graph';
import { greedySpanner } from './spanner';

export type EdgePathBundlingParams = {
	maxDistortion?: number;
	edgeWeightFactor?: number;
};

export function edgePathBundling(
	graph: Graph,
	{ maxDistortion = 2, edgeWeightFactor = 1 }: EdgePathBundlingParams = {}
) {
	const spanner = greedySpanner(graph, maxDistortion);

	const edges = [...spanner.edges].map((edge) => {
		const weight = Math.pow(Math.abs(edge.weight), edgeWeightFactor);
		edge.weight = weight;
		return edge;
	});
	spanner.edges = new Set(edges);

	const difference: Edge[] = [];
	graph.edges.forEach((edge) => {
		if (!spanner.edges.has(edge)) {
			difference.push(edge);
		}
	});

	const bundeledEdges: {
		edge: Edge;
		controlPoints: { x: number; y: number }[];
	}[] = [];

	let i = 0;
	for (const edge of difference) {
		console.log(`Bundeling edge ${i} of ${difference.length} edges`);
		const shortestPath = dijkstra(spanner, edge.start, edge.end);

		if (shortestPath === null) {
			throw new Error('Shortest path is null');
		}

		if (shortestPath.length <= maxDistortion * edge.weight) {
			bundeledEdges.push({
				edge,
				controlPoints: shortestPath.nodes.slice(1, -1).map(({ x, y }) => ({ x, y })),
			});
		}

		i++;
	}

	return {
		bundeledEdges,
		spanner,
	};
}
