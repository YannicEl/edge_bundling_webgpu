import { AdjacencyMatrix } from '../../AdjacencyMatrix';
import { BufferData } from '../../BufferData';
import type { Edge, Graph, Node } from '../../AdjacencyList';
import type { Path } from '../../path';
import { mapAndReadBuffer } from '../../utils';
import shader from './shader.wgsl?raw';
import { writeGPUBuffer } from '../../GPUBuffer';

export type FloydWarshallParams = {
	graph: Graph;
	device: GPUDevice;
	edgeWeightFactor?: number;
};

export class FloydWarshall {
	graph: Graph;
	#device: GPUDevice;

	#pipeline: GPUComputePipeline | undefined;
	#bindGroup: GPUBindGroup | undefined;
	#shaderModule: GPUShaderModule | undefined;

	distanceMatrix: AdjacencyMatrix<Float32Array>;
	nextMatrix: AdjacencyMatrix<Uint32Array>;

	#distanceMatrixBuffer: GPUBuffer | undefined;
	#distanceMatrixReadBuffer: GPUBuffer | undefined;
	#nextMatrixBuffer: GPUBuffer | undefined;
	#nextMatrixReadBuffer: GPUBuffer | undefined;

	#uniformsBufferData: BufferData<{ k: 'uint'; edge_weight_factor: 'float' }>;
	#uniformsBuffer: GPUBuffer | undefined;

