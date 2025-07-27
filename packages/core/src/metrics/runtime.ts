import type { Graph } from '../AdjacencyList';
import { EdgePathBundlingGPUFloydWarshall } from '../edge-path-bundling/floyd-warshall/gpu';

export type GetRuntimeParams = {
	device: GPUDevice;
	graph: Graph;
	iterations: number;
};

export async function getRuntime({ device, graph, iterations = 5 }: GetRuntimeParams) {
	const runtimes = [];

	const epb = new EdgePathBundlingGPUFloydWarshall({
		graph,
		device,
	});

	for (let i = 0; i < iterations; i++) {
		const start = performance.now();

		await epb.bundle();

		const end = performance.now();
		const runtime = end - start;

		runtimes.push(runtime);
	}

	console.log(runtimes);

	return runtimes;
}
