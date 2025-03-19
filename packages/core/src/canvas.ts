import type { Point } from './Point';

export function drawLine(
	ctx: CanvasRenderingContext2D,
	x1: number,
	y1: number,
	x2: number,
	y2: number,
	{ width, color }: { width: number; color?: string }
): void {
	ctx.lineWidth = width;
	if (color) ctx.strokeStyle = color;
	ctx.beginPath();
	ctx.moveTo(x1, y1);
	ctx.lineTo(x2, y2);
	ctx.stroke();
}

export function drawCircle(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	{ radius, color }: { radius: number; color?: string }
): void {
	if (color) ctx.fillStyle = color;
	ctx.beginPath();
	ctx.arc(x, y, radius, 0, 2 * Math.PI);
	ctx.fill();
}

export function drawBezierCurve(
	ctx: CanvasRenderingContext2D,
	x1: number,
	y1: number,
	x2: number,
	y2: number,
	controlPoints: Point[],
	{ width, color }: { width: number; color?: string }
): void {
	ctx.lineWidth = width;
	if (color) ctx.strokeStyle = color;

	ctx.beginPath();
	ctx.moveTo(x1, y1);

	if (controlPoints.length === 1) {
		const point = controlPoints[0]!;
		ctx.quadraticCurveTo(point.x, point.y, x2, y2);
	} else if (controlPoints.length === 2) {
		const point1 = controlPoints[0]!;
		const point2 = controlPoints[1]!;
		ctx.bezierCurveTo(point1.x, point1.y, point2.x, point2.y, x2, y2);
	} else {
		ctx.moveTo(x1, y1);
		const start = { x: x1, y: y1 };
		const end = { x: x2, y: y2 };
		const points: Point[] = [start, ...controlPoints, end];
		ctx.beginPath();

		ctx.moveTo(start.x, start.y);
		for (let i = 1; i < points.length - 2; i++) {
			const xc = (points[i].x + points[i + 1].x) / 2;
			const yc = (points[i].y + points[i + 1].y) / 2;
			ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
		}
		ctx.quadraticCurveTo(
			points[points.length - 2].x,
			points[points.length - 2].y,
			points[points.length - 1].x,
			points[points.length - 1].y
		);
	}

	ctx.stroke();
}
