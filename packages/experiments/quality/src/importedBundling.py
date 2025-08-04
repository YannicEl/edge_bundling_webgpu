import networkx as nx
import json
import numpy as np
from abstractBundling import AbstractBundling
from nx2ipe.nx2ipe import SplineC


class ImportedBundling(AbstractBundling):
    '''
    Import a pre-bundled graph from a file instead of computing the bundling.
    
    This algorithm loads a graph that has already been bundled and preserves
    the bundling information (splines with node indices, layers, etc.) from the file.
    '''
    
    def __init__(self, bundled_file_path: str, name: str):
        # Load the bundled graph data
        self.G = self.load_bundled_graph(bundled_file_path)
        
        # Initialize the parent class with the loaded graph
        super().__init__(self.G)
        
        # Set the name for this bundling algorithm
        self.name = name
        
        # Apply the bundling data to the graph
        self.bundle()
    
    def bundle(self):
        '''
        Apply the imported bundling data to the graph.
        Since the bundling is already computed, this method just applies
        the splines and other bundling data to the graph edges.
        '''
        # Load the bundled data if not already loaded
        if not hasattr(self, 'bundled_data'):
            return
            
        # Apply splines to edges
        if 'splines' in self.bundled_data:
            for edge_key, spline_node_indices in self.bundled_data['splines'].items():
                # Parse the edge key (format: "u,v")
                u, v = edge_key.split(',')
                
                # Convert node indices back to coordinates
                spline_points = []
                for node_index in spline_node_indices:
                    if 0 <= node_index < len(self.bundled_data['node_ids']):
                        node_id = self.bundled_data['node_ids'][node_index]
                        node_coords = self.bundled_data['nodes'][node_index]
                        spline_points.append(node_coords)
                
                # Create SplineC object from the control points
                spline = SplineC(spline_points)
                
                # Apply the spline to the edge
                if self.G.has_edge(u, v):
                    self.G[u][v]['Spline'] = spline
    
    def load_bundled_graph(self, file_path: str) -> nx.Graph:
        '''
        Load a bundled graph from a JSON file.
        
        Args:
            file_path: Path to the JSON file containing the bundled graph data.
                      The splines should contain node indices instead of coordinates.
            
        Returns:
            nx.Graph: A NetworkX graph with nodes, edges, and bundling data.
            
        Raises:
            FileNotFoundError: If the file doesn't exist.
            ValueError: If the JSON structure is invalid.
        '''
        try:
            with open(file_path, 'r') as f:
                data = json.load(f)
        except FileNotFoundError:
            raise FileNotFoundError(f"Bundled graph file not found: {file_path}")
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON format in {file_path}: {e}")
        
        # Validate required fields
        required_fields = ['nodes', 'node_ids', 'edges']
        for field in required_fields:
            if field not in data:
                raise ValueError(f"Missing required field '{field}' in bundled graph file")
        
        # Create a new graph
        G = nx.Graph()
        
        # Add nodes with coordinates
        for i, (node_id, coords) in enumerate(zip(data['node_ids'], data['nodes'])):
            if len(coords) != 2:
                raise ValueError(f"Node coordinates must be [x, y], got {coords}")
            
            G.add_node(node_id, X=coords[0], Y=coords[1])
        
        # Add edges
        for edge in data['edges']:
            if len(edge) != 2:
                raise ValueError(f"Edge must be [u, v], got {edge}")
            
            u, v = edge
            G.add_edge(u, v)
        
        # Set graph dimensions if available
        if 'dimensions' in data:
            dims = data['dimensions']
            G.graph['xmin'] = dims.get('xmin', 0)
            G.graph['xmax'] = dims.get('xmax', 1600)
            G.graph['ymin'] = dims.get('ymin', 0)
            G.graph['ymax'] = dims.get('ymax', 1200)
        else:
            # Calculate dimensions from node coordinates
            x_coords = [G.nodes[node]['X'] for node in G.nodes()]
            y_coords = [G.nodes[node]['Y'] for node in G.nodes()]
            
            G.graph['xmin'] = min(x_coords) if x_coords else 0
            G.graph['xmax'] = max(x_coords) if x_coords else 1600
            G.graph['ymin'] = min(y_coords) if y_coords else 0
            G.graph['ymax'] = max(y_coords) if y_coords else 1200
        
        # Store the original data for later use in bundle()
        self.bundled_data = data
        
        return G
