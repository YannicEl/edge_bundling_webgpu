import { BufferData } from './BufferData';
import shader from './compute.wgsl?raw';
import { createGPUBuffer } from './GPUBuffer';
import type { Graph } from './Graph';
import type { Node } from './Node';
import type { Path } from './path';

export type DijkstraGpuParams = {
	device: GPUDevice;
	graph: Graph;
	start: Node;
	end: Node;
};

export async function dijkstraGPU({
	device,
	graph,
	start,
	end,
}: DijkstraGpuParams): Promise<Path | null> {
	const nodes = [...graph.nodes];
	const startIndex = nodes.indexOf(start);
	const endIndex = nodes.indexOf(end);
	if (startIndex === -1 || endIndex === -1) {
		throw new Error('Node not found in graph');
	}

	const pipeline = await device.createComputePipelineAsync({
		label: 'compute pipeline',
		layout: 'auto',
		compute: {
			module: device.createShaderModule({ code: shader }),
			constants: {
				start: startIndex,
				end: endIndex,
			},
		},
	});

	const list = graph.toAdjacencyList();
	const nodesBufferData = new BufferData({ edges: 'uint' }, list.nodes.length);
	const edgesBufferData = new BufferData({ end: 'uint', weight: 'float' }, list.edges.length);
	const distancesBufferData = new BufferData({ value: 'float', last: 'uint' }, list.nodes.length);
	const visitedBufferData = new BufferData({ visited: 'uint' }, list.nodes.length);

	for (let i = 0; i < list.nodes.length; i++) {
		const node = list.nodes[i]!;
		nodesBufferData.set({ edges: node }, i);
		visitedBufferData.set({ visited: 0 }, i);
		distancesBufferData.set({ value: Infinity }, i);
	}

	for (let i = 0; i < list.edges.length; i++) {
		const edge = list.edges[i]!;
		edgesBufferData.set({ end: edge.end, weight: edge.weight }, i);
	}

	const nodesBuffer = createGPUBuffer({
		device,
		data: nodesBufferData,
		usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
	});

	const edgesBuffer = createGPUBuffer({
		device,
		data: edgesBufferData,
		usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
	});

	const distancesBuffer = createGPUBuffer({
		device,
		data: distancesBufferData,
		usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
	});

	const visitedBuffer = createGPUBuffer({
		device,
		data: visitedBufferData,
		usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
	});

	const outputBuffer = device.createBuffer({
		size: 24,
		usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
	});

	const outputReadBuffer = device.createBuffer({
		size: 24,
		usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
	});

	const bindGroup = device.createBindGroup({
		label: 'Compute Bind Group',
		layout: pipeline.getBindGroupLayout(0),
		entries: [
			{ binding: 1, resource: { buffer: nodesBuffer } },
			{ binding: 2, resource: { buffer: edgesBuffer } },
			{ binding: 3, resource: { buffer: distancesBuffer } },
			{ binding: 4, resource: { buffer: visitedBuffer } },
			{ binding: 5, resource: { buffer: outputBuffer } },
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
		24
	);

	// Finish encoding and submit the commands
	const commandBuffer = encoder.finish();
	device.queue.submit([commandBuffer]);

	await outputReadBuffer.mapAsync(GPUMapMode.READ);

	const buffer = await outputReadBuffer.getMappedRange();

	const outputDataBuffer = new BufferData(
		{
			hallo: 'uint',
			distance: 'float',
			zwallo: 'int',
			drallo: 'float',
			float: 'float',
			unsigned: 'uint',
		},
		1,
		buffer
	);

	console.log(outputDataBuffer);
	console.log('Distance:', ...outputDataBuffer.get('distance'));
	console.log('Hallo:', ...outputDataBuffer.get('hallo'));
	console.log('Zwallo:', ...outputDataBuffer.get('zwallo'));
	console.log('Float:', ...outputDataBuffer.get('float'));
	console.log('Unsigned:', ...outputDataBuffer.get('unsigned'));

	const distance = outputDataBuffer.get('distance')[0];

	if (distance === undefined || distance === Infinity) {
		return null;
	} else {
		return {
			nodes: [],
			length: distance,
		};
	}
}
