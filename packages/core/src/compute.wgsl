struct Node {
  edges: u32,
  visited: u32,
}

struct Edge {
  end: u32,
  weight: f32,
}

struct Distance {
  value: f32,
  last: u32,
}

@group(0) @binding(1) var<storage, read_write> nodes: array<Node>;
@group(0) @binding(2) var<storage, read> edges: array<Edge>;
@group(0) @binding(3) var<storage, read_write> distances: array<Distance>;
// @group(0) @binding(4) var<storage, read_write> output: array<u32>;
@group(0) @binding(4) var<storage, read_write> output: array<f32>;

override start: u32;  
override end: u32;  

@compute @workgroup_size(1) fn compute(
  @builtin(global_invocation_id) pixel : vec3<u32>,
  @builtin(num_workgroups) dimensions: vec3<u32>
) {
  distances[start].value = 1.0;

  var visited = 0u;
  var lol = 0.0;
  while(visited < arrayLength(&nodes)) {
    let current = getCurrentNode();

    if(current == end) {
      output[0] = distances[end].value;
      output[1] = lol;
    }

    for(var i = nodes[current].edges; i < nodes[current + 1].edges; i++) {
      let edge = edges[i];

      let neighbor = edge.end;
      if(nodes[neighbor].visited == 0) {
        continue;
      }

      let distance = max(distances[edge.end].value, 0) + edge.weight;
      
      if(distance < max(distances[neighbor].value, 0)) {
        distances[neighbor].value = distance;
        distances[neighbor].last = current;
      }
    }

    nodes[current].visited = 1;
    visited++;
    lol = lol +1;
  }

  for (var i = 0u; i < arrayLength(&nodes); i++) {
    let node = nodes[i];
    let edge = edges[i];

    // output[i] = distances[i].value;
  }
}

fn getCurrentNode() -> u32 {
  var current = 0u;

  for (var i = 0u; i < arrayLength(&nodes); i++) {
    let node = nodes[i];
    if(node.visited == 1) {
      continue;
    }

    let distance_node = distances[i];
    let distance_current = distances[current];

    if(distance_current.value < 0) {
      current = i;
    }

    if(distance_node.value < 0) {
      continue;
    }

    if(distance_node.value < distance_current.value) {
      current = i;
    }
  }

  return current;
}


