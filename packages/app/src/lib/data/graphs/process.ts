import { Edge } from '@bachelor/core/Edge';
import { Node } from '@bachelor/core/Node';
import fs from 'node:fs/promises';
import json from './airlines.json' with { type: 'json' };

const nodes = new Map<string, Node>();
json.nodes.forEach((node) => {
	nodes.set(node.id, new Node(node.x, node.y));
});

const edges: Edge[] = [];
json.links.forEach((edge) => {
	const source = nodes.get(edge.source);
	const target = nodes.get(edge.target);
	if (source && target) {
		edges.push(new Edge(source, target));
	} else {
		throw new Error('Invalid edge');
	}
});

fs.writeFile('airlines.json', JSON.stringify(toJSON(), null, 2));

function toJSON() {
	const temp = Array.from(nodes).map(([_, node]) => node);

	return {
		nodes: temp,
		edges: Array.from(edges).map((edge) => ({
			start: temp.indexOf(edge.start),
			end: temp.indexOf(edge.end),
		})),
	};
}
