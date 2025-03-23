type DataType =
	| 'int'
	| 'uint'
	| 'float'
	| 'vec2i'
	| 'vec2u'
	| 'vec2f'
	| 'vec3i'
	| 'vec3u'
	| 'vec3f'
	| 'vec4i'
	| 'vec4u'
	| 'vec4f';

export type TypedArrayConstructor =
	| Float32ArrayConstructor
	| Int32ArrayConstructor
	| Uint32ArrayConstructor;

export type TypedArray = Float32Array | Int32Array | Uint32Array;

type SetParams<T extends Record<string, DataType>> = {
	[K in keyof T]: T[K] extends 'int' | 'uint' | 'float'
		? number
		: T[K] extends `vec2${infer _}`
			? [number, number]
			: T[K] extends `vec3${infer _}`
				? [number, number, number]
				: T[K] extends `vec4${infer _}`
					? [number, number, number, number]
					: never;
};

export const DATA_TYPE_SIZES: Record<
	DataType,
	{ size: number; align: number; typedArrayConstructor: TypedArrayConstructor }
> = {
	int: { size: 4, align: 4, typedArrayConstructor: Int32Array },
	uint: { size: 4, align: 4, typedArrayConstructor: Uint32Array },
	float: { size: 4, align: 4, typedArrayConstructor: Float32Array },
	vec2i: { size: 8, align: 8, typedArrayConstructor: Int32Array },
	vec2u: { size: 8, align: 8, typedArrayConstructor: Uint32Array },
	vec2f: { size: 8, align: 8, typedArrayConstructor: Float32Array },
	vec3i: { size: 12, align: 16, typedArrayConstructor: Int32Array },
	vec3u: { size: 12, align: 16, typedArrayConstructor: Uint32Array },
	vec3f: { size: 12, align: 16, typedArrayConstructor: Float32Array },
	vec4i: { size: 16, align: 16, typedArrayConstructor: Int32Array },
	vec4u: { size: 16, align: 16, typedArrayConstructor: Uint32Array },
	vec4f: { size: 16, align: 16, typedArrayConstructor: Float32Array },
} as const;

export type UniformBufferParams<T> = {
	[K in keyof T]: T[K];
};

export type Offsets<T> = Record<
	keyof T,
	{ typedArrayConstructor: TypedArrayConstructor; byteOffset: number; length: number }
>;

export class BufferData<T extends Record<string, DataType> = any> {
	buffer: ArrayBuffer;
	structLength: number;

	offsets = {} as Offsets<T>;

	constructor(params: UniformBufferParams<T>, length = 1) {
		let currentOffset = 0;
		for (const key in params) {
			const { size, align, typedArrayConstructor } = DATA_TYPE_SIZES[params[key]];

			let padding = 0;
			const modulo = currentOffset % align;
			if (modulo > 0) {
				padding = align - modulo;
			}

			this.offsets[key] = {
				typedArrayConstructor,
				byteOffset: currentOffset + padding,
				length: size / 4,
			};

			currentOffset += size + padding;
		}

		let byteLength = currentOffset;
		if (byteLength > 16) byteLength += 16 - (currentOffset % 16);

		this.buffer = new ArrayBuffer(byteLength * length);
		this.structLength = byteLength;
	}

	set(values: Partial<SetParams<T>>, index = 0): void {
		for (const key in values) {
			const value = values[key];
			if (value !== undefined) {
				const { typedArrayConstructor, byteOffset, length } = this.offsets[key];
				const view = new typedArrayConstructor(
					this.buffer,
					index * this.structLength + byteOffset,
					length
				);
				view.set(Array.isArray(value) ? value : [value]);
			}
		}
	}

	get(key: keyof T, index = 0): TypedArray {
		const { typedArrayConstructor, byteOffset, length } = this.offsets[key];
		return new typedArrayConstructor(this.buffer, index * this.structLength + byteOffset, length);
	}
}
