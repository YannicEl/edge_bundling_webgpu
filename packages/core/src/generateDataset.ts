import { writeFile } from 'fs/promises';
import { Graph } from './AdjacencyList';

const nodeCount = 500;
const dimensions = { x: 1000, y: 1000 };

const graph = new Graph();

console.log(Math.sqrt(512));

let i = 0;
for (let x = 0; x < Math.sqrt(nodeCount); x++) {
	for (let y = 0; y < Math.sqrt(nodeCount); y++) {
		graph.addNode({
			x: x * (dimensions.x / Math.sqrt(nodeCount)),
			y: y * (dimensions.y / Math.sqrt(nodeCount)),
		});
		i++;
	}
}

// Connect each node with every other node
const nodeEntries = Array.from(graph.nodes.entries());
for (let i = 0; i < nodeEntries.length; i++) {
	for (let j = i + 1; j < nodeEntries.length; j++) {
		const startEntry = nodeEntries[i];
		const endEntry = nodeEntries[j];

		if (startEntry && endEntry) {
			const [startIndex, startNode] = startEntry;
			const [endIndex, endNode] = endEntry;

			// Calculate weight as Euclidean distance
			const weight = Math.sqrt(
				Math.pow(endNode.x - startNode.x, 2) + Math.pow(endNode.y - startNode.y, 2)
			);

			graph.addEdge({ start: startIndex, end: endIndex, weight });
		} else {
			console.log('oop');
		}
	}
}

console.log(graph.nodes.size, graph.edges.size);

writeFile(
	`./src/datasets/graphs/fully_connected_${graph.nodes.size}.json`,
	JSON.stringify(graph.toJSON())
);

const nodes = Array.from(graph.nodes);
const edges = Array.from(graph.edges);

const graphML = `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://graphml.graphdrawing.org/xmlns
  http://graphml.graphdrawing.org/xmlns/1.0/graphml.xsd">

  <key id="x" for="node" attr.name="x" attr.type="double"/>
  <key id="y" for="node" attr.name="y" attr.type="double"/>

  <graph edgedefault="directed">
    <!-- nodes -->
    ${nodes
			.map(([nodeId, node]) => {
				return `
        <node id="${nodeId}">
          <data key="x">${node.x}</data>
          <data key="y">${node.y}</data>
        </node>`;
			})
			.join('')}



    <!-- edges -->
    ${edges
			.map(([edgeId, edge]) => {
				return `<edge id="${edgeId}" source="${edge.start}" target="${edge.end}"></edge>`;
			})
			.join('\n')}
  </graph>
</graphml>
`;

writeFile(`./src/datasets/graphml/fully_connected_${graph.nodes.size}.graphml`, graphML);

const json = {
	directed: false,
	multigraph: false,
	graph: {
		node_default: {},
		edge_default: {},
		Name: `fully_connected_${graph.nodes.size}`,
		xmin: 0,
		xmax: 1000,
		ymin: 0,
		ymax: 1000,
	},
	nodes: [],
	links: [],
};

nodes.forEach(([nodeId, node]) => {
	json.nodes.push({ x: node.x, y: node.y, id: nodeId.toString() });
});

edges.forEach(([edgeId, edge]) => {
	json.links.push({ source: edge.start.toString(), target: edge.end.toString() });
});

writeFile(`./src/datasets/graphml/fully_connected_${graph.nodes.size}.json`, JSON.stringify(json));
