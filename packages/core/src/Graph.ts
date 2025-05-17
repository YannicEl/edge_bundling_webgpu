import { Edge } from './Edge';
import { Node } from './Node';

export type GraphJSON = {
	nodes: [number, number][];
	edges: [number, number][];
};

export type AdjacencyList = {
	nodes: number[];
	edges: { end: number; weight: number }[];
};

export class Graph {
	nodes: Map<string, Node>;
	edges: Map<string, Edge>;

	constructor(nodes: Node[] | Map<string, Node> = [], edges: Edge[] | Map<string, Edge> = []) {
		this.nodes = nodes instanceof Map ? nodes : new Map(nodes.map((node) => [node.id, node]));
		this.edges = edges instanceof Map ? edges : new Map(edges.map((edge) => [edge.id, edge]));
	}

	static fromJSON(json: GraphJSON): Graph {
		const nodes: Node[] = [];
		for (const [x, y] of json.nodes) {
			nodes.push(new Node(x, y));
		}

		const edges: Edge[] = [];
		for (const [startIndex, endIndex] of json.edges) {
			const start = nodes[startIndex];
			const end = nodes[endIndex];
			if (start && end) {
				edges.push(new Edge(start, end));
			}
		}

		return new Graph(nodes, edges);
	}

	toJSON(): GraphJSON {
		const nodes = Array.from(this.nodes.values());

		return {
			nodes: nodes.map(({ x, y }) => [x, y]),
			edges: Array.from(this.edges.values()).map(({ start, end }) => [
				nodes.indexOf(start),
				nodes.indexOf(end),
			]),
		};
	}

	clone(): Graph {
		return Graph.fromJSON(this.toJSON());
	}

	toAdjacencyList(): AdjacencyList {
		const nodes = [...this.nodes.values()];
		const edges = [...this.edges.values()];
		const list: AdjacencyList = { nodes: [], edges: [] };

		let edgeIndex = 0;
		for (let i = 0; i < this.nodes.size; i++) {
			list.nodes.push(edgeIndex);

			const node = nodes[i]!;
			const neighbors = edges
				.filter(({ start, end }) => start === node || end === node)
				.map(({ start, end, weight }) => ({ node: start === node ? end : start, weight }));

			for (let j = 0; j < neighbors.length; j++) {
				const neighbor = neighbors[j]!;

				const nodeIndex = nodes.findIndex((n) => n === neighbor.node);
				if (nodeIndex === -1) throw new Error('Node not found');

				list.edges.push({ end: nodeIndex, weight: neighbor.weight });

				edgeIndex++;
			}
		}

		return list;
	}
}
