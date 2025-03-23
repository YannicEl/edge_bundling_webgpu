struct Node {
  edges: u32,
}

struct Edge {
  end: u32,
  weight: f32,
}

@group(0) @binding(1) var<storage, read> nodes: array<Node>;
@group(0) @binding(2) var<storage, read> edges: array<Edge>;
@group(0) @binding(3) var<storage, read_write> output: array<Node>;

@compute @workgroup_size(64) fn compute(
  @builtin(global_invocation_id) pixel : vec3<u32>,
  @builtin(num_workgroups) dimensions: vec3<u32>
) {
  for (var i = 0u; i <= arrayLength(&nodes); i++) {
    let node = nodes[i];

    output[i].edges = node.edges;
  }
}