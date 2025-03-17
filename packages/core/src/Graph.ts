import type { Edge } from './Edge';
import type { Vertice } from './Vertice';

export class Graph {
	vertices: Set<Vertice>;
	edges: Set<Edge>;

	constructor(vertices: Vertice[] | Set<Vertice> = [], edges: Edge[] | Set<Edge> = []) {
		this.vertices = new Set(vertices);
		this.edges = new Set(edges);
	}
}
