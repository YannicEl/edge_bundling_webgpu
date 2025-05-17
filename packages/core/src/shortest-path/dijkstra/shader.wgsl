struct Path {
  start: u32,
  end: u32,
}

struct Node {
  edges: u32,
}

struct Edge {
  end: u32,
  weight: f32,
}

struct Distance {
  value: f32,
  last: u32,
}

@group(0) @binding(0) var<storage, read> paths: array<Path>;
@group(0) @binding(1) var<storage, read> nodes: array<Node>;
@group(0) @binding(2) var<storage, read> edges: array<Edge>;
@group(0) @binding(3) var<storage, read_write> distances: array<Distance>;
@group(0) @binding(4) var<storage, read_write> visited: array<u32>;
@group(0) @binding(5) var<storage, read_write> shortestPaths: array<u32>;
@group(0) @binding(6) var<storage, read_write> shortestDistance: array<f32>;

override node_count: u32;

@compute @workgroup_size(1) fn compute(
  @builtin(global_invocation_id) global_id: vec3<u32>,
  @builtin(workgroup_id) workgroup_id: vec3<u32>,
) {
  let edge_count = arrayLength(&edges);

  let path = paths[global_id.x];
  let start = path.start;
  let end = path.end;

  distances[normalizeIndex(start, global_id)].value = 0.0;

  var nrVisited = 0u;
  while(nrVisited < arrayLength(&nodes)) {
    let current = getCurrentNode(global_id, workgroup_id);

    if(current == end) {
      shortestDistance[global_id.x] = distances[normalizeIndex(end, global_id)].value;
      shortestPaths[normalizeIndex(0, global_id)] = end;

      var temp = end;
      var i = 1u;
      while(temp != start) {
        temp = distances[normalizeIndex(temp, global_id)].last;
        shortestPaths[normalizeIndex(i, global_id)] = temp;
        i++;
      }

      if(i != arrayLength(&nodes)) {
        shortestPaths[normalizeIndex(i, global_id)] = arrayLength(&nodes);
      }
    }

    let startEdge = nodes[current].edges;
    var endEdge: u32;
    if(current + 1 < arrayLength(&nodes)) {
      endEdge = nodes[current + 1].edges;
    } else {
      endEdge = arrayLength(&edges);
    }

    for(var i = startEdge; i < endEdge; i++) {
      let edge = edges[i];

      let neighbor = edge.end;
      if(visited[normalizeIndex(neighbor, global_id)] == 1) {
        continue;
      }

      let distance = distances[normalizeIndex(current, global_id)].value + edge.weight;
      if (distance < distances[normalizeIndex(neighbor, global_id)].value) {
        distances[normalizeIndex(neighbor, global_id)].value = distance;
        distances[normalizeIndex(neighbor, global_id)].last = current;
      }
    }

    visited[normalizeIndex(current, global_id)] = 1;
    nrVisited++;
  }
}

fn getCurrentNode(global_id: vec3u, num_workgroups: vec3u) -> u32 {
  var current: u32;
  var first = true;

  for (var i = 0u; i < arrayLength(&nodes); i++) {
    let node = nodes[i];
    if(visited[normalizeIndex(i, global_id)] == 1) {
      continue;
    }

    if(first) {
      current = i;
      first = false;
      continue;
    }

    let distance_node = distances[normalizeIndex(i, global_id)];
    let distance_current = distances[normalizeIndex(current, global_id)];

    if(distance_node.value < distance_current.value) {
      current = i;
    }
  }

  return current;
}

fn normalizeIndex(index: u32, global_id: vec3u) -> u32 {
  return index + global_id.x * node_count;
} 
