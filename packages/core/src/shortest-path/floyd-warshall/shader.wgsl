struct Path {
  start: u32,
  end: u32,
}

struct Uniforms {
  k: u32,
  edge_weight_factor: f32,
}

@group(0) @binding(0) var<storage, read_write> distance_matrix: array<f32>;
@group(0) @binding(1) var<storage, read_write> next_matrix: array<u32>;
@group(0) @binding(2) var<uniform> uniforms: Uniforms;
@group(0) @binding(3) var<storage, read> paths: array<Path>;
@group(0) @binding(4) var<storage, read_write> shortest_paths_distances: array<f32>;
@group(0) @binding(5) var<storage, read_write> shortest_paths_nodes: array<u32>;

override node_count: u32;

@compute @workgroup_size(8, 8) fn compute_matrix(
  @builtin(global_invocation_id) global_id: vec3<u32>,
) {
  let x = global_id.x;
  let y = global_id.y;
  let n = node_count;
  let k = uniforms.k;

  if (x >= n || y >= n) {
    return;
  }

  var distance_through_k: f32;
  if(uniforms.k == 0) {
    distance_through_k = pow(distance_matrix_get(x, k), uniforms.edge_weight_factor) + pow(distance_matrix_get(k, y), uniforms.edge_weight_factor);
  } else {
    distance_through_k = distance_matrix_get(x, k) + distance_matrix_get(k, y);
  }

  var distance: f32;
  if(uniforms.k == 0) {
    distance = pow(distance_matrix_get(x, y), uniforms.edge_weight_factor);
  } else {
    distance = distance_matrix_get(x, y);
  }

  if (distance_through_k < distance) {
    distance_matrix_set(x, y, distance_through_k);
    next_matrix_set(x, y, next_matrix_get(x, k));
  }
}

@compute @workgroup_size(64) fn compute_shortest_paths(
  @builtin(global_invocation_id) global_id: vec3<u32>,
) {
  let i = global_id.x;
  if (i >= arrayLength(&paths)) {
    return;
  }

  let path = paths[i];

  let distance = distance_matrix_get(path.start, path.end);
  if(distance == -1) {
    // shortest_paths[i] = 0;
    return;
  }

  shortest_paths_nodes[i * node_count] = path.start;

  var path_index: u32 = 0;
  var newStartIndex = path.start;
  while(newStartIndex != path.end) {
    if(path_index > 100) {
      break;
    }

    newStartIndex = next_matrix_get(newStartIndex, path.end);
    path_index++;

    shortest_paths_nodes[i * node_count + path_index] = newStartIndex;
  }

  shortest_paths_distances[i] = distance;
}

// Matrix getters and setters

fn distance_matrix_get(x: u32, y: u32) -> f32 {
  return distance_matrix[get_matrix_index(x, y)];
}

fn distance_matrix_set(x: u32, y: u32, value: f32) {
  distance_matrix[get_matrix_index(x, y)] = value;
}

fn next_matrix_get(x: u32, y: u32) -> u32 {
  return next_matrix[get_matrix_index(x, y)];
}

fn next_matrix_set(x: u32, y: u32, value: u32) {
  next_matrix[get_matrix_index(x, y)] = value;
}

fn get_matrix_index(x: u32, y: u32) -> u32 {
  return x * node_count + y;
}