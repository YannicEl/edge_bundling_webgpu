import type { Edge } from './Edge';
import { FloydWarshall } from './floydWarshall';
import type { Graph } from './Graph';
import { greedySpanner } from './spanner';

export type EdgePathBundlinGPUgParams = {
	device: GPUDevice;
	spanner?: Graph;
	maxDistortion?: number;
	edgeWeightFactor?: number;
};

export async function edgePathBundlingFloydGPU(
	graph: Graph,
	{ device, spanner, maxDistortion = 2, edgeWeightFactor = 1 }: EdgePathBundlinGPUgParams
) {
	if (!spanner) {
		spanner = greedySpanner(graph, maxDistortion);
	}

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

	const floydWarshall = new FloydWarshall({ graph: spanner, device, edgeWeightFactor });
	await floydWarshall.init();
	await floydWarshall.compute();
	const shortestPaths = floydWarshall.shortestPaths(
		difference.map((edge) => ({ start: edge.start, end: edge.end }))
	);

	let i = 0;
	for (const shortestPath of shortestPaths) {
		const edge = difference[i];
		if (!edge) throw new Error('Edge not found');

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
