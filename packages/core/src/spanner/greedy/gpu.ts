import { Graph } from '../../AdjacencyList';
import { AdjacencyMatrix } from '../../AdjacencyMatrix';
import { BufferData } from '../../BufferData';
import { createGPUBuffer, writeGPUBuffer } from '../../GPUBuffer';
import { Spanner, type SpannerParams } from '../index';
import shader from './shader.wgsl?raw';

export class GreedySpanner extends Spanner {
	#device: GPUDevice;

	#graph: Graph;
	#spanner?: Graph;

	#maxDistortion: number;

	#distanceMatrix: AdjacencyMatrix<Float32Array>;
	#distanceMatrixBuffer: GPUBuffer;

	#uniformsBufferData: BufferData<{ k: 'uint'; max_distortion: 'float' }>;
	#uniformsBuffer: GPUBuffer;

	#graphEdgesBufferData: BufferData<{ start: 'uint'; end: 'uint'; weight: 'float' }>;
	#graphEdgesBuffer: GPUBuffer;

	#spannerEdgesBuffer: GPUBuffer;
	#spannerEdgesReadBuffer: GPUBuffer;

	#shaderModule: GPUShaderModule;
	#pipeline: GPUComputePipeline;
	#bindGroup: GPUBindGroup;

	constructor({ device, graph, maxDistortion }: SpannerParams) {
		super();

		this.#device = device;

		this.#graph = graph;

		this.#maxDistortion = maxDistortion;
		this.#uniformsBufferData = new BufferData({ k: 'uint', max_distortion: 'float' });
		this.#uniformsBufferData.set({ max_distortion: this.#maxDistortion });

		this.#uniformsBuffer = createGPUBuffer({
			label: 'uniforms buffer',
			device: this.#device,
			data: this.#uniformsBufferData,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
		});

		this.#graphEdgesBufferData = new BufferData(
			{
				start: 'uint',
				end: 'uint',
				weight: 'float',
			},
			this.#graph.edges.size
		);

		this.#graphEdgesBuffer = createGPUBuffer({
			label: 'graph edges buffer',
			device: this.#device,
			data: this.#graphEdgesBufferData,
			usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
		});

		this.#spannerEdgesBuffer = device.createBuffer({
			label: 'spanner edges buffer',
			size: this.#graph.edges.size * 4,
			usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
		});

		this.#spannerEdgesReadBuffer = this.#device.createBuffer({
			size: this.#spannerEdgesBuffer.size,
			usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
		});

		this.#distanceMatrix = new AdjacencyMatrix(this.#graph.nodes.size, Float32Array);

		for (let x = 0; x < this.#distanceMatrix.size; x++) {
			for (let y = 0; y < this.#distanceMatrix.size; y++) {
				this.#distanceMatrix.set(x, y, x === y ? 0 : Infinity);
			}
		}

		this.#distanceMatrixBuffer = createGPUBuffer({
			label: 'distance matrix buffer',
			device,
			data: this.#distanceMatrix.buffer,
			usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
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
				{ binding: 2, resource: { buffer: this.#graphEdgesBuffer } },
				{ binding: 3, resource: { buffer: this.#spannerEdgesBuffer } },
			],
		});
	}

	async compute(): Promise<Graph> {
		if (this.#spanner) {
			console.log('Spanner already computed');
			return this.#spanner;
		}

		this.#spanner = new Graph();
		this.#graph.nodes.forEach((node) => {
			this.#spanner!.addNode(node);
		});

		const sortedEdges = Array.from(this.#graph.edges)
			.map(([_, edge]) => edge)
			.sort((a, b) => a.weight - b.weight);

		sortedEdges.forEach(({ start, end, weight }, index) => {
			this.#graphEdgesBufferData.set({ start, end, weight }, index);
		});

		writeGPUBuffer({
			device: this.#device,
			buffer: this.#graphEdgesBuffer,
			data: this.#graphEdgesBufferData,
		});

		for (let k = 0; k < sortedEdges.length; k++) {
			this.#uniformsBufferData.set({ k });
			writeGPUBuffer({
				device: this.#device,
				buffer: this.#uniformsBuffer,
				data: this.#uniformsBufferData,
			});

			const encoder = this.#device.createCommandEncoder({ label: 'compute builtin encoder' });
			const pass = encoder.beginComputePass({ label: 'compute builtin pass' });

			pass.setPipeline(this.#pipeline);
			pass.setBindGroup(0, this.#bindGroup);
			pass.dispatchWorkgroups(
				Math.ceil(this.#distanceMatrix.size / 8),
				Math.ceil(this.#distanceMatrix.size / 8)
			);
			pass.end();

			const commandBuffer = encoder.finish();
			this.#device.queue.submit([commandBuffer]);
		}

		const encoder = this.#device.createCommandEncoder({ label: 'compute builtin encoder' });

		encoder.copyBufferToBuffer(
			this.#spannerEdgesBuffer,
			0,
			this.#spannerEdgesReadBuffer,
			0,
			this.#spannerEdgesBuffer.size
		);

		const commandBuffer = encoder.finish();
		this.#device.queue.submit([commandBuffer]);

		await this.#spannerEdgesReadBuffer.mapAsync(GPUMapMode.READ);

		const spannerEdges = new Uint32Array(await this.#spannerEdgesReadBuffer.getMappedRange());

		for (let i = 0; i < spannerEdges.length; i++) {
			const edgeIndex = spannerEdges[i];
			if (edgeIndex === undefined) {
				throw new Error(`Edge ${i} is undefined`);
			}

			if (edgeIndex !== this.#graph.edges.size) {
				const edge = sortedEdges[edgeIndex];
				if (!edge) {
					throw new Error(`Edge ${spannerEdges[i]} not found`);
				}

				this.#spanner.addEdge(edge);
			}
		}

		this.#spannerEdgesReadBuffer.unmap();

		return this.#spanner;
	}

	get graph() {
		return this.#spanner;
	}

	set maxDistortion(value: number) {
		this.#maxDistortion = value;
		this.#uniformsBufferData.set({ max_distortion: this.#maxDistortion });

		this.#spanner = undefined;
	}

	get maxDistortion() {
		return this.#maxDistortion;
	}
}
