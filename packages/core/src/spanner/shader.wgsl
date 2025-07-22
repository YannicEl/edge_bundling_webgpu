struct Positions { data : array<vec2<f32>>; };
struct Edge      { a : u32, b : u32 };

@group(0) @binding(0) var<storage, read>       positions : Positions;
@group(0) @binding(1) var<storage, read_write> edges     : array<Edge>;
@group(0) @binding(2) var<storage, read_write> counter   : atomic<u32>;
struct Uniforms { n : u32 };
@group(0) @binding(3) var<uniform> uniforms : Uniforms;

const K       : u32 = 8u;
const TILE    : u32 = 64u;
const TWO_PI  : f32 = 6.28318530718;
const THETA   : f32 = TWO_PI / f32(K);

var<workgroup> shPos : array<vec2<f32>, TILE>;
var<workgroup> shIdx : array<u32,      TILE>;

@compute @workgroup_size(${WORKGROUP})
fn main(@builtin(global_invocation_id) gid : vec3<u32>,
        @builtin(local_invocation_id)  lid : vec3<u32>) {
    let i = gid.x;
    if (i >= uniforms.n) { return; }

    let vi = positions.data[i];

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
        if (base >= uniforms.n) { break; }

        let loc = lid.x;
        if (base + loc < uniforms.n) {
            shPos[loc] = positions.data[base + loc];
            shIdx[loc] = base + loc;
        }
        workgroupBarrier();

        let lim = min(TILE, uniforms.n - base);
        for (var j : u32 = 0u; j < lim; j = j + 1u) {
            let idx = shIdx[j];
            if (idx == i) { continue; }

            let d = shPos[j] - vi;
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
            let out = atomicAdd(&counter, 1u);
            edges[out] = Edge(i, j);
        }
    }
}