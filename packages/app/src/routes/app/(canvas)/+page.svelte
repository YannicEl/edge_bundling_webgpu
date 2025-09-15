<script lang="ts">
	import { clearCanvas, drawBundledEdges, drawGraph } from '$lib/_canvas';
	import { getCanvasState } from '$lib/state/canvas';
	import { getWebGPUState } from '$lib/state/webGPU';
	import ControlPanel from '$lib/components/ControlPanel.svelte';
	import { DATASET_NAMES, loadGraph, type DatasetName } from '@bachelor/core/datasets/load';
	import RangeInput from '$lib/components/RangeInput.svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { EdgePathBundlingGPUFloydWarshall } from '@bachelor/core/edge-path-bundling/floyd-warshall/gpu';
	import { onMount, onDestroy } from 'svelte';
	import { ThetaSpanner } from '@bachelor/core/spanner/theta/gpu';
	import { GreedySpanner } from '@bachelor/core/spanner/greedy/gpu';
	import { exportBundling } from '@bachelor/core/AdjacencyList';

	const { device } = getWebGPUState();
	const { canvas, context } = getCanvasState();

	let selectedGraph = $state<DatasetName>(
		(page.url.searchParams.get('graph') as DatasetName) ?? 'airlines'
	);
	$effect(() => {
		goto(`?graph=${selectedGraph}&spannerAlgorithm=${spannerAlgorithm}`);
	});

	let maxDistortion = $state<number>(2);
	let edgeWeightFactor = $state<number>(2);
	let spannerAlgorithm = $state<string>(page.url.searchParams.get('spannerAlgorithm') ?? 'theta');
	let epb: EdgePathBundlingGPUFloydWarshall;
	let graph: any; // Store graph for use in drawBundledEdges
	let cachedBundledEdges: any[] | null = null; // Cache for redraws while dragging
	let snapshot: ImageBitmap | null = null; // Snapshot of canvas for drag-only redraws
	let snapshotOffset = { x: 0, y: 0 }; // Offset at which snapshot was captured
	let snapshotScale = 1; // Scale at which snapshot was captured
	let hasCenteredInitialView = $state(false);
	let isLoading = $state(false);

	// Drag state
	let isDragging = $state(false);
	let lastMousePos = $state({ x: 0, y: 0 });
	let canvasOffset = $state({ x: 0, y: 0 });

	// Zoom state
	let canvasScale = $state(1);
	const minScale = 0.2;
	const maxScale = 8;

	canvas.onResize = () => runGPU();

	// Mouse event handlers for dragging
	function handleMouseDown(event: MouseEvent) {
		hasCenteredInitialView = true; // user interaction cancels auto-centering
		isDragging = true;
		event.preventDefault();
		// Ensure snapshot is anchored to the exact state at drag start
		void captureSnapshot();
		lastMousePos = { x: event.clientX, y: event.clientY };
		canvas.element.style.cursor = 'grabbing';
	}

	function handleMouseMove(event: MouseEvent) {
		if (!isDragging) return;

		const deltaX = event.clientX - lastMousePos.x;
		const deltaY = event.clientY - lastMousePos.y;

		canvasOffset.x += deltaX;
		canvasOffset.y += deltaY;

		lastMousePos = { x: event.clientX, y: event.clientY };

		// During drag, draw only the last snapshot translated (no edges redrawn)
		drawSnapshot();
	}

	function handleMouseUp() {
		isDragging = false;
		canvas.element.style.cursor = 'grab';
		// After drag ends, render edges at final position and refresh snapshot
		drawCanvas();
		void captureSnapshot();
	}

	function handleMouseLeave() {
		isDragging = false;
		canvas.element.style.cursor = 'grab';
		// After drag ends, render edges at final position and refresh snapshot
		drawCanvas();
		void captureSnapshot();
	}

	function handleWheel(event: WheelEvent) {
		hasCenteredInitialView = true; // user interaction cancels auto-centering
		// Enable smooth zooming toward cursor
		if (!canvas?.element) return;
		event.preventDefault();

		const rect = canvas.element.getBoundingClientRect();
		const mouseX = event.clientX - rect.left;
		const mouseY = event.clientY - rect.top;

		// Account for centered, oversized canvas
		const canvasWidth = canvas.element.width;
		const canvasHeight = canvas.element.height;
		const viewportWidth = window.innerWidth;
		const viewportHeight = window.innerHeight;
		const centerOffsetX = (canvasWidth - viewportWidth) / 2;
		const centerOffsetY = (canvasHeight - viewportHeight) / 2;

		// Compute zoom factor (trackpad-friendly)
		const zoomIntensity = 0.003; // increased sensitivity
		const factor = Math.exp(-event.deltaY * zoomIntensity);
		const newScaleUnclamped = canvasScale * factor;
		const newScale = Math.min(maxScale, Math.max(minScale, newScaleUnclamped));
		const appliedFactor = newScale / canvasScale;

		if (appliedFactor === 1) return;

		// Keep mouse position stable: screen = (center + offset) + world * scale
		const worldX = (mouseX - (centerOffsetX + canvasOffset.x)) / canvasScale;
		const worldY = (mouseY - (centerOffsetY + canvasOffset.y)) / canvasScale;
		canvasScale = newScale;
		canvasOffset.x = mouseX - worldX * canvasScale - centerOffsetX;
		canvasOffset.y = mouseY - worldY * canvasScale - centerOffsetY;

		// Redraw using cached edges and refresh snapshot for future drags
		drawCanvas();
		void captureSnapshot();
	}

	// $effect(() => {
	// 	console.log({ maxDistortion, edgeWeightFactor });
	// 	runGPU();
	// });

	// $effect(() => {
	// 	console.log({ edgeWeightFactor });
	// 	if (!epb) return;
	// 	epb.setEdgeWeightFactor(edgeWeightFactor).then(() => runGPU());
	// });

	// Re-run when control values change (distortion, weight, algorithm)
	$effect(() => {
		const md = maxDistortion;
		const ew = edgeWeightFactor;
		const algo = spannerAlgorithm;
		if (!graph) return;
		epb = new EdgePathBundlingGPUFloydWarshall({
			device,
			graph,
			maxDistortion: md,
			edgeWeightFactor: ew,
			spannerAlgorithm: algo === 'theta' ? ThetaSpanner : GreedySpanner,
		});
		runGPU();
	});

	// Reload graph when dataset changes and re-run
	$effect(() => {
		const g = selectedGraph;
		(async () => {
			graph = await loadGraph(g);
			epb = new EdgePathBundlingGPUFloydWarshall({
				device,
				graph,
				maxDistortion,
				edgeWeightFactor,
				spannerAlgorithm: spannerAlgorithm === 'theta' ? ThetaSpanner : GreedySpanner,
			});
			runGPU();
		})();
	});

	onMount(async () => {
		graph = await loadGraph(selectedGraph);
		// const spannerControl = await loadSpanner(selectedGraph);

		// console.time('greedy');
		// const greedySpanner = new GreedySpanner({ graph, device, maxDistortion });
		// const greedySpannerGraph = await greedySpanner.compute();
		// console.timeEnd('greedy');

		// console.time('theta');
		// const thetaSpanner = new ThetaSpanner({ graph, device, k: 100 });
		// const thetaSpannerGraph = await thetaSpanner.compute();
		// console.timeEnd('theta');

		epb = new EdgePathBundlingGPUFloydWarshall({
			device,
			graph,
			maxDistortion,
			edgeWeightFactor,
			spannerAlgorithm: spannerAlgorithm === 'theta' ? ThetaSpanner : GreedySpanner,
		});

		hasCenteredInitialView = false;
		runGPU();

		// Add mouse event listeners for dragging
		canvas.element.addEventListener('mousedown', handleMouseDown);
		canvas.element.addEventListener('mousemove', handleMouseMove);
		canvas.element.addEventListener('mouseup', handleMouseUp);
		canvas.element.addEventListener('mouseleave', handleMouseLeave);
		canvas.element.addEventListener('wheel', handleWheel, { passive: false });

		// Set initial cursor style
		canvas.element.style.cursor = 'grab';
	});

	onDestroy(() => {
		// Clean up event listeners
		if (canvas?.element) {
			canvas.element.removeEventListener('mousedown', handleMouseDown);
			canvas.element.removeEventListener('mousemove', handleMouseMove);
			canvas.element.removeEventListener('mouseup', handleMouseUp);
			canvas.element.removeEventListener('mouseleave', handleMouseLeave);
			canvas.element.removeEventListener('wheel', handleWheel as EventListener);
		}
	});

	function drawCanvas() {
		console.time('Draw');
		clearCanvas(context, 'white');

		// Apply canvas offset transformation
		context.save();

		// Center the content on the larger canvas
		const canvasWidth = canvas.element.width;
		const canvasHeight = canvas.element.height;
		const viewportWidth = window.innerWidth;
		const viewportHeight = window.innerHeight;

		// Calculate the offset to center content on the larger canvas
		const centerOffsetX = (canvasWidth - viewportWidth) / 2;
		const centerOffsetY = (canvasHeight - viewportHeight) / 2;

		context.translate(centerOffsetX + canvasOffset.x, centerOffsetY + canvasOffset.y);
		context.scale(canvasScale, canvasScale);

		if (cachedBundledEdges) {
			// drawGraph({ ctx: context, graph, drawLabels: false, drawNodes: false });
			drawBundledEdges({ ctx: context, bundeledEdges: cachedBundledEdges });
		}

		context.restore();
		console.timeEnd('Draw');
	}

	function drawSnapshot() {
		clearCanvas(context, 'white');
		if (!snapshot) return;

		// Calculate center offset for the larger canvas
		const canvasWidth = canvas.element.width;
		const canvasHeight = canvas.element.height;
		const viewportWidth = window.innerWidth;
		const viewportHeight = window.innerHeight;
		const centerOffsetX = (canvasWidth - viewportWidth) / 2;
		const centerOffsetY = (canvasHeight - viewportHeight) / 2;

		// Draw in screen space by delta since snapshot capture. No extra transforms.
		const dx = centerOffsetX + canvasOffset.x - snapshotOffset.x;
		const dy = centerOffsetY + canvasOffset.y - snapshotOffset.y;
		context.drawImage(snapshot, dx, dy);
	}

	async function captureSnapshot() {
		try {
			if (!canvas?.element) return;

			// Calculate center offset for the larger canvas
			const canvasWidth = canvas.element.width;
			const canvasHeight = canvas.element.height;
			const viewportWidth = window.innerWidth;
			const viewportHeight = window.innerHeight;
			const centerOffsetX = (canvasWidth - viewportWidth) / 2;
			const centerOffsetY = (canvasHeight - viewportHeight) / 2;

			// Anchor snapshot to current view transform
			snapshotOffset = { x: centerOffsetX + canvasOffset.x, y: centerOffsetY + canvasOffset.y };
			snapshotScale = canvasScale;
			snapshot = await createImageBitmap(canvas.element);
		} catch (err) {
			console.warn('Failed to capture canvas snapshot', err);
		}
	}

	async function runGPU() {
		if (!epb) return;

		isLoading = true;
		const t1 = performance.now();
		const bundeledEdges = await epb.bundle();
		const t2 = performance.now();
		console.log(`EPB: ${t2 - t1}ms`);

		// const cache = localStorage.getItem(`${selectedGraph}_greedy`);
		// if (cache) {
		// 	localStorage.setItem(`${selectedGraph}_greedy`, `${cache};${t2 - t1}`);
		// } else {
		// 	localStorage.setItem(`${selectedGraph}_greedy`, `${t2 - t1}`);
		// }

		// await sleep(2000);

		// const length = cache?.split(';').length ?? 0;
		// console.log({ length });
		// if (length < 24) {
		// 	location.reload();
		// }

		// Update cache
		cachedBundledEdges = bundeledEdges;

		// Center initial view once per dataset
		if (!hasCenteredInitialView && cachedBundledEdges && cachedBundledEdges.length > 0) {
			// Compute bounds from bundled edges' control points
			let minX = Infinity,
				maxX = -Infinity,
				minY = Infinity,
				maxY = -Infinity;
			for (const edge of cachedBundledEdges) {
				for (const p of edge.controlPoints) {
					if (!p) continue;
					if (p.x < minX) minX = p.x;
					if (p.x > maxX) maxX = p.x;
					if (p.y < minY) minY = p.y;
					if (p.y > maxY) maxY = p.y;
				}
			}
			if (
				Number.isFinite(minX) &&
				Number.isFinite(maxX) &&
				Number.isFinite(minY) &&
				Number.isFinite(maxY)
			) {
				const worldCenterX = (minX + maxX) / 2;
				const worldCenterY = (minY + maxY) / 2;
				const viewportWidth = window.innerWidth;
				const viewportHeight = window.innerHeight;
				// After draw, we translate by centerOffset + canvasOffset then scale
				// To put world center at screen center, set canvasOffset accordingly
				canvasOffset.x = viewportWidth / 2 - worldCenterX * canvasScale;
				canvasOffset.y = viewportHeight / 2 - worldCenterY * canvasScale;
				hasCenteredInitialView = true;
			}
		}

		// Draw and refresh snapshot
		drawCanvas();
		await captureSnapshot();
		isLoading = false;

		// const exported = exportBundling(epb.graph, bundeledEdges);
		// console.log(JSON.stringify(exported, undefined, 2));
	}

	function downloadCanvas() {
		const canvasElement = canvas.element;
		const link = document.createElement('a');
		link.download = `PEPB_${spannerAlgorithm}_${selectedGraph}_d_${maxDistortion}_w_${edgeWeightFactor}.png`;
		link.href = canvasElement.toDataURL('image/png');
		link.click();
	}

	function downloadBundling() {
		if (!epb || !graph) return;

		// Get the bundled edges from the last run
		epb.bundle().then((bundledEdges) => {
			const exported = exportBundling(graph, bundledEdges);
			const dataStr = JSON.stringify(exported, null, 2);
			const dataBlob = new Blob([dataStr], { type: 'application/json' });

			const link = document.createElement('a');
			link.download = `${selectedGraph}_${spannerAlgorithm}_bundling.json`;
			link.href = URL.createObjectURL(dataBlob);
			link.click();

			// Clean up the object URL
			URL.revokeObjectURL(link.href);
		});
	}
