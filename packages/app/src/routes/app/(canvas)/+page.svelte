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

	const { device } = getWebGPUState();
	const { canvas, context } = getCanvasState();

	let selectedGraph = $state<DatasetName>(
		(page.url.searchParams.get('graph') as DatasetName) ?? 'airlines'
	);
	$effect(() => {
		goto(
			`?graph=${selectedGraph}&spannerAlgorithm=${spannerAlgorithm}&renderingMode=${renderingMode}`
		);
	});

	let maxDistortion = $state<number>(2);
	let edgeWeightFactor = $state<number>(2);
	let renderingMode = $state<'quality' | 'fast'>(
		(page.url.searchParams.get('renderingMode') as 'quality' | 'fast') ?? 'quality'
	);
	let spannerAlgorithm = $state<string>(page.url.searchParams.get('spannerAlgorithm') ?? 'theta');
	let epb: EdgePathBundlingGPUFloydWarshall;
	let graph: any; // Store graph for use in drawBundledEdges
	let cachedBundledEdges: any[] | null = null; // Cache for redraws while dragging
	let snapshot: ImageBitmap | null = null; // Snapshot of canvas for drag-only redraws
	let snapshotOffset = { x: 0, y: 0 }; // Offset at which snapshot was captured
	let snapshotScale = 1; // Scale at which snapshot was captured
	let hasCenteredInitialView = $state(false);
	let isLoading = $state(false);
	let isComputing = false;
	let rerunRequested = false;

	// Drag state
	let isDragging = $state(false);
	let lastMousePos = $state({ x: 0, y: 0 });
	let canvasOffset = $state({ x: 0, y: 0 });

	// Zoom state
	let canvasScale = $state(1);
	const minScale = 0.2;
	const maxScale = 8;

	function debounce(fn: () => void, delay = 100) {
		let t: number | undefined;
		return () => {
			if (t) window.clearTimeout(t);
			t = window.setTimeout(fn, delay);
		};
	}

	canvas.onResize = debounce(() => {
		if (!cachedBundledEdges) return;
		drawCanvas();
		void captureSnapshot();
	}, 100);

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
	let lastSpannerAlgorithm = spannerAlgorithm;
	$effect(() => {
		const md = maxDistortion;
		const ew = edgeWeightFactor;
		const algo = spannerAlgorithm;
		if (!epb || !graph) return;
		epb.maxDistortion = md;
		epb.edgeWeightFactor = ew;
		if (algo !== lastSpannerAlgorithm) {
			epb = new EdgePathBundlingGPUFloydWarshall({
				device,
				graph,
				maxDistortion: md,
				edgeWeightFactor: ew,
				spannerAlgorithm: algo === 'theta' ? ThetaSpanner : GreedySpanner,
			});
			lastSpannerAlgorithm = algo;
		}
		runGPU();
	});

	// Re-render when rendering mode changes (no recompute)
	$effect(() => {
		const mode = renderingMode;
		if (cachedBundledEdges && !isDragging) {
			drawCanvas();
			void captureSnapshot();
		}
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

			// Reset view so the new dataset recenters like on first render
			cachedBundledEdges = null;
			snapshot = null;
			canvasScale = 1;
			canvasOffset = { x: 0, y: 0 };
			hasCenteredInitialView = false;

			runGPU();
		})();
	});

	onMount(async () => {
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
			drawBundledEdges({ ctx: context, bundeledEdges: cachedBundledEdges, mode: renderingMode });
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
		if (isComputing) {
			rerunRequested = true;
			return;
		}

		isComputing = true;
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
		isComputing = false;
		if (rerunRequested) {
			rerunRequested = false;
			void runGPU();
		}

		// const exported = exportBundling(epb.graph, bundeledEdges);
		// console.log(JSON.stringify(exported, undefined, 2));
	}

	function downloadCanvas() {
		const canvasElement = canvas.element;

		// Calculate the visible viewport area (excluding the oversized canvas borders)
		const viewportWidth = window.innerWidth;
		const viewportHeight = window.innerHeight;
		const canvasWidth = canvasElement.width;
		const canvasHeight = canvasElement.height;

		// Calculate the center offset to crop to visible area
		const centerOffsetX = (canvasWidth - viewportWidth) / 2;
		const centerOffsetY = (canvasHeight - viewportHeight) / 2;

		// Create a temporary canvas for the cropped image
		const tempCanvas = document.createElement('canvas');
		tempCanvas.width = viewportWidth;
		tempCanvas.height = viewportHeight;
		const tempCtx = tempCanvas.getContext('2d');

		if (!tempCtx) return;

		// Draw only the visible portion of the original canvas
		tempCtx.drawImage(
			canvasElement,
			centerOffsetX,
			centerOffsetY,
			viewportWidth,
			viewportHeight, // source area
			0,
			0,
			viewportWidth,
			viewportHeight // destination area
		);

		const link = document.createElement('a');
		link.download = `PEPB_${spannerAlgorithm}_${selectedGraph}_d_${maxDistortion}_w_${edgeWeightFactor}.png`;
		link.href = tempCanvas.toDataURL('image/png');
		link.click();
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

		<select name="spannerAlgorithm" bind:value={spannerAlgorithm}>
			<option value="theta">Theta</option>
			<option value="greedy">Greedy</option>
		</select>
	</label>

	<label class="flex items-center justify-between gap-2">
		Rendering mode

		<select name="renderingMode" bind:value={renderingMode}>
			<option value="fast">Fast</option>
			<option value="quality">Quality</option>
		</select>
	</label>

	<label>
		Max distortion
		<RangeInput min={0} max={10} step={0.1} bind:value={maxDistortion} />
	</label>

	<label>
		Edge weight factor
		<RangeInput min={1} max={3} step={0.01} bind:value={edgeWeightFactor} />
	</label>

	<button
		onclick={downloadCanvas}
		class="cursor-pointer border border-black hover:bg-black hover:text-white"
		>Download Canvas</button
	>

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
