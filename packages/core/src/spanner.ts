import { Graph } from './Graph';
import type { Vertice } from './Vertice';

export function greedySpanner(graph: Graph, stretchFactor = 2): Graph {
	const spanner = new Graph(graph.vertices, []);

	const edges = Array.from(graph.edges).sort((a, b) => a.weight - b.weight);

	edges.forEach((edge) => {
		const shortestPath = calculateShortestPath(spanner, edge.start, edge.end);

		if (shortestPath === null || shortestPath > edge.weight * stretchFactor) {
			spanner.edges.add(edge);
		}
	});

	return spanner;
}

function calculateShortestPath(graph: Graph, start: Vertice, end: Vertice): number | null {
	const length = null;

	return length;
}

export function dijkstra(graph: Graph, start: Vertice, end: Vertice): Vertice[] {
	const distances: Map<Vertice, number> = new Map();
	const previous: Map<Vertice, Vertice | null> = new Map();
	const unvisited: Vertice[] = [...graph.vertices];

	for (const vertex of graph.vertices) {
		distances.set(vertex, vertex === start ? 0 : Infinity);
		previous.set(vertex, null);
	}

	while (unvisited.length > 0) {
		let smallest = unvisited.reduce((min, vertex) =>
			distances.get(vertex)! < distances.get(min)! ? vertex : min
		);

		unvisited.splice(unvisited.indexOf(smallest), 1);

		if (smallest === end) {
			const path: Vertice[] = [];
			let temp: Vertice | null | undefined = smallest;
			while (temp) {
				path.push(temp);
				temp = previous.get(temp);
			}

			return path.reverse();
		}

		for (const edge of graph.edges) {
			if (edge.start === smallest && unvisited.includes(edge.end)) {
				const newDist = distances.get(smallest)! + edge.weight;
				if (newDist < distances.get(edge.end)!) {
					distances.set(edge.end, newDist);
					previous.set(edge.end, smallest);
				}
			}
		}
	}

	return [];
}
