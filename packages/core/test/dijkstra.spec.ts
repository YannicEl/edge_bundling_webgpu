import { expect, test } from 'vitest';
import { dijkstra } from '../src/dijkstra.js';
import { dijkstraGPU } from '../src/dijkstraGPU.js';
import { Graph } from '../src/Graph.js';
import { initWebGPU } from '../src/webGpu.js';
import { shortestPath } from './data.js';

test('Dijkstra GPU', { retry: 10 }, async () => {
	const { device } = await initWebGPU();

	const json = await import(`../../app/src/lib/data/graphs/simple.json`);
	const graph = Graph.fromJSON(json);

	const nodes = [...graph.nodes];
	const path = await dijkstraGPU({ device, graph, start: nodes[0]!, end: nodes[2]! });
	console.log(path);
});

test.each(shortestPath)('Dijkstra %#', async (parmas) => {
	const jsonGraph = await import(`../../app/src/lib/data/graphs/${parmas.file}.json`);
	const graph = Graph.fromJSON(jsonGraph);

	const nodes = [...graph.nodes];
	const start = nodes[Number(parmas.start)];
	const end = nodes[Number(parmas.end)];

	expect(start).toBeTruthy();
	expect(end).toBeTruthy();

	if (!start || !end) {
		throw new Error('Node not found');
	}

	const path = dijkstra(graph, start, end);

	expect(path).toBeTruthy();

	if (!path) throw new Error('No shortest path found');

	expect(path.length).toBe(parmas.length);
	expect(path.nodes.map((node) => nodes.indexOf(node))).toEqual(parmas.path);
});
