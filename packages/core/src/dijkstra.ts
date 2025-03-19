import type { Graph } from './Graph';
import type { Node } from './Node';

type Path = {
	nodes: Node[];
	length: number;
};

export function dijkstra(graph: Graph, start: Node, end: Node): Path | null {
	if (graph.edges.size === 0) return null;

	const unvisited = new Set<Node>();
	const previous = new Map<Node, Node | null>();
	const distances = new Map<Node, number>();

	for (const vertex of graph.nodes) {
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

			const nodes: Node[] = [end];
			let temp = end;
			while (temp !== start) {
				temp = previous.get(temp)!;
				nodes.unshift(temp);
			}

			return { nodes, length };
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
