import { Edge } from '../Edge';
import { Graph } from '../Graph';
import { dijkstra } from '../shortest-path/dijkstra/cpu';

export function greedySpanner(graph: Graph, stretchFactor = 2): Graph {
	console.time('Greedy Spanner');
	const spanner = new Graph(graph.nodes, []).clone();

	const edges = Array.from(graph.edges).sort(([_1, a], [_2, b]) => a.weight - b.weight);

	let i = 0;
	for (const [id, edge] of edges) {
		console.log(`Processing spanner edge ${i} of ${edges.length} edges`);
		const shortestPath = dijkstra(spanner, edge.start, edge.end);

		if (shortestPath === null || shortestPath.length > edge.weight * stretchFactor) {
			const start = spanner.nodes.get(edge.start.id)!;
			const end = spanner.nodes.get(edge.end.id)!;
			const newEdge = new Edge(start, end);
			spanner.edges.set(id, newEdge);
		}

		i++;
	}

	console.timeEnd('Greedy Spanner');
	return spanner;
}
