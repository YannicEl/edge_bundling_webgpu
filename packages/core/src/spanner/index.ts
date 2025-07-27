import type { Graph } from '../AdjacencyList';

export abstract class Spanner {
	abstract compute(): Promise<Graph> | Graph;

	abstract get graph(): Graph;
}
