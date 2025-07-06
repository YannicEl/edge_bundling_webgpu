import { Graph } from '@bachelor/core/AdjacencyList';

const graphCache = new Map<string, Graph>();
export async function loadGraph(name: string): Promise<Graph> {
	if (graphCache.has(name)) return graphCache.get(name)!;

	const graphJSON = await import(`$lib/data/graphs/${name}.json`);
	const graph = Graph.fromJSON(graphJSON);

	console.log(`${name} graph loaded, ${graph.nodes.size} nodes, ${graph.edges.size} edges`);

	graphCache.set(name, graph);

	return graph;
}

const spannerCache = new Map<string, Graph>();
export async function loadSpanner(name: string): Promise<Graph> {
	if (spannerCache.has(name)) return spannerCache.get(name)!;

	const spannerJSON = await import(`$lib/data/graphs/spanners/${name}.json`);
	const spanner = Graph.fromJSON(spannerJSON);

	console.log(`${name} spanner loaded, ${spanner.nodes.size} nodes, ${spanner.edges.size} edges`);

	spannerCache.set(name, spanner);

	return spanner;
}