</script>

<ControlPanel>
	<label class="flex items-center justify-between gap-2">
		Graph
		<select name="graph" bind:value={selectedGraph}>
			{#each DATASET_NAMES as datasetName}
				<option value={datasetName}>{datasetName}</option>
			{/each}
		</select>
	</label>

	<label class="flex items-center justify-between gap-2">
		Spanner Algorithm

		<select name="graph" bind:value={spannerAlgorithm}>
			<option value="theta">Theta</option>
			<option value="greedy">Greedy</option>
		</select>
	</label>

	<label>
		Max distortion
		<RangeInput min={0} max={10} step={0.1} bind:value={maxDistortion} />
	</label>

	<label>
		Edge weight factor
		<RangeInput min={0.01} max={2} step={0.01} bind:value={edgeWeightFactor} />
	</label>

	<button onclick={downloadCanvas}>Download Canvas</button>

	<!-- <button onclick={downloadBundling}>Download Bundling</button> -->
</ControlPanel>

{#if isLoading}
	<div
		class="pointer-events-none fixed left-3 top-3 z-50 inline-flex items-center gap-2 rounded bg-black/70 px-3 py-2 text-xs text-white"
	>
		<svg
			class="size-3 animate-spin"
			viewBox="0 0 24 24"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			aria-hidden="true"
		>
			<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
			></circle>
			<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
		</svg>
		<span>Computing…</span>
	</div>
{/if}
