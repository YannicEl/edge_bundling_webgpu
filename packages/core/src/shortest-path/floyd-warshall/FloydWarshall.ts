import { AdjacencyMatrix } from '../../AdjacencyMatrix';
import { BufferData } from '../../BufferData';
import { Edge } from '../../Edge';
import type { Graph } from '../../Graph';
import { Node } from '../../Node';
import type { Path } from '../../path';
import { mapAndReadBuffer } from '../../utils';
import shader from './shader.wgsl?raw';

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
	#kBuffer: GPUBuffer | undefined;

	constructor({ graph, device, edgeWeightFactor = 1 }: FloydWarshallParams) {
		this.graph = graph;
		this.#device = device;
		this.distanceMatrix = new AdjacencyMatrix(graph.nodes.size, Float32Array);
		this.nextMatrix = new AdjacencyMatrix(graph.nodes.size, Uint32Array);

		const nodes = [...graph.nodes.values()];
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
					edge.weight = Math.pow(Math.abs(edge.weight), edgeWeightFactor);
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

		this.#kBuffer = this.#device.createBuffer({
			size: 4,
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
				{ binding: 2, resource: { buffer: this.#kBuffer } },
			],
		});
	}

	async compute() {
		for (let k = 0; k < this.distanceMatrix.size; ++k) {
			this.#device.queue.writeBuffer(this.#kBuffer!, 0, new Uint32Array([k]).buffer);

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

	async shortestPaths(paths: { start: Node; end: Node }[]): Promise<(Path | null)[]> {
		const nodes = [...this.graph.nodes];

		const pathsBufferData = new BufferData(
			{
				start: 'uint',
				end: 'uint',
			},
			paths.length
		);

		for (let i = 0; i < paths.length; i++) {
			const { start, end } = paths[i]!;
			const startIndex = nodes.findIndex(([_, node]) => node.equals(start));
			const endIndex = nodes.findIndex(([_, node]) => node.equals(end));

			pathsBufferData.set(
				{
					start: startIndex,
					end: endIndex,
				},
				i
			);
		}

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
			size: nodes.length * paths.length * 4,
			usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
		});

		const shortestPathsNodesReadBuffer = this.#device.createBuffer({
			size: nodes.length * paths.length * 4,
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
			nodes.length * paths.length * 4
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

		const ret: (Path | null)[] = [];

		for (let i = 0; i < paths.length; i++) {
			const endIndex = pathsBufferData.get('end', i)[0]!;

			const tempNodes: Node[] = [];

			for (let j = 0; j < nodes.length; j++) {
				const nodeIndex = shortestPathsNodesData[i * nodes.length + j]!;

				const node = nodes[nodeIndex]?.[1];
				if (!node) throw new Error('Node not found');

				tempNodes.push(node);

				if (nodeIndex === endIndex) break;
			}

			ret.push({
				length: shortestPathsDistancesData[i]!,
				nodes: tempNodes,
			});
		}

		return ret;
	}
}
