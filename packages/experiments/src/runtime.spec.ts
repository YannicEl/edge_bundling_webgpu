import type { DatasetName } from '@bachelor/core/datasets/load';
import { EdgePathBundlingGPUFloydWarshall } from '@bachelor/core/edge-path-bundling/floyd-warshall/gpu';
import { initWebGPU } from '@bachelor/core/webGpu';
import { afterAll, beforeAll, describe, test } from 'vitest';
import type { CSV, CSVRow } from './utils';
import { ITERATIONS, loadDatasets, mean, median, writeResult } from './utils';

const datasets = await loadDatasets();

const results = {} as Record<DatasetName, number[]>;

beforeAll(() => {
	datasets.forEach(({ dataset }) => {
		results[dataset] = [];
	});
});

describe.sequential('Runtime', () => {
	test.sequential.for(datasets)(
		'$dataset',
		{ repeats: ITERATIONS - 1 },
		async ({ dataset, graph }) => {
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

			results[dataset].push(end - start);
		}
	);
});

afterAll(async () => {
	const csv: CSV = [];

	const header: CSVRow = ['dataset'];

	const aggregationTypes = [
		['mean', mean],
		['median', median],
	] as const;
	aggregationTypes.forEach(([type]) => {
		header.push(type);
	});

	for (let i = 0; i < ITERATIONS; i++) {
		header.push(`run_${i + 1}`);
	}

	csv.push(header);

	datasets.forEach(({ dataset }) => {
		const row: CSVRow = [dataset];

		const times = results[dataset];

		times.forEach((time) => {
			row.push(time);
		});

		aggregationTypes.forEach(([_, fn]) => {
			row.push(fn(times));
		});

		csv.push(row);
	});

	await writeResult('runtime', csv);
});
