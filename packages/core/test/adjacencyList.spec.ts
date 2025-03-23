import { expect, test } from 'vitest';
import { Graph } from '../src/Graph';
import { adjacencyList } from './data';

test.each(adjacencyList)('Adjacency List %#', async ({ file, nodes, edges }) => {
	const jsonGraph = await import(`../../app/src/lib/data/graphs/${file}.json`);
	const graph = Graph.fromJSON(jsonGraph);
	const adjacencyList = graph.toAdjacencyList();

	expect(adjacencyList.nodes, 'Nodes not equal').toEqual(nodes);
	expect(
		adjacencyList.edges.map(({ end }) => end),
		'Edges not equal'
	).toEqual(edges);
});
