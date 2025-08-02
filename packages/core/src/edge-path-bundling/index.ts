import type { Edge, Graph } from '../AdjacencyList';
import type { Spanner, SpannerParams } from '../spanner';

export type BundledEdge = {
	edge: Edge;
	controlPoints: { x: number; y: number }[];
};

export type EdgePathBundlingParams = {
	device: GPUDevice;
	graph: Graph;
	spannerAlgorithm: new (params: SpannerParams) => Spanner;
	maxDistortion: number;
	edgeWeightFactor: number;
};

export abstract class EdgePathBundling {
	abstract bundle(): Promise<BundledEdge[]> | BundledEdge[];
}
