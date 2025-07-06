import type { GraphJSON } from './Graph';

export type Node = {
	x: number;
	y: number;
};

export type Edge = {
	start: number;
	end: number;
	weight: number;
};

export class Graph {
	adjacencyList: Map<number, Set<number>>;
	nodes: Readonly<Map<number, Node>>;
	edges: Readonly<Map<string, Edge>>;

	constructor() {
		this.adjacencyList = new Map();
		this.nodes = new Map();
		this.edges = new Map();
	}

	addNode(node: Node): number {
		const index = this.nodes.size;
		this.nodes.set(index, node);
		this.adjacencyList.set(index, new Set());
		return index;
	}

	addEdge(edge: Edge) {
		if (!this.adjacencyList.has(edge.start)) throw new Error('Start node not found');
		if (!this.adjacencyList.has(edge.end)) throw new Error('End node not found');

		this.adjacencyList.get(edge.start)!.add(edge.end);
		this.adjacencyList.get(edge.end)!.add(edge.start);

		const key = `${edge.start}_${edge.end}`;
		this.edges.set(key, edge);
	}

	static fromJSON({ nodes, edges }: GraphJSON): Graph {
		const graph = new Graph();

		for (const [x, y] of nodes) {
			graph.addNode({ x, y });
		}

		for (const [start, end] of edges) {
			const startNode = graph.nodes.get(start);
			if (!startNode) throw new Error('Start node not found');

			const endNode = graph.nodes.get(end);
			if (!endNode) throw new Error('End node not found');

			const weight = Math.sqrt(
				Math.pow(endNode.x - startNode.x, 2) + Math.pow(endNode.y - startNode.y, 2)
			);
			graph.addEdge({ start, end, weight });
		}

		return graph;
	}
}
