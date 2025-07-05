import type { TypedArrayConstructor } from './BufferData';

export async function mapAndReadBuffer(
	gpuBuffer: GPUBuffer,
	typedArrayConstructor: TypedArrayConstructor
) {
	await gpuBuffer.mapAsync(GPUMapMode.READ);
	const mappedRange = await gpuBuffer.getMappedRange();
	return new typedArrayConstructor(mappedRange);
}
