struct Path {
  start: u32,
  end: u32,
}

struct Return {
  length: u32,
  nodes: array<u32>,
}

@group(0) @binding(0) var<storage, read_write> distance_matrix: array<f32>;
@group(0) @binding(1) var<storage, read_write> next_matrix: array<u32>;
@group(0) @binding(2) var<uniform> k : u32;
@group(0) @binding(3) var<storage, read> paths: array<Path>;
@group(0) @binding(4) var<storage, read_write> shortest_paths_distances: array<f32>;
@group(0) @binding(5) var<storage, read_write> shortest_paths_nodes: array<u32>;

override node_count: u32;

@compute @workgroup_size(8, 8) fn compute_matrix(
  @builtin(global_invocation_id) global_id: vec3<u32>,
) {
  let i = global_id.y;
  let j = global_id.x;
  let n = node_count;

  if (i >= n || j >= n) {
    return;
  }

  let idx_ij = i * n + j;
  let idx_ik = i * n + k;
  let idx_kj = k * n + j;

  let throughK = distance_matrix[idx_ik] + distance_matrix[idx_kj];
  if (throughK < distance_matrix[idx_ij]) {
    distance_matrix[idx_ij] = throughK;
    next_matrix[idx_ij] = next_matrix[idx_ik];
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

fn distance_matrix_get(x: u32, y: u32) -> f32 {
  return distance_matrix[x * node_count + y];
}

fn next_matrix_get(x: u32, y: u32) -> u32 {
  return next_matrix[x * node_count + y];
}