import type { Graph } from '../AdjacencyList';

export type SpannerParams = {
	device: GPUDevice;
	graph: Graph;
	maxDistortion: number;
};

export abstract class Spanner {
	abstract compute(): Promise<Graph> | Graph;

	abstract get graph(): Graph | undefined;

	abstract set maxDistortion(value: number);
	abstract get maxDistortion(): number;
}
