struct Edge {
  start: u32,
  end: u32,
  weight: f32,
}

struct Uniforms {
  k: u32,
  max_distortion: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read_write> distance_matrix: array<f32>;
@group(0) @binding(2) var<storage, read> edges: array<Edge>;
@group(0) @binding(3) var<storage, read_write> skipped: u32;

override node_count: u32;

@compute @workgroup_size(8, 8)
fn compute(
  @builtin(global_invocation_id) global_id : vec3<u32>,
) {
  let x = global_id.x;
  let y = global_id.y;
  let n = node_count;

  if (x >= n || y >= n) {
    return;
  }

  let edge = edges[uniforms.k];

  if(distance_matrix_get(x, y) > edge.weight * uniforms.max_distortion) {
    var value = min(distance_matrix_get(x, y), distance_matrix_get(x, edge.start) + edge.weight + distance_matrix_get(edge.end, y));
    value = min(value, distance_matrix_get(x, edge.end) + edge.weight + distance_matrix_get(edge.start, y));

    distance_matrix_set(x, y, value);
  } else {
    skipped += 1;
    return;
  }
}

// Matrix getters and setters

fn distance_matrix_get(x: u32, y: u32) -> f32 {
  return distance_matrix[get_matrix_index(x, y)];
}

fn distance_matrix_set(x: u32, y: u32, value: f32) {
  distance_matrix[get_matrix_index(x, y)] = value;
}

fn get_matrix_index(x: u32, y: u32) -> u32 {
  return x * node_count + y;
}