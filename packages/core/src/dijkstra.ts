import type { Graph } from './Graph';
import type { Vertex } from './Vertex';

type Path = {
	vertices: Vertex[];
	length: number;
};

export function dijkstra(graph: Graph, start: Vertex, end: Vertex): Path | null {
	if (graph.edges.size === 0) return null;

	const unvisited = new Set<Vertex>();
	const previous = new Map<Vertex, Vertex | null>();
	const distances = new Map<Vertex, number>();

	for (const vertex of graph.vertices) {
		unvisited.add(vertex);
		previous.set(vertex, null);
		distances.set(vertex, Infinity);
	}

	distances.set(start, 0);

	while (unvisited.size > 0) {
		const current = Array.from(unvisited).reduce((min, vertex) => {
			return distances.get(vertex)! < distances.get(min)! ? vertex : min;
		});

		if (current === end) {
			const length = distances.get(end)!;
			if (length === Infinity) return null;

			const vertices: Vertex[] = [end];
			let temp = end;
			while (temp !== start) {
				temp = previous.get(temp)!;
				vertices.unshift(temp);
			}

			return { vertices, length };
		}

		for (const edge of graph.edges) {
			if (edge.start !== current && edge.end !== current) continue;

			const neighbor = edge.start === current ? edge.end : edge.start;
			if (!unvisited.has(neighbor)) continue;

			const distance = distances.get(current)! + edge.weight;
			if (distance < distances.get(neighbor)!) {
				distances.set(neighbor, distance);
				previous.set(neighbor, current);
			}
		}

		unvisited.delete(current);
	}

	return null;
}
