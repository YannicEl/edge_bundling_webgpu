import type { Graph } from './Graph';

export function floydWarshall(graph: Graph) {
	const distanceMatrix = new Float32Array(graph.nodes.size * graph.nodes.size);

	for (let i = 0; i < graph.nodes.size; i++) {
		for (let j = 0; j < graph.nodes.size; j++) {
			if (graph[i][j] === 0 && i !== j) {
				dist[i][j] = Infinity; // If no edge exists between i and j, set distance to Infinity
			} else {
				dist[i][j] = graph[i][j]; // Otherwise, use the weight of the edge
			}
		}
	}
}

class AdjacencyMatrix {
	nodes: number;
	values: Float32Array;

	constructor(nodes: number) {
		this.nodes = nodes;
		this.values = new Float32Array(nodes * nodes);
	}

	get(x: number, y: number) {
		return this.values[x * this.nodes + y];
	}

	set(x: number, y: number, value: number) {
		this.values[x * this.nodes + y] = value;
	}
}
