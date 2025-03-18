import { Edge } from './Edge';
import type { VertexJSON } from './Vertex';
import { Vertex } from './Vertex';

export type GraphJSON = {
	vertices: VertexJSON[];
	edges: { start: number; end: number }[];
};

export class Graph {
	vertices: Set<Vertex>;
	edges: Set<Edge>;

	constructor(vertices: Vertex[] | Set<Vertex> = [], edges: Edge[] | Set<Edge> = []) {
		this.vertices = new Set(vertices);
		this.edges = new Set(edges);
	}

	static fromJSON(json: GraphJSON): Graph {
		const vertices: Vertex[] = [];
		for (const vertex of json.vertices) {
			vertices.push(new Vertex(vertex.x, vertex.y));
		}

		const edges: Edge[] = [];
		for (const edge of json.edges) {
			const start = vertices[edge.start];
			const end = vertices[edge.end];
			if (start && end) {
				edges.push(new Edge(start, end));
			}
		}

		return new Graph(vertices, edges);
	}

	toJSON(): GraphJSON {
		const vertices = Array.from(this.vertices);

		return {
			vertices,
			edges: Array.from(this.edges).map((edge) => ({
				start: vertices.indexOf(edge.start),
				end: vertices.indexOf(edge.end),
			})),
		};
	}
}
