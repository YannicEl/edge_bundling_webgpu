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
export type UniformBufferParams<T extends string, Y extends DataType> = Record<T, Y>;

type TypedArrayConstructor =
	| Float32ArrayConstructor
	| Int32ArrayConstructor
	| Uint32ArrayConstructor;

type Test<Path extends DataType> = Path extends 'int' | 'uint' | 'float'
	? number
	: Path extends `vec2${infer _}`
		? [number, number]
		: Path extends `vec3${infer _}`
			? [number, number, number]
			: Path extends `vec4${infer _}`
				? [number, number, number, number]
				: never;

export const DATA_TYPE_SIZES: Record<
	DataType,
	{ size: number; align?: number; typedArrayConstructor: TypedArrayConstructor }
> = {
	int: { size: 4, typedArrayConstructor: Int32Array },
	uint: { size: 4, typedArrayConstructor: Uint32Array },
	float: { size: 4, typedArrayConstructor: Float32Array },
	vec2i: { size: 8, align: 8, typedArrayConstructor: Int32Array },
	vec2u: { size: 8, align: 8, typedArrayConstructor: Uint32Array },
	vec2f: { size: 8, align: 8, typedArrayConstructor: Float32Array },
	vec3i: { size: 12, align: 16, typedArrayConstructor: Int32Array },
	vec3u: { size: 12, align: 16, typedArrayConstructor: Uint32Array },
	vec3f: { size: 12, align: 16, typedArrayConstructor: Float32Array },
	vec4i: { size: 16, typedArrayConstructor: Int32Array },
	vec4u: { size: 16, typedArrayConstructor: Uint32Array },
	vec4f: { size: 16, typedArrayConstructor: Float32Array },
} as const;

export class UniformBuffer<T extends string = any, Y extends DataType = any> {
	descriptor: GPUBufferDescriptor;
	value: ArrayBuffer;
	buffer?: GPUBuffer;

	offsets = {} as Record<
		T,
		{ typedArrayConstructor: TypedArrayConstructor; byteOffset: number; length: number }
	>;

	constructor(params: UniformBufferParams<T, Y>, label?: string) {
		let currentOffset = 0;
		for (const key in params) {
			const { size, align, typedArrayConstructor } = DATA_TYPE_SIZES[params[key]];

			let padding = 0;
			if (align) {
				const modulo = currentOffset % align;
				if (modulo > 0) {
					padding = align - modulo;
				}
			}

			this.offsets[key] = {
				typedArrayConstructor,
				byteOffset: currentOffset + padding,
				length: size / 4,
			};
			currentOffset += size + padding;
		}

		const byteLength = currentOffset + (16 - (currentOffset % 16));
		this.value = new ArrayBuffer(byteLength);

		this.descriptor = {
			label,
			size: this.value.byteLength,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
		};
	}

	set(values: Partial<Record<T, Test<Y>>>) {
		for (const key in values) {
			const value = values[key];
			if (value) {
				const { typedArrayConstructor, byteOffset, length } = this.offsets[key];
				const view = new typedArrayConstructor(this.value, byteOffset, length);
				view.set(Array.isArray(value) ? value : [value]);
			}
		}
	}

	load(device: GPUDevice): GPUBuffer {
		if (this.buffer) return this.buffer;
		this.buffer = device.createBuffer(this.descriptor);
		return this.buffer;
	}

	write(device: GPUDevice) {
		const buffer = this.load(device);
		device.queue.writeBuffer(buffer, 0, this.value);
	}
}
