import type { Edge } from '../../Edge';
import type { Graph } from '../../Graph';
import { dijkstra } from '../../shortest-path/dijkstra/cpu';
import { greedySpanner } from '../../spanner/greedy';

export type EdgePathBundlingParams = {
	spanner?: Graph;
	maxDistortion?: number;
	edgeWeightFactor?: number;
};

export function edgePathBundling(
	graph: Graph,
	{ spanner, maxDistortion = 2, edgeWeightFactor = 1 }: EdgePathBundlingParams = {}
) {
	if (!spanner) {
		spanner = greedySpanner(graph, maxDistortion);
	}

	spanner.edges.forEach((edge) => {
		edge.weight = Math.pow(Math.abs(edge.weight), edgeWeightFactor);
	});

	const difference: Edge[] = [];
	graph.edges.forEach((edge) => {
		if (!spanner.edges.has(edge.id)) {
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
