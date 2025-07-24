import { Graph } from '../AdjacencyList';
import { AdjacencyMatrix } from '../AdjacencyMatrix';
import { FloydWarshall } from '../shortest-path/floyd-warshall/FloydWarshall';

export type GreedySpannerParams = {
	device: GPUDevice;
	graph: Graph;
	maxDistortion: number;
};

export class GreedySpanner {
	graph: Graph;
	maxDistortion: number;
	#device: GPUDevice;
	#floydWarshall: FloydWarshall;

	constructor({ device, graph, maxDistortion }: GreedySpannerParams) {
		this.graph = graph;
		this.maxDistortion = maxDistortion;
		this.#device = device;

		this.#floydWarshall = new FloydWarshall({
			device,
			graph: this.graph,
		});
	}

	async compute() {
		await this.#floydWarshall.init();
		console.time('Floyd Warshall');
		await this.#floydWarshall.compute(true);
		console.timeEnd('Floyd Warshall');

		const spanner = new Graph();
		this.graph.nodes.forEach((node) => {
			spanner.addNode(node);
		});

		console.log(this.maxDistortion);
		const distanceMatrix = new AdjacencyMatrix(
			this.#floydWarshall.distanceMatrix.size,
			Float32Array
		);

		for (let x = 0; x < distanceMatrix.size; x++) {
			for (let y = 0; y < distanceMatrix.size; y++) {
				distanceMatrix.set(x, y, x === y ? 0 : Infinity);
			}
		}
		const sortedEdges = Array.from(this.graph.edges)
			.map(([_, edge]) => edge)
			.sort((a, b) => a.weight - b.weight);

		let skipped = 0;
		for (const edge of sortedEdges) {
			console.log(
				edge.weight.toFixed(3) ===
					this.#floydWarshall.distanceMatrix.get(edge.start, edge.end).toFixed(3)
			);
			if (
				distanceMatrix.get(edge.start, edge.end) >
				this.maxDistortion * this.#floydWarshall.distanceMatrix.get(edge.start, edge.end)
			) {
				spanner.addEdge(edge);

				for (let x = 0; x < distanceMatrix.size; x++) {
					for (let y = 0; y < distanceMatrix.size; y++) {
						const weight = Math.min(
							distanceMatrix.get(x, y),
							distanceMatrix.get(x, edge.start) + edge.weight + distanceMatrix.get(edge.end, y),
							distanceMatrix.get(x, edge.end) + edge.weight + distanceMatrix.get(edge.start, y)
						);
						distanceMatrix.set(x, y, weight);
					}
				}
			} else {
				skipped++;
			}
		}

		console.log({ skipped });
		console.log({ skippedPercentage: (skipped / sortedEdges.length) * 100 });
		return spanner;
	}
}
