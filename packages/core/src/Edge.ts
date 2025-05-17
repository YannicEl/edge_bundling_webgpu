import type { Node } from './Node';

export class Edge {
	start: Node;
	end: Node;
	weight: number;

	constructor(start: Node, end: Node) {
		this.start = start;
		this.end = end;

		this.weight = Math.sqrt(
			Math.pow(this.end.x - this.start.x, 2) + Math.pow(this.end.y - this.start.y, 2)
		);

		this.start.edges.add(this.end);
		this.end.edges.add(this.start);
	}

	get id() {
		return `${this.start.id}_${this.end.id}`;
	}
}
