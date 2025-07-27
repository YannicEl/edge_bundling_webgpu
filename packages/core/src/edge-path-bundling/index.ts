import type { Edge } from '../AdjacencyList';

export type BundledEdge = {
	edge: Edge;
	controlPoints: { x: number; y: number }[];
};

export abstract class EdgePathBundling {
	abstract bundle(): Promise<BundledEdge[]> | BundledEdge[];
}
