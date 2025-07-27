import type { BufferData } from './BufferData';

export type CreateGPUBufferParams = {
	device: GPUDevice;
	label?: string;
	data: BufferData | ArrayBuffer;
	usage: GPUBufferUsageFlags;
	write?: boolean;
};

export function createGPUBuffer({
	device,
	label,
	data,
	usage,
	write = true,
}: CreateGPUBufferParams): GPUBuffer {
	const buffer = device.createBuffer({
		label,
		size: data instanceof ArrayBuffer ? data.byteLength : data.buffer.byteLength,
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
	data: BufferData | ArrayBuffer;
};

export function writeGPUBuffer({ device, buffer, data }: WriteGPUBufferParams) {
	device.queue.writeBuffer(buffer, 0, data instanceof ArrayBuffer ? data : data.buffer);
}
