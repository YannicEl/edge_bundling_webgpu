import type { Graph } from '../Graph';

export type LocalSpannerParams = {
	graph: Graph;
};

export function localSpanner({ graph }: LocalSpannerParams): Graph {
	return graph;
}
