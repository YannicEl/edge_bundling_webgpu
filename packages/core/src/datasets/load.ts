import { Graph } from '../AdjacencyList';

export const DATASET_NAMES = [
  // 'simple',
  // 'example',
  'airlines',
  'migration',
  'airtraffic',
  'fully_connected_256',
  'fully_connected_529',
  'fully_connected_1024',
] as const;
export type DatasetName = (typeof DATASET_NAMES)[number];

export async function loadGraph(name: DatasetName): Promise<Graph> {
	const graphJSON = await import(`./graphs/${name}.json`);

	// Mirror the airtraffic dataset on the Y axis
	const normalizedJSON =
		name === 'airtraffic'
			? {
					// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
					nodes: (graphJSON.nodes as [number, number][])?.map(([x, y]) => [x, -y]) ?? [],
					// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
					edges: (graphJSON.edges as [number, number][]) ?? [],
				}
			: graphJSON;

	const graph = Graph.fromJSON(normalizedJSON as any);

	return graph;
}
