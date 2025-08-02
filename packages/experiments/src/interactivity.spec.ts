import type { DatasetName } from '@bachelor/core/datasets/load';
import { EdgePathBundlingGPUFloydWarshall } from '@bachelor/core/edge-path-bundling/floyd-warshall/gpu';
import { initWebGPU } from '@bachelor/core/webGpu';
import { afterAll, beforeAll, describe, test } from 'vitest';
import type { CSV, CSVRow } from './utils';
import { ITERATIONS, loadDatasets, mean, median, writeResult } from './utils';

const datasets = await loadDatasets();

const experiments = [
	{
		name: 'edge_weight_factor',
		steps: [
			[{ parameter: 'edgeWeightFactor', value: 1 }],
			[{ parameter: 'edgeWeightFactor', value: 2 }],
			[{ parameter: 'edgeWeightFactor', value: 3 }],
		],
	},
	{
		name: 'max_distortion',
		steps: [
			[{ parameter: 'maxDistortion', value: 1 }],
			[{ parameter: 'maxDistortion', value: 2 }],
			[{ parameter: 'maxDistortion', value: 3 }],
		],
	},
	{
		name: 'edge_weight_factor_and_max_distortion',
		steps: [
			[
				{ parameter: 'maxDistortion', value: 1 },
				{ parameter: 'edgeWeightFactor', value: 1 },
			],
			[
				{ parameter: 'maxDistortion', value: 2 },
				{ parameter: 'edgeWeightFactor', value: 2 },
			],
			[
				{ parameter: 'maxDistortion', value: 3 },
				{ parameter: 'edgeWeightFactor', value: 3 },
			],
		],
	},
] as const;

type ExperimentName = (typeof experiments)[number]['name'];

const results = {} as Record<ExperimentName, Record<DatasetName, number[]>>;

beforeAll(() => {
	experiments.forEach(({ name }) => {
		results[name] = {} as Record<DatasetName, number[]>;

		datasets.forEach(({ dataset }) => {
			results[name][dataset] = [];
		});
	});
});

describe.sequential.for(experiments)('Interactivity $name', (experiment) => {
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

			results[experiment.name][dataset].push(end - start);

			for await (const stepValues of experiment.steps) {
				const start = performance.now();
				stepValues.forEach(({ parameter, value }) => {
					epb[parameter] = value;
				});

				await epb.bundle();
				const end = performance.now();

				results[experiment.name][dataset].push(end - start);
			}
		}
	);
});

afterAll(async () => {
	Object.entries(results).forEach(async ([name, values]) => {
		console.log({ values });

		const csv: CSV = [];

		const header: CSVRow = ['dataset'];

		const steps = experiments.find(({ name: stepName }) => stepName === name)?.steps;
		if (!steps) {
			throw new Error(`Step ${name} not found`);
		}

		const aggregationTypes = [
			['mean', mean],
			['median', median],
		] as const;
		aggregationTypes.forEach(([type]) => {
			header.push(`${type}_initial`);

			for (const step of steps) {
				header.push(
					`${type}_${step.map(({ parameter, value }) => `${parameter}_${value}`).join('_')}`
				);
			}
		});

		for (let i = 0; i < ITERATIONS; i++) {
			header.push(`run_${i + 1}_initial`);

			for (const step of steps) {
				header.push(`run_${step.map(({ parameter, value }) => `${parameter}_${value}`).join('_')}`);
			}
		}

		csv.push(header);

		Object.entries(values).forEach(([dataset, times]) => {
			const row: CSVRow = [dataset];

			aggregationTypes.forEach(([_, fn]) => {
				for (let i = 0; i <= steps.length; i++) {
					const values: number[] = [];

					for (let j = i; j < times.length; j += steps.length + 1) {
						values.push(times[j]!);
					}

					row.push(fn(values));
				}
			});

			times.forEach((time) => {
				row.push(time);
			});

			csv.push(row);
		});

		await writeResult(`interactivity_${name}`, csv);
	});
});
