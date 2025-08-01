import { EdgePathBundlingGPUFloydWarshall } from '@bachelor/core/edge-path-bundling/floyd-warshall/gpu';
import { initWebGPU } from '@bachelor/core/webGpu';
import { afterAll, describe, test } from 'vitest';
import type { CSV, CSVRow } from './utils';
import { average, ITERATIONS, loadDatasets, writeResult } from './utils';

const datasets = await loadDatasets();

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

afterAll(async () => {
	const csv: CSV = [];

	const header: CSVRow = ['dataset'];
	for (let i = 0; i < ITERATIONS; i++) {
		header.push(`run_${i + 1}`);
	}

	header.push('average');

	csv.push(header);

	datasets.forEach(([dataset, graph, times]) => {
		const row: CSVRow = [dataset];

		times.forEach((time) => {
			row.push(time);
		});

		row.push(average(times));

		csv.push(row);
	});
	await writeResult('runtime', csv);
});
