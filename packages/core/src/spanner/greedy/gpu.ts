import type { Spanner } from '..';
import { Graph } from '../../AdjacencyList';
import { AdjacencyMatrix } from '../../AdjacencyMatrix';
import { BufferData } from '../../BufferData';
import { createGPUBuffer, writeGPUBuffer } from '../../GPUBuffer';
import shader from './shader.wgsl?raw';

export type GreedySpannerParams = {
	device: GPUDevice;
	graph: Graph;
	maxDistortion: number;
};

export class GreedySpanner implements Spanner {
	#graph: Graph;
	#spanner: Graph;
	#maxDistortion: number;
	#device: GPUDevice;

	#distanceMatrix: AdjacencyMatrix<Float32Array>;
	#distanceMatrixBuffer: GPUBuffer;
	#distanceMatrixReadBuffer: GPUBuffer;

	#uniformsBufferData: BufferData<{ k: 'uint'; max_distortion: 'float' }>;
	#uniformsBuffer: GPUBuffer;

	#edgesBufferData: BufferData<{ start: 'uint'; end: 'uint'; weight: 'float' }>;
	#edgesBuffer: GPUBuffer;

	#skippedBufferData: BufferData<{ skipped: 'uint' }>;
	#skippedBuffer: GPUBuffer;
	#skippedReadBuffer: GPUBuffer;

	#shaderModule: GPUShaderModule;
	#pipeline: GPUComputePipeline;
	#bindGroup: GPUBindGroup;

