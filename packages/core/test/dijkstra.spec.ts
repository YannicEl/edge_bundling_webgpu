import { test } from 'vitest';
import { Graph } from '../src/Graph.js';
import { greedySpannerGpu } from '../src/spannerGpu.js';
import { initWebGPU } from '../src/webGpu.js';

test('Dijkstra', async () => {
	const { device } = await initWebGPU();

	const graph = new Graph();
	const spanner = await greedySpannerGpu({ device, graph });

	console.log(spanner);
});
