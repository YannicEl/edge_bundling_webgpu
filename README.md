# Edge Path Bundling with WebGPU

A high-performance implementation of edge path bundling algorithms using WebGPU for GPU-accelerated graph processing and visualization. This project implements spanner-based edge bundling techniques with both CPU and GPU implementations for interactive graph visualization.

## Demo

[https://bachelor.yannic.at/](https://bachelor.yannic.at/)

## Overview

Edge path bundling is a technique for reducing visual clutter in dense graph visualizations by routing edges through common paths rather than drawing them as straight lines. This implementation focuses on **Spanner-based Edge Path Bundling (S-EPB)**, which uses graph spanners to create efficient bundling solutions.

## Key Features

- **GPU Acceleration**: WebGPU-based implementations for high-performance graph processing
- **Multiple Algorithms**: Support for both Greedy and Theta spanner construction algorithms
- **Interactive Visualization**: Real-time parameter adjustment and canvas-based rendering
- **Multiple Datasets**: Pre-loaded datasets including airlines, migration, air traffic, and synthetic graphs
- **Performance Benchmarking**: Built-in performance measurement and export capabilities
- **Cross-Platform**: Web-based application that runs in modern browsers with WebGPU support

## Architecture

The project is organized as a monorepo with three main packages:

### `packages/core`

Core library containing:

- **Graph Data Structures**: `Graph`, `Node`, `Edge`, `AdjacencyList`, `AdjacencyMatrix`
- **Spanner Algorithms**: Greedy and Theta spanner construction (CPU & GPU)
- **Shortest Path Algorithms**: Dijkstra and Floyd-Warshall (CPU & GPU)
- **Edge Path Bundling**: Main bundling logic with configurable parameters
- **WebGPU Utilities**: Shader management and GPU buffer handling
- **Dataset Loading**: Support for JSON and GraphML formats

### `packages/app`

SvelteKit web application featuring:

- **Interactive Canvas**: Real-time graph visualization with WebGL rendering
- **Control Panel**: Parameter adjustment for distortion, edge weights, and algorithms
- **Dataset Selection**: Multiple pre-loaded graph datasets
- **Export Functionality**: Download visualizations and bundling data
- **Responsive Design**: Adaptive canvas sizing and modern UI

### `packages/experiments`

Research and evaluation tools:

- **Performance Testing**: Automated benchmarking across different datasets
- **Quality Assessment**: Python-based evaluation of bundling quality
- **Result Analysis**: CSV export and statistical analysis

## Algorithms Implemented

### Spanner Construction

- **Greedy Spanner**: Iteratively adds edges that don't violate the distortion constraint
- **Theta Spanner**: Geometric spanner construction based on angular relationships

### Shortest Path Algorithms

- **Dijkstra's Algorithm**: Single-source shortest path (CPU & GPU)
- **Floyd-Warshall**: All-pairs shortest path (CPU & GPU)

### Edge Path Bundling

- **S-EPB**: Spanner-based Edge Path Bundling with configurable parameters:
  - `maxDistortion`: Maximum allowed path length multiplier
  - `edgeWeightFactor`: Weight adjustment for edge importance

## Available Datasets

- **Simple**: Basic test graph (6 nodes, 7 edges)
- **Example**: Small example graph (12 nodes, 17 edges)
- **Airlines**: Flight route network
- **Migration**: Human migration patterns
- **Air Traffic**: Air traffic control network
- **Fully Connected**: Synthetic graphs (256, 529, 1024 nodes)

## Getting Started

### Prerequisites

- Node.js 24.7.0 or later
- pnpm 10.15.1 or later
- Modern browser with WebGPU support (Chrome 113+, Firefox 110+)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd edge_bundling_webgpu

# Install dependencies
pnpm install
```

### Development

```bash
# Start the development server
pnpm --filter app dev
```

The application will be available at `http://localhost:3000`

## Usage

1. **Select a Dataset**: Choose from available graphs in the control panel
2. **Choose Algorithm**: Select between Theta or Greedy spanner construction
3. **Adjust Parameters**:
   - **Max Distortion**: Controls how much longer bundled paths can be (0-10)
   - **Edge Weight Factor**: Adjusts edge importance weighting (0.01-2.0)
4. **Run Bundling**: Click "Run GPU" to process the graph
5. **Export Results**: Download the visualization or bundling data

## Development

### Project Structure

```
packages/
├── core/           # Core algorithms and data structures
├── app/            # Web application
└── experiments/    # Research and evaluation tools
```

### Key Files

- `packages/core/src/edge-path-bundling/` - Main bundling algorithms
- `packages/core/src/spanner/` - Spanner construction implementations
- `packages/core/src/shortest-path/` - Shortest path algorithms
- `packages/app/src/routes/app/(canvas)/` - Main application interface

## License

MIT License
