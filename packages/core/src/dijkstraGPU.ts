import { BufferData } from './buffer';
import shader from './compute.wgsl?raw';
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
		},
	});

	const nodesBufferData = new BufferData({ edges: 'uint' }, graph.nodes.size);
	const edgesBufferData = new BufferData({ end: 'uint', weight: 'float' }, graph.edges.size);

	const nodes = [...graph.nodes];
	const edges = [...graph.edges];

	let edgeIndex = 0;
	for (let i = 0; i < nodes.length; i++) {
		nodesBufferData.set({ edges: edgeIndex }, i);

		const node = nodes[i]!;
		const neighbors = edges
			.filter(({ start, end }) => start === node || end === node)
			.map(({ start, end, weight }) => ({ node: start === node ? end : start, weight }));

		for (let j = 0; j < neighbors.length; j++) {
			const neighbor = neighbors[j]!;

			const endIndex = nodes.indexOf(neighbor.node);
			if (endIndex === -1) throw new Error('Node not found');

			edgesBufferData.set({ end: endIndex, weight: neighbor.weight }, edgeIndex);

			edgeIndex++;
		}
	}

	console.log(nodesBufferData.buffer);

	const nodeBuffer = device.createBuffer({
		size: nodesBufferData.buffer.byteLength,
		usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
	});

	device.queue.writeBuffer(nodeBuffer, 0, nodesBufferData.buffer);

	const edgeBuffer = device.createBuffer({
		size: edgesBufferData.buffer.byteLength,
		usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
	});

	device.queue.writeBuffer(edgeBuffer, 0, edgesBufferData.buffer);

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
}
