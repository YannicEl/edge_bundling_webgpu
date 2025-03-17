import type { Vertice } from './Vertice';

export class Edge {
	start: Vertice;
	end: Vertice;
	weight: number;

	constructor(start: Vertice, end: Vertice) {
		this.start = start;
		this.end = end;

		this.weight = Math.sqrt(
			Math.pow(this.end.x - this.start.x, 2) + Math.pow(this.end.y - this.start.y, 2)
		);
	}
}
