import { Edge } from './Edge';
import { Node } from './Node';

export type GraphJSON = {
	nodes: [number, number][];
	edges: [number, number][];
};

export class Graph {
	nodes: Set<Node>;
	edges: Set<Edge>;

	constructor(nodes: Node[] | Set<Node> = [], edges: Edge[] | Set<Edge> = []) {
		this.nodes = new Set(nodes);
		this.edges = new Set(edges);
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

		console.log(`Imported graph with ${nodes.length} nodes and ${edges.length} edges`);
		return new Graph(nodes, edges);
	}

	toJSON(): GraphJSON {
		const nodes = Array.from(this.nodes);

		return {
			nodes: nodes.map(({ x, y }) => [x, y]),
			edges: Array.from(this.edges).map(({ start, end }) => [
				nodes.indexOf(start),
				nodes.indexOf(end),
			]),
		};
	}
}
