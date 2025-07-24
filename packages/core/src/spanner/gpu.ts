import { Graph } from '../AdjacencyList';
import { BufferData } from '../BufferData';
import { createGPUBuffer } from '../GPUBuffer';
import shader from './shader.wgsl?raw';

export type GreedySpannerParams = {
	device: GPUDevice;
	graph: Graph;
	k?: number;
};

export class GreedySpanner {
	graph: Graph;
	#device: GPUDevice;

	#positionsBuffer: GPUBuffer;
	#edgesBuffer: GPUBuffer;
	#counterBuffer: GPUBuffer;
	#uniformsBuffer: GPUBuffer;

	#shaderModule: GPUShaderModule;
	#pipeline: GPUComputePipeline;
	#bindGroup: GPUBindGroup;

	constructor({ device, graph, k = 100 }: GreedySpannerParams) {
		this.graph = graph;
		this.#device = device;

		const theta = (2 * Math.PI) / k;
		console.log('theta:', theta);

		console.log('cos(theta / 2):', Math.cos(theta / 2));
		console.log('sin(theta / 2):', Math.sin(theta / 2));

		console.log('cos(theta / 2) - sin(theta / 2):', Math.cos(theta / 2) - Math.sin(theta / 2));

		const t = 1 / (Math.cos(theta / 2) - Math.sin(theta / 2));
		console.log('t:', t);

		const positionsBufferData = new BufferData(
			{
				x: 'float',
				y: 'float',
			},
			this.graph.nodes.size
		);

		graph.nodes.forEach((node, index) => {
			positionsBufferData.set(
				{
					x: node.x,
					y: node.y,
				},
				index
			);
		});

		this.#positionsBuffer = createGPUBuffer({
			label: 'positions buffer',
			device: this.#device,
			data: positionsBufferData,
			usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
		});

		const maxEdges = (k * graph.nodes.size) / 2;

		const edgesBufferData = new BufferData(
			{
				start: 'uint',
				end: 'uint',
			},
			maxEdges
		);

		this.#edgesBuffer = createGPUBuffer({
			label: 'edges buffer',
			device: this.#device,
			data: edgesBufferData,
			usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
		});

		const counterBufferData = new BufferData({
			value: 'uint',
		});

		this.#counterBuffer = createGPUBuffer({
			label: 'counter buffer',
			device: this.#device,
			data: counterBufferData,
			usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
		});

		const uniformsBufferData = new BufferData({
			k: 'uint',
			node_count: 'uint',
		});
		uniformsBufferData.set({
			k: k,
			node_count: this.graph.nodes.size,
		});

		this.#uniformsBuffer = createGPUBuffer({
			label: 'uniforms buffer',
			device: this.#device,
			data: uniformsBufferData,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
		});

		this.#shaderModule = this.#device.createShaderModule({ code: shader });
		this.#pipeline = this.#device.createComputePipeline({
			label: 'compute pipeline',
			layout: 'auto',
			compute: {
				entryPoint: 'compute',
				module: this.#shaderModule,
			},
		});

		this.#bindGroup = this.#device.createBindGroup({
			label: 'Compute Bind Group',
			layout: this.#pipeline.getBindGroupLayout(0),
			entries: [
				{ binding: 0, resource: { buffer: this.#positionsBuffer } },
				{ binding: 1, resource: { buffer: this.#edgesBuffer } },
				{ binding: 2, resource: { buffer: this.#counterBuffer } },
				{ binding: 3, resource: { buffer: this.#uniformsBuffer } },
			],
		});
	}

	async compute() {
		const counterReadBuffer = this.#device.createBuffer({
			size: this.#counterBuffer.size,
			usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
		});

		const edgesReadBuffer = this.#device.createBuffer({
			size: this.#edgesBuffer.size,
			usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
		});

		const encoder = this.#device.createCommandEncoder({ label: 'compute builtin encoder' });
		const pass = encoder.beginComputePass({ label: 'compute builtin pass' });

		pass.setPipeline(this.#pipeline!);
		pass.setBindGroup(0, this.#bindGroup);
		pass.dispatchWorkgroups(Math.ceil(this.graph.nodes.size / 64));
		pass.end();

		encoder.copyBufferToBuffer(
			this.#counterBuffer,
			0,
			counterReadBuffer,
			0,
			this.#counterBuffer.size
		);

		encoder.copyBufferToBuffer(this.#edgesBuffer, 0, edgesReadBuffer, 0, this.#edgesBuffer.size);

		const commandBuffer = encoder.finish();
		this.#device.queue.submit([commandBuffer]);

		await counterReadBuffer.mapAsync(GPUMapMode.READ);
		const [counter] = new Uint32Array(await counterReadBuffer.getMappedRange());

		await edgesReadBuffer.mapAsync(GPUMapMode.READ);
		const edges = new Uint32Array(await edgesReadBuffer.getMappedRange());

		console.log({ counter });
		console.log({ edges });

		const spanner = new Graph();
		this.graph.nodes.forEach((node, index) => {
			spanner.addNode(node);
		});

		for (let i = 0; i < counter!; i++) {
			const start = edges[i * 2];
			const end = edges[i * 2 + 1];
			if (start === undefined || end === undefined) {
				console.warn('start is undefined. continuing...');
				continue;
			}

			const startNode = this.graph.nodes.get(start);
			const endNode = this.graph.nodes.get(end);

			if (startNode === undefined || endNode === undefined) {
				console.warn('start or end node is undefined. continuing...');
				continue;
			}

			const weight = Math.sqrt(
				Math.pow(endNode.x - startNode.x, 2) + Math.pow(endNode.y - startNode.y, 2)
			);

			spanner.addEdge({ start, end, weight });
		}

		return spanner;
	}
}
