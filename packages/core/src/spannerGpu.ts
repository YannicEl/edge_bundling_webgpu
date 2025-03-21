import { UniformBuffer } from './buffer';
import shader from './compute.wgsl?raw';
import type { Graph } from './Graph';

export type GreedySpannerGpuParams = {
	device: GPUDevice;
	graph: Graph;
};

export async function greedySpannerGpu({ device, graph }: GreedySpannerGpuParams): Promise<Graph> {
	const pipeline = await device.createComputePipelineAsync({
		label: 'compute pipeline',
		layout: 'auto',
		compute: {
			module: device.createShaderModule({ code: shader }),
		},
	});

	const test = new UniformBuffer({
		position: 'vec2u',
		edges: 'uint',
		node: 'uint',
	});

	test.set({
		position: [2],
		edges: [1, 2, 3, 4],
		node: 5,
	});

	const length = 4;

	const nodeBufferData = new Float32Array(length * 4 - 1);
	for (let i = 0; i < length; i++) {
		nodeBufferData.set([1 * i, 2 * i, 3 * i], i * 4);
	}

	const nodeBuffer = device.createBuffer({
		size: nodeBufferData.byteLength,
		usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
	});

	device.queue.writeBuffer(nodeBuffer, 0, nodeBufferData);

	const edgeBufferData = new Float32Array(length * 4 - 1);
	for (let i = 0; i < length; i++) {
		edgeBufferData.set([1 * i, 2 * i, 3 * i], i * 4);
	}

	const edgeBuffer = device.createBuffer({
		size: edgeBufferData.byteLength,
		usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
	});

	device.queue.writeBuffer(edgeBuffer, 0, edgeBufferData);

	const outputBuffer = device.createBuffer({
		size: 1024,
		usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
	});

	const outputReadBuffer = device.createBuffer({
		size: 1024,
		usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
	});

	const bindGroup = device.createBindGroup({
		label: 'Compute Bind Group',
		layout: pipeline.getBindGroupLayout(0),
		entries: [
			{ binding: 1, resource: { buffer: nodeBuffer } },
			{ binding: 2, resource: { buffer: edgeBuffer } },
			{ binding: 3, resource: { buffer: outputBuffer } },
		],
	});

	// Encode commands to do the computation
	const encoder = device.createCommandEncoder({ label: 'compute builtin encoder' });
	const pass = encoder.beginComputePass({ label: 'compute builtin pass' });

	pass.setPipeline(pipeline);
	pass.setBindGroup(0, bindGroup);
	pass.dispatchWorkgroups(1);
	pass.end();

	encoder.copyBufferToBuffer(
		outputBuffer,
		0, // Source offset
		outputReadBuffer,
		0, // Destination offset
		1024
	);

	// Finish encoding and submit the commands
	const commandBuffer = encoder.finish();
	device.queue.submit([commandBuffer]);

	await outputReadBuffer.mapAsync(GPUMapMode.READ);
	const output = new Uint32Array(outputReadBuffer.getMappedRange());
	console.log(output);

	return graph;
}
