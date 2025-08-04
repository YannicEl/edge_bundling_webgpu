export type RGB = [number, number, number];

export function normalize(value: number, min: number, max: number): number {
	return (value - min) / (max - min);
}

export function scale(value: number, min: number, max: number): number {
	return value * (max - min) + min;
}
