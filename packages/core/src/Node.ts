export class Node {
	x: number;
	y: number;

	constructor(x: number, y: number) {
		this.x = x;
		this.y = y;
	}

	equals(other: Node) {
		return this.x === other.x && this.y === other.y;
	}
}
