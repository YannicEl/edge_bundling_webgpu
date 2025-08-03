import { afterAll, describe, test } from 'vitest';
import { Graph } from '@bachelor/core/AdjacencyList';
import { loadGraph } from '@bachelor/core/datasets/load';
import type { DatasetName } from '@bachelor/core/datasets/load';
import { initWebGPU } from '@bachelor/core/webGpu';
import { EdgePathBundlingGPUFloydWarshall } from '@bachelor/core/edge-path-bundling/floyd-warshall/gpu';
import { server } from '@vitest/browser/context';

const ITERATIONS = 5;

const datasets: [dataset: DatasetName, graph: Graph, times: number[]][] = await Promise.all(
	(['airlines', 'migration', 'airtraffic'] satisfies DatasetName[]).map(async (dataset) => {
		const graph = await loadGraph(dataset);
		return [dataset, graph, []];
	})
);

describe('Runtime', () => {
	test.each(datasets)('%s', { repeats: ITERATIONS - 1 }, async (dataset, graph, times) => {
		const { device } = await initWebGPU();

		const epb = new EdgePathBundlingGPUFloydWarshall({
			device,
			graph,
			maxDistortion: 2,
			edgeWeightFactor: 2,
		});

		const start = performance.now();
		await epb.bundle();
		const end = performance.now();

		times.push(end - start);
	});
});

type CSVRowValue = string | number;

afterAll(async () => {
	const csv: CSVRowValue[][] = [];

	const header: CSVRowValue[] = ['dataset'];
	for (let i = 0; i < ITERATIONS; i++) {
		header.push(`run_${i + 1}`);
	}

	header.push('average');

	csv.push(header);

	datasets.forEach(([dataset, graph, times]) => {
		const row: CSVRowValue[] = [dataset];

		times.forEach((time) => {
			row.push(time);
		});

		row.push(times.reduce((acc, time) => acc + time, 0) / times.length);

		csv.push(row);
	});

	await server.commands.writeFile('./result.csv', csv.map((row) => row.join(',')).join('\n'));
});
