import type { Edge } from '../../AdjacencyList';
import type { Graph } from '../../AdjacencyList';
import { FloydWarshall } from '../../shortest-path/floyd-warshall/FloydWarshall';
import { greedySpanner } from '../../spanner/greedy';

export type EdgePathBundlingGPUFloydWarshallParams = {
	device: GPUDevice;
	spanner: Graph;
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
	// if (!spanner) {
	// 	spanner = greedySpanner(graph, maxDistortion);
	// }

	console.time('Difference');
	const difference: Edge[] = [];
	graph.edges.forEach((edge, key) => {
		if (!spanner.edges.has(key)) {
			difference.push(edge);
		}
	});
	console.timeEnd('Difference');

	console.time('Floyd Warshall');
	const floydWarshall = new FloydWarshall({ graph: spanner, device, edgeWeightFactor });
	console.timeEnd('Floyd Warshall');

	console.time('Floyd Warshall Init');
	await floydWarshall.init();
	console.timeEnd('Floyd Warshall Init');

	console.time('Floyd Warshall Compute');
	await floydWarshall.compute();
	console.timeEnd('Floyd Warshall Compute');

	console.time('Floyd Warshall Shortest Paths');
	const shortestPaths = await floydWarshall.shortestPaths(difference);
	console.timeEnd('Floyd Warshall Shortest Paths');

	console.time('Bundeling');
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
				controlPoints: shortestPath.nodes.slice(1, -1).map((nodeIndex) => {
					const node = graph.nodes.get(nodeIndex);
					if (!node) throw new Error('Node not found');
					return { x: node.x, y: node.y };
				}),
			});
		}

		i++;
	}
	console.timeEnd('Bundeling');

	return { bundeledEdges, spanner };
}
