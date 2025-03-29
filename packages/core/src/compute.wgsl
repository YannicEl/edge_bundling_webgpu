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
  distances[start].value = 1.0;

  getCurrentNode();

  var visited = 0u;
  var lol = 0.0;
  while(visited < arrayLength(&nodes)) {
    // let current = getCurrentNode();
    let current = 0u;

    if(current == end) {
      output.distance = distances[end].value;
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
}

fn getCurrentNode() -> u32 {
  var current: u32;
  var first = true;

  for (var i = 0u; i < arrayLength(&nodes); i++) {
      output.unsigned = i;
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

    if(i == 5) {
      // output.unsigned = current;
    }

    if(distance_current.value == -1) {
      output.zwallo ++;
      current = i;
      continue;
    }

    if(distance_node.value < distance_current.value) {
      current = i;
    }
  }

  return current;
}


