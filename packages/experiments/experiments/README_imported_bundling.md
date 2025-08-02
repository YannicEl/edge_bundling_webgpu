# Imported Bundling Algorithm

This document explains how to use the new `ImportedBundling` algorithm that allows you to import pre-bundled graphs from files instead of computing the bundling.

## Overview

The `ImportedBundling` algorithm provides two main classes:

1. **`ImportedBundling`**: Applies bundling information from a file to an existing graph
2. **`ImportedBundlingFromFile`**: Loads a complete bundled graph from a file

## File Format

The bundled graph files should be in JSON format with the following structure:

```json
{
  "nodes": [
    [x1, y1],
    [x2, y2],
    ...
  ],
  "edges": [
    [u1, v1],
    [u2, v2],
    ...
  ],
  "bundling": {
    "splines": {
      "0,1": [[x1, y1], [x2, y2], ...],
      "1,2": [[x1, y1], [x2, y2], ...],
      ...
    },
    "layers": {
      "0,1": "Bundled",
      "1,2": "Spanning",
      ...
    },
    "strokes": {
      "0,1": "purple",
      "1,2": "blue",
      ...
    }
  }
}
```

### Field Descriptions

- **`nodes`**: Array of node positions `[x, y]`
- **`edges`**: Array of edge connections `[u, v]` where u and v are node indices
- **`bundling`**: Optional object containing bundling information
  - **`splines`**: Control points for curved edges (edge key format: "u,v")
  - **`layers`**: Edge layer information ("Bundled", "Spanning", "Distorted")
  - **`strokes`**: Edge stroke colors ("purple", "blue", "brown")

## Export Functions

The system provides several functions to export already bundled graphs:

### 1. Basic Export

```python
from save_bundled_graph import save_bundled_graph

# Export a bundled graph
save_bundled_graph(G, "output.json")
```

### 2. Enhanced Export with Metadata

```python
from save_bundled_graph import export_bundled_graph

# Export with metadata and statistics
export_bundled_graph(G, "output_detailed.json", include_metadata=True)
```

### 3. Export from Bundling Algorithm

```python
from save_bundled_graph import export_bundled_graph_from_experiment

# Export from a bundling algorithm instance
export_bundled_graph_from_experiment(bundling_algorithm, "output.json")
```

### 4. Custom Format Export

```python
from save_bundled_graph import export_bundled_graph_with_custom_format

# Export with custom options
export_bundled_graph_with_custom_format(
    G,
    "output_custom.json",
    format_options={
        'include_metadata': True,
        'include_node_attributes': True,
        'include_edge_attributes': True,
        'compact_format': False,
        'include_statistics': True
    }
)
```

## Usage Examples

### 1. Applying Bundling to an Existing Graph

```python
from reader import Reader
from imported_bundling import ImportedBundling

# Load a graph
G = Reader.readGraphML('path/to/graph.graphml', G_width=1600, directed=False)

# Apply imported bundling
bundling = ImportedBundling(G, "bundled_graph.json")
bundling.bundle()
bundling.draw("output/")
```

### 2. Loading a Complete Bundled Graph

```python
from imported_bundling import ImportedBundlingFromFile

# Load the complete bundled graph
bundling = ImportedBundlingFromFile("bundled_graph.json")
bundling.draw("output/")
```

### 3. Creating a Bundled Graph File

```python
from reader import Reader
from sepb import SpannerBundlingFG
from save_bundled_graph import save_bundled_graph_from_experiment

# Load and bundle a graph
G = Reader.readGraphML('path/to/graph.graphml', G_width=1600, directed=False)
bundling = SpannerBundlingFG(G)
bundling.bundle()

# Save the bundled graph
save_bundled_graph_from_experiment(bundling, "output_bundled.json")
```

### 4. Exporting Already Bundled Graphs

```python
from save_bundled_graph import export_bundled_graph

# Export any already bundled graph
export_bundled_graph(bundled_graph, "exported_bundled.json")
```

## Running the Example

