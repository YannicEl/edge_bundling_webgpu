import { Edge } from './Edge';
import type { NodeJSON } from './Node';
import { Node } from './Node';

export type GraphJSON = {
	nodes: NodeJSON[];
	edges: { start: number; end: number }[];
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
		for (const vertex of json.nodes) {
			nodes.push(new Node(vertex.x, vertex.y));
		}

		const edges: Edge[] = [];
		for (const edge of json.edges) {
			const start = nodes[edge.start];
			const end = nodes[edge.end];
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
			nodes,
			edges: Array.from(this.edges).map((edge) => ({
				start: nodes.indexOf(edge.start),
				end: nodes.indexOf(edge.end),
			})),
		};
	}
}
