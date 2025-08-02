import { Graph } from '../../AdjacencyList';
import { BufferData } from '../../BufferData';
import { createGPUBuffer, writeGPUBuffer } from '../../GPUBuffer';
import type { SpannerParams } from '../index';
import { Spanner } from '../index';
import shader from './shader.wgsl?raw';

export class ThetaSpanner extends Spanner {
	#device: GPUDevice;

	#graph: Graph;
	#spanner?: Graph;

	#maxDistortion: number;
	#k: number;

	#uniformsBufferData: BufferData<{ k: 'uint'; theta: 'float'; node_count: 'uint' }>;
	#uniformsBuffer: GPUBuffer;

	#positionsBuffer: GPUBuffer;

	#edgesBuffer: GPUBuffer;
	#edgesReadBuffer: GPUBuffer;

	#counterBufferData: BufferData<{ value: 'uint' }>;
	#counterBuffer: GPUBuffer;
	#counterReadBuffer: GPUBuffer;

	#shaderModule: GPUShaderModule;
	#pipeline: GPUComputePipeline;
	#bindGroup: GPUBindGroup;

	constructor({ device, graph, maxDistortion }: SpannerParams) {
		super();

		this.#device = device;

		this.#graph = graph;

		this.#maxDistortion = maxDistortion;
		this.#k = this.#maxDistortion;
		// this.#k = this.#maxDistortion * 50;

		console.log({ k: this.#k });

		const positionsBufferData = new BufferData({ x: 'float', y: 'float' }, this.#graph.nodes.size);

		this.#graph.nodes.forEach(({ x, y }, index) => {
			positionsBufferData.set({ x, y }, index);
		});

		this.#positionsBuffer = createGPUBuffer({
			label: 'positions buffer',
			device: this.#device,
			data: positionsBufferData,
			usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
		});

		const { edgesBuffer, edgesReadBuffer } = this.updateEdgesBuffer();
		this.#edgesBuffer = edgesBuffer;
		this.#edgesReadBuffer = edgesReadBuffer;

		this.#counterBufferData = new BufferData({ value: 'uint' });
		this.#counterBuffer = createGPUBuffer({
			label: 'counter buffer',
			device: this.#device,
			data: this.#counterBufferData,
			usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
		});

		this.#counterReadBuffer = this.#device.createBuffer({
			size: this.#counterBuffer.size,
			usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
		});

		this.#uniformsBufferData = new BufferData({
			k: 'uint',
			theta: 'float',
			node_count: 'uint',
		});

		this.#uniformsBufferData.set({
			k: this.#k,
			theta: (Math.PI * 2) / this.#k,
			node_count: this.#graph.nodes.size,
		});

		this.#uniformsBuffer = createGPUBuffer({
			label: 'uniforms buffer',
			device: this.#device,
			data: this.#uniformsBufferData,
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
		// if (this.#spanner) {
		// 	return this.#spanner;
		// }

		writeGPUBuffer({
			device: this.#device,
			buffer: this.#uniformsBuffer,
			data: this.#uniformsBufferData,
		});

		this.#counterBufferData.set({ value: 0 });
		writeGPUBuffer({
			device: this.#device,
			buffer: this.#counterBuffer,
			data: this.#counterBufferData,
		});

		const encoder = this.#device.createCommandEncoder({ label: 'compute builtin encoder' });
		const pass = encoder.beginComputePass({ label: 'compute builtin pass' });

		pass.setPipeline(this.#pipeline);
		pass.setBindGroup(0, this.#bindGroup);
		pass.dispatchWorkgroups(Math.ceil(this.#graph.nodes.size / 64));
		pass.end();

		encoder.copyBufferToBuffer(
			this.#counterBuffer,
			0,
			this.#counterReadBuffer,
			0,
			this.#counterBuffer.size
		);

		encoder.copyBufferToBuffer(
			this.#edgesBuffer,
			0,
			this.#edgesReadBuffer,
			0,
			this.#edgesBuffer.size
		);

		const commandBuffer = encoder.finish();
		this.#device.queue.submit([commandBuffer]);

		await this.#counterReadBuffer.mapAsync(GPUMapMode.READ);
		const [counter] = new Uint32Array(await this.#counterReadBuffer.getMappedRange());

		await this.#edgesReadBuffer.mapAsync(GPUMapMode.READ);
		const edges = new Uint32Array(await this.#edgesReadBuffer.getMappedRange());

		const spanner = new Graph();
		this.#graph.nodes.forEach((node) => {
			spanner.addNode(node);
		});

		for (let i = 0; i < counter!; i++) {
			const start = edges[i * 2];
			const end = edges[i * 2 + 1];

			if (start === undefined || end === undefined) {
				console.warn('start is undefined. continuing...');
				continue;
			}

			const startNode = this.#graph.nodes.get(start);
			const endNode = this.#graph.nodes.get(end);

			if (startNode === undefined || endNode === undefined) {
				console.warn('start or end node is undefined. continuing...');
				continue;
			}

			const weight = Math.sqrt(
				Math.pow(endNode.x - startNode.x, 2) + Math.pow(endNode.y - startNode.y, 2)
			);

			spanner.addEdge({ start, end, weight });
		}

		// spanner.edges.forEach((edge) => {
		// 	if (!this.#graph.edges.has(`${edge.start}_${edge.end}`)) {
		// 		spanner.removeEdge(edge);
		// 	}
		// });

		this.#counterReadBuffer.unmap();
		this.#edgesReadBuffer.unmap();

		this.#spanner = spanner;
		return spanner;
	}

	get graph(): Graph | undefined {
		return this.#spanner;
	}

	set maxDistortion(value: number) {
		this.#maxDistortion = value;
		this.#k = this.#maxDistortion;
		// this.#k = Math.floor(this.#maxDistortion * 50);

		this.#uniformsBufferData.set({
			k: this.#k,
			theta: (Math.PI * 2) / this.#k,
		});

		// this.updateEdgesBuffer();
	}

	get maxDistortion() {
		return this.#maxDistortion;
	}

	private updateEdgesBuffer() {
		const edgesBufferData = new BufferData(
			{
				start: 'uint',
				end: 'uint',
			},
			Math.floor((this.#k * this.#graph.nodes.size) / 2)
		);

		this.#edgesBuffer = createGPUBuffer({
			label: 'edges buffer',
			device: this.#device,
			data: edgesBufferData,
			usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
		});

		this.#edgesReadBuffer = this.#device.createBuffer({
			size: this.#edgesBuffer.size,
			usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
		});

		return { edgesBuffer: this.#edgesBuffer, edgesReadBuffer: this.#edgesReadBuffer };
	}
}
