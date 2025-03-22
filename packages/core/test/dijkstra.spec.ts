import { expect, test } from 'vitest';
import { dijkstra } from '../src/dijkstra.js';
import { Graph } from '../src/Graph.js';
import { greedySpannerGpu } from '../src/spannerGpu.js';
import { initWebGPU } from '../src/webGpu.js';

const testData = [
	{ file: 'simple.json', start: 0, end: 2, path: [0, 1, 2], length: 718.8845741897483 },
	{ file: 'simple.json', start: 4, end: 3, path: [4, 3], length: 339.4112549695428 },
	{
		file: 'simple.json',
		start: 0,
		end: 5,
		path: [0, 5],
		length: 1223.7646832622684,
	},
	{
		file: 'simple.json',
		start: 5,
		end: 1,
		path: [5, 4, 3, 2, 1],
		length: 1338.3578934099537,
	},
	{
		file: 'simple.json',
		start: 1,
		end: 5,
		path: [1, 2, 3, 4, 5],
		length: 1338.3578934099537,
	},
	{
		file: 'simple.json',
		start: 3,
		end: 0,
		path: [3, 0],
		length: 989.5453501482385,
	},
	{
		file: 'simple.json',
		start: 3,
		end: 2,
		path: [3, 2],
		length: 379.4733192202055,
	},
	{
		file: 'simple.json',
		start: 1,
		end: 2,
		path: [1, 2],
		length: 379.4733192202055,
	},
	{
		file: 'simple.json',
		start: 5,
		end: 0,
		path: [5, 0],
		length: 1223.7646832622684,
	},
	{
		file: 'simple.json',
		start: 5,
		end: 0,
		path: [5, 0],
		length: 1223.7646832622684,
	},
	{
		file: 'airlines.json',
		start: 21,
		end: 111,
		path: [21, 111],
		length: 284.1543780971135,
	},
	{
		file: 'airlines.json',
		start: 74,
		end: 187,
		path: [74, 136, 173, 187],
		length: 797.9773019916798,
	},
	{
		file: 'airlines.json',
		start: 95,
		end: 217,
		path: [95, 41, 217],
		length: 400.7359602003381,
	},
	{
		file: 'airlines.json',
		start: 193,
		end: 59,
		path: [193, 70, 59],
		length: 313.6092162868872,
	},
	{
		file: 'airlines.json',
		start: 217,
		end: 6,
		path: [217, 50, 6],
		length: 188.16603456363885,
	},
	{
		file: 'airlines.json',
		start: 171,
		end: 162,
		path: [171, 134, 192, 162],
		length: 879.8346423688016,
	},
	{
		file: 'airlines.json',
		start: 27,
		end: 204,
		path: [27, 50, 204],
		length: 166.37146219118176,
	},
	{
		file: 'airlines.json',
		start: 48,
		end: 103,
		path: [48, 192, 103],
		length: 359.3588946710471,
	},
	{
		file: 'airlines.json',
		start: 150,
		end: 170,
		path: [150, 50, 136, 170],
		length: 440.24380533912984,
	},
	{
		file: 'airlines.json',
		start: 9,
		end: 47,
		path: [9, 192, 18, 47],
		length: 604.9044078125856,
	},
	{
		file: 'airtraffic.json',
		start: 1523,
		end: 904,
		path: [1523, 262, 59, 8, 33, 904],
		length: 508.4819433843285,
	},
	{
		file: 'airtraffic.json',
		start: 255,
		end: 1431,
		path: [255, 278, 1431],
		length: 56.12607448366406,
	},
	{
		file: 'airtraffic.json',
		start: 217,
		end: 1214,
		path: [217, 54, 1214],
		length: 131.7543257688497,
	},
	{
		file: 'airtraffic.json',
		start: 470,
		end: 583,
		path: [470, 82, 219, 138, 583],
		length: 381.75824590236346,
	},
	{
		file: 'airtraffic.json',
		start: 1393,
		end: 432,
		path: [1393, 945, 1084, 10, 432],
		length: 460.75653477260096,
	},
	{
		file: 'airtraffic.json',
		start: 1507,
		end: 1240,
		path: [1507, 62, 216, 1240],
		length: 266.8734593993161,
	},
	{
		file: 'airtraffic.json',
		start: 842,
		end: 75,
		path: [842, 843, 833, 822, 23, 26, 82, 75],
		length: 957.0757641966541,
	},
	{
		file: 'airtraffic.json',
		start: 1427,
		end: 593,
		path: [1427, 62, 230, 593],
		length: 344.5910775578635,
	},
	{
		file: 'airtraffic.json',
		start: 1283,
		end: 236,
		path: [1283, 26, 236],
		length: 207.09216991527427,
	},
	{
		file: 'airtraffic.json',
		start: 918,
		end: 1211,
		path: [918, 135, 166, 229, 769, 1211],
		length: 94.28961171848935,
	},
];

test('Dijkstra GPU', async () => {
	const { device } = await initWebGPU();

	const graph = new Graph();
	const spanner = await greedySpannerGpu({ device, graph });
});

test.each(testData)('Dijkstra %#', async (parmas) => {
	const jsonGraph = await import(`../../app/src/lib/data/graphs/${parmas.file}`);
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
