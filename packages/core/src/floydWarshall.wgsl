@group(0) @binding(0) var<storage, read_write> distance_matrix: array<f32>;
@group(0) @binding(1) var<uniform> k : u32;

override distance_matrix_size: u32;

@compute @workgroup_size(8, 8) fn compute(
  @builtin(global_invocation_id) global_id: vec3<u32>,
  @builtin(workgroup_id) workgroup_id: vec3<u32>,
) {
  let i = global_id.y;
  let j = global_id.x;
  let n = distance_matrix_size;

  if (i >= n || j >= n) {
    return;
  }

  let idx_ij = i * n + j;
  let idx_ik = i * n + k;
  let idx_kj = k * n + j;

  let throughK = distance_matrix[idx_ik] + distance_matrix[idx_kj];
  if (throughK < distance_matrix[idx_ij]) {
    distance_matrix[idx_ij] = throughK;
  }
}