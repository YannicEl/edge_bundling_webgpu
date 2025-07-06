import type { Node } from './Node';

export type Path = {
	nodes: (Node | number)[];
	length: number;
};
