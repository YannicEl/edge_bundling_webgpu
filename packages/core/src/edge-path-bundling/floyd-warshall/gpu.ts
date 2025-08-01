import type { EdgePathBundling } from '..';
import type { Edge } from '../../AdjacencyList';
import { Graph } from '../../AdjacencyList';
import { FloydWarshall } from '../../shortest-path/floyd-warshall/FloydWarshall';
import type { Spanner } from '../../spanner';
import { ThetaSpanner } from '../../spanner/theta/gpu';

export type EdgePathBundlingGPUFloydWarshallParams = {
	graph: Graph;
	maxDistortion?: number;
	edgeWeightFactor?: number;
	device: GPUDevice;
};

export class EdgePathBundlingGPUFloydWarshall implements EdgePathBundling {
	#device: GPUDevice;
	#graph: Graph;

	#maxDistortion: number;
	#edgeWeightFactor: number;

	#spanner?: Spanner;
	#floydWarshall?: FloydWarshall;

	constructor({
		device,
		graph,
		maxDistortion = 2,
		edgeWeightFactor = 1,
	}: EdgePathBundlingGPUFloydWarshallParams) {
		this.#device = device;

		this.#graph = graph;

		this.#maxDistortion = maxDistortion;
		this.#edgeWeightFactor = edgeWeightFactor;
	}

	async bundle() {
		if (!this.#spanner) {
			// this.#spanner = new GreedySpanner({
			// 	graph: this.#graph,
			// 	device: this.#device,
			// 	maxDistortion: this.#maxDistortion,
			// });

			this.#spanner = new ThetaSpanner({
				graph: this.#graph,
				device: this.#device,
				k: 100,
			});

			await this.#spanner.compute();
		}

		if (!this.#floydWarshall) {
			this.#floydWarshall = new FloydWarshall({
				graph: this.#spanner.graph,
				device: this.#device,
				edgeWeightFactor: this.#edgeWeightFactor,
			});

			await this.#floydWarshall.compute();
		}

		if (this.#edgeWeightFactor !== this.#floydWarshall.edgeWeightFactor) {
			console.log('Edge weight factor changed. Recomputing Floyd-Warshall');
			this.#floydWarshall.edgeWeightFactor = this.#edgeWeightFactor;
			await this.#floydWarshall.compute();
		}

		const difference: Edge[] = [];
		this.#graph.edges.forEach((edge, key) => {
			if (!this.#spanner!.graph.edges.has(key)) {
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
					controlPoints: shortestPath.nodes.map((nodeIndex) => {
						const node = this.#graph.nodes.get(nodeIndex as number);
						if (!node) throw new Error('Node not found');
						return { x: node.x, y: node.y };
					}),
				});
			}

			i++;
		}

		return bundeledEdges;
	}

	set maxDistortion(maxDistortion: number) {
		this.#maxDistortion = maxDistortion;
	}

	set edgeWeightFactor(edgeWeightFactor: number) {
		this.#edgeWeightFactor = edgeWeightFactor;
	}
}
