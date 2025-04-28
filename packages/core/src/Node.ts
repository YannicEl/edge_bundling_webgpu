export class Node {
	x: number;
	y: number;

	edges: WeakSet<Node>;

	constructor(x: number, y: number) {
		this.edges = new WeakSet<Node>();

		this.x = x;
		this.y = y;
	}

	equals(other: Node) {
		return this.x === other.x && this.y === other.y;
	}
}
