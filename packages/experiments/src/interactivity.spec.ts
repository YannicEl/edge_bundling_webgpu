import type { DatasetName } from '@bachelor/core/datasets/load';
import { EdgePathBundlingGPUFloydWarshall } from '@bachelor/core/edge-path-bundling/floyd-warshall/gpu';
import { GreedySpanner } from '@bachelor/core/spanner/greedy/gpu';
import { ThetaSpanner } from '@bachelor/core/spanner/theta/gpu';
import { initWebGPU } from '@bachelor/core/webGpu';
import { afterAll, beforeAll, describe, test } from 'vitest';
import type { CSV, CSVRow } from './utils';
import { ITERATIONS, loadDatasets, mean, median, writeResult } from './utils';

const datasets = await loadDatasets();

const algorithms = [
	{
		name: 'greedy',
		value: GreedySpanner,
	},
	{
		name: 'theta',
		value: ThetaSpanner,
	},
] as const;

type AlgorithmName = (typeof algorithms)[number]['name'];

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

const results = {} as Record<AlgorithmName, Record<ExperimentName, Record<DatasetName, number[]>>>;

beforeAll(() => {
	algorithms.forEach(({ name: algorithmName }) => {
		results[algorithmName] = {} as Record<ExperimentName, Record<DatasetName, number[]>>;

		experiments.forEach(({ name: experimentName }) => {
			results[algorithmName][experimentName] = {} as Record<DatasetName, number[]>;

			datasets.forEach(({ dataset }) => {
				results[algorithmName][experimentName][dataset] = [];
			});
		});
	});
});

describe.sequential.for(algorithms)('Interactivity $name', (algorithm) => {
	describe.sequential.for(experiments)('$name', (experiment) => {
		test.sequential.for(datasets)(
			'$dataset',
			{ repeats: ITERATIONS - 1 },
			async ({ dataset, graph }) => {
				const { device } = await initWebGPU();
				const epb = new EdgePathBundlingGPUFloydWarshall({
					device,
					graph,
					spannerAlgorithm: algorithm.value,
					maxDistortion: 2,
					edgeWeightFactor: 2,
				});

				const start = performance.now();
				await epb.bundle();
				const end = performance.now();

				results[algorithm.name][experiment.name][dataset].push(end - start);

				for await (const stepValues of experiment.steps) {
					const start = performance.now();
					stepValues.forEach(({ parameter, value }) => {
						epb[parameter] = value;
					});

					await epb.bundle();
					const end = performance.now();

					results[algorithm.name][experiment.name][dataset].push(end - start);
				}
			}
		);
	});
});

afterAll(async () => {
	Object.entries(results).forEach(async ([algorithmName, values]) => {
		Object.entries(values).forEach(async ([experimentName, values]) => {
			const csv: CSV = [];

			const header: CSVRow = ['iteration'];

			const steps = experiments.find(({ name: stepName }) => stepName === experimentName)?.steps;
			if (!steps) {
				throw new Error(`Step ${experimentName} not found`);
			}

			header.push('initial');
			steps.forEach((step) => {
				header.push(step.map(({ parameter, value }) => `${parameter}_${value}`).join('_'));
			});

			csv.push(header);

			Object.entries(values).forEach(async ([dataset, times]) => {
				const csv: CSV = [];
				csv.push(header);

				for (let i = 0; i < ITERATIONS; i++) {
					const values: number[] = [];

					for (let j = 0; j <= steps.length; j++) {
						values.push(times[j + i * (steps.length + 1)]!);
					}

					csv.push([i + 1, ...values]);
				}

				const aggregationTypes = [
					['mean', mean],
					['median', median],
				] as const;

				aggregationTypes.forEach(([name, fn]) => {
					const row: CSVRow = [name];

					for (let i = 0; i <= steps.length; i++) {
						const values: number[] = [];
						for (let j = 0; j < ITERATIONS; j++) {
							values.push(times[j * (steps.length + 1) + i]!);
						}

						row.push(fn(values));
					}

					csv.push(row);
				});

				await writeResult(`interactivity_${dataset}_${algorithmName}_${experimentName}`, csv);
			});
		});
	});
});