	constructor({ graph, device, edgeWeightFactor = 1 }: FloydWarshallParams) {
		this.graph = graph;
		this.#device = device;
		this.distanceMatrix = new AdjacencyMatrix(graph.nodes.size, Float32Array);
		this.nextMatrix = new AdjacencyMatrix(graph.nodes.size, Uint32Array);

		this.#uniformsBufferData = new BufferData({
			k: 'uint',
			edge_weight_factor: 'float',
		});
		this.#uniformsBufferData.set({ edge_weight_factor: edgeWeightFactor });

		for (let x = 0; x < this.distanceMatrix.size; x++) {
			for (let y = 0; y < this.distanceMatrix.size; y++) {
				if (x === y) {
					this.distanceMatrix.set(x, y, 0);
					continue;
				}

				const node1 = graph.nodes.get(x);
				const node2 = graph.nodes.get(y);
				if (!node1 || !node2) throw new Error('Node not found');

				let edge: Edge | null = null;
				if (graph.adjacencyList.get(x)?.has(y) && graph.adjacencyList.get(y)?.has(x)) {
					const weight = Math.sqrt(Math.pow(node2.x - node1.x, 2) + Math.pow(node2.y - node1.y, 2));

					edge = {
						start: x,
						end: y,
						weight,
					};
				}

				if (edge) {
					this.distanceMatrix.set(x, y, edge.weight);
					this.nextMatrix.set(x, y, y);
				} else {
					this.distanceMatrix.set(x, y, Infinity);
					this.nextMatrix.set(x, y, -1);
				}
			}
		}
	}

	async init() {
		this.#distanceMatrixBuffer = this.#device.createBuffer({
			size: this.distanceMatrix.buffer.byteLength,
			usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
		});

		this.#device.queue.writeBuffer(this.#distanceMatrixBuffer, 0, this.distanceMatrix.buffer);

		this.#distanceMatrixReadBuffer = this.#device.createBuffer({
			size: this.distanceMatrix.buffer.byteLength,
			usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
		});

		this.#nextMatrixBuffer = this.#device.createBuffer({
			size: this.nextMatrix.buffer.byteLength,
			usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
		});

		this.#device.queue.writeBuffer(this.#nextMatrixBuffer, 0, this.nextMatrix.buffer);

		this.#nextMatrixReadBuffer = this.#device.createBuffer({
			size: this.nextMatrix.buffer.byteLength,
			usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
		});

		this.#uniformsBuffer = this.#device.createBuffer({
			size: this.#uniformsBufferData.buffer.byteLength,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
		});

		this.#shaderModule = this.#device.createShaderModule({ code: shader });

		this.#pipeline = await this.#device.createComputePipelineAsync({
			label: 'compute pipeline',
			layout: 'auto',
			compute: {
				entryPoint: 'compute_matrix',
				module: this.#shaderModule,
				constants: {
					node_count: this.distanceMatrix.size,
				},
			},
		});

		this.#bindGroup = this.#device.createBindGroup({
			label: 'Compute Bind Group',
			layout: this.#pipeline.getBindGroupLayout(0),
			entries: [
				{ binding: 0, resource: { buffer: this.#distanceMatrixBuffer } },
				{ binding: 1, resource: { buffer: this.#nextMatrixBuffer } },
				{ binding: 2, resource: { buffer: this.#uniformsBuffer } },
			],
		});
	}

	async compute() {
		for (let k = 0; k < this.distanceMatrix.size; ++k) {
			this.#uniformsBufferData.set({ k });

			writeGPUBuffer({
				device: this.#device,
				buffer: this.#uniformsBuffer!,
				data: this.#uniformsBufferData,
			});

			// Encode commands to do the computation
			const encoder = this.#device.createCommandEncoder({ label: 'compute builtin encoder' });
			const pass = encoder.beginComputePass({ label: 'compute builtin pass' });

			pass.setPipeline(this.#pipeline!);
			pass.setBindGroup(0, this.#bindGroup);
			pass.dispatchWorkgroups(
				Math.ceil(this.distanceMatrix.size / 8),
				Math.ceil(this.distanceMatrix.size / 8)
			);
			pass.end();

			const commandBuffer = encoder.finish();
			this.#device.queue.submit([commandBuffer]);
		}

		const encoder = this.#device.createCommandEncoder({ label: 'compute builtin encoder' });
		encoder.copyBufferToBuffer(
			this.#distanceMatrixBuffer!,
			0,
			this.#distanceMatrixReadBuffer!,
			0,
			this.distanceMatrix.buffer.byteLength
		);

		encoder.copyBufferToBuffer(
			this.#nextMatrixBuffer!,
			0,
			this.#nextMatrixReadBuffer!,
			0,
			this.nextMatrix.buffer.byteLength
		);

		const commandBuffer = encoder.finish();
		this.#device.queue.submit([commandBuffer]);

		await this.#distanceMatrixReadBuffer!.mapAsync(GPUMapMode.READ);
		const distances = new Float32Array(await this.#distanceMatrixReadBuffer!.getMappedRange());

		await this.#nextMatrixReadBuffer!.mapAsync(GPUMapMode.READ);
		const next = new Uint32Array(await this.#nextMatrixReadBuffer!.getMappedRange());
		this.distanceMatrix.values = distances;
		this.nextMatrix.values = next;
	}

	async shortestPaths(paths: { start: number; end: number }[]): Promise<(Path | null)[]> {
		console.time('Shortest Paths Buffer Data');
		const pathsBufferData = new BufferData(
			{
				start: 'uint',
				end: 'uint',
			},
			paths.length
		);

		for (let i = 0; i < paths.length; i++) {
			const { start, end } = paths[i]!;
			pathsBufferData.set({ start, end }, i);
		}
		console.timeEnd('Shortest Paths Buffer Data');

		console.time('Shortest Paths Buffer Compute');
		const pathsBuffer = this.#device.createBuffer({
			label: 'Paths Buffer',
			size: pathsBufferData.buffer.byteLength,
			usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
		});

		this.#device.queue.writeBuffer(pathsBuffer, 0, pathsBufferData.buffer);

		const shortestPathsDistancesBuffer = this.#device.createBuffer({
			size: paths.length * 4,
			usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
		});

		const shortestPathsDistancesReadBuffer = this.#device.createBuffer({
			size: paths.length * 4,
			usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
		});

		const shortestPathsNodesBuffer = this.#device.createBuffer({
			size: this.graph.nodes.size * paths.length * 4,
			usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
		});

		const shortestPathsNodesReadBuffer = this.#device.createBuffer({
			size: this.graph.nodes.size * paths.length * 4,
			usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
		});

		const pipeline = await this.#device.createComputePipelineAsync({
			label: 'Compute Shortest Paths Pipeline',
			layout: 'auto',
			compute: {
				entryPoint: 'compute_shortest_paths',
				module: this.#shaderModule!,
				constants: {
					node_count: this.distanceMatrix.size,
				},
			},
		});

		const bindGroup = this.#device.createBindGroup({
			label: 'Compute Shortest Paths Bind Group',
			layout: pipeline.getBindGroupLayout(0),
			entries: [
				{ binding: 0, resource: { buffer: this.#distanceMatrixBuffer! } },
				{ binding: 1, resource: { buffer: this.#nextMatrixBuffer! } },
				{ binding: 3, resource: { buffer: pathsBuffer } },
				{ binding: 4, resource: { buffer: shortestPathsDistancesBuffer } },
				{ binding: 5, resource: { buffer: shortestPathsNodesBuffer } },
			],
		});

		const encoder = this.#device.createCommandEncoder({ label: 'compute shortest paths encoder' });
		const pass = encoder.beginComputePass({ label: 'compute shortest paths pass' });

		pass.setPipeline(pipeline);
		pass.setBindGroup(0, bindGroup);
		pass.dispatchWorkgroups(Math.ceil(paths.length / 64));
		pass.end();

		encoder.copyBufferToBuffer(
			shortestPathsDistancesBuffer,
			0,
			shortestPathsDistancesReadBuffer,
			0,
			paths.length * 4
		);

		encoder.copyBufferToBuffer(
			shortestPathsNodesBuffer,
			0,
			shortestPathsNodesReadBuffer,
			0,
			this.graph.nodes.size * paths.length * 4
		);

		const commandBuffer = encoder.finish();
		this.#device.queue.submit([commandBuffer]);

		const shortestPathsDistancesData = await mapAndReadBuffer(
			shortestPathsDistancesReadBuffer,
			Float32Array
		);
		const shortestPathsNodesData = await mapAndReadBuffer(
			shortestPathsNodesReadBuffer,
			Uint32Array
		);
		console.timeEnd('Shortest Paths Buffer Compute');

		console.time('Shortest Paths Buffer Map');
		const ret: (Path | null)[] = [];

		for (let i = 0; i < paths.length; i++) {
			const endIndex = pathsBufferData.get('end', i)[0]!;

			const nodes: number[] = [];

			for (let j = 0; j < this.graph.nodes.size; j++) {
				const nodeIndex = shortestPathsNodesData[i * this.graph.nodes.size + j]!;
				nodes.push(nodeIndex);

				if (nodeIndex === endIndex) break;
			}

			ret.push({
				length: shortestPathsDistancesData[i]!,
				nodes,
			});
		}
		console.timeEnd('Shortest Paths Buffer Map');

		return ret;
	}
}