To see the complete workflow in action, run:

```bash
cd packages/experiments/experiments/
python example_imported_bundling.py
```

This will:

1. Create bundled graph files using different export methods
2. Load and apply the bundling using `ImportedBundling`
3. Load the complete graph using `ImportedBundlingFromFile`
4. Demonstrate various export functions
5. Compare different file formats
6. Generate output images and metrics

## Integration with Experiments

You can integrate the imported bundling into your experiments by modifying `main.py`:

```python
from imported_bundling import ImportedBundling

def effectivenessExperiments(base, dataset, algorithm, invertY, bundled_file=None):
    G = Reader.readGraphML(f'../../core/src/datasets/graphml/{dataset}.graphml',
                          G_width=1600, invertY=invertY, directed=False)

    outPath = f'{base}/output/{dataset}/'
    if not os.path.exists(outPath):
        os.makedirs(outPath)

    # Create straight line drawing
    straight = StraightLine(G)
    straight.bundle()
    straight.draw(outPath)

    if bundled_file and os.path.exists(bundled_file):
        # Use imported bundling
        bundling = ImportedBundling(G, bundled_file)
    else:
        # Use regular algorithm
        bundling = algorithm(G)

    bundling.bundle()
    bundling.draw(outPath)

    exp = Experiment(bundling, straight)
    return exp.run(outPath)
```

## Export Function Comparison

| Function                                    | Metadata     | Statistics   | Node Attributes | Edge Attributes | Format   |
| ------------------------------------------- | ------------ | ------------ | --------------- | --------------- | -------- |
| `save_bundled_graph()`                      | ❌           | ❌           | ❌              | ❌              | Basic    |
| `export_bundled_graph()`                    | ✅           | ✅           | ✅              | ✅              | Detailed |
| `export_bundled_graph_from_experiment()`    | ✅           | ✅           | ✅              | ✅              | Enhanced |
| `export_bundled_graph_with_custom_format()` | Configurable | Configurable | Configurable    | Configurable    | Custom   |

## File Format Compatibility

The bundled graph format is compatible with:

- NetworkX graphs with node positions (`X`, `Y` attributes)
- Edge attributes: `Spline`, `Layer`, `Stroke`
- The existing experiment framework
- The drawing and metrics calculation functions

## Error Handling

The algorithm includes error handling for:

- Missing files
- Invalid JSON format
- Missing bundling data (with warning)
- Missing edge or node data

## Performance

Since `ImportedBundling` only loads data from files without computation:

- **Bundle time**: 0.0 seconds
- **Memory usage**: Minimal (just loading JSON)
- **File I/O**: Depends on file size and disk speed

This makes it ideal for:

- Reproducing previous bundling results
- Comparing different bundling algorithms
- Storing and sharing bundled graphs
- Quick visualization of pre-computed bundling

## Advanced Usage

### Custom Export Formats

You can create custom export formats for specific use cases:

```python
# Compact format for web applications
export_bundled_graph_with_custom_format(
    G, "web_format.json",
    format_options={
        'include_metadata': False,
        'include_node_attributes': False,
        'include_edge_attributes': False,
        'compact_format': True,
        'include_statistics': False
    }
)

# Detailed format for analysis
export_bundled_graph_with_custom_format(
    G, "analysis_format.json",
    format_options={
        'include_metadata': True,
        'include_node_attributes': True,
        'include_edge_attributes': True,
        'compact_format': False,
        'include_statistics': True
    }
)
```

### Batch Export

For processing multiple graphs:

```python
import os
from save_bundled_graph import export_bundled_graph

def batch_export_bundled_graphs(graphs_directory, output_directory):
    """Export all bundled graphs in a directory."""
    for filename in os.listdir(graphs_directory):
        if filename.endswith('.graphml'):
            # Load and process each graph
            # ... (your bundling logic here)

            # Export the bundled graph
            output_path = os.path.join(output_directory, f"{filename[:-8]}_bundled.json")
            export_bundled_graph(bundled_graph, output_path)
```
