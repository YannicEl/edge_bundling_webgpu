<script lang="ts">
	import { Graph } from '@bachelor/core/Graph';
	import { Graph as NewGraph } from '@bachelor/core/AdjacencyList';
	import { edgePathBundling } from '@bachelor/core/edge-path-bundling/dijkstra/cpu';
	import { edgePathBundlingGPU } from '@bachelor/core/edge-path-bundling/dijkstra/gpu';
	import { drawBezierCurve } from '@bachelor/core/canvas';
	import { drawGraph } from '$lib/canvas';
	import type { Edge } from '@bachelor/core/Edge';
	import { getCanvasState } from '$lib/state/canvas';
	import { getWebGPUState } from '$lib/state/webGPU';
	import ControlPanel from '$lib/components/ControlPanel.svelte';
	import { clearCanvas, drawBundledEdges } from '$lib/_canvas';
	import { exportBundling } from '@bachelor/core/AdjacencyList';
	import type { BundledEdge } from '@bachelor/core/edge-path-bundling/index';
	import { greedySpanner } from '@bachelor/core/spanner/greedy/cpu';

	const { device } = getWebGPUState();
	const { canvas, context } = getCanvasState();

	let selectedGraph = $state<string>('simple');

	async function loadGraph(name: string) {
		const graphJSON = await import(`$lib/data/graphs/${name}.json`);
		const graph = Graph.fromJSON(graphJSON);

		const spannerJSON = await import(`$lib/data/graphs/spanners/${name}.json`);
		const spanner = Graph.fromJSON(spannerJSON);

		console.log(`${name} graph loaded, ${graph.nodes.size} nodes, ${graph.edges.size} edges`);
		console.log(`${name} spanner loaded, ${spanner.nodes.size} nodes, ${spanner.edges.size} edges`);

		return { graph, spanner };
	}

	function drawGraphAndBundledEdges(
		graph: Graph,
		bundeledEdges: { edge: Edge; controlPoints: { x: number; y: number }[] }[]
	) {
		console.log(bundeledEdges);

		console.time('Draw');
		clearCanvas(context, 'white');
		drawGraph({ ctx: context, graph, drawLabels: false, drawNodes: false, drawEdges: false });
		drawBundledEdges({ ctx: context, bundeledEdges });

		console.timeEnd('Draw');
	}

	async function runCPU() {
		const { graph } = await loadGraph(selectedGraph);

		const st1 = performance.now();
		const spanner = greedySpanner(graph, 2);
		const st2 = performance.now();

		console.time('EPB');
		const et1 = performance.now();
		const { bundeledEdges } = await edgePathBundling(graph, {
			spanner,
			maxDistortion: 2,
			edgeWeightFactor: 1,
		});
		const et2 = performance.now();
		console.timeEnd('EPB');

		console.log(`Spanner: ${st2 - st1}ms`);
		console.log(`EPB: ${et2 - et1}ms`);

		drawGraphAndBundledEdges(spanner, bundeledEdges);

		// downloadBundling(bundeledEdges, graph);
	}

	function downloadCanvas() {
		const canvasElement = canvas.element;
		const link = document.createElement('a');
		link.download = `SEPB_JS_${selectedGraph}_d_2_w_2.png`;
		link.href = canvasElement.toDataURL('image/png');
		link.click();
	}

	function downloadBundling(bundledEdges: BundledEdge[], graph: Graph) {
		console.log(bundledEdges);
		const newGraph = new NewGraph();

		const nodes = Array.from(graph.nodes.values());
		graph.nodes.forEach((node) => {
			newGraph.addNode(node);
		});

		graph.edges.forEach((edge) => {
			console.log(edge);
			newGraph.addEdge({
				start: nodes.indexOf(edge.start),
				end: nodes.indexOf(edge.end),
				weight: edge.weight,
			});
		});

		// Get the bundled edges from the last run
		const exported = exportBundling(newGraph, bundledEdges);
		const dataStr = JSON.stringify(exported, null, 2);
		const dataBlob = new Blob([dataStr], { type: 'application/json' });

		const link = document.createElement('a');
		link.download = `${selectedGraph}_bundling.json`;
		link.href = URL.createObjectURL(dataBlob);
		link.click();

		// Clean up the object URL
		URL.revokeObjectURL(link.href);
	}
</script>

<ControlPanel>
	<select name="graph" bind:value={selectedGraph}>
		<option value="simple">Simple</option>
		<option value="example">Example</option>
		<option value="airlines">Airlines</option>
		<option value="migration">Migration</option>
		<option value="airtraffic">Airtraffic</option>
	</select>

	<button onclick={runCPU}>Run CPU</button>
	<button onclick={runGPU}>Run GPU</button>

	<button onclick={downloadCanvas}>Download Canvas</button>

	<button onclick={downloadBundling}>Download Bundling</button>

	<a href="/">back</a>
</ControlPanel>
