import { AdjacencyMatrix } from './AdjacencyMatrix';
import { Edge } from './Edge';
import shader from './floydWarshall.wgsl?raw';
import type { Graph } from './Graph';
import { initWebGPU } from './webGpu';

export type FloydWarshallParams = {
	graph: Graph;
	device: GPUDevice;
};

export class FloydWarshall {
	distanceMatrix: AdjacencyMatrix;

	constructor({ graph, device }: FloydWarshallParams) {
		this.distanceMatrix = new AdjacencyMatrix(graph.nodes.size);

		const nodes = [...graph.nodes];
		for (let x = 0; x < this.distanceMatrix.size; x++) {
			for (let y = 0; y < this.distanceMatrix.size; y++) {
				if (x === y) {
					this.distanceMatrix.set(x, y, 0);
					continue;
				}

				const node1 = nodes[x];
				const node2 = nodes[y];
				if (!node1 || !node2) {
					throw new Error('Node not found');
				}

				let edge = null;
				if (node1.edges.has(node2) && node2.edges.has(node1)) {
					edge = new Edge(node1, node2);
				}

				this.distanceMatrix.set(x, y, edge ? edge.weight : Infinity);
			}
		}
	}
}

export async function floydWarshall(graph: Graph) {
	const distanceMatrix = new AdjacencyMatrix(graph.nodes.size);

	graph.nodes.values;

	const nodes = [...graph.nodes];

	for (let x = 0; x < distanceMatrix.size; x++) {
		for (let y = 0; y < distanceMatrix.size; y++) {
			if (x === y) {
				distanceMatrix.set(x, y, 0);
				continue;
			}

			const node1 = nodes[x];
			const node2 = nodes[y];
			if (!node1 || !node2) {
				throw new Error('Node not found');
			}

			let edge = null;
			if (node1.edges.has(node2) && node2.edges.has(node1)) {
				edge = new Edge(node1, node2);
			}

			distanceMatrix.set(x, y, edge ? edge.weight : Infinity);
		}
	}

	const { device } = await initWebGPU();

	const distanceMatrixBuffer = device.createBuffer({
		size: distanceMatrix.buffer.byteLength,
		usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
	});

	device.queue.writeBuffer(distanceMatrixBuffer, 0, distanceMatrix.buffer);

	const kBuffer = device.createBuffer({
		size: 4,
		usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
	});

	const distanceMatrixReadBuffer = device.createBuffer({
		size: distanceMatrix.buffer.byteLength,
		usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
	});

	const pipeline = await device.createComputePipelineAsync({
		label: 'compute pipeline',
		layout: 'auto',
		compute: {
			module: device.createShaderModule({ code: shader }),
			constants: {
				distance_matrix_size: distanceMatrix.size,
			},
		},
	});

	const bindGroup = device.createBindGroup({
		label: 'Compute Bind Group',
		layout: pipeline.getBindGroupLayout(0),
		entries: [
			{ binding: 0, resource: { buffer: distanceMatrixBuffer } },
			{ binding: 1, resource: { buffer: kBuffer } },
		],
	});

	console.time('k loop');
	for (let k = 0; k < distanceMatrix.size; ++k) {
		device.queue.writeBuffer(kBuffer, 0, new Uint32Array([k]).buffer);

		// Encode commands to do the computation
		const encoder = device.createCommandEncoder({ label: 'compute builtin encoder' });
		const pass = encoder.beginComputePass({ label: 'compute builtin pass' });

		pass.setPipeline(pipeline);
		pass.setBindGroup(0, bindGroup);
		pass.dispatchWorkgroups(Math.ceil(distanceMatrix.size / 8), Math.ceil(distanceMatrix.size / 8));
		pass.end();

		encoder.copyBufferToBuffer(
			distanceMatrixBuffer,
			0,
			distanceMatrixReadBuffer,
			0,
			distanceMatrix.buffer.byteLength
		);

		const commandBuffer = encoder.finish();
		device.queue.submit([commandBuffer]);
	}
	console.timeEnd('k loop');

	console.time('read buffer');
	await distanceMatrixReadBuffer.mapAsync(GPUMapMode.READ);
	const result = new Float32Array(await distanceMatrixReadBuffer.getMappedRange());
	console.timeEnd('read buffer');

	console.log(result);
}
