import type { RGB } from '../utils';
import { scale } from '../utils';

export function colorMap(value: number, map: RGB[]): RGB {
	value = scale(value, 0, map.length - 1);
	return map[Math.floor(value)]!;
}
