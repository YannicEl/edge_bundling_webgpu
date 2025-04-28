export class AdjacencyMatrix {
	size: number;
	values: Float32Array;

	constructor(size: number, values?: Float32Array) {
		this.size = size;
		this.values = values ? values : new Float32Array(size * size);
	}

	get buffer() {
		return this.values.buffer;
	}

	get(x: number, y: number) {
		if (x < 0 || x >= this.size || y < 0 || y >= this.size) {
			throw new Error(`Index out of bounds: (${x}, ${y})`);
		}
		return this.values[x * this.size + y];
	}

	set(x: number, y: number, value: number) {
		if (x < 0 || x >= this.size || y < 0 || y >= this.size) {
			throw new Error(`Index out of bounds: (${x}, ${y})`);
		}
		this.values[x * this.size + y] = value;
	}

	log() {
		const rows = [];

		for (let y = 0; y < this.size; y++) {
			let row = [];
			for (let x = 0; x < this.size; x++) {
				row.push(this.get(x, y));
			}

			rows.push(row);
		}

		console.table(rows);
	}
}
