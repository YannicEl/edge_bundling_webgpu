import { describe, expect, test } from 'vitest';
import { dijkstra } from '../src/dijkstra.js';
import { dijkstraGPU } from '../src/dijkstraGPU.js';
import { Graph } from '../src/Graph.js';
import { initWebGPU } from '../src/webGpu.js';
import { shortestPath } from './data.js';

describe('Shortest Path', () => {
	test.each(shortestPath)('Dijkstra GPU %#', async (parmas) => {
		const { device } = await initWebGPU();

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

		const path = await dijkstraGPU({
			device,
			graph,
			paths: [
				{ start: start, end: start },
				{ start, end },
			],
		});

		expect(path).toBeTruthy();

		if (!path) throw new Error('No shortest path found');

		expect(path.length.toFixed(3)).toBe(parmas.length.toFixed(3));
		expect(path.nodes.map((node) => nodes.indexOf(node))).toEqual(parmas.path);
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
});
