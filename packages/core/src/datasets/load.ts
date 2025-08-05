import { Graph } from '../AdjacencyList';

export const DATASET_NAMES = ['simple', 'example', 'airlines', 'migration', 'airtraffic', "fully_connected_256", "fully_connected_529", "fully_connected_1024"] as const;
export type DatasetName = (typeof DATASET_NAMES)[number];

export async function loadGraph(name: DatasetName): Promise<Graph> {
	const graphJSON = await import(`./graphs/${name}.json`);
	const graph = Graph.fromJSON(graphJSON);

	return graph;
}
