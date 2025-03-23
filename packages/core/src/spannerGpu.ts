import { BufferData } from './BufferData';
import shader from './compute.wgsl?raw';
import type { Graph } from './Graph';

export type GreedySpannerGpuParams = {
	device: GPUDevice;
	graph: Graph;
};

export async function greedySpannerGPU({ device, graph }: GreedySpannerGpuParams): Promise<Graph> {
	const pipeline = await device.createComputePipelineAsync({
		label: 'compute pipeline',
		layout: 'auto',
		compute: {
			module: device.createShaderModule({ code: shader }),
		},
	});

	const length = 4;

	const nodeBufferData = new BufferData(
		{
			position: 'vec2u',
			edges: 'uint',
			neighbors: 'uint',
		},
		length
	);
	for (let i = 0; i < length; i++) {
		nodeBufferData.set(
			{
				position: [1 * i, 2 * i],
				edges: 10 * i,
				neighbors: 100 * i,
			},
			i
		);
	}

	const nodeBuffer = device.createBuffer({
		size: nodeBufferData.buffer.byteLength,
		usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
	});

	device.queue.writeBuffer(nodeBuffer, 0, nodeBufferData.buffer);

	const edgeBufferData = new BufferData(
		{
			start: 'uint',
			end: 'uint',
			weight: 'uint',
		},
		length
	);
	for (let i = 0; i < length; i++) {
		edgeBufferData.set(
			{
				start: 1,
				end: 10,
				weight: 10,
			},
			i
		);
	}

	const edgeBuffer = device.createBuffer({
		size: edgeBufferData.buffer.byteLength,
		usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
	});

	device.queue.writeBuffer(edgeBuffer, 0, edgeBufferData.buffer);

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
