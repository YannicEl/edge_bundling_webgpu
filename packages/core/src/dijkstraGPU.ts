import { BufferData } from './BufferData';
import shader from './compute.wgsl?raw';
import { createGPUBuffer } from './GPUBuffer';
import type { Graph } from './Graph';
import type { Node } from './Node';

type Path = {
	nodes: Node[];
	length: number;
};

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
	const pipeline = await device.createComputePipelineAsync({
		label: 'compute pipeline',
		layout: 'auto',
		compute: {
			module: device.createShaderModule({ code: shader }),
			constants: {
				start: 5,
				end: 1,
			},
		},
	});

	const list = graph.toAdjacencyList();
	const nodesBufferData = new BufferData({ edges: 'uint', visited: 'uint' }, list.nodes.length);
	const edgesBufferData = new BufferData({ end: 'uint', weight: 'float' }, list.edges.length);
	const distancesBufferData = new BufferData({ value: 'float', last: 'uint' }, list.nodes.length);

	for (let i = 0; i < list.nodes.length; i++) {
		const node = list.nodes[i]!;
		nodesBufferData.set({ edges: node, visited: 0 }, i);
		distancesBufferData.set({ value: -1 }, i);
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
			{ binding: 1, resource: { buffer: nodesBuffer } },
			{ binding: 2, resource: { buffer: edgesBuffer } },
			{ binding: 3, resource: { buffer: distancesBuffer } },
			{ binding: 4, resource: { buffer: outputBuffer } },
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
		distancesBuffer,
		0, // Source offset
		outputReadBuffer,
		0, // Destination offset
		48
	);

	// Finish encoding and submit the commands
	const commandBuffer = encoder.finish();
	device.queue.submit([commandBuffer]);

	await outputReadBuffer.mapAsync(GPUMapMode.READ);
	// const output = new Uint32Array(outputReadBuffer.getMappedRange());
	const output = new Float32Array(outputReadBuffer.getMappedRange());
	console.log(output);
}
