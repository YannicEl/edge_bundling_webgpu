import type { Edge } from '../../Edge';
import type { Graph } from '../../Graph';
import { FloydWarshall } from '../../shortest-path/floyd-warshall/FloydWarshall';
import { greedySpanner } from '../../spanner/greedy';

export type EdgePathBundlingGPUFloydWarshallParams = {
	device: GPUDevice;
	spanner?: Graph;
	maxDistortion?: number;
	edgeWeightFactor?: number;
};

export async function edgePathBundlingGPUFloydWarshall(
	graph: Graph,
	{
		device,
		spanner,
		maxDistortion = 2,
		edgeWeightFactor = 1,
	}: EdgePathBundlingGPUFloydWarshallParams
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

	const floydWarshall = new FloydWarshall({ graph: spanner, device });
	await floydWarshall.init();
	await floydWarshall.compute();
	const shortestPaths = await floydWarshall.shortestPaths(
		difference.map((edge) => ({ start: edge.start, end: edge.end }))
	);

	const bundeledEdges: {
		edge: Edge;
		controlPoints: { x: number; y: number }[];
	}[] = [];

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

	return { bundeledEdges, spanner };
}
