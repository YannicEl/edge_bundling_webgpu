import { dijkstra } from './dijkstra';
import { Graph } from './Graph';

export function greedySpanner(graph: Graph, stretchFactor = 2): Graph {
	console.time('Greedy Spanner');
	const spanner = new Graph(graph.nodes, []);

	const edges = Array.from(graph.edges).sort((a, b) => a.weight - b.weight);

	let i = 0;
	for (const edge of edges) {
		console.log(`Processing spanner edge ${i} of ${edges.length} edges`);
		const shortestPath = dijkstra(spanner, edge.start, edge.end);

		if (shortestPath === null || shortestPath.length > edge.weight * stretchFactor) {
			spanner.edges.add(edge);
		}

		i++;
	}

	console.timeEnd('Greedy Spanner');
	return spanner;
}
