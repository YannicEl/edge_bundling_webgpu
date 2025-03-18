export type VertexJSON = {
	x: number;
	y: number;
};

export class Vertex {
	x: number;
	y: number;

	constructor(x: number, y: number) {
		this.x = x;
		this.y = y;
	}
}
