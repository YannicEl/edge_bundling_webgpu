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

struct Output {
  length: f32,
  length_2: vec4f,
  hallo: u32,
  zwallo: u32,
  drallo: u32,   
  float: f32,   
  unsigned: u32,
}

@group(0) @binding(1) var<storage, read> nodes: array<Node>;
@group(0) @binding(2) var<storage, read> edges: array<Edge>;
@group(0) @binding(3) var<storage, read_write> distances: array<Distance>;
@group(0) @binding(4) var<storage, read_write> visited: array<u32>;
@group(0) @binding(5) var<storage, read_write> path: array<u32>;
@group(0) @binding(6) var<storage, read_write> output: Output;

override start1: u32;  
override end1: u32;
override start2: u32;  
override end2: u32;
override node_count: u32;

@compute @workgroup_size(1) fn compute(
  @builtin(global_invocation_id) global_id: vec3<u32>,
  @builtin(workgroup_id) workgroup_id: vec3<u32>,
) {
  var start: u32;
  var end: u32;

  start = start2;
  end = end2;

  start = start1;
  end = end1;

  if(global_id.x == 0) {
    output.length_2[0] = f32(global_id.x);
  } else if (global_id.x == 1) {
    output.length_2[1] = f32(global_id.x);
  } else if (global_id.x == 2) {
    output.length_2[2] = f32(global_id.x);
  } else if (global_id.x == 3) {
    output.length_2[3] = f32(global_id.x);
  } else {
    output.hallo = 10;
  }

  let edge_count = arrayLength(&edges);
  
  distances[normalizeIndex(start, global_id)].value = 0.0;

  var nrVisited = 0u;
  while(nrVisited < arrayLength(&nodes)) {
    let current = getCurrentNode(global_id, workgroup_id);

    if(current == end) {
      output.length = distances[normalizeIndex(end, global_id)].value;
      // output.length_2[global_id.x] = output.length;
      path[0 + node_count * global_id.x] = end;

      var temp = end;
      var i = 1u;
      while(temp != start) {
        temp = distances[normalizeIndex(temp, global_id)].last;
        path[i + node_count * global_id.x] = temp;
        i++;
      }

      path[i] = arrayLength(&nodes);
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
  return index + 0 * node_count;
} 
