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

export function calcAngle(start: Point, end: Point): number {
	const x = end.x - start.x;
	const y = end.y - start.y;

	let angle = (Math.atan2(y, x) * 180) / Math.PI;

	if (angle < 0) {
		angle = 360 + angle;
	}

	if (angle > 180) {
		angle = (angle + 180) % 360;
	}
	angle = angle / 180;

	angle += 0.75;
	if (angle > 1) {
		angle = angle - 1;
	}

	return angle;
}

/**
 * Calculate binomial coefficient C(n,k)
 */
function binomial(n: number, k: number): number {
	let coefficient = 1;
	let x = n - k + 1;
	while (x <= n) {
		coefficient *= x;
		x += 1;
	}

	for (let x = 1; x <= k; x++) {
		coefficient /= x;
	}

	return coefficient;
}

/**
 * Approximate Bezier curve using the same algorithm as Python implementation TODO reference in readme
 * @param points Array of control points
 * @param n Number of points to sample along the curve
 * @returns Array of [x, y] coordinates along the curve
 */
function approxBezier(points: Point[], n: number): Point[] {
	if (points.length < 2) {
		return points;
	}

	const result: Point[] = [];
	const binom: number[] = [];

	// Calculate binomial coefficients
	for (let i = 0; i < points.length; i++) {
		binom[i] = binomial(points.length - 1, i);
	}

	// Sample points along the curve
	for (let j = 0; j < n; j++) {
		const t = j / (n - 1); // t goes from 0 to 1
		let pX = 0;
		let pY = 0;

		for (let i = 0; i < points.length; i++) {
			const point = points[i];
			if (!point) continue;

			const tpi = Math.pow(1 - t, points.length - 1 - i);
			const coeff = tpi * Math.pow(t, i);

			pX += binom[i]! * coeff * point.x;
			pY += binom[i]! * coeff * point.y;
		}

		result.push({ x: pX, y: pY });
	}

	return result;
}

export function drawBezierCurve(
	ctx: CanvasRenderingContext2D,
	controlPoints: Point[],
	{
		width,
		alpha = 1.0,
		strokeStyle,
	}: {
		width: number;
		alpha?: number;
		strokeStyle: CanvasFillStrokeStyles['strokeStyle'];
	}
): void {
	if (controlPoints.length < 2) {
		console.warn('Not enough control points');
		return;
	}

	ctx.lineWidth = width;

	// Use approximation for better curve rendering (similar to Python implementation)
	const NUM_POINTS_BEZIER = 50;
	const approximatedPoints = approxBezier(controlPoints, NUM_POINTS_BEZIER);

	if (approximatedPoints.length === 0) {
		console.warn('No approximated points generated');
		return;
	}

	ctx.strokeStyle = strokeStyle;
	ctx.globalAlpha = alpha;

	ctx.beginPath();
	ctx.moveTo(approximatedPoints[0]!.x, approximatedPoints[0]!.y);

	for (let i = 1; i < approximatedPoints.length; i++) {
		const point = approximatedPoints[i];
		if (point) {
			ctx.lineTo(point.x, point.y);
		}
	}

	ctx.stroke();

	// Reset global alpha
	ctx.globalAlpha = 1.0;
}

export function drawBezierCurve_(
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
