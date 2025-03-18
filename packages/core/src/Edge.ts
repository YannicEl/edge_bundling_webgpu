import type { Vertex } from './Vertex';

export class Edge {
	start: Vertex;
	end: Vertex;
	weight: number;

	constructor(start: Vertex, end: Vertex) {
		this.start = start;
		this.end = end;

		this.weight = Math.sqrt(
			Math.pow(this.end.x - this.start.x, 2) + Math.pow(this.end.y - this.start.y, 2)
		);
	}
}
