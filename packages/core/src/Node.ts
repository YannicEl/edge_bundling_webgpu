export class Node {
	x: number;
	y: number;

	edges: WeakSet<Node>;

	constructor(x: number, y: number) {
		this.edges = new WeakSet<Node>();

		this.x = x;
		this.y = y;
	}

	get id() {
		return `${this.x}_${this.y}`;
	}

	equals(other: Node) {
		return this.id === other.id;
	}
}
