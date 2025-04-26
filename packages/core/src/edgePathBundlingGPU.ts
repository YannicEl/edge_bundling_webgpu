import { dijkstraGPU } from './dijkstraGPU';
import type { Edge } from './Edge';
import type { Graph } from './Graph';
import { greedySpanner } from './spanner';
import { initWebGPU } from './webGpu';

export type EdgePathBundlinGPUgParams = {
	spanner?: Graph;
	maxDistortion?: number;
	edgeWeightFactor?: number;
};

export async function edgePathBundlingGPU(
	graph: Graph,
	{ spanner, maxDistortion = 2, edgeWeightFactor = 1 }: EdgePathBundlinGPUgParams = {}
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

	const { device } = await initWebGPU();
	const shortestPaths = await dijkstraGPU({
		device,
		graph: spanner,
		paths: difference.map((edge) => ({ start: edge.start, end: edge.end })),
	});

	let i = 0;
	for (const shortestPath of shortestPaths) {
		console.log(`Bundeling edge ${i} of ${difference.length} edges`);

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
