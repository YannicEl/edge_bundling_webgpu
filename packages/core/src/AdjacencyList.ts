import type { BundledEdge } from './edge-path-bundling/index';
import type { GraphJSON } from './Graph';

export type Node = {
	x: number;
	y: number;
};

export type Edge = {
	start: number;
	end: number;
	weight: number;
};

export class Graph {
	adjacencyList: Map<number, Set<number>>;
	nodes: Readonly<Map<number, Node>>;
	edges: Readonly<Map<string, Edge>>;

	constructor() {
		this.adjacencyList = new Map();
		this.nodes = new Map();
		this.edges = new Map();
	}

	addNode(node: Node): number {
		const index = this.nodes.size;
		this.nodes.set(index, node);
		this.adjacencyList.set(index, new Set());
		return index;
	}

	addEdge(edge: Edge) {
		if (!this.adjacencyList.has(edge.start)) throw new Error('Start node not found');
		if (!this.adjacencyList.has(edge.end)) throw new Error('End node not found');

		this.adjacencyList.get(edge.start)!.add(edge.end);
		this.adjacencyList.get(edge.end)!.add(edge.start);

		const key = `${edge.start}_${edge.end}`;
		this.edges.set(key, edge);
	}

	removeEdge(edge: Edge) {
		if (!this.adjacencyList.has(edge.start)) throw new Error('Start node not found');
		this.adjacencyList.get(edge.start)!.delete(edge.end);

		if (!this.adjacencyList.has(edge.end)) throw new Error('End node not found');
		this.adjacencyList.get(edge.end)!.delete(edge.start);

		this.edges.delete(`${edge.start}_${edge.end}`);
	}

	static fromJSON({ nodes, edges }: GraphJSON): Graph {
		const graph = new Graph();

		for (const [x, y] of nodes) {
			graph.addNode({ x, y });
		}

		for (const [start, end] of edges) {
			const startNode = graph.nodes.get(start);
			if (!startNode) throw new Error('Start node not found');

			const endNode = graph.nodes.get(end);
			if (!endNode) throw new Error('End node not found');

			const weight = Math.sqrt(
				Math.pow(endNode.x - startNode.x, 2) + Math.pow(endNode.y - startNode.y, 2)
			);
			graph.addEdge({ start, end, weight });
		}

		return graph;
	}

	toJSON(): GraphJSON {
		return {
			nodes: Array.from(this.nodes.values()).map(({ x, y }) => [x, y]),
			edges: Array.from(this.edges.values()).map(({ start, end }) => [start, end]),
		};
	}
}

export type BundlingJSON = {
	nodes: [x: number, y: number][];
	node_ids: string[];
	edges: [start: string, end: string][];
	splines: {
		[key: `${number},${number}`]: number[];
	};
	dimensions: {
		xmin: number;
		xmax: number;
		ymin: number;
		ymax: number;
	};
};

export function exportBundling(graph: Graph, bundledEdges: BundledEdge[]): BundlingJSON {
	const nodes: BundlingJSON['nodes'] = [];
	const node_ids: BundlingJSON['node_ids'] = [];
	graph.nodes.forEach((node, i) => {
		nodes.push([node.x, node.y]);
		node_ids.push(i.toString());
	});

	const edges: BundlingJSON['edges'] = [];
	bundledEdges.forEach((bundledEdge) => {
		edges.push([bundledEdge.edge.start.toString(), bundledEdge.edge.end.toString()]);
	});

	const splines: BundlingJSON['splines'] = {};
	bundledEdges.forEach((bundledEdge) => {
		const controlPoints = bundledEdge.controlPoints.slice(1, -1).map(({ nodeIndex }) => nodeIndex);

		if (controlPoints.length > 2) {
			splines[`${bundledEdge.edge.start},${bundledEdge.edge.end}`] = controlPoints;
		}
	});

	return {
		nodes,
		node_ids,
		edges,
		splines,
		dimensions: {
			xmin: Math.min(...nodes.map(([x]) => x)),
			xmax: Math.max(...nodes.map(([x]) => x)),
			ymin: Math.min(...nodes.map(([, y]) => y)),
			ymax: Math.max(...nodes.map(([, y]) => y)),
		},
	};
}