	constructor({ device, graph, maxDistortion }: GreedySpannerParams) {
		this.#device = device;

		this.#graph = graph;
		this.#spanner = new Graph();

		this.#maxDistortion = maxDistortion;

		this.#uniformsBufferData = new BufferData({ k: 'uint', max_distortion: 'float' });
		this.#uniformsBufferData.set({ max_distortion: this.#maxDistortion });

		this.#uniformsBuffer = createGPUBuffer({
			label: 'uniforms buffer',
			device: this.#device,
			data: this.#uniformsBufferData,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
		});

		this.#edgesBufferData = new BufferData(
			{
				start: 'uint',
				end: 'uint',
				weight: 'float',
			},
			this.#graph.edges.size
		);

		this.#edgesBuffer = createGPUBuffer({
			label: 'edges buffer',
			device: this.#device,
			data: this.#edgesBufferData,
			usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
		});

		this.#distanceMatrix = new AdjacencyMatrix(this.#graph.nodes.size, Float32Array);

		for (let x = 0; x < this.#distanceMatrix.size; x++) {
			for (let y = 0; y < this.#distanceMatrix.size; y++) {
				this.#distanceMatrix.set(x, y, x === y ? 0 : Infinity);
			}
		}

		this.#distanceMatrixBuffer = createGPUBuffer({
			label: 'distance matrix',
			device,
			data: this.#distanceMatrix.buffer,
			usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
		});

		this.#distanceMatrixReadBuffer = this.#device.createBuffer({
			size: this.#distanceMatrix.buffer.byteLength,
			usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
		});

		this.#skippedBufferData = new BufferData({ skipped: 'uint' });
		this.#skippedBufferData.set({ skipped: 0 });
		this.#skippedBuffer = createGPUBuffer({
			label: 'skipped buffer',
			device: this.#device,
			data: this.#skippedBufferData,
			usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
		});

		this.#skippedReadBuffer = this.#device.createBuffer({
			size: 4,
			usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
		});

		this.#shaderModule = this.#device.createShaderModule({ code: shader });
		this.#pipeline = this.#device.createComputePipeline({
			label: 'compute pipeline',
			layout: 'auto',
			compute: {
				entryPoint: 'compute',
				module: this.#shaderModule,
				constants: {
					node_count: this.#distanceMatrix.size,
				},
			},
		});

		this.#bindGroup = this.#device.createBindGroup({
			label: 'Compute Bind Group',
			layout: this.#pipeline.getBindGroupLayout(0),
			entries: [
				{ binding: 0, resource: { buffer: this.#uniformsBuffer } },
				{ binding: 1, resource: { buffer: this.#distanceMatrixBuffer } },
				{ binding: 2, resource: { buffer: this.#edgesBuffer } },
				{ binding: 3, resource: { buffer: this.#skippedBuffer } },
			],
		});
	}

	set maxDistortion(value: number) {
		this.#maxDistortion = value;
		this.#uniformsBufferData.set({ max_distortion: this.#maxDistortion });
	}

	get graph() {
		return this.#spanner;
	}

	async compute(): Promise<Graph> {
		const skippedReadBuffer = this.#device.createBuffer({
			size: 4,
			usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
		});

		this.#spanner = new Graph();
		this.#graph.nodes.forEach((node) => {
			this.#spanner.addNode(node);
		});

		const sortedEdges = Array.from(this.#graph.edges)
			.map(([_, edge]) => edge)
			.sort((a, b) => a.weight - b.weight);

		sortedEdges.forEach(({ start, end, weight }, index) => {
			this.#edgesBufferData.set({ start, end, weight }, index);
		});

		writeGPUBuffer({
			device: this.#device,
			buffer: this.#edgesBuffer,
			data: this.#edgesBufferData,
		});

		let k = 0;
		let skipped = 0;
		let copyTime = 0;
		let readTime = 0;
		for (const edge of sortedEdges) {
			this.#uniformsBufferData.set({ k });
			// writeGPUBuffer({
			// 	device: this.#device,
			// 	buffer: this.#uniformsBuffer,
			// 	data: this.#uniformsBufferData,
			// });

			k++;

			if (this.#distanceMatrix.get(edge.start, edge.end) > this.#maxDistortion * edge.weight) {
				this.#spanner.addEdge(edge);

				for (let x = 0; x < this.#distanceMatrix.size; x++) {
					for (let y = 0; y < this.#distanceMatrix.size; y++) {
						const weight = Math.min(
							this.#distanceMatrix.get(x, y),
							this.#distanceMatrix.get(x, edge.start) +
								edge.weight +
								this.#distanceMatrix.get(edge.end, y),
							this.#distanceMatrix.get(x, edge.end) +
								edge.weight +
								this.#distanceMatrix.get(edge.start, y)
						);
						this.#distanceMatrix.set(x, y, weight);
					}
				}

				// const encoder = this.#device.createCommandEncoder({ label: 'compute builtin encoder' });
				// const pass = encoder.beginComputePass({ label: 'compute builtin pass' });

				// pass.setPipeline(this.#pipeline!);
				// pass.setBindGroup(0, this.#bindGroup);
				// pass.dispatchWorkgroups(
				// 	Math.ceil(this.#distanceMatrix.size / 8),
				// 	Math.ceil(this.#distanceMatrix.size / 8)
				// );
				// pass.end();

				// encoder.copyBufferToBuffer(
				// 	this.#distanceMatrixBuffer,
				// 	0,
				// 	this.#distanceMatrixReadBuffer,
				// 	0,
				// 	this.#distanceMatrixBuffer.size
				// );

				// const commandBuffer = encoder.finish();
				// this.#device.queue.submit([commandBuffer]);

				// let start = performance.now();
				// await this.#distanceMatrixReadBuffer.mapAsync(GPUMapMode.READ);
				// readTime += performance.now() - start;

				// const distances = new Float32Array(await this.#distanceMatrixReadBuffer.getMappedRange());

				// start = performance.now();
				// const distancesCopy = new Float32Array(distances.byteLength);
				// distancesCopy.set(new Float32Array(distances));
				// copyTime += performance.now() - start;

				// this.#distanceMatrix.values = distancesCopy;

				// await this.#distanceMatrixReadBuffer.unmap();
			} else {
				skipped++;
			}
		}

		// const encoder = this.#device.createCommandEncoder({ label: 'compute builtin encoder' });

		// encoder.copyBufferToBuffer(
		// 	this.#skippedBuffer,
		// 	0,
		// 	this.#skippedReadBuffer,
		// 	0,
		// 	this.#skippedBuffer.size
		// );

		// const commandBuffer = encoder.finish();
		// this.#device.queue.submit([commandBuffer]);

		// await this.#skippedReadBuffer.mapAsync(GPUMapMode.READ);
		// const [newSkipped] = new Uint32Array(await this.#skippedReadBuffer.getMappedRange());

		// console.log({ newSkipped });
		// console.log({ copyTime, readTime });

		// console.log({ skipped });
		// console.log({ skippedPercentage: (skipped / sortedEdges.length) * 100 });

		return this.#spanner;
	}
}
