export type NodeJSON = {
	x: number;
	y: number;
};

export class Node {
	x: number;
	y: number;

	constructor(x: number, y: number) {
		this.x = x;
		this.y = y;
	}
}
