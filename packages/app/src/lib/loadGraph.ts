import { Graph } from '@bachelor/core/Graph';

export async function loadGraph(name: string): Promise<Graph> {
	const graphJSON = await import(`$lib/data/graphs/${name}.json`);
	const graph = Graph.fromJSON(graphJSON);

	console.log(`${name} graph loaded, ${graph.nodes.size} nodes, ${graph.edges.size} edges`);

	return graph;
}

export async function loadSpanner(name: string): Promise<Graph> {
	const spannerJSON = await import(`$lib/data/graphs/spanners/${name}.json`);
	const spanner = Graph.fromJSON(spannerJSON);

	console.log(`${name} spanner loaded, ${spanner.nodes.size} nodes, ${spanner.edges.size} edges`);

	return spanner;
}
