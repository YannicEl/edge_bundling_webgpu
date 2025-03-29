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

struct Output {
  hallo: i32,
  distance: f32,
  zwallo: i32,
  drallo: i32,   
  float: f32,   
  unsigned: u32,
}

@group(0) @binding(1) var<storage, read_write> nodes: array<Node>;
@group(0) @binding(2) var<storage, read> edges: array<Edge>;
@group(0) @binding(3) var<storage, read_write> distances: array<Distance>;
@group(0) @binding(4) var<storage, read_write> output: Output;

override start: u32;  
override end: u32;  

@compute @workgroup_size(1) fn compute(
  @builtin(global_invocation_id) pixel : vec3<u32>,
  @builtin(num_workgroups) dimensions: vec3<u32>
) {
  distances[start].value = 0.0;

  let one = 1.0;
  let zero = 0.0;
  let infinity = one / zero;

  var visited = 0u;
  while(visited < arrayLength(&nodes)) {
    let current = getCurrentNode();

    if(current == end) {
      output.distance = distances[end].value;
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
      if(nodes[neighbor].visited == 1) {
        continue;
      }

      let distance = distances[current].value + edge.weight;
      if (distance < distances[neighbor].value) {
        distances[neighbor].value = distance;
        distances[neighbor].last = current;
      }
    }

    nodes[current].visited = 1;
    visited++;
  }
}

fn getCurrentNode() -> u32 {
  var current: u32;
  var first = true;

  for (var i = 0u; i < arrayLength(&nodes); i++) {
    let node = nodes[i];
    if(node.visited == 1) {
      continue;
    }

    if(first) {
      current = i;
      first = false;
      continue;
    }

    let distance_node = distances[i];
    let distance_current = distances[current];

    if(distance_node.value < distance_current.value) {
      current = i;
    }
  }

  return current;
}


