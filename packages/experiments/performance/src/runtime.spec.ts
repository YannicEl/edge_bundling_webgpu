import type { DatasetName } from '@bachelor/core/datasets/load';
import { EdgePathBundlingGPUFloydWarshall } from '@bachelor/core/edge-path-bundling/floyd-warshall/gpu';
import { ThetaSpanner } from '@bachelor/core/spanner/theta/gpu';
import { initWebGPU } from '@bachelor/core/webGpu';
import { afterAll, beforeAll, describe, test } from 'vitest';
import type { CSV, CSVRow } from './utils';
import { ITERATIONS, loadDatasets, mean, median, writeResult } from './utils';

const datasets = await loadDatasets();

const experiments = [
	// {
	// 	name: 'greedy',
	// 	algorithm: GreedySpanner,
	// },
	{
		name: 'theta',
		algorithm: ThetaSpanner,
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

describe.sequential.for(experiments)('Runtime $name', (experiment) => {
	test.sequential.for(datasets)(
		'$dataset',
		{ repeats: ITERATIONS - 1 },
		async ({ dataset, graph }) => {
			const { device } = await initWebGPU();

			const epb = new EdgePathBundlingGPUFloydWarshall({
				device,
				graph,
				spannerAlgorithm: experiment.algorithm,
				maxDistortion: 2,
				edgeWeightFactor: 2,
			});

			const start = performance.now();
			await epb.bundle();
			const end = performance.now();

			results[experiment.name][dataset].push(end - start);
		}
	);
});

afterAll(async () => {
	Object.entries(results).forEach(async ([name, values]) => {
		const header: CSVRow = ['iteration', 'time'];

		Object.entries(values).forEach(async ([dataset, times]) => {
			const csv: CSV = [];
			csv.push(header);

			times.forEach((time, i) => {
				csv.push([i + 1, time]);
			});

			const aggregationTypes = [
				['mean', mean],
				['median', median],
			] as const;

			aggregationTypes.forEach(([name, fn]) => {
				csv.push([name, fn(times)]);
			});

			await writeResult(`runtime_${dataset}_${name}`, csv);
		});
	});
});
