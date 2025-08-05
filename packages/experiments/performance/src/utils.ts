import type { Graph } from '@bachelor/core/AdjacencyList';
import type { DatasetName } from '@bachelor/core/datasets/load';
import { loadGraph } from '@bachelor/core/datasets/load';
import { server } from '@vitest/browser/context';

export const ITERATIONS = 25;
export const SLEEP_BETWEEN_ITERATIONS = 2000;

export async function loadDatasets(names: DatasetName[]) {
	const datasets: { dataset: DatasetName; graph: Graph }[] = await Promise.all(
		names.map(async (dataset) => {
			const graph = await loadGraph(dataset);
			return { dataset, graph };
		})
	);

	return datasets;
}

export type CSVRowValue = string | number;
export type CSVRow = CSVRowValue[];
export type CSV = CSVRow[];

export async function writeCSV(name: string, csv: CSV) {
	await writeResult(`./results/${name}.csv`, csv);
}

export async function writeResult(name: string, csv: CSV) {
	await server.commands.writeFile(
		`./results/${name}.csv`,
		csv.map((row) => row.join(';')).join('\n')
	);
}

export function mean(values: number[]) {
	return values.reduce((acc, value) => acc + value, 0) / values.length;
}

export function median(values: number[]) {
	return values.sort((a, b) => a - b)[Math.floor(values.length / 2)]!;
}

export async function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
