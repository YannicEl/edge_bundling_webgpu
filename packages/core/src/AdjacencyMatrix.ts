import type { TypedArray } from './BufferData';

export class AdjacencyMatrix<T extends TypedArray> {
	size: number;
	values: T;

	constructor(size: number, values: T);
	constructor(size: number, ArrayType: new (length: number) => T);
	constructor(size: number, valuesOrArrayType: T | (new (length: number) => T)) {
		this.size = size;

		if (typeof valuesOrArrayType === 'function') {
			this.values = new valuesOrArrayType(size * size);
		} else {
			this.values = valuesOrArrayType;
		}
	}

	get buffer() {
		return this.values.buffer;
	}

	get(x: number, y: number) {
		if (x < 0 || x >= this.size || y < 0 || y >= this.size) {
			throw new Error(`Index out of bounds: (${x}, ${y})`);
		}
		return this.values[x * this.size + y]!;
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
