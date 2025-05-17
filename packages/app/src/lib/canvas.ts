import type { Edge } from '@bachelor/core/Edge';
import type { Graph } from '@bachelor/core/Graph';
import { drawBezierCurve, drawCircle, drawLine } from '@bachelor/core/canvas';

export type DrawGraphParams = {
	ctx: CanvasRenderingContext2D;
	graph: Graph;
	drawLabels?: boolean;
	drawNodes?: boolean;
	drawEdges?: boolean;
};

export function drawGraph({
	ctx,
	graph,
	drawLabels = true,
	drawNodes = true,
	drawEdges = true,
}: DrawGraphParams): void {
	ctx.clearRect(0, 0, ctx.canvas?.width, ctx.canvas?.height);

	// Compute bounding box
	const nodes = [...graph.nodes.values()];
	if (nodes.length === 0) return;
	const minX = Math.min(...nodes.map((n) => n.x));
	const maxX = Math.max(...nodes.map((n) => n.x));
	const minY = Math.min(...nodes.map((n) => n.y));
	const maxY = Math.max(...nodes.map((n) => n.y));

	const graphCenterX = (minX + maxX) / 2;
	const graphCenterY = (minY + maxY) / 2;
	const canvasCenterX = ctx.canvas.width / 2;
	const canvasCenterY = ctx.canvas.height / 2;

	const offsetX = canvasCenterX - graphCenterX;
	const offsetY = canvasCenterY - graphCenterY;

	if (drawEdges) {
		let i = 0;
		graph.edges.forEach(({ start, end }) => {
			drawLine(ctx, start.x + offsetX, start.y + offsetY, end.x + offsetX, end.y + offsetY, {
				width: 1,
				color: 'black',
			});

			if (drawLabels) {
				ctx.font = '2rem sans-serif';
				ctx.fillText(
					i.toString(),
					(start.x + end.x) / 2 + offsetX,
					(start.y + end.y) / 2 + offsetY
				);
			}
			i++;
		});
	}

	if (drawNodes) {
		let i = 0;
		graph.nodes.forEach((vertice) => {
			drawCircle(ctx, vertice.x + offsetX, vertice.y + offsetY, { radius: 3, color: 'blue' });
			if (drawLabels) {
				ctx.font = '2rem sans-serif';
				ctx.fillText(i.toString(), vertice.x + offsetX, vertice.y + offsetY + 30);
			}
			i++;
		});
	}
}

export type DrawGraphAndBundledEdgesParams = {
	ctx: CanvasRenderingContext2D;
	graph: Graph;
	bundeledEdges: { edge: Edge; controlPoints: { x: number; y: number }[] }[];
};

export function drawGraphAndBundledEdges({
	ctx,
	graph,
	bundeledEdges,
}: DrawGraphAndBundledEdgesParams): void {
	console.time('Draw');
	drawGraph({ ctx, graph, drawLabels: false, drawNodes: false, drawEdges: false });

	bundeledEdges.forEach(({ edge, controlPoints }, i) => {
		drawBezierCurve(ctx, edge.start.x, edge.start.y, edge.end.x, edge.end.y, controlPoints, {
			width: 1,
			color: 'color(srgb 1 0 0 / 0.2)',
		});
	});
	console.timeEnd('Draw');
}
