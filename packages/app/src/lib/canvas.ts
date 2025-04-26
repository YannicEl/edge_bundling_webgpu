import { drawCircle, drawLine } from '@bachelor/core/canvas';
import type { Graph } from '@bachelor/core/Graph';

export function drawGraph(
	ctx: CanvasRenderingContext2D,
	graph: Graph,
	labels: boolean = true
): void {
	ctx.clearRect(0, 0, ctx.canvas?.width, ctx.canvas?.height);

	let i = 0;
	graph.edges.forEach(({ start, end }) => {
		drawLine(ctx, start.x, start.y, end.x, end.y, { width: 1, color: 'black' });
		ctx.font = '2rem sans-serif';
		if (labels) {
			ctx.fillText(i.toString(), (start.x + end.x) / 2, (start.y + end.y) / 2);
		}
		i++;
	});

	i = 0;
	graph.nodes.forEach((vertice) => {
		drawCircle(ctx, vertice.x, vertice.y, { radius: 5, color: 'blue' });
		ctx.font = '2rem sans-serif';
		if (labels) {
			ctx.fillText(i.toString(), vertice.x, vertice.y + 30);
		}
		i++;
	});
}
