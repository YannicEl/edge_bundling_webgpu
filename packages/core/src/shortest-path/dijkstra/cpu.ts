import type { Graph } from '../../Graph';
import type { Node } from '../../Node';
import type { Path } from '../../path';

export function dijkstra(graph: Graph, start: Node, end: Node): Path | null {
	if (graph.edges.size === 0) return null;

	const unvisited = new Map<string, Node>();
	const previous = new Map<string, Node | null>();
	const distances = new Map<string, number>();

	for (const node of graph.nodes.values()) {
		unvisited.set(node.id, node);
		previous.set(node.id, null);
		distances.set(node.id, Infinity);
	}

	distances.set(start.id, 0);

	while (unvisited.size > 0) {
		let current = null as unknown as Node;
		unvisited.forEach((node) => {
			if (!current || distances.get(node.id)! < distances.get(current.id)!) {
				current = node;
			}
		});

		if (current.equals(end)) {
			const length = distances.get(end.id)!;
			if (length === Infinity) return null;

			const nodes: Node[] = [end];
			let temp = end;
			while (!temp.equals(start)) {
				temp = previous.get(temp.id)!;
				nodes.unshift(temp);
			}

			return { nodes, length };
		}

		for (const edge of graph.edges.values()) {
			if (!edge.start.equals(current) && !edge.end.equals(current)) continue;

			const neighbor = edge.start.equals(current) ? edge.end : edge.start;
			if (!unvisited.has(neighbor.id)) continue;

			const distance = distances.get(current.id)! + edge.weight;
			if (distance < distances.get(neighbor.id)!) {
				distances.set(neighbor.id, distance);
				previous.set(neighbor.id, current);
			}
		}

		unvisited.delete(current.id);
	}

	return null;
}
