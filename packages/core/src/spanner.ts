import { dijkstra } from './dijkstra';
import { Graph } from './Graph';

export function greedySpanner(graph: Graph, stretchFactor = 2): Graph {
	const spanner = new Graph(graph.vertices, []);

	const edges = Array.from(graph.edges).sort((a, b) => a.weight - b.weight);

	edges.forEach((edge) => {
		const shortestPath = dijkstra(spanner, edge.start, edge.end);

		if (shortestPath === null || shortestPath.length > edge.weight * stretchFactor) {
			spanner.edges.add(edge);
		}
	});

	return spanner;
}
