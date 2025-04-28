import { AdjacencyMatrix } from './AdjacencyMatrix';
import { Edge } from './Edge';
import shader from './floydWarshall.wgsl?raw';
import type { Graph } from './Graph';
import { Node } from './Node';
import type { Path } from './path';

export type FloydWarshallParams = {
	graph: Graph;
	device: GPUDevice;
};

export class FloydWarshall {
	graph: Graph;
	#device: GPUDevice;

	#pipeline: GPUComputePipeline | undefined;
	#bindGroup: GPUBindGroup | undefined;

	distanceMatrix: AdjacencyMatrix;
	nextMatrix: AdjacencyMatrix;

	#distanceMatrixBuffer: GPUBuffer | undefined;
	#distanceMatrixReadBuffer: GPUBuffer | undefined;
	#nextMatrixBuffer: GPUBuffer | undefined;
	#nextMatrixReadBuffer: GPUBuffer | undefined;
	#kBuffer: GPUBuffer | undefined;

	constructor({ graph, device }: FloydWarshallParams) {
		this.graph = graph;
		this.#device = device;
		this.distanceMatrix = new AdjacencyMatrix(graph.nodes.size);
		this.nextMatrix = new AdjacencyMatrix(graph.nodes.size);

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

		this.#pipeline = await this.#device.createComputePipelineAsync({
			label: 'compute pipeline',
			layout: 'auto',
			compute: {
				module: this.#device.createShaderModule({ code: shader }),
				constants: {
					distance_matrix_size: this.distanceMatrix.size,
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
		console.time('k loop');
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
		}
		console.timeEnd('k loop');

		console.time('read buffer');
		await this.#distanceMatrixReadBuffer!.mapAsync(GPUMapMode.READ);
		const distances = new Float32Array(await this.#distanceMatrixReadBuffer!.getMappedRange());

		await this.#nextMatrixReadBuffer!.mapAsync(GPUMapMode.READ);
		const next = new Float32Array(await this.#nextMatrixReadBuffer!.getMappedRange());
		console.timeEnd('read buffer');

		console.log('Distances:');
		this.distanceMatrix = new AdjacencyMatrix(this.distanceMatrix.size, distances);
		this.distanceMatrix.log();

		console.log('Next:');
		this.nextMatrix = new AdjacencyMatrix(this.nextMatrix.size, next);
		this.nextMatrix.log();
	}

	shortestPaths(paths: { start: Node; end: Node }[]): (Path | null)[] {
		const nodes = [...this.graph.nodes];

		const ret: (Path | null)[] = [];

		for (const { start, end } of paths) {
			const startIndex = nodes.indexOf(start);
			const endIndex = nodes.indexOf(end);

			console.log(`startIndex: ${startIndex}, endIndex: ${endIndex}`);
			const distance = this.distanceMatrix.get(startIndex, endIndex);
			console.log(`distance: ${distance}`);
			if (distance === undefined || distance === Infinity) {
				ret.push(null);
				continue;
			}

			const path: Node[] = [];

			if (this.nextMatrix.get(startIndex, endIndex) === -1) {
				ret.push(null);
				continue;
			}

			path.push(start);

			let newStartIndex = startIndex;
			while (newStartIndex !== endIndex) {
				newStartIndex = this.nextMatrix.get(newStartIndex, endIndex);
				const node = nodes[newStartIndex];
				if (!node) throw new Error('Node not found');
				path.push(node);
			}

			ret.push({
				length: distance,
				nodes: path,
			});
		}

		return ret;
	}
}
