import { EdgePathBundlingGPUFloydWarshall } from '@bachelor/core/edge-path-bundling/floyd-warshall/gpu';
import { initWebGPU } from '@bachelor/core/webGpu';
import { afterAll, describe, test } from 'vitest';
import { average, ITERATIONS, loadDatasets, writeResult, type CSV, type CSVRow } from './utils';

const datasets = await loadDatasets();

const steps = [
	{ parameter: 'edgeWeightFactor', value: 1 },
	{ parameter: 'maxDistortion', value: 1 },
	{ parameter: 'edgeWeightFactor', value: 3 },
	{ parameter: 'maxDistortion', value: 3 },
] as const;

describe('Interactivity', () => {
	test.sequential.each(datasets)('%s', { repeats: ITERATIONS - 1 }, async (dataset, graph, times) => {
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

		for await (const { parameter, value } of steps) {
			const start = performance.now();
			epb[parameter] = value;
			await epb.bundle();
			const end = performance.now();

			times.push(end - start);
		}
	});
});

afterAll(async () => {
	const csv: CSV = [];

	const header: CSVRow = ['dataset'];

	header.push('average_initial');
	for (const { parameter, value } of steps) {
		header.push(`average_${parameter}_${value}`);
	}

	for (let i = 0; i < ITERATIONS; i++) {
		header.push(`run_${i + 1}_initial`);

		for (const { parameter, value } of steps) {
			header.push(`run_${i + 1}_${parameter}_${value}`);
		}
	}

	csv.push(header);

	datasets.forEach(([dataset, graph, times]) => {
		const row: CSVRow = [dataset];

		// Calculate average for each step
		for (let i = 0; i <= steps.length; i++) {
			const values: number[] = [];

			for (let j = i; j < times.length; j += steps.length + 1) {
				console.log({ i, j });
				values.push(times[j]!);
			}

			row.push(average(values));
		}

		times.forEach((time) => {
			row.push(time);
		});

		csv.push(row);
	});

	await writeResult('interactivity', csv);
});
