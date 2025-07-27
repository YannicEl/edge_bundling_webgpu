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
	controlPoints: Point[],
	{ width, color }: { width: number; color?: string }
): void {
	if (controlPoints.length < 2) {
		console.warn('Not enough control points');
		return;
	}

	ctx.lineWidth = width;
	if (color) ctx.strokeStyle = color;

	const start = controlPoints.at(0)!;
	const end = controlPoints.at(-1)!;

	ctx.beginPath();
	ctx.moveTo(start.x, start.y);

	if (controlPoints.length === 3) {
		const point = controlPoints[1]!;
		ctx.quadraticCurveTo(point.x, point.y, end.x, end.y);
	} else if (controlPoints.length === 4) {
		const point1 = controlPoints[1]!;
		const point2 = controlPoints[2]!;
		ctx.bezierCurveTo(point1.x, point1.y, point2.x, point2.y, end.x, end.y);
	} else {
		for (let i = 1; i < controlPoints.length - 2; i++) {
			const point1 = controlPoints[i]!;
			const point2 = controlPoints[i + 1]!;

			const xc = (point1.x + point2.x) / 2;
			const yc = (point1.y + point2.y) / 2;
			ctx.quadraticCurveTo(point1.x, point1.y, xc, yc);
		}

		const point1 = controlPoints.at(-2)!;
		const point2 = controlPoints.at(-1)!;
		ctx.quadraticCurveTo(point1.x, point1.y, point2.x, point2.y);
	}

	ctx.stroke();
}
