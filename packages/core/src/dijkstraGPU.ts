import { BufferData } from './BufferData';
import shader from './compute.wgsl?raw';
import { createGPUBuffer } from './GPUBuffer';
import type { Graph } from './Graph';
import type { Node } from './Node';
import type { Path } from './path';

export type DijkstraGpuParams = {
	device: GPUDevice;
	graph: Graph;
	paths: {
		start: Node;
		end: Node;
	}[];
};

export async function dijkstraGPU({
	device,
	graph,
	paths,
}: DijkstraGpuParams): Promise<(Path | null)[]> {
	const nodes = [...graph.nodes];

	const list = graph.toAdjacencyList();
	const nodesLength = list.nodes.length * paths.length;

	const pathsBufferData = new BufferData({ start: 'uint', end: 'uint' }, paths.length);
	for (let i = 0; i < paths.length; i++) {
		const { start, end } = paths[i]!;
		const startIndex = nodes.findIndex((node) => node.equals(start));
		const endIndex = nodes.findIndex((node) => node.equals(end));
		if (startIndex === -1 || endIndex === -1) {
			throw new Error('Node not found in graph');
		}

		pathsBufferData.set({ start: startIndex, end: endIndex }, i);
	}

	const nodesBufferData = new BufferData({ edges: 'uint' }, list.nodes.length);
	const edgesBufferData = new BufferData({ end: 'uint', weight: 'float' }, list.edges.length);
	const distancesBufferData = new BufferData({ value: 'float', last: 'uint' }, nodesLength);
	const visitedBufferData = new BufferData({ visited: 'uint' }, nodesLength);

	for (let i = 0; i < nodesLength; i++) {
		if (i < list.nodes.length) {
			const node = list.nodes[i]!;
			nodesBufferData.set({ edges: node }, i);
		}
		visitedBufferData.set({ visited: 0 }, i);
		distancesBufferData.set({ value: Infinity }, i);
	}

	for (let i = 0; i < list.edges.length; i++) {
		const edge = list.edges[i]!;
		edgesBufferData.set({ end: edge.end, weight: edge.weight }, i);
	}

	const pathsBuffer = createGPUBuffer({
		device,
		data: pathsBufferData,
		usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
	});

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

	const shortestPathsBuffer = device.createBuffer({
		size: paths.length * list.nodes.length * 4,
		usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
	});

	const shortestPathsReadBuffer = device.createBuffer({
		size: paths.length * list.nodes.length * 4,
		usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
	});

	const shortestDistancesBuffer = device.createBuffer({
		size: paths.length * 4,
		usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
	});

	const shortestDistancesReadBuffer = device.createBuffer({
		size: paths.length * 4,
		usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
	});

	const pipeline = await device.createComputePipelineAsync({
		label: 'compute pipeline',
		layout: 'auto',
		compute: {
			module: device.createShaderModule({ code: shader }),
			constants: {
				node_count: list.nodes.length,
			},
		},
	});

	const bindGroup = device.createBindGroup({
		label: 'Compute Bind Group',
		layout: pipeline.getBindGroupLayout(0),
		entries: [
			{ binding: 0, resource: { buffer: pathsBuffer } },
			{ binding: 1, resource: { buffer: nodesBuffer } },
			{ binding: 2, resource: { buffer: edgesBuffer } },
			{ binding: 3, resource: { buffer: distancesBuffer } },
			{ binding: 4, resource: { buffer: visitedBuffer } },
			{ binding: 5, resource: { buffer: shortestPathsBuffer } },
			{ binding: 6, resource: { buffer: shortestDistancesBuffer } },
		],
	});

	// Encode commands to do the computation
	const encoder = device.createCommandEncoder({ label: 'compute builtin encoder' });
	const pass = encoder.beginComputePass({ label: 'compute builtin pass' });

	pass.setPipeline(pipeline);
	pass.setBindGroup(0, bindGroup);
	pass.dispatchWorkgroups(paths.length);
	pass.end();

	encoder.copyBufferToBuffer(
		shortestPathsBuffer,
		0,
		shortestPathsReadBuffer,
		0,
		paths.length * list.nodes.length * 4
	);
	encoder.copyBufferToBuffer(
		shortestDistancesBuffer,
		0,
		shortestDistancesReadBuffer,
		0,
		paths.length * 4
	);

	// Finish encoding and submit the commands
	const commandBuffer = encoder.finish();
	device.queue.submit([commandBuffer]);

	await shortestPathsReadBuffer.mapAsync(GPUMapMode.READ);
	await shortestDistancesReadBuffer.mapAsync(GPUMapMode.READ);

	const shortestPathsData = new Uint32Array(await shortestPathsReadBuffer.getMappedRange());
	const shortestDistanceData = new Float32Array(await shortestDistancesReadBuffer.getMappedRange());

	const ret: (Path | null)[] = [];

	for (let i = 0; i < paths.length; i++) {
		const path = shortestPathsData.slice(i * list.nodes.length, (i + 1) * list.nodes.length);
		const distance = shortestDistanceData[i];

		if (distance === undefined || distance === Infinity) {
			ret.push(null);
			continue;
		}

		const shortestPath: number[] = [];
		for (const node of path) {
			if (node === list.nodes.length) break;

			shortestPath.unshift(node);
		}

		ret.push({
			length: distance,
			nodes: shortestPath.map((node) => nodes[node]!),
		});
	}

	return ret;
}
