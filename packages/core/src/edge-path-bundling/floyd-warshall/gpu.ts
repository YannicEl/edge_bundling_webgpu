import type { Edge } from '../../AdjacencyList';
import type { Graph } from '../../AdjacencyList';
import { FloydWarshall } from '../../shortest-path/floyd-warshall/FloydWarshall';
import { greedySpanner } from '../../spanner/greedy';

export type EdgePathBundlingGPUFloydWarshallParams = {
	graph: Graph;
	spanner: Graph;
	maxDistortion?: number;
	edgeWeightFactor?: number;
	device: GPUDevice;
};

export class EdgePathBundlingGPUFloydWarshall {
	#graph: Graph;
	#device: GPUDevice;
	#spanner: Graph;
	#maxDistortion: number;
	#floydWarshall: FloydWarshall;

	initialized = false;

	constructor({
		graph,
		spanner,
		maxDistortion = 2,
		edgeWeightFactor = 1,
		device,
	}: EdgePathBundlingGPUFloydWarshallParams) {
		// if (!spanner) {
		// 	this.#spanner = greedySpanner(graph, maxDistortion);
		// }
		this.#graph = graph;
		this.#device = device;
		this.#spanner = spanner;
		this.#maxDistortion = maxDistortion;

		this.#floydWarshall = new FloydWarshall({
			graph: spanner,
			device,
			edgeWeightFactor,
		});
	}

	async init() {
		if (this.initialized) return;
		await this.#floydWarshall.init();
		await this.#floydWarshall.compute();
		this.initialized = true;
	}

	async bundle() {
		if (!this.initialized) await this.init();

		const difference: Edge[] = [];
		this.#graph.edges.forEach((edge, key) => {
			if (!this.#spanner.edges.has(key)) {
				difference.push(edge);
			}
		});

		const shortestPaths = await this.#floydWarshall.shortestPaths(difference);

		const bundeledEdges: {
			edge: Edge;
			controlPoints: { x: number; y: number }[];
		}[] = [];

		let i = 0;
		for (const shortestPath of shortestPaths) {
			const edge = difference[i];
			if (!edge) throw new Error('Edge not found');

			if (shortestPath === null) {
				throw new Error('Shortest path is null');
			}

			if (shortestPath.length <= this.#maxDistortion * edge.weight) {
				bundeledEdges.push({
					edge,
					controlPoints: shortestPath.nodes.slice(1, -1).map((nodeIndex) => {
						const node = this.#graph.nodes.get(nodeIndex);
						if (!node) throw new Error('Node not found');
						return { x: node.x, y: node.y };
					}),
				});
			}

			i++;
		}

		return { bundeledEdges, spanner: this.#spanner };
	}

	async setEdgeWeightFactor(value: number) {
		this.#floydWarshall.edgeWeightFactor = value;
		console.time('compute');
		await this.#floydWarshall.compute();
		console.timeEnd('compute');
	}
}
