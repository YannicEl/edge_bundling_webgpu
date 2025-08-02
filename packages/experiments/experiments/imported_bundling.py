import networkx as nx
import json
import numpy as np
from abstractBundling import AbstractBundling
from nx2ipe.nx2ipe import SplineC


class ImportedBundling(AbstractBundling):
    '''
    Import a pre-bundled graph from a file instead of computing the bundling.
    
    This algorithm loads a graph that has already been bundled and preserves
    the bundling information (splines, layers, etc.) from the file.
    '''
    
    def __init__(self, G: nx.Graph, bundled_file_path: str):
        super().__init__(G)
        self.bundled_file_path = bundled_file_path
        self.name = f'imported_{bundled_file_path.split("/")[-1].split(".")[0]}'
        
    def bundle(self):
        '''
        Load the pre-bundled graph from file and apply its bundling to the current graph.
        
        The file should be in JSON format with the following structure:
        {
            "nodes": [[x1, y1], [x2, y2], ...],
            "edges": [[u1, v1], [u2, v2], ...],
            "bundling": {
                "splines": {
                    "0,1": [[x1, y1], [x2, y2], ...],  // control points for edge 0->1
                    "1,2": [[x1, y1], [x2, y2], ...],  // control points for edge 1->2
                    ...
                },
                "layers": {
                    "0,1": "Bundled",  // or "Spanning", "Distorted"
                    "1,2": "Bundled",
                    ...
                },
                "strokes": {
                    "0,1": "purple",  // or "blue", "brown"
                    "1,2": "purple",
                    ...
                }
            }
        }
        
        Returns the time needed for loading (0 since no computation is done).
        '''
        
        try:
            with open(self.bundled_file_path, 'r') as f:
                bundled_data = json.load(f)
        except FileNotFoundError:
            raise FileNotFoundError(f"Bundled graph file not found: {self.bundled_file_path}")
        except json.JSONDecodeError:
            raise ValueError(f"Invalid JSON format in file: {self.bundled_file_path}")
        
        # Apply the bundling information to the current graph
        self._apply_bundling(bundled_data)
        
        return 0.0  # No computation time since we're just loading
    
    def _apply_bundling(self, bundled_data):
        '''
        Apply the bundling information from the loaded data to the current graph.
        '''
        
        # Check if bundling data exists
        if 'bundling' not in bundled_data:
            print("Warning: No bundling data found in file. Graph will remain unbundled.")
            return
        
        bundling = bundled_data['bundling']
        splines = bundling.get('splines', {})
        layers = bundling.get('layers', {})
        strokes = bundling.get('strokes', {})
        
        # Apply bundling to each edge
        for u, v in self.G.edges():
            edge_key = f"{u},{v}"
            
            # Apply spline if available
            if edge_key in splines:
                control_points = splines[edge_key]
                if control_points:
                    self.G[u][v]['Spline'] = SplineC(control_points)
            
            # Apply layer if available
            if edge_key in layers:
                self.G[u][v]['Layer'] = layers[edge_key]
            
            # Apply stroke color if available
            if edge_key in strokes:
                self.G[u][v]['Stroke'] = strokes[edge_key]
    
    def load_bundled_graph(self, file_path: str) -> nx.Graph:
        '''
        Load a complete bundled graph from file.
        
        This method can be used to load a graph that has been saved with
        all its bundling information intact.
        '''
        
        try:
            with open(file_path, 'r') as f:
                data = json.load(f)
        except FileNotFoundError:
            raise FileNotFoundError(f"Graph file not found: {file_path}")
        except json.JSONDecodeError:
            raise ValueError(f"Invalid JSON format in file: {file_path}")
        
        # Create a new graph
        G = nx.Graph()
        
        # Add nodes with positions
        if 'nodes' in data:
            for i, (x, y) in enumerate(data['nodes']):
                G.add_node(i, X=x, Y=y)
        
        # Add edges
        if 'edges' in data:
            for u, v in data['edges']:
                G.add_edge(u, v)
        
        # Apply bundling information if available
        if 'bundling' in data:
            bundling = data['bundling']
            splines = bundling.get('splines', {})
            layers = bundling.get('layers', {})
            strokes = bundling.get('strokes', {})
            
            for edge_key, control_points in splines.items():
                u, v = map(int, edge_key.split(','))
                if G.has_edge(u, v):
                    if control_points:
                        G[u][v]['Spline'] = SplineC(control_points)
            
            for edge_key, layer in layers.items():
                u, v = map(int, edge_key.split(','))
                if G.has_edge(u, v):
                    G[u][v]['Layer'] = layer
            
            for edge_key, stroke in strokes.items():
                u, v = map(int, edge_key.split(','))
                if G.has_edge(u, v):
                    G[u][v]['Stroke'] = stroke
        
        # Set graph dimensions
        if data.get('nodes'):
            x_coords = [node[0] for node in data['nodes']]
            y_coords = [node[1] for node in data['nodes']]
            G.graph['xmin'] = min(x_coords)
            G.graph['xmax'] = max(x_coords)
            G.graph['ymin'] = min(y_coords)
            G.graph['ymax'] = max(y_coords)
        
        return G


class ImportedBundlingFromFile(ImportedBundling):
    '''
    A variant that loads the complete graph from file instead of applying
    bundling to an existing graph.
    '''
    
    def __init__(self, bundled_file_path: str):
        # Load the graph from file
        G = self.load_bundled_graph(bundled_file_path)
        super().__init__(G, bundled_file_path)
    
    def bundle(self):
        '''
        No bundling computation needed since the graph is already bundled.
        '''
        return 0.0 