import { describe, expect, test } from 'vitest';
import { dijkstra } from '../src/dijkstra.js';
import { dijkstraGPU } from '../src/dijkstraGPU.js';
import { FloydWarshall } from '../src/floydWarshall.js';
import { Graph } from '../src/Graph.js';
import { initWebGPU } from '../src/webGpu.js';
import { getShortestPathDataGouped, shortestPath } from './data.js';

const groupedShortestPath = getShortestPathDataGouped();

describe('Shortest Path', () => {
	test.each(shortestPath)('Dijkstra GPU %#', async (params) => {
		const { device } = await initWebGPU();

		const jsonGraph = await import(`../../app/src/lib/data/graphs/${params.file}.json`);
		const graph = Graph.fromJSON(jsonGraph);

		const nodes = [...graph.nodes];
		const start = nodes[Number(params.start)];
		const end = nodes[Number(params.end)];

		expect(start).toBeTruthy();
		expect(end).toBeTruthy();

		if (!start || !end) {
			throw new Error('Node not found');
		}

		const [path] = await dijkstraGPU({
			device,
			graph,
			paths: [{ start, end }],
		});

		expect(path).toBeTruthy();

		if (!path) throw new Error('No shortest path found');

		expect(path.length.toFixed(3)).toBe(params.length.toFixed(3));
		expect(path.nodes.map((node) => nodes.indexOf(node))).toEqual(params.path);
	});

	test.each(Object.entries(groupedShortestPath))(
		'Dijkstra GPU Parallel %#',
		async (file, params) => {
			const { device } = await initWebGPU();

			const jsonGraph = await import(`../../app/src/lib/data/graphs/${file}.json`);
			const graph = Graph.fromJSON(jsonGraph);

			const nodes = [...graph.nodes];
			const paths = params.map((p) => {
				const start = nodes[Number(p.start)];
				const end = nodes[Number(p.end)];

				expect(start).toBeTruthy();
				expect(end).toBeTruthy();

				if (!start || !end) {
					throw new Error('Node not found');
				}

				return {
					start,
					end,
				};
			});

			const shortestPaths = await dijkstraGPU({
				device,
				graph,
				paths,
			});

			expect(shortestPaths).toBeInstanceOf(Array);

			shortestPaths.forEach((path, index) => {
				expect(path).toBeTruthy();

				if (!path) throw new Error('No shortest path found');

				const expected = params[index];

				if (!expected) throw new Error('No expected path found');
				expect(path.length.toFixed(3)).toBe(expected.length.toFixed(3));
				expect(path.nodes.map((node) => nodes.indexOf(node))).toEqual(expected.path);
			});
		}
	);

	test.each(shortestPath)('Dijkstra %#', async (params) => {
		const jsonGraph = await import(`../../app/src/lib/data/graphs/${params.file}.json`);
		const graph = Graph.fromJSON(jsonGraph);

		const nodes = [...graph.nodes];
		const start = nodes[Number(params.start)];
		const end = nodes[Number(params.end)];

		expect(start).toBeTruthy();
		expect(end).toBeTruthy();

		if (!start || !end) {
			throw new Error('Node not found');
		}

		const path = dijkstra(graph, start, end);

		expect(path).toBeTruthy();

		if (!path) throw new Error('No shortest path found');

		expect(path.length).toBe(params.length);
		expect(path.nodes.map((node) => nodes.indexOf(node))).toEqual(params.path);
	});

	test.each(Object.entries(groupedShortestPath))(
		'Floyd Warshall GPU Parallel %#',
		async (file, params) => {
			const { device } = await initWebGPU();

			const jsonGraph = await import(`../../app/src/lib/data/graphs/${file}.json`);
			const graph = Graph.fromJSON(jsonGraph);

			const nodes = [...graph.nodes];
			const paths = params.map((p) => {
				const start = nodes[Number(p.start)];
				const end = nodes[Number(p.end)];

				expect(start).toBeTruthy();
				expect(end).toBeTruthy();

				if (!start || !end) {
					throw new Error('Node not found');
				}

				return {
					start,
					end,
				};
			});

			const floydWarshall = new FloydWarshall({ graph, device });
			await floydWarshall.init();
			await floydWarshall.compute();

			const shortestPaths = floydWarshall.shortestPaths(paths);

			expect(shortestPaths).toBeInstanceOf(Array);

			shortestPaths.forEach((path, index) => {
				expect(path).toBeTruthy();

				if (!path) throw new Error('No shortest path found');

				const expected = params[index];

				if (!expected) throw new Error('No expected path found');
				expect(path.length.toFixed(3)).toBe(expected.length.toFixed(3));
				expect(path.nodes.map((node) => nodes.indexOf(node))).toEqual(expected.path);
			});
		}
	);
});
