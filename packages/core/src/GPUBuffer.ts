import type { BufferData } from './BufferData';

export type CreateGPUBufferParams = {
	device: GPUDevice;
	data: BufferData;
	usage: GPUBufferUsageFlags;
};

export function createGPUBuffer({ device, data, usage }: CreateGPUBufferParams): GPUBuffer {
	const gpuBuffer = device.createBuffer({
		size: data.buffer.byteLength,
		usage,
	});

	device.queue.writeBuffer(gpuBuffer, 0, data.buffer);

	return gpuBuffer;
}
