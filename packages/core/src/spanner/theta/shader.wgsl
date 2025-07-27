struct Position { 
  x : f32,
  y : f32,
}

struct Edge {
  start: u32,
  end: u32,
}

struct Uniforms {
  k: u32,
  node_count: u32,
}

@group(0) @binding(0) var<storage, read> positions: array<Position>;
@group(0) @binding(1) var<storage, read_write> edges: array<Edge>;
@group(0) @binding(2) var<storage, read_write> counter: atomic<u32>;
@group(0) @binding(3) var<uniform> uniforms: Uniforms;

const K       : u32 = 128;
const TILE    : u32 = 64u;
const TWO_PI  : f32 = 6.28318530718;
const THETA   : f32 = TWO_PI / f32(K);

var<workgroup> shPos : array<Position, TILE>;
var<workgroup> shIdx : array<u32, TILE>;

@compute @workgroup_size(TILE)
fn compute(
  @builtin(global_invocation_id) global_id : vec3<u32>,
  @builtin(local_invocation_id) local_id : vec3<u32>
) {
  let i = global_id.x;
  // if (i >= uniforms.node_count) { return; }

  let vi = positions[i];

  // best candidate per cone
  var bestDist : array<f32, K>;
  var bestIdx  : array<u32, K>;
  for (var c : u32 = 0u; c < K; c = c + 1u) {
    bestDist[c] = 1e30;
    bestIdx[c]  = 0xffffffffu;
  }

  // tiled sweep over all points
  var base : u32 = 0u;
  loop {
    if (base >= uniforms.node_count) { break; }

    let loc = local_id.x;
    if (base + loc < uniforms.node_count) {
      shPos[loc] = positions[base + loc];
      shIdx[loc] = base + loc;
    }

    workgroupBarrier();

    let lim = min(TILE, uniforms.node_count - base);
    for (var j : u32 = 0u; j < lim; j = j + 1u) {
      let idx = shIdx[j];
      if (idx == i) { continue; }

      let d = vec2<f32>(shPos[j].x - vi.x, shPos[j].y - vi.y);
      var phi = atan2(d.y, d.x);
      if (phi < 0.0) { phi = phi + TWO_PI; }
      let cone = u32(floor(phi / THETA));

      let dist2 = dot(d, d);
      if (dist2 < bestDist[cone]) {
        bestDist[cone] = dist2;
        bestIdx[cone]  = idx;
      }
    }
    workgroupBarrier();
    base = base + TILE;
  }

  // write chosen edges (de-duplicate undirected)
  for (var c : u32 = 0u; c < K; c = c + 1u) {
    let j = bestIdx[c];
    if (j != 0xffffffffu && i < j) {
      if (i < uniforms.node_count) {
        let out = atomicAdd(&counter, 1u);
        edges[out] = Edge(i, j);
      }
    }
  }
}