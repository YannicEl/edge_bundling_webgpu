import fs from 'node:fs/promises';
import json from './panama.json' with { type: 'json' };


const data = {
  nodes: json.nodes.map(({x,y}) => [x,y]),
  edges: json.edges.map(({start,end}) => [start,end]),
}


await fs.writeFile('panama.json', JSON.stringify(data));
