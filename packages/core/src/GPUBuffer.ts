import type { BufferData } from './BufferData';

export type CreateGPUBufferParams = {
	device: GPUDevice;
	data: BufferData;
	usage: GPUBufferUsageFlags;
	write?: boolean;
};

export function createGPUBuffer({
	device,
	data,
	usage,
	write = true,
}: CreateGPUBufferParams): GPUBuffer {
	const buffer = device.createBuffer({
		size: data.buffer.byteLength,
		usage,
	});

	if (write) {
		writeGPUBuffer({ device, buffer, data });
	}

	return buffer;
}

export type WriteGPUBufferParams = {
	device: GPUDevice;
	buffer: GPUBuffer;
	data: BufferData;
};

export function writeGPUBuffer({ device, buffer, data }: WriteGPUBufferParams) {
	device.queue.writeBuffer(buffer, 0, data.buffer);
}
